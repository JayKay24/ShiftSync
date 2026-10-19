import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, gt, or, sql } from 'drizzle-orm';
import { schema } from '../schema';
import { staffCertifications } from '../entities/staff-certification.entity';
import { staffSkills } from '../entities/staff-skill.entity';
import { type NewUser, users } from '../entities/user.entity';
import { availability } from '../entities/availability.entity';
import {
  CursorPaginationParams,
  CursorPaginatedResponse,
  StaffMemberResponse,
} from '../api-interfaces';
import { clampLimit, decodeCursor, paginateResults } from '../pagination';

/**
 * Repository encapsulating user account management, staff certification verification,
 * location authorization (LBAC), skills validation, and availability schedules.
 */
export class UserRepository {
  /**
   * Initializes the repository with the Drizzle PostgreSQL database client.
   *
   * @param {NodePgDatabase<typeof schema>} db - Drizzle database instance aware of the ShiftSync schema.
   */
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

  /**
   * Retrieves a single user record by their unique UUID.
   *
   * @param {string} userId - User UUID.
   * @returns {Promise<typeof users.$inferSelect | null>} User record or null if not found.
   */
  async findById(userId: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return user || null;
  }

  /**
   * Retrieves a single user record by their unique email address.
   *
   * @param {string} email - User email address.
   * @returns {Promise<typeof users.$inferSelect | null>} User record or null if not found.
   */
  async findByEmail(email: string) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    return user || null;
  }

  /**
   * Retrieves a cursor-paginated list of all staff members, ordered by last name.
   * Eagerly loads certified locations and skills.
   *
   * @param {CursorPaginationParams} [pagination] - Pagination options containing cursor and limit.
   * @returns {Promise<CursorPaginatedResponse<StaffMemberResponse>>} Paginated staff collection.
   */
  async findStaff(
    pagination?: CursorPaginationParams,
  ): Promise<CursorPaginatedResponse<StaffMemberResponse>> {
    const limit = clampLimit(pagination?.limit);
    const conditions = [eq(schema.users.role, 'Staff')];

    const cursorPayload = decodeCursor(pagination?.cursor);
    if (cursorPayload) {
      conditions.push(
        or(
          gt(schema.users.lastName, cursorPayload.value),
          and(
            eq(schema.users.lastName, cursorPayload.value),
            gt(schema.users.id, cursorPayload.id),
          ),
        )!,
      );
    }

    const rows = await this.db.query.users.findMany({
      where: and(...conditions),
      columns: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        timezone: true,
        desiredWeeklyHours: true,
        role: true,
        createdAt: true,
      },
      with: {
        staffCertifications: {
          with: { location: true },
        },
        staffSkills: {
          with: { skill: true },
        },
      },
      orderBy: (users, { asc }) => [asc(users.lastName), asc(users.id)],
      limit: limit + 1,
    });

    return paginateResults(
      rows as unknown as StaffMemberResponse[],
      limit,
      (u) => u.lastName,
    );
  }

  /**
   * Retrieves a cursor-paginated list of staff members certified for one or more target locations.
   * Used for Location-Based Access Control (LBAC) so managers only view authorized staff.
   *
   * @param {string[]} locationIds - List of authorized restaurant location UUIDs.
   * @param {CursorPaginationParams} [pagination] - Pagination options.
   * @returns {Promise<CursorPaginatedResponse<StaffMemberResponse>>} Paginated staff certified for the specified locations.
   */
  async findStaffByLocations(
    locationIds: string[],
    pagination?: CursorPaginationParams,
  ): Promise<CursorPaginatedResponse<StaffMemberResponse>> {
    if (locationIds.length === 0) {
      return {
        data: [],
        nextCursor: null,
        hasMore: false,
      };
    }

    const limit = clampLimit(pagination?.limit);
    const inLocationsCondition = sql`${schema.users.id} IN (SELECT user_id FROM staff_certifications WHERE location_id IN (${sql.join(
      locationIds.map((id) => sql`${id}`),
      sql`, `,
    )}))`;
    const conditions = [eq(schema.users.role, 'Staff'), inLocationsCondition];

    const cursorPayload = decodeCursor(pagination?.cursor);
    if (cursorPayload) {
      conditions.push(
        or(
          gt(schema.users.lastName, cursorPayload.value),
          and(
            eq(schema.users.lastName, cursorPayload.value),
            gt(schema.users.id, cursorPayload.id),
          ),
        )!,
      );
    }

    const rows = await this.db.query.users.findMany({
      where: and(...conditions),
      columns: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        timezone: true,
        desiredWeeklyHours: true,
        role: true,
        createdAt: true,
      },
      with: {
        staffCertifications: {
          where: sql`${schema.staffCertifications.locationId} IN (${sql.join(
            locationIds.map((id) => sql`${id}`),
            sql`, `,
          )})`,
          with: { location: true },
        },
        staffSkills: {
          with: { skill: true },
        },
      },
      orderBy: (users, { asc }) => [asc(users.lastName), asc(users.id)],
      limit: limit + 1,
    });

    return paginateResults(
      rows as unknown as StaffMemberResponse[],
      limit,
      (u) => u.lastName,
    );
  }

  /**
   * Finds all staff members with skills, certifications, and existing assignments for a specific shift.
   *
   * @param {string} shiftId - Shift UUID.
   * @returns {Promise<any[]>} List of staff members with assignments for the shift.
   */
  async findQualifiedStaffWithAssignments(shiftId: string) {
    return this.db.query.users.findMany({
      where: eq(schema.users.role, 'Staff'),
      with: {
        staffCertifications: true,
        staffSkills: true,
        assignments: {
          where: eq(schema.assignments.shiftId, shiftId),
        },
      },
    });
  }

  /**
   * Checks whether a staff member holds an active certification for a given restaurant location.
   *
   * @param {string} userId - User UUID.
   * @param {string} locationId - Location UUID.
   * @returns {Promise<boolean>} True if the user is certified for the location, false otherwise.
   */
  async hasCertification(userId: string, locationId: string): Promise<boolean> {
    const [cert] = await this.db
      .select()
      .from(staffCertifications)
      .where(
        and(
          eq(staffCertifications.userId, userId),
          eq(staffCertifications.locationId, locationId),
        ),
      )
      .limit(1);

    return !!cert;
  }

  /**
   * Checks whether a staff member possesses a certified skill.
   *
   * @param {string} userId - User UUID.
   * @param {string} skillId - Skill UUID.
   * @returns {Promise<boolean>} True if the user possesses the certified skill, false otherwise.
   */
  async hasSkill(userId: string, skillId: string): Promise<boolean> {
    const [skill] = await this.db
      .select()
      .from(staffSkills)
      .where(
        and(eq(staffSkills.userId, userId), eq(staffSkills.skillId, skillId)),
      )
      .limit(1);

    return !!skill;
  }

  /**
   * Updates user profile fields such as name, email, or desired weekly working hours.
   *
   * @param {string} userId - User UUID.
   * @param {Partial<NewUser>} data - Updated profile fields.
   * @returns {Promise<typeof users.$inferSelect | null>} Updated user record or null if not found.
   */
  async updateUser(userId: string, data: Partial<NewUser>) {
    const [user] = await this.db
      .update(schema.users)
      .set(data)
      .where(eq(schema.users.id, userId))
      .returning();

    return user || null;
  }

  /**
   * Fetches recurring availability time blocks configured for a staff member.
   *
   * @param {string} userId - User UUID.
   * @returns {Promise<any[]>} List of availability window records (day of week, start/end times).
   */
  async getUserAvailability(userId: string) {
    return this.db
      .select()
      .from(availability)
      .where(eq(availability.userId, userId));
  }
}
