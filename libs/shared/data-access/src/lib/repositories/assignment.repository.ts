import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, count, ne, gte, lte } from 'drizzle-orm';
import { schema } from '../schema';
import { assignments } from '../entities/assignment.entity';
import { complianceOverrides } from '../entities/compliance-override.entity';
import { shifts } from '../entities/shift.entity';
import { startOfDay, endOfDay } from 'date-fns';

export class AssignmentRepository {
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

  async getUserConfirmedAssignments(userId: string) {
    return this.db.query.assignments.findMany({
      where: and(
        eq(assignments.userId, userId),
        eq(assignments.status, 'confirmed')
      ),
      with: {
        shift: {
          with: { location: true }
        },
      },
      orderBy: (assignments, { asc }) => [asc(assignments.id)],
    });
  }

  async countConfirmedByShift(shiftId: string): Promise<number> {
    const [assignmentCount] = await this.db
      .select({ value: count() })
      .from(assignments)
      .where(and(eq(assignments.shiftId, shiftId), eq(assignments.status, 'confirmed')));
    
    return Number(assignmentCount.value);
  }

  async findByUserAndShift(userId: string, shiftId: string) {
    const [existingAssignment] = await this.db
      .select()
      .from(assignments)
      .where(and(eq(assignments.shiftId, shiftId), eq(assignments.userId, userId)))
      .limit(1);
      
    return existingAssignment || null;
  }

  async createAssignment(shiftId: string, userId: string) {
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

  async createComplianceOverride(assignmentId: string, managerId: string, overrideReason: string) {
    await this.db.insert(complianceOverrides).values({
      assignmentId,
      managerId,
      overrideReason,
      overrideType: '7th_consecutive_day',
    });
  }

  async findConfirmedByUserAndShift(userId: string, shiftId: string) {
    const [assignment] = await this.db
      .select()
      .from(assignments)
      .where(
        and(
          eq(assignments.shiftId, shiftId),
          eq(assignments.userId, userId),
          eq(assignments.status, 'confirmed')
        )
      )
      .limit(1);
      
    return assignment || null;
  }

  async updateStatus(userId: string, shiftId: string, status: string) {
    const [assignment] = await this.db
      .update(assignments)
      .set({ status } as any)
      .where(and(eq(assignments.shiftId, shiftId), eq(assignments.userId, userId)))
      .returning();
      
    return assignment || null;
  }

  async getConfirmedShiftTimesForUserExcluding(userId: string, shiftIdToExclude: string) {
    return this.db
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
          ne(assignments.shiftId, shiftIdToExclude)
        )
      );
  }

  async hasWorkedOnDay(userId: string, targetDay: Date): Promise<boolean> {
    const [worked] = await this.db
      .select({ id: assignments.id })
      .from(assignments)
      .innerJoin(shifts, eq(assignments.shiftId, shifts.id))
      .where(
        and(
          eq(assignments.userId, userId),
          eq(assignments.status, 'confirmed'),
          gte(shifts.startTime, startOfDay(targetDay)),
          lte(shifts.startTime, endOfDay(targetDay))
        )
      )
      .limit(1);
      
    return !!worked;
  }
}
