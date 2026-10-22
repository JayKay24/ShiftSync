'use client';

import { useState, useCallback } from 'react';

import { shiftsApi } from '@/features/shifts/api/shifts-api';
import {
  ShiftResponse,
  CreateShiftRequest,
  UpdateShiftRequest,
  AvailableStaffResponse,
} from '@shiftsync/data-access';

/**
 * Custom React hook managing shift state, keyset pagination, creation, updates, and staff assignment.
 *
 * @returns {Object} Shifts state, loading indicators, pagination cursors, and action dispatchers.
 */
export function useShifts() {
  const [shifts, setShifts] = useState<ShiftResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchShifts = useCallback(
    async (params?: {
      start?: string;
      end?: string;
      startDate?: string;
      endDate?: string;
      locationId?: string;
      cursor?: string;
      limit?: number;
    }) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await shiftsApi.getShifts(params);
        let allShifts = res.data.data;
        let currentCursor = res.data.nextCursor;
        let currentHasMore = res.data.hasMore;

        // If fetching a bounded calendar window without explicit cursor/limit and hasMore is true, continue fetching remaining shifts for that window
        if (
          !params?.cursor &&
          !params?.limit &&
          (params?.start || params?.startDate)
        ) {
          while (currentHasMore && currentCursor) {
            const nextRes = await shiftsApi.getShifts({
              ...params,
              cursor: currentCursor,
            });
            allShifts = [...allShifts, ...nextRes.data.data];
            currentCursor = nextRes.data.nextCursor;
            currentHasMore = nextRes.data.hasMore;
          }
        }

        setShifts(allShifts);
        setNextCursor(currentCursor);
        setHasMore(currentHasMore);
        return allShifts;
      } catch (err: any) {
        const msg = err.response?.data?.message || 'Failed to fetch shifts';
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const loadMoreShifts = useCallback(
    async (params?: {
      start?: string;
      end?: string;
      startDate?: string;
      endDate?: string;
      locationId?: string;
    }) => {
      if (!nextCursor || isLoadingMore) return;
      setIsLoadingMore(true);
      setError(null);
      try {
        const res = await shiftsApi.getShifts({
          ...params,
          cursor: nextCursor,
        });
        setShifts((prev) => [...prev, ...res.data.data]);
        setNextCursor(res.data.nextCursor);
        setHasMore(res.data.hasMore);
        return res.data.data;
      } catch (err: any) {
        const msg = err.response?.data?.message || 'Failed to load more shifts';
        setError(msg);
        throw err;
      } finally {
        setIsLoadingMore(false);
      }
    },
    [nextCursor, isLoadingMore],
  );

  const createShift = async (data: CreateShiftRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await shiftsApi.createShift(data);
      return res.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create shift');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateShift = async (id: string, data: UpdateShiftRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await shiftsApi.updateShift(id, data);
      return res.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update shift');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const assignStaff = async (
    shiftId: string,
    userId: string,
    overrideReason?: string,
  ) => {
    const res = await shiftsApi.assignStaff(shiftId, userId, overrideReason);
    return res.data;
  };

  const getAvailableStaff = async (
    shiftId: string,
  ): Promise<AvailableStaffResponse[]> => {
    const res = await shiftsApi.getAvailableStaff(shiftId);
    return res.data;
  };

  return {
    shifts,
    isLoading,
    isLoadingMore,
    nextCursor,
    hasMore,
    error,
    fetchShifts,
    loadMoreShifts,
    createShift,
    updateShift,
    assignStaff,
    getAvailableStaff,
  };
}
