import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, count, ne, gte, lte } from 'drizzle-orm';
import { schema } from '../schema';
import { assignments } from '../entities/assignment.entity';
import { complianceOverrides } from '../entities/compliance-override.entity';
import { shifts } from '../entities/shift.entity';
import { startOfDay, endOfDay } from 'date-fns';

/**
 * Repository managing shift assignments, status transitions, and compliance overrides.
 */
export class AssignmentRepository {
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

  /**
   * Retrieves all confirmed assignments for a specific user, including associated shifts and locations.
   *
   * @param {string} userId - User identifier.
   * @returns {Promise<any[]>} List of confirmed assignments with shift and location metadata.
   */
  async getUserConfirmedAssignments(userId: string) {
    return this.db.query.assignments.findMany({
      where: and(
        eq(assignments.userId, userId),
        eq(assignments.status, 'confirmed'),
      ),
      with: {
        shift: {
          with: { location: true },
        },
      },
      orderBy: (assignments, { asc }) => [asc(assignments.id)],
    });
  }

  /**
   * Counts the number of active confirmed assignments currently booked for a shift.
   *
   * @param {string} shiftId - Shift identifier.
   * @returns {Promise<number>} Number of confirmed staff assigned.
   */
  async countConfirmedByShift(shiftId: string): Promise<number> {
    const [assignmentCount] = await this.db
      .select({ value: count() })
      .from(assignments)
      .where(
        and(
          eq(assignments.shiftId, shiftId),
          eq(assignments.status, 'confirmed'),
        ),
      );

    return Number(assignmentCount.value);
  }

  /**
   * Finds an assignment record for a specific user and shift regardless of status.
   *
   * @param {string} userId - User identifier.
   * @param {string} shiftId - Shift identifier.
   * @returns {Promise<any | null>} Assignment record if found, otherwise null.
   */
  async findByUserAndShift(userId: string, shiftId: string) {
    const [existingAssignment] = await this.db
      .select()
      .from(assignments)
      .where(
        and(eq(assignments.shiftId, shiftId), eq(assignments.userId, userId)),
      )
      .limit(1);

    return existingAssignment || null;
  }

  /**
   * Creates a new confirmed assignment linking a user to a shift.
   *
   * @param {string} shiftId - Shift identifier.
   * @param {string} userId - User identifier.
   * @returns {Promise<any>} Created assignment record.
   */
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

  /**
   * Records a documented manager override for a labor law compliance rule (e.g. 7th consecutive day).
   *
   * @param {string} assignmentId - Associated shift assignment identifier.
   * @param {string} managerId - Authorizing manager user identifier.
   * @param {string} overrideReason - Documented business justification for overriding the rule.
   * @returns {Promise<void>}
   */
  async createComplianceOverride(
    assignmentId: string,
    managerId: string,
    overrideReason: string,
  ) {
    await this.db.insert(complianceOverrides).values({
      assignmentId,
      managerId,
      overrideReason,
      overrideType: '7th_consecutive_day',
    });
  }

  /**
   * Finds a confirmed assignment record for a specific user and shift.
   *
   * @param {string} userId - User identifier.
   * @param {string} shiftId - Shift identifier.
   * @returns {Promise<any | null>} Confirmed assignment record, or null if none exists.
   */
  async findConfirmedByUserAndShift(userId: string, shiftId: string) {
    const [assignment] = await this.db
      .select()
      .from(assignments)
      .where(
        and(
          eq(assignments.shiftId, shiftId),
          eq(assignments.userId, userId),
          eq(assignments.status, 'confirmed'),
        ),
      )
      .limit(1);

    return assignment || null;
  }

  /**
   * Updates the status of an assignment (e.g. 'confirmed', 'swapped', 'dropped').
   *
   * @param {string} userId - User identifier.
   * @param {string} shiftId - Shift identifier.
   * @param {string} status - New assignment status.
   * @returns {Promise<any | null>} Updated assignment record or null.
   */
  async updateStatus(userId: string, shiftId: string, status: string) {
    const [assignment] = await this.db
      .update(assignments)
      .set({ status } as any)
      .where(
        and(eq(assignments.shiftId, shiftId), eq(assignments.userId, userId)),
      )
      .returning();

    return assignment || null;
  }

  /**
   * Retrieves start and end timestamps of all other confirmed shifts for a user, excluding a target shift.
   * Used for double-booking collision checks and 10-hour mandatory rest gap calculations.
   *
   * @param {string} userId - User identifier.
   * @param {string} shiftIdToExclude - Identifier of the shift to exclude from the query.
   * @returns {Promise<Array<{ startTime: Date; endTime: Date }>>} Array of confirmed shift time intervals.
   */
  async getConfirmedShiftTimesForUserExcluding(
    userId: string,
    shiftIdToExclude: string,
  ) {
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
          ne(assignments.shiftId, shiftIdToExclude),
        ),
      );
  }

  /**
   * Determines whether a user has at least one confirmed shift on a given calendar day.
   * Used when evaluating consecutive work day thresholds (e.g., 6th warning or 7th day override).
   *
   * @param {string} userId - User identifier.
   * @param {Date} targetDay - Calendar date to verify.
   * @returns {Promise<boolean>} True if the user worked or is scheduled on targetDay.
   */
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
          lte(shifts.startTime, endOfDay(targetDay)),
        ),
      )
      .limit(1);

    return !!worked;
  }
}
