import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from '../database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { schema, assignments, shifts } from '@shiftsync/data-access';
import { eq, and, sql, gte, lte } from 'drizzle-orm';
import { startOfWeek, endOfWeek, startOfDay, endOfDay, differenceInHours, addDays, subDays } from 'date-fns';

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

    // 1. Get the shift details
    const [shift] = await this.db
      .select()
      .from(shifts)
      .where(eq(shifts.id, shiftId))
      .limit(1);

    if (!shift) return result;

    const shiftStart = new Date(shift.startTime);
    const shiftEnd = new Date(shift.endTime);
    const shiftDuration = differenceInHours(shiftEnd, shiftStart);

    // 2. Check Daily Hours (Requirement #4)
    const dayStart = startOfDay(shiftStart);
    const dayEnd = endOfDay(shiftStart);

    const dailyAssignments = await this.db
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
          gte(shifts.startTime, dayStart),
          lte(shifts.endTime, dayEnd)
        )
      );

    const totalDailyHours = dailyAssignments.reduce((sum, a) => 
      sum + differenceInHours(new Date(a.endTime), new Date(a.startTime)), 0
    ) + shiftDuration;

    if (totalDailyHours > 12) {
      result.hasHardBlock = true;
      result.warnings.push('Daily hours exceed 12-hour hard block limit');
    } else if (totalDailyHours > 8) {
      result.warnings.push('Daily hours exceed 8 hours');
    }

    // 3. Check Weekly Hours (Requirement #4)
    const weekStart = startOfWeek(shiftStart);
    const weekEnd = endOfWeek(shiftStart);

    const weeklyAssignments = await this.db
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
          gte(shifts.startTime, weekStart),
          lte(shifts.endTime, weekEnd)
        )
      );

    const totalWeeklyHours = weeklyAssignments.reduce((sum, a) => 
      sum + differenceInHours(new Date(a.endTime), new Date(a.startTime)), 0
    ) + shiftDuration;

    if (totalWeeklyHours >= 40) {
      result.warnings.push('Weekly hours exceed 40 hours');
    } else if (totalWeeklyHours >= 35) {
      result.warnings.push('Weekly hours approaching 40 (35+)');
    }

    // 4. Consecutive Days Tracking (Requirement #4)
    // Simplified: Check backwards for consecutive days
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
}
