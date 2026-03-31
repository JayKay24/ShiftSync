import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, sql, gte, count } from 'drizzle-orm';
import { schema } from '../schema';

export class DashboardRepository {
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

  async getAdminStats() {
    const [staffCount] = await this.db
      .select({ value: count() })
      .from(schema.users)
      .where(eq(schema.users.role, 'Staff'));

    const [pendingSwapsCount] = await this.db
      .select({ value: count() })
      .from(schema.swapRequests)
      .where(eq(schema.swapRequests.status, 'pending_manager'));

    const [upcomingShiftsCount] = await this.db
      .select({ value: count() })
      .from(schema.shifts)
      .where(gte(schema.shifts.startTime, new Date()));

    return {
      totalStaff: Number(staffCount.value),
      pendingSwaps: Number(pendingSwapsCount.value),
      upcomingShifts: Number(upcomingShiftsCount.value),
    };
  }

  async getManagerStats(locationIds: string[]) {
    if (locationIds.length === 0) {
      return { totalStaff: 0, pendingSwaps: 0, upcomingShifts: 0 };
    }

    const locIdsSql = sql.join(locationIds.map(id => sql`${id}`), sql`, `);

    const staffCountWhere = and(
      eq(schema.users.role, 'Staff'),
      sql`EXISTS (
        SELECT 1 FROM ${schema.staffCertifications} sc 
        WHERE sc.user_id = ${schema.users.id} 
        AND sc.location_id IN (${locIdsSql})
      )`
    ) as any;

    const [staffCount] = await this.db
      .select({ value: count() })
      .from(schema.users)
      .where(staffCountWhere);

    const swapsWhere = and(
      eq(schema.swapRequests.status, 'pending_manager'),
      sql`EXISTS (
        SELECT 1 FROM ${schema.shifts} s 
        WHERE s.id = ${schema.swapRequests.shiftId} 
        AND s.location_id IN (${locIdsSql})
      )`
    ) as any;

    const [pendingSwapsCount] = await this.db
      .select({ value: count() })
      .from(schema.swapRequests)
      .where(swapsWhere);

    const shiftsWhere = and(
      gte(schema.shifts.startTime, new Date()),
      sql`${schema.shifts.locationId} IN (${locIdsSql})`
    ) as any;

    const [upcomingShiftsCount] = await this.db
      .select({ value: count() })
      .from(schema.shifts)
      .where(shiftsWhere);

    return {
      totalStaff: Number(staffCount.value),
      pendingSwaps: Number(pendingSwapsCount.value),
      upcomingShifts: Number(upcomingShiftsCount.value),
    };
  }
}
