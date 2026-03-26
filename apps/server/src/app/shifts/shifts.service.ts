import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { DRIZZLE } from '../database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { schema, shifts, assignments, staffSkills, NewShift } from '@shiftsync/data-access';
import { eq, and } from 'drizzle-orm';

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

    // 2. Constraint: Staff can only be assigned to shifts requiring skills they possess
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

    // 3. Create assignment
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
