import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { schema } from '../schema';
import { assignments } from '../entities/assignment.entity';
import { shifts } from '../entities/shift.entity';
import { users } from '../entities/user.entity';

export class AnalyticsRepository {
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

  async getHoursDistribution(startDate: Date, endDate: Date, locationIds?: string[]) {
    let whereClause: any = eq(users.role, 'Staff');

    if (locationIds && locationIds.length > 0) {
      whereClause = and(
        whereClause,
        sql`EXISTS (
          SELECT 1 FROM ${schema.staffCertifications} sc 
          WHERE sc.user_id = ${users.id} 
          AND sc.location_id IN (${sql.join(locationIds.map(id => sql`${id}`), sql`, `)})
        )`
      );
    }

    const results = await this.db
      .select({
        userId: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        totalHours: sql<number>`CAST(COALESCE(SUM(EXTRACT(EPOCH FROM (${shifts.endTime} - ${shifts.startTime})) / 3600), 0) AS FLOAT)`,
        desiredWeeklyHours: users.desiredWeeklyHours,
      })
      .from(users)
      .leftJoin(assignments, eq(assignments.userId, users.id))
      .leftJoin(shifts, and(
        eq(assignments.shiftId, shifts.id), 
        eq(assignments.status, 'confirmed'), 
        gte(shifts.startTime, startDate), 
        lte(shifts.endTime, endDate)
      ))
      .where(whereClause)
      .groupBy(users.id)
      .orderBy(users.lastName);

    return results;
  }

  async getPremiumShiftDistribution(startDate: Date, endDate: Date, locationIds?: string[]) {
    let whereClause: any = eq(users.role, 'Staff');

    if (locationIds && locationIds.length > 0) {
      whereClause = and(
        whereClause,
        sql`EXISTS (
          SELECT 1 FROM ${schema.staffCertifications} sc 
          WHERE sc.user_id = ${users.id} 
          AND sc.location_id IN (${sql.join(locationIds.map(id => sql`${id}`), sql`, `)})
        )`
      );
    }

    const distribution = await this.db
      .select({
        userId: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        premiumShiftCount: sql<number>`CAST(COUNT(CASE WHEN ${shifts.isPremium} = true THEN 1 END) AS INTEGER)`,
      })
      .from(users)
      .leftJoin(assignments, eq(assignments.userId, users.id))
      .leftJoin(shifts, and(
        eq(assignments.shiftId, shifts.id), 
        eq(assignments.status, 'confirmed'), 
        gte(shifts.startTime, startDate), 
        lte(shifts.endTime, endDate)
      ))
      .where(whereClause)
      .groupBy(users.id)
      .orderBy(users.lastName);

    return distribution;
  }
}
