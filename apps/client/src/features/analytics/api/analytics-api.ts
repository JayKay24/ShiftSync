import { api } from '@/lib/api';
import {
  FairnessScoreResponse,
  HourDistributionRecord,
} from '@shiftsync/data-access';

/**
 * Schedule analytics endpoints for Fairness Index and hours distribution.
 */
export const analyticsApi = {
  /**
   * Fetches premium shift distribution and calculated Fairness Score.
   *
   * @param {Object} [params] - Query parameters.
   * @param {string} [params.startDate] - Start ISO date string.
   * @param {string} [params.endDate] - End ISO date string.
   * @returns {Promise<import('axios').AxiosResponse<FairnessScoreResponse>>}
   */
  getFairness: (params?: { startDate?: string; endDate?: string }) =>
    api.get<FairnessScoreResponse>('/analytics/fairness', { params }),

  /**
   * Fetches scheduled work hours breakdown per staff member.
   *
   * @param {Object} [params] - Query parameters.
   * @param {string} [params.startDate] - Start ISO date string.
   * @param {string} [params.endDate] - End ISO date string.
   * @returns {Promise<import('axios').AxiosResponse<HourDistributionRecord[]>>}
   */
  getDistribution: (params?: { startDate?: string; endDate?: string }) =>
    api.get<HourDistributionRecord[]>('/analytics/distribution', { params }),
};
