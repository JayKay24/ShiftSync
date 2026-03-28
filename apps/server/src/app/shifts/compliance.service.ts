import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from '../database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { schema, assignments, shifts, users, availability } from '@shiftsync/data-access';
import { eq, and, sql, gte, lte, ne } from 'drizzle-orm';
import { startOfWeek, endOfWeek, startOfDay, endOfDay, subDays } from 'date-fns';

export interface ComplianceResult {
  hasHardBlock: boolean;
  warnings: string[];
  requiresOverride: boolean;
}

@Injectable()
export class ComplianceService {
  constructor(
    @Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>,
  ) {}

  async checkCompliance(userId: string, shiftId: string): Promise<ComplianceResult> {
    const result: ComplianceResult = {
      hasHardBlock: false,
      warnings: [],
      requiresOverride: false,
    };

    // 1. Get the shift and user details
    const [shift] = await this.db
      .select()
      .from(shifts)
      .where(eq(shifts.id, shiftId))
      .limit(1);

    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!shift || !user) return result;

    const shiftStart = new Date(shift.startTime);
    const shiftEnd = new Date(shift.endTime);
    const shiftDuration = (shiftEnd.getTime() - shiftStart.getTime()) / (1000 * 60 * 60);

    // 2. Overlapping & 10-Hour Rest Rule (Requirement #2)
    // Fetch all confirmed assignments for this user
    const userAssignments = await this.db
      .select({
        startTime: shifts.startTime,
        endTime: shifts.endTime,
      })
      .from(assignments)
      .innerJoin(shifts, eq(assignments.shiftId, shifts.id))
      .where(
        and(
          eq(assignments.userId, userId),
          eq(assignments.status, 'confirmed'),
          ne(assignments.shiftId, shiftId)
        )
      );

    for (const existing of userAssignments) {
      const existingStart = new Date(existing.startTime).getTime();
      const existingEnd = new Date(existing.endTime).getTime();
      const newStart = shiftStart.getTime();
      const newEnd = shiftEnd.getTime();

      // Double-Booking Check
      if (newStart < existingEnd && newEnd > existingStart) {
        result.hasHardBlock = true;
        result.warnings.push('Staff member has an overlapping shift');
      }

      // 10-hour rest check
      const restPeriodMs = 10 * 60 * 60 * 1000;
      if (
        (existingEnd > newStart - restPeriodMs && existingEnd <= newStart) ||
        (existingStart < newEnd + restPeriodMs && existingStart >= newEnd)
      ) {
        result.hasHardBlock = true;
        result.warnings.push('Minimum 10-hour rest period required between shifts');
      }
    }

    // 3. Availability Alignment (Requirement #2 & Timezone Tangle)
    const userAvailability = await this.db
      .select()
      .from(availability)
      .where(eq(availability.userId, userId));

    const isAvailable = await this.checkUserAvailability(user.timezone, shiftStart, shiftEnd, userAvailability);
    if (!isAvailable) {
      result.hasHardBlock = true;
      result.warnings.push('Shift falls outside of staff availability windows');
    }

    // 4. Check Daily Hours (Requirement #4)
    const dayStart = startOfDay(shiftStart);
    const dayEnd = endOfDay(shiftStart);

    const calculateHoursInRange = (start: Date, end: Date, rangeStart: Date, rangeEnd: Date) => {
      const actualStart = start > rangeStart ? start : rangeStart;
      const actualEnd = end < rangeEnd ? end : rangeEnd;
      const ms = actualEnd.getTime() - actualStart.getTime();
      return ms > 0 ? ms / (1000 * 60 * 60) : 0;
    };

    let totalDailyHours = shiftDuration;
    for (const a of userAssignments) {
      totalDailyHours += calculateHoursInRange(new Date(a.startTime), new Date(a.endTime), dayStart, dayEnd);
    }

    if (totalDailyHours > 12.01) { // Floating point safety
      result.hasHardBlock = true;
      result.warnings.push(`Daily hours (${totalDailyHours.toFixed(1)}) exceed 12-hour hard block limit`);
    } else if (totalDailyHours > 8.01) {
      result.warnings.push(`Daily hours (${totalDailyHours.toFixed(1)}) exceed 8-hour warning threshold`);
    }

    // 5. Check Weekly Hours (Requirement #4)
    const weekStart = startOfWeek(shiftStart, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(shiftStart, { weekStartsOn: 1 });

    let totalWeeklyHours = shiftDuration;
    for (const a of userAssignments) {
      totalWeeklyHours += calculateHoursInRange(new Date(a.startTime), new Date(a.endTime), weekStart, weekEnd);
    }

    if (totalWeeklyHours >= 40) {
      result.warnings.push(`Weekly hours (${totalWeeklyHours.toFixed(1)}) exceed 40-hour high alert`);
    } else if (totalWeeklyHours >= 35) {
      result.warnings.push(`Weekly hours (${totalWeeklyHours.toFixed(1)}) approaching 40 (35+)`);
    }

    // 6. Consecutive Days Tracking (Requirement #4)
    let consecutiveDays = 0;
    for (let i = 1; i <= 7; i++) {
      const checkDay = subDays(shiftStart, i);
      const [worked] = await this.db
        .select({ id: assignments.id })
        .from(assignments)
        .innerJoin(shifts, eq(assignments.shiftId, shifts.id))
        .where(
          and(
            eq(assignments.userId, userId),
            eq(assignments.status, 'confirmed'),
            gte(shifts.startTime, startOfDay(checkDay)),
            lte(shifts.startTime, endOfDay(checkDay))
          )
        )
        .limit(1);

      if (worked) {
        consecutiveDays++;
      } else {
        break;
      }
    }

    if (consecutiveDays === 5) {
      result.warnings.push('6th consecutive day worked in a week (warning)');
    } else if (consecutiveDays >= 6) {
      result.requiresOverride = true;
      result.warnings.push('7th consecutive day requires manager override');
    }

    return result;
  }

  private async checkUserAvailability(timezone: string, start: Date, end: Date, avails: any[]): Promise<boolean> {
    if (avails.length === 0) return true;

    // We check availability for the entire duration of the shift
    // Iterate through every hour of the shift to ensure the user is available
    const checkStepMs = 30 * 60 * 1000; // Check every 30 mins
    let currentMs = start.getTime();
    
    while (currentMs < end.getTime()) {
      const currentTime = new Date(currentMs);
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour12: false,
        weekday: 'long',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
      const parts = formatter.formatToParts(currentTime);
      const map: any = {};
      parts.forEach(p => map[p.type] = p.value);
      
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayOfWeek = days.indexOf(map.weekday);
      const dateStr = `${map.year}-${map.month}-${map.day}`;
      const timeStr = `${map.hour}:${map.minute}:00`;

      // 1. Check Exceptions
      const exception = avails.find(a => a.isException && a.exceptionDate === dateStr);
      if (exception) {
        if (timeStr < exception.startTimeLocal || timeStr > exception.endTimeLocal) return false;
      } else {
        // 2. Check Recurring
        const recurring = avails.find(a => !a.isException && a.dayOfWeek === dayOfWeek);
        if (!recurring) return false; // No availability defined for this day
        if (timeStr < recurring.startTimeLocal || timeStr > recurring.endTimeLocal) return false;
      }

      currentMs += checkStepMs;
    }

    return true;
  }
}
