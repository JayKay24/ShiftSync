import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, gte, lte, gt, or } from 'drizzle-orm';
import { schema } from '../schema';
import { shifts, NewShift } from '../entities/shift.entity';
import { ShiftResponse, CursorPaginatedResponse } from '../api-interfaces';
import { clampLimit, decodeCursor, paginateResults } from '../pagination';

/**
 * Repository encapsulating database operations for shifts, including eager-loaded
 * relation queries, cursor-paginated filtering, and lifecycle state mutations.
 */
export class ShiftRepository {
  /**
   * Initializes the repository with the Drizzle PostgreSQL database client.
   *
   * @param {NodePgDatabase<typeof schema>} db - Drizzle database instance aware of the ShiftSync schema.
   */
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

  /**
   * Retrieves a single shift by its unique UUID.
   *
   * @param {string} shiftId - Shift UUID.
   * @returns {Promise<typeof shifts.$inferSelect | null>} Found shift record or null if not found.
   */
  async findById(shiftId: string) {
    const [shift] = await this.db
      .select()
      .from(shifts)
      .where(eq(shifts.id, shiftId))
      .limit(1);

    return shift || null;
  }

  /**
   * Retrieves a single shift by ID with its confirmed assignments eager-loaded.
   *
   * @param {string} id - Shift UUID.
   * @returns {Promise<any | null>} Shift record with confirmed assignments, or null if not found.
   */
  async findByIdWithAssignments(id: string) {
    const shift = await this.db.query.shifts.findFirst({
      where: eq(shifts.id, id),
      with: {
        assignments: {
          where: eq(schema.assignments.status, 'confirmed'),
        },
      },
    });
    return shift || null;
  }

  /**
   * Queries shifts matching optional date range and location criteria with cursor-based pagination.
   * Eagerly loads confirmed assignments, location details, and required skill profiles.
   *
   * @param {Object} filters - Search and pagination options.
   * @param {Date} [filters.startDate] - Earliest shift start time filter.
   * @param {Date} [filters.endDate] - Latest shift end time filter.
   * @param {string} [filters.locationId] - Location UUID filter.
   * @param {string} [filters.cursor] - Opaque cursor representing the pagination starting point.
   * @param {number} [filters.limit] - Page size limit (default 100, max 500).
   * @returns {Promise<CursorPaginatedResponse<ShiftResponse>>} Paginated shifts response with next cursor.
   */
  async findShiftsByFilters(filters: {
    startDate?: Date;
    endDate?: Date;
    locationId?: string;
    cursor?: string;
    limit?: number;
  }): Promise<CursorPaginatedResponse<ShiftResponse>> {
    const limit = clampLimit(filters.limit, 100, 500);
    const whereClauses = [];
    if (filters.startDate)
      whereClauses.push(gte(shifts.startTime, filters.startDate));
    if (filters.endDate)
      whereClauses.push(lte(shifts.endTime, filters.endDate));
    if (filters.locationId)
      whereClauses.push(eq(shifts.locationId, filters.locationId));

    const cursorPayload = decodeCursor(filters.cursor);
    if (cursorPayload) {
      const cursorDate = new Date(cursorPayload.value);
      whereClauses.push(
        or(
          gt(shifts.startTime, cursorDate),
          and(
            eq(shifts.startTime, cursorDate),
            gt(shifts.id, cursorPayload.id),
          ),
        )!,
      );
    }

    const rows = await this.db.query.shifts.findMany({
      where: and(...whereClauses),
      with: {
        assignments: {
          where: eq(schema.assignments.status, 'confirmed'),
          with: { user: true },
        },
        location: true,
        requiredSkill: true,
      },
      orderBy: (shifts, { asc }) => [asc(shifts.startTime), asc(shifts.id)],
      limit: limit + 1,
    });

    return paginateResults(
      rows as unknown as ShiftResponse[],
      limit,
      (s) => s.startTime,
    );
  }

  /**
   * Persists a new shift record to the database.
   *
   * @param {NewShift} newShift - Insert model containing location, required skill, start/end times, and headcount.
   * @returns {Promise<typeof shifts.$inferSelect>} Newly created shift record.
   */
  async createShift(newShift: NewShift) {
    const [result] = await this.db.insert(shifts).values(newShift).returning();

    return result;
  }

  /**
   * Updates fields on an existing shift record.
   *
   * @param {string} shiftId - Shift UUID.
   * @param {Partial<NewShift>} updates - Key-value map of fields to update.
   * @returns {Promise<typeof shifts.$inferSelect>} Updated shift record.
   */
  async updateShift(shiftId: string, updates: Partial<NewShift>) {
    const [result] = await this.db
      .update(shifts)
      .set(updates)
      .where(eq(shifts.id, shiftId))
      .returning();

    return result;
  }
}
