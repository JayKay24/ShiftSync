import { api, DEFAULT_PAGE_SIZE } from '@/lib/api';
import {
  AssignmentResult,
  CursorPaginatedResponse,
  StaffMemberResponse,
} from '@shiftsync/data-access';

/**
 * Staff management endpoints for staff directory and assignment tracking.
 */
export const staffApi = {
  /**
   * Retrieves paginated staff members for management and scheduling.
   *
   * @param {Object} [params] - Pagination options.
   * @param {string} [params.cursor] - Keyset cursor.
   * @param {number} [params.limit] - Page size.
   * @returns {Promise<import('axios').AxiosResponse<CursorPaginatedResponse<StaffMemberResponse>>>}
   */
  getStaff: (params?: { cursor?: string; limit?: number }) =>
    api.get<CursorPaginatedResponse<StaffMemberResponse>>('/shifts/staff', {
      params: { limit: DEFAULT_PAGE_SIZE, ...params },
    }),

  /**
   * Retrieves all confirmed assignments for a specific staff member.
   *
   * @param {string} userId - User identifier.
   * @returns {Promise<import('axios').AxiosResponse<AssignmentResult[]>>}
   */
  getStaffAssignments: (userId: string) =>
    api.get<AssignmentResult[]>(`/shifts/staff/${userId}/assignments`),

  /**
   * Retrieves all confirmed assignments for the logged-in staff member.
   *
   * @returns {Promise<import('axios').AxiosResponse<AssignmentResult[]>>}
   */
  getMyAssignments: () => api.get<AssignmentResult[]>('/shifts/my-assignments'),
};
