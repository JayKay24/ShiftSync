import { api } from '@/lib/api';
import {
  ShiftResponse,
  CreateShiftRequest,
  UpdateShiftRequest,
  AssignStaffRequest,
  AssignmentResult,
  AvailableStaffResponse,
  OnDutyStaffResponse,
  CursorPaginatedResponse,
  Location,
  Skill,
} from '@shiftsync/data-access';

/**
 * Shifts endpoints for schedule board retrieval, assignment actions, and duty status.
 */
export const shiftsApi = {
  /**
   * Retrieves paginated shifts matching optional date range and location filters.
   *
   * @param {Object} [params] - Query parameters.
   * @param {string} [params.start] - Start ISO date string.
   * @param {string} [params.end] - End ISO date string.
   * @param {string} [params.startDate] - Alternative start ISO date string.
   * @param {string} [params.endDate] - Alternative end ISO date string.
   * @param {string} [params.locationId] - Location identifier.
   * @param {string} [params.cursor] - Keyset pagination cursor token.
   * @param {number} [params.limit] - Page size limit.
   * @returns {Promise<import('axios').AxiosResponse<CursorPaginatedResponse<ShiftResponse>>>}
   */
  getShifts: (params?: {
    start?: string;
    end?: string;
    startDate?: string;
    endDate?: string;
    locationId?: string;
    cursor?: string;
    limit?: number;
  }) => api.get<CursorPaginatedResponse<ShiftResponse>>('/shifts', { params }),

  /**
   * Retrieves single shift details including confirmed assignments.
   *
   * @param {string} id - Shift identifier.
   * @returns {Promise<import('axios').AxiosResponse<ShiftResponse>>}
   */
  getShift: (id: string) => api.get<ShiftResponse>(`/shifts/${id}`),

  /**
   * Creates a new scheduled shift.
   *
   * @param {CreateShiftRequest} data - Shift parameters.
   * @returns {Promise<import('axios').AxiosResponse<ShiftResponse>>}
   */
  createShift: (data: CreateShiftRequest) =>
    api.post<ShiftResponse>('/shifts', data),

  /**
   * Updates an existing shift subject to 48-hour schedule lock rules.
   *
   * @param {string} id - Shift identifier.
   * @param {UpdateShiftRequest} data - Shift patch updates.
   * @returns {Promise<import('axios').AxiosResponse<ShiftResponse>>}
   */
  updateShift: (id: string, data: UpdateShiftRequest) =>
    api.patch<ShiftResponse>(`/shifts/${id}`, data),

  /**
   * Assigns a staff member to a shift with optional manager override rationale.
   *
   * @param {string} shiftId - Shift identifier.
   * @param {string} userId - Assigned staff user ID.
   * @param {string} [overrideReason] - Required justification if 7th consecutive day override.
   * @returns {Promise<import('axios').AxiosResponse<AssignmentResult>>}
   */
  assignStaff: (shiftId: string, userId: string, overrideReason?: string) =>
    api.post<AssignmentResult>(`/shifts/${shiftId}/assign`, {
      userId,
      overrideReason,
    } as AssignStaffRequest),

  /**
   * Fetches eligible staff members available to work a specific shift without compliance hard blocks.
   *
   * @param {string} shiftId - Shift identifier.
   * @returns {Promise<import('axios').AxiosResponse<AvailableStaffResponse[]>>}
   */
  getAvailableStaff: (shiftId: string) =>
    api.get<AvailableStaffResponse[]>(`/shifts/${shiftId}/available-staff`),

  /**
   * Retrieves all staff members currently clocked in and on-duty.
   *
   * @returns {Promise<import('axios').AxiosResponse<OnDutyStaffResponse[]>>}
   */
  getOnDutyNow: () => api.get<OnDutyStaffResponse[]>('/shifts/on-duty'),

  /**
   * Fetches dashboard schedule statistics for active shifts and hours.
   *
   * @returns {Promise<import('axios').AxiosResponse<{ activeShifts: number; totalHours: number; openShifts: number; unassignedShifts: number }>>}
   */
  getStats: () => api.get('/shifts/stats'),

  /**
   * Fetches available system locations.
   *
   * @returns {Promise<import('axios').AxiosResponse<Location[]>>}
   */
  getLocations: () => api.get<Location[]>('/shifts/locations'),

  /**
   * Fetches available certified skills.
   *
   * @returns {Promise<import('axios').AxiosResponse<Skill[]>>}
   */
  getSkills: () => api.get<Skill[]>('/shifts/skills'),
};
