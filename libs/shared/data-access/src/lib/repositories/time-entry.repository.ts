import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { schema } from '../schema';

/**
 * Repository managing actual clock-in/clock-out time entry records and active shifts.
 */
export class TimeEntryRepository {
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

  /**
   * Retrieves all staff members currently clocked in and actively working (clockOut IS NULL).
   *
   * @returns {Promise<any[]>} Active time entries populated with user profile and location details.
   */
  async findOnDutyStaff() {
    return this.db.query.timeEntries.findMany({
      where: sql`${schema.timeEntries.clockOut} IS NULL`,
      with: {
        user: {
          columns: { passwordHash: false },
        },
        location: true,
      },
    });
  }
}
