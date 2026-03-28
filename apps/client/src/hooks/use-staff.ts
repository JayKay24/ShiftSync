'use client';

import { useState, useCallback } from 'react';
import { api, shiftsApi } from '@/lib/api';
import { StaffMemberResponse, AssignmentResult } from '@shiftsync/data-access';

export function useStaff() {
  const [staffList, setStaffList] = useState<StaffMemberResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStaff = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get('/shifts/staff');
      setStaffList(res.data);
      return res.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch staff list');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchStaffAssignments = useCallback(async (userId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await shiftsApi.getStaffAssignments(userId);
      return res.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch staff assignments');
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
      setError(err.response?.data?.message || 'Failed to fetch your assignments');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    staffList,
    isLoading,
    error,
    fetchStaff,
    fetchStaffAssignments,
    fetchMyAssignments
  };
}
