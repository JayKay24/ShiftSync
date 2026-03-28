'use client';

import { useState, useCallback } from 'react';
import { analyticsApi } from '@/lib/api';
import { FairnessScoreResponse, HourDistributionRecord } from '@shiftsync/data-access';

export function useAnalytics() {
  const [fairnessData, setFairnessData] = useState<FairnessScoreResponse | null>(null);
  const [distributionData, setDistributionData] = useState<HourDistributionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFairness = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await analyticsApi.getFairness();
      setFairnessData(res.data);
      return res.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch fairness data');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchDistribution = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await analyticsApi.getDistribution();
      setDistributionData(res.data);
      return res.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch distribution data');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    fairnessData,
    distributionData,
    isLoading,
    error,
    fetchFairness,
    fetchDistribution
  };
}
