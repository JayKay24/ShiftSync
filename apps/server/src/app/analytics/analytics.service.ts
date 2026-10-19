import { Injectable } from '@nestjs/common';
import {
  AnalyticsRepository,
  LocationRepository,
  HourDistributionRecord,
  FairnessScoreResponse,
} from '@shiftsync/data-access';

/**
 * Service providing scheduling analytics, hours distribution, and fairness index calculations.
 */
@Injectable()
export class AnalyticsService {
  constructor(
    private analyticsRepo: AnalyticsRepository,
    private locationRepo: LocationRepository,
  ) {}

  /**
   * Retrieves aggregated work hours per staff member within a date range, scoped to manager locations.
   *
   * @param {Date} startDate - Start of reporting window.
   * @param {Date} endDate - End of reporting window.
   * @param {string} userId - Requesting user identifier.
   * @param {string} role - Requesting user role ('Admin' or 'Manager').
   * @returns {Promise<HourDistributionRecord[]>} Staff hours distribution records.
   */
  async getHoursDistribution(
    startDate: Date,
    endDate: Date,
    userId: string,
    role: string,
  ): Promise<HourDistributionRecord[]> {
    let locationIds: string[] | undefined;

    if (role === 'Manager') {
      const assignedLocations =
        await this.locationRepo.findAssignedToManager(userId);
      locationIds = assignedLocations.map((al) => al.id);

      if (locationIds.length === 0) return [];
    }

    const results = await this.analyticsRepo.getHoursDistribution(
      startDate,
      endDate,
      locationIds,
    );

    return results as HourDistributionRecord[];
  }

  /**
   * Evaluates the equitable distribution of premium shifts (Friday/Saturday evenings) across staff members.
   * Computes a normalized Fairness Score from 0 to 100 based on the Coefficient of Variation.
   *
   * @param {Date} startDate - Start of reporting period.
   * @param {Date} endDate - End of reporting period.
   * @param {string} userId - Requesting user identifier.
   * @param {string} role - Requesting user role ('Admin' or 'Manager').
   * @returns {Promise<FairnessScoreResponse>} Fairness score and distribution breakdown.
   */
  async getFairnessScore(
    startDate: Date,
    endDate: Date,
    userId: string,
    role: string,
  ): Promise<FairnessScoreResponse> {
    let locationIds: string[] | undefined;

    if (role === 'Manager') {
      const assignedLocations =
        await this.locationRepo.findAssignedToManager(userId);
      locationIds = assignedLocations.map((al) => al.id);

      if (locationIds.length === 0)
        return {
          distribution: [],
          periodStart: startDate,
          periodEnd: endDate,
          overallScore: 100,
        };
    }

    const distribution = await this.analyticsRepo.getPremiumShiftDistribution(
      startDate,
      endDate,
      locationIds,
    );

    const counts = distribution.map((d) => Number(d.premiumShiftCount));
    const overallScore = this.calculateFairnessIndex(counts);

    return {
      distribution: distribution.map((d) => ({
        ...d,
        premiumShiftCount: Number(d.premiumShiftCount),
      })),
      periodStart: startDate,
      periodEnd: endDate,
      overallScore: Math.round(overallScore * 100),
    };
  }

  /**
   * Calculates a normalized fairness index from 0 to 1 based on the Coefficient of Variation (CV).
   * 1.0 = Perfect fairness (equal distribution)
   * 0.0 = High inequality
   *
   * @param {number[]} counts - Array of premium shift counts per staff member.
   * @returns {number} Fairness score between 0.0 and 1.0.
   */
  private calculateFairnessIndex(counts: number[]): number {
    if (counts.length <= 1) return 1.0;

    const sum = counts.reduce((a, b) => a + b, 0);
    if (sum === 0) return 1.0; // Everyone has 0, perfectly fair.

    const mean = sum / counts.length;
    const variance =
      counts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / counts.length;
    const stdDev = Math.sqrt(variance);

    // Coefficient of Variation (CV) = stdDev / mean
    // A CV of 0 means perfect equality.
    // We normalize this to a score where 1 is perfect.
    // We cap CV at 1 for the score calculation to avoid negative results in extreme cases.
    const cv = stdDev / mean;
    return Math.max(0, 1 - cv);
  }
}
