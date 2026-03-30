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

      whereClause = and(
        whereClause,
        sql`EXISTS (
          SELECT 1 FROM ${schema.staffCertifications} sc 
          WHERE sc.user_id = ${users.id} 
          AND sc.location_id IN (${sql.join(locationIds.map(id => sql`${id}`), sql`, `)})
        )`
      ) as any;
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

    return results as HourDistributionRecord[];
  }

  async getFairnessScore(startDate: Date, endDate: Date, userId: string, role: string): Promise<FairnessScoreResponse> {
    let whereClause = eq(users.role, 'Staff');

    if (role === 'Manager') {
      const assignedLocations = await this.db.query.managerLocations.findMany({
        where: eq(schema.managerLocations.userId, userId),
      });
      const locationIds = assignedLocations.map(al => al.locationId);

      if (locationIds.length === 0) return { distribution: [], periodStart: startDate, periodEnd: endDate, overallScore: 100 };

      whereClause = and(
        whereClause,
        sql`EXISTS (
          SELECT 1 FROM ${schema.staffCertifications} sc 
          WHERE sc.user_id = ${users.id} 
          AND sc.location_id IN (${sql.join(locationIds.map(id => sql`${id}`), sql`, `)})
        )`
      ) as any;
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

    const counts = distribution.map(d => Number(d.premiumShiftCount));
    const overallScore = this.calculateFairnessIndex(counts);

    return {
      distribution: distribution.map(d => ({
        ...d,
        premiumShiftCount: Number(d.premiumShiftCount)
      })),
      periodStart: startDate,
      periodEnd: endDate,
      overallScore: Math.round(overallScore * 100)
    };
  }

  /**
   * Calculates a fairness index from 0 to 1 based on Coefficient of Variation.
   * 1.0 = Perfect fairness (equal distribution)
   * 0.0 = High inequality
   */
  private calculateFairnessIndex(counts: number[]): number {
    if (counts.length <= 1) return 1.0;
    
    const sum = counts.reduce((a, b) => a + b, 0);
    if (sum === 0) return 1.0; // Everyone has 0, perfectly fair.

    const mean = sum / counts.length;
    const variance = counts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / counts.length;
    const stdDev = Math.sqrt(variance);

    // Coefficient of Variation (CV) = stdDev / mean
    // A CV of 0 means perfect equality.
    // We normalize this to a score where 1 is perfect.
    // We cap CV at 1 for the score calculation to avoid negative results in extreme cases.
    const cv = stdDev / mean;
    return Math.max(0, 1 - cv);
  }
}
