'use client';

import { useState, useCallback } from 'react';
import { auditApi } from '@/lib/api';
import { AuditLogResponse } from '@shiftsync/data-access';

export function useAudit() {
  const [logs, setLogs] = useState<AuditLogResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEntityLogs = useCallback(async (type: string, id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await auditApi.getLogsByEntity(type, id);
      setLogs(res.data);
      return res.data;
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to fetch audit logs';
      setError(message);
      console.error('Audit Fetch Error:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchLogsInRange = useCallback(async (startDate?: string, endDate?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await auditApi.getLogs(startDate || endDate ? { startDate, endDate } : undefined);
      setLogs(res.data);
      return res.data;
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to fetch audit logs';
      setError(message);
      console.error('Audit Fetch Error:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    logs,
    isLoading,
    error,
    fetchEntityLogs,
    fetchLogsInRange,
    setLogs,
  };
}
