import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { schema } from '../schema';

export class TimeEntryRepository {
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

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
