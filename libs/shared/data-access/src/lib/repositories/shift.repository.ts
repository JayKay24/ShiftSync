import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, gte, lte, gt, or } from 'drizzle-orm';
import { schema } from '../schema';
import { shifts, NewShift } from '../entities/shift.entity';
import { ShiftResponse, CursorPaginatedResponse } from '../api-interfaces';
import { clampLimit, decodeCursor, paginateResults } from '../pagination';

export class ShiftRepository {
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

  async findById(shiftId: string) {
    const [shift] = await this.db
      .select()
      .from(shifts)
      .where(eq(shifts.id, shiftId))
      .limit(1);

    return shift || null;
  }

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

  async createShift(newShift: NewShift) {
    const [result] = await this.db.insert(shifts).values(newShift).returning();

    return result;
  }

  async updateShift(shiftId: string, updates: Partial<NewShift>) {
    const [result] = await this.db
      .update(shifts)
      .set(updates)
      .where(eq(shifts.id, shiftId))
      .returning();

    return result;
  }
}
