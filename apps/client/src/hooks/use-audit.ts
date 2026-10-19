'use client';

import { useState, useCallback } from 'react';
import { auditApi } from '@/lib/api';
import { AuditLogResponse } from '@shiftsync/data-access';

/**
 * Custom React hook for fetching and paginating entity-level and date-range audit logs.
 *
 * @returns {Object} Audit logs list, pagination states, loading flags, and fetch dispatchers.
 */
export function useAudit() {
  const [logs, setLogs] = useState<AuditLogResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEntityLogs = useCallback(async (type: string, id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await auditApi.getLogsByEntity(type, id);
      setLogs(res.data.data);
      setNextCursor(res.data.nextCursor);
      setHasMore(res.data.hasMore);
      return res.data.data;
    } catch (err: any) {
      const message =
        err.response?.data?.message || 'Failed to fetch audit logs';
      setError(message);
      console.error('Audit Fetch Error:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadMoreEntityLogs = useCallback(
    async (type: string, id: string) => {
      if (!nextCursor || isLoadingMore) return;
      setIsLoadingMore(true);
      setError(null);
      try {
        const res = await auditApi.getLogsByEntity(type, id, {
          cursor: nextCursor,
        });
        setLogs((prev) => [...prev, ...res.data.data]);
        setNextCursor(res.data.nextCursor);
        setHasMore(res.data.hasMore);
        return res.data.data;
      } catch (err: any) {
        const message =
          err.response?.data?.message || 'Failed to load more audit logs';
        setError(message);
        console.error('Audit Fetch More Error:', err);
        return [];
      } finally {
        setIsLoadingMore(false);
      }
    },
    [nextCursor, isLoadingMore],
  );

  const fetchLogsInRange = useCallback(
    async (startDate?: string, endDate?: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await auditApi.getLogs(
          startDate || endDate ? { startDate, endDate } : undefined,
        );
        setLogs(res.data.data);
        setNextCursor(res.data.nextCursor);
        setHasMore(res.data.hasMore);
        return res.data.data;
      } catch (err: any) {
        const message =
          err.response?.data?.message || 'Failed to fetch audit logs';
        setError(message);
        console.error('Audit Fetch Error:', err);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const loadMoreLogsInRange = useCallback(
    async (startDate?: string, endDate?: string) => {
      if (!nextCursor || isLoadingMore) return;
      setIsLoadingMore(true);
      setError(null);
      try {
        const res = await auditApi.getLogs({
          startDate,
          endDate,
          cursor: nextCursor,
        });
        setLogs((prev) => [...prev, ...res.data.data]);
        setNextCursor(res.data.nextCursor);
        setHasMore(res.data.hasMore);
        return res.data.data;
      } catch (err: any) {
        const message =
          err.response?.data?.message || 'Failed to load more audit logs';
        setError(message);
        console.error('Audit Fetch More Error:', err);
        return [];
      } finally {
        setIsLoadingMore(false);
      }
    },
    [nextCursor, isLoadingMore],
  );

  return {
    logs,
    isLoading,
    isLoadingMore,
    nextCursor,
    hasMore,
    error,
    fetchEntityLogs,
    loadMoreEntityLogs,
    fetchLogsInRange,
    loadMoreLogsInRange,
    setLogs,
  };
}
