import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { DRIZZLE } from '../database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { schema, shifts, assignments, staffSkills, staffCertifications, NewShift } from '@shiftsync/data-access';
import { eq, and, or, lte, gte, lt, gt, sql } from 'drizzle-orm';

@Injectable()
export class ShiftsService {
  constructor(
    @Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>,
  ) {}

  async createShift(newShift: NewShift) {
    const [result] = await this.db
      .insert(shifts)
      .values(newShift)
      .returning();
    return result;
  }

  async assignStaff(shiftId: string, userId: string) {
    // 1. Check if shift exists
    const [shift] = await this.db
      .select()
      .from(shifts)
      .where(eq(shifts.id, shiftId))
      .limit(1);

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    // 2. Check if user is already assigned to this shift
    const [existingAssignment] = await this.db
      .select()
      .from(assignments)
      .where(and(eq(assignments.shiftId, shiftId), eq(assignments.userId, userId)))
      .limit(1);

    if (existingAssignment) {
      throw new BadRequestException('Staff member is already assigned to this shift');
    }

    // 3. Constraint: Location Certification
    const [isCertified] = await this.db
      .select()
      .from(staffCertifications)
      .where(
        and(
          eq(staffCertifications.userId, userId),
          eq(staffCertifications.locationId, shift.locationId)
        )
      )
      .limit(1);

    if (!isCertified) {
      throw new BadRequestException('Staff member is not certified for this location');
    }

    // 4. Constraint: Skill Matching
    const [hasSkill] = await this.db
      .select()
      .from(staffSkills)
      .where(
        and(
          eq(staffSkills.userId, userId),
          eq(staffSkills.skillId, shift.requiredSkillId)
        )
      )
      .limit(1);

    if (!hasSkill) {
      throw new BadRequestException('Staff member does not have the required skill for this shift');
    }

    // 5. Get all existing shifts for this user to check temporal constraints
    const userAssignments = await this.db
      .select({
        startTime: shifts.startTime,
        endTime: shifts.endTime,
      })
      .from(assignments)
      .innerJoin(shifts, eq(assignments.shiftId, shifts.id))
      .where(and(eq(assignments.userId, userId), eq(assignments.status, 'confirmed')));

    for (const existing of userAssignments) {
      const existingStart = new Date(existing.startTime).getTime();
      const existingEnd = new Date(existing.endTime).getTime();
      const newStart = new Date(shift.startTime).getTime();
      const newEnd = new Date(shift.endTime).getTime();

      // 6. Constraint: No Double-Booking (Overlapping)
      // Overlap if (StartA < EndB) and (EndA > StartB)
      if (newStart < existingEnd && newEnd > existingStart) {
        throw new BadRequestException('Staff member has an overlapping shift');
      }

      // 7. Constraint: Minimum 10-hour rest (36,000,000 ms)
      const restPeriodMs = 10 * 60 * 60 * 1000;
      
      // If existing shift is before new shift
      if (existingEnd > newStart - restPeriodMs && existingEnd <= newStart) {
        throw new BadRequestException('Minimum 10-hour rest period required between shifts');
      }
      
      // If existing shift is after new shift
      if (existingStart < newEnd + restPeriodMs && existingStart >= newEnd) {
        throw new BadRequestException('Minimum 10-hour rest period required between shifts');
      }
    }

    // 8. Create assignment
    const [assignment] = await this.db
      .insert(assignments)
      .values({
        shiftId,
        userId,
        status: 'confirmed',
      })
      .returning();

    return assignment;
  }
}

