'use client';

import { useState, useCallback } from 'react';
import { swapsApi } from '@/lib/api';
import { SwapRequestResponse, CreateSwapRequest } from '@shiftsync/data-access';

export function useSwaps() {
  const [swaps, setSwaps] = useState<SwapRequestResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSwaps = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await swapsApi.getSwaps();
      setSwaps(res.data);
      return res.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch swap requests');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createRequest = async (data: CreateSwapRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await swapsApi.createRequest(data);
      await fetchSwaps();
      return res.data;
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to create swap request';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const acceptRequest = async (id: string) => {
    try {
      await swapsApi.acceptRequest(id);
      await fetchSwaps();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to accept swap');
      throw err;
    }
  };

  const rejectRequest = async (id: string) => {
    try {
      await swapsApi.rejectRequest(id);
      await fetchSwaps();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reject swap');
      throw err;
    }
  };

  const cancelRequest = async (id: string) => {
    try {
      await swapsApi.cancelRequest(id);
      await fetchSwaps();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to cancel swap');
      throw err;
    }
  };

  return {
    swaps,
    isLoading,
    error,
    fetchSwaps,
    createRequest,
    acceptRequest,
    rejectRequest,
    cancelRequest
  };
}
