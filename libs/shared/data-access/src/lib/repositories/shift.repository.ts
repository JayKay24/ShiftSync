import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, gte, lte } from 'drizzle-orm';
import { schema } from '../schema';
import { shifts, NewShift } from '../entities/shift.entity';

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

  async findShiftsByFilters(filters: { startDate?: Date; endDate?: Date; locationId?: string }) {
    const whereClauses = [];
    if (filters.startDate) whereClauses.push(gte(shifts.startTime, filters.startDate));
    if (filters.endDate) whereClauses.push(lte(shifts.endTime, filters.endDate));
    if (filters.locationId) whereClauses.push(eq(shifts.locationId, filters.locationId));

    return this.db.query.shifts.findMany({
      where: and(...whereClauses),
      with: {
        assignments: {
          where: eq(schema.assignments.status, 'confirmed'),
          with: { user: true },
        },
      },
      orderBy: [shifts.startTime],
    });
  }

  async createShift(newShift: NewShift) {
    const [result] = await this.db
      .insert(shifts)
      .values(newShift)
      .returning();
      
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
