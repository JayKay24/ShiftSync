'use client';

import { useState, useCallback } from 'react';
import { api, shiftsApi } from '@/lib/api';
import { StaffMemberResponse, AssignmentResult } from '@shiftsync/data-access';

export function useStaff() {
  const [staffList, setStaffList] = useState<StaffMemberResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStaff = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await shiftsApi.getStaff();
      setStaffList(res.data.data);
      setNextCursor(res.data.nextCursor);
      setHasMore(res.data.hasMore);
      return res.data.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch staff list');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadMoreStaff = useCallback(async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    setError(null);
    try {
      const res = await shiftsApi.getStaff({ cursor: nextCursor });
      setStaffList((prev) => [...prev, ...res.data.data]);
      setNextCursor(res.data.nextCursor);
      setHasMore(res.data.hasMore);
      return res.data.data;
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Failed to load more staff members',
      );
      throw err;
    } finally {
      setIsLoadingMore(false);
    }
  }, [nextCursor, isLoadingMore]);

  const fetchStaffAssignments = useCallback(async (userId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await shiftsApi.getStaffAssignments(userId);
      return res.data;
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Failed to fetch staff assignments',
      );
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchMyAssignments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get('/shifts/my-assignments');
      return res.data;
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Failed to fetch your assignments',
      );
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    staffList,
    isLoading,
    isLoadingMore,
    nextCursor,
    hasMore,
    error,
    fetchStaff,
    loadMoreStaff,
    fetchStaffAssignments,
    fetchMyAssignments,
  };
}
