'use client';

import { useState, useCallback } from 'react';
import { shiftsApi } from '@/lib/api';
import { 
  ShiftResponse, 
  CreateShiftRequest, 
  UpdateShiftRequest, 
  AssignmentResult,
  AvailableStaffResponse 
} from '@shiftsync/data-access';

export function useShifts() {
  const [shifts, setShifts] = useState<ShiftResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchShifts = useCallback(async (params?: { start?: string; end?: string; locationId?: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await shiftsApi.getShifts(params);
      setShifts(res.data);
      return res.data;
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to fetch shifts';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  const assignStaff = async (shiftId: string, userId: string, overrideReason?: string) => {
    const res = await shiftsApi.assignStaff(shiftId, userId, overrideReason);
    return res.data;
  };

  const getAvailableStaff = async (shiftId: string): Promise<AvailableStaffResponse[]> => {
    const res = await shiftsApi.getAvailableStaff(shiftId);
    return res.data;
  };

  return {
    shifts,
    isLoading,
    error,
    fetchShifts,
    createShift,
    updateShift,
    assignStaff,
    getAvailableStaff
  };
}
