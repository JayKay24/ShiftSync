import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from '../database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { schema, assignments, shifts, users, HourDistributionRecord, FairnessScoreResponse } from '@shiftsync/data-access';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

@Injectable()
export class AnalyticsService {
  constructor(
    @Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>,
  ) {}

  async getHoursDistribution(startDate: Date, endDate: Date, userId: string, role: string): Promise<HourDistributionRecord[]> {
    let whereClause = eq(users.role, 'Staff');

    if (role === 'Manager') {
      const assignedLocations = await this.db.query.managerLocations.findMany({
        where: eq(schema.managerLocations.userId, userId),
      });
      const locationIds = assignedLocations.map(al => al.locationId);

      if (locationIds.length === 0) return [];

      // Filter staff who have certifications in these locations
      whereClause = and(
        whereClause,
        sql`EXISTS (
          SELECT 1 FROM ${schema.staffCertifications} sc 
          WHERE sc.user_id = ${users.id} 
          AND sc.location_id IN (${sql.join(locationIds.map(id => sql`${id}`), sql`, `)})
        )`
      ) as any;
    }

    // Get total hours per staff member in the range
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
      .leftJoin(shifts, and(eq(assignments.shiftId, shifts.id), eq(assignments.status, 'confirmed'), gte(shifts.startTime, startDate), lte(shifts.endTime, endDate)))
      .where(whereClause)
      .groupBy(users.id)
      .orderBy(users.lastName);

    return results as HourDistributionRecord[];
  }

  async getFairnessScore(startDate: Date, endDate: Date, userId: string, role: string): Promise<FairnessScoreResponse> {
    let whereClause = eq(users.role, 'Staff');

    if (role === 'Manager') {
      const assignedLocations = await this.db.query.managerLocations.findMany({
        where: eq(schema.managerLocations.userId, userId),
      });
      const locationIds = assignedLocations.map(al => al.locationId);

      if (locationIds.length === 0) return { distribution: [], periodStart: startDate, periodEnd: endDate };

      whereClause = and(
        whereClause,
        sql`EXISTS (
          SELECT 1 FROM ${schema.staffCertifications} sc 
          WHERE sc.user_id = ${users.id} 
          AND sc.location_id IN (${sql.join(locationIds.map(id => sql`${id}`), sql`, `)})
        )`
      ) as any;
    }

    // Get distribution of premium shifts per staff
    const distribution = await this.db
      .select({
        userId: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        premiumShiftCount: sql<number>`CAST(COUNT(${shifts.id}) AS INTEGER)`,
      })
      .from(users)
      .leftJoin(assignments, eq(assignments.userId, users.id))
      .leftJoin(shifts, and(eq(assignments.shiftId, shifts.id), eq(assignments.status, 'confirmed'), eq(shifts.isPremium, true), gte(shifts.startTime, startDate), lte(shifts.endTime, endDate)))
      .where(whereClause)
      .groupBy(users.id)
      .orderBy(users.lastName);

    return {
      distribution: distribution as FairnessScoreResponse['distribution'],
      periodStart: startDate,
      periodEnd: endDate,
    };
  }
}
