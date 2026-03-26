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

  async getHoursDistribution(startDate: Date, endDate: Date): Promise<HourDistributionRecord[]> {
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
      .where(eq(users.role, 'Staff'))
      .groupBy(users.id)
      .orderBy(users.lastName);

    return results as HourDistributionRecord[];
  }

  async getFairnessScore(startDate: Date, endDate: Date): Promise<FairnessScoreResponse> {
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
      .where(eq(users.role, 'Staff'))
      .groupBy(users.id)
      .orderBy(users.lastName);

    return {
      distribution: distribution as FairnessScoreResponse['distribution'],
      periodStart: startDate,
      periodEnd: endDate,
    };
  }
}
