import { api, DEFAULT_PAGE_SIZE } from '@/lib/api';
import {
  AuditLogResponse,
  CursorPaginatedResponse,
} from '@shiftsync/data-access';

/**
 * Schedule audit trail endpoints for viewing system change logs.
 */
export const auditApi = {
  /**
   * Retrieves paginated system-wide audit logs within an optional date range.
   *
   * @param {Object} [params] - Query and pagination parameters.
   * @param {string} [params.startDate] - Start ISO date string.
   * @param {string} [params.endDate] - End ISO date string.
   * @param {string} [params.cursor] - Keyset cursor.
   * @param {number} [params.limit] - Page size.
   * @returns {Promise<import('axios').AxiosResponse<CursorPaginatedResponse<AuditLogResponse>>>}
   */
  getLogs: (params?: {
    startDate?: string;
    endDate?: string;
    cursor?: string;
    limit?: number;
  }) =>
    api.get<CursorPaginatedResponse<AuditLogResponse>>('/audit', {
      params: { limit: DEFAULT_PAGE_SIZE, ...params },
    }),

  /**
   * Retrieves paginated chronological audit logs for a specific entity.
   *
   * @param {string} type - Entity type (e.g. 'shift', 'assignment').
   * @param {string} id - Entity identifier.
   * @param {Object} [params] - Pagination parameters.
   * @param {string} [params.cursor] - Keyset cursor.
   * @param {number} [params.limit] - Page size.
   * @returns {Promise<import('axios').AxiosResponse<CursorPaginatedResponse<AuditLogResponse>>>}
   */
  getLogsByEntity: (
    type: string,
    id: string,
    params?: { cursor?: string; limit?: number },
  ) =>
    api.get<CursorPaginatedResponse<AuditLogResponse>>(
      `/audit/entity/${type}/${id}`,
      { params: { limit: DEFAULT_PAGE_SIZE, ...params } },
    ),
};
