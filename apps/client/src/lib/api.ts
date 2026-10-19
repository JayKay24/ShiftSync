import axios from 'axios';
import {
  AuthResponse,
  ShiftResponse,
  AssignmentResult,
  AvailableStaffResponse,
  OnDutyStaffResponse,
  FairnessScoreResponse,
  HourDistributionRecord,
  NotificationListResponse,
  CreateShiftRequest,
  UpdateShiftRequest,
  AssignStaffRequest,
  SwapRequestResponse,
  CreateSwapRequest,
  LoginRequest,
  ApproveSwapRequest,
  UpdateProfileRequest,
  SafeUser,
  AuditLogResponse,
  CursorPaginatedResponse,
  StaffMemberResponse,
  DEFAULT_PAGE_LIMIT,
} from '@shiftsync/data-access';

const API_URL =
  (import.meta.env?.VITE_API_URL as string) || 'http://localhost:3001/api';

/** Default page size for cursor-paginated list views ('Load More'). */
export const DEFAULT_PAGE_SIZE = DEFAULT_PAGE_LIMIT;

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to add Bearer token to requests
api.interceptors.request.use((config) => {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor to handle unauthorized errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    return Promise.reject(error);
  },
);

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
   * Retrieves all confirmed assignments for a specific staff member.
   *
   * @param {string} userId - User identifier.
   * @returns {Promise<import('axios').AxiosResponse<AssignmentResult[]>>}
   */
  getStaffAssignments: (userId: string) =>
    api.get<AssignmentResult[]>(`/shifts/staff/${userId}/assignments`),
};

/**
 * Shift swap endpoints for creating, accepting, declining, and manager approvals.
 */
export const swapsApi = {
  /**
   * Retrieves paginated swap and drop requests for the current user or manager.
   *
   * @param {Object} [params] - Pagination options.
   * @param {string} [params.cursor] - Keyset cursor.
   * @param {number} [params.limit] - Page size.
   * @returns {Promise<import('axios').AxiosResponse<CursorPaginatedResponse<SwapRequestResponse>>>}
   */
  getSwaps: (params?: { cursor?: string; limit?: number }) =>
    api.get<CursorPaginatedResponse<SwapRequestResponse>>('/swaps', {
      params: { limit: DEFAULT_PAGE_SIZE, ...params },
    }),

  /**
   * Submits a new shift swap or drop request.
   *
   * @param {CreateSwapRequest} data - Request payload.
   * @returns {Promise<import('axios').AxiosResponse<SwapRequestResponse>>}
   */
  createRequest: (data: CreateSwapRequest) =>
    api.post<SwapRequestResponse>('/swaps/request', data),

  /**
   * Accepts a peer-to-peer swap request as the designated recipient.
   *
   * @param {string} id - Swap request identifier.
   * @returns {Promise<import('axios').AxiosResponse<SwapRequestResponse>>}
   */
  acceptRequest: (id: string) =>
    api.put<SwapRequestResponse>(`/swaps/accept/${id}`),

  /**
   * Declines a peer-to-peer swap request.
   *
   * @param {string} id - Swap request identifier.
   * @returns {Promise<import('axios').AxiosResponse<SwapRequestResponse>>}
   */
  rejectRequest: (id: string) =>
    api.put<SwapRequestResponse>(`/swaps/reject/${id}`),

  /**
   * Cancels a pending swap request initiated by the current user.
   *
   * @param {string} id - Swap request identifier.
   * @returns {Promise<import('axios').AxiosResponse<SwapRequestResponse>>}
   */
  cancelRequest: (id: string) =>
    api.put<SwapRequestResponse>(`/swaps/cancel/${id}`),

  /**
   * Approves or rejects a shift swap request as a manager.
   *
   * @param {string} id - Swap request identifier.
   * @param {ApproveSwapRequest} data - Decision payload (approve boolean).
   * @returns {Promise<import('axios').AxiosResponse<SwapRequestResponse>>}
   */
  approveRequest: (id: string, data: ApproveSwapRequest) =>
    api.put<SwapRequestResponse>(`/swaps/approve/${id}`, data),
};

/**
 * Schedule analytics endpoints for Fairness Index and hours distribution.
 */
export const analyticsApi = {
  /**
   * Fetches premium shift distribution and calculated Fairness Score.
   *
   * @param {Object} [params] - Query parameters.
   * @param {string} [params.startDate] - Start ISO date string.
   * @param {string} [params.endDate] - End ISO date string.
   * @returns {Promise<import('axios').AxiosResponse<FairnessScoreResponse>>}
   */
  getFairness: (params?: { startDate?: string; endDate?: string }) =>
    api.get<FairnessScoreResponse>('/analytics/fairness', { params }),

  /**
   * Fetches scheduled work hours breakdown per staff member.
   *
   * @param {Object} [params] - Query parameters.
   * @param {string} [params.startDate] - Start ISO date string.
   * @param {string} [params.endDate] - End ISO date string.
   * @returns {Promise<import('axios').AxiosResponse<HourDistributionRecord[]>>}
   */
  getDistribution: (params?: { startDate?: string; endDate?: string }) =>
    api.get<HourDistributionRecord[]>('/analytics/distribution', { params }),
};

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

/**
 * Notification endpoints for user alerts and read receipt receipts.
 */
export const notificationsApi = {
  /**
   * Retrieves paginated notifications for the logged-in user.
   *
   * @param {Object} [params] - Pagination parameters.
   * @param {string} [params.cursor] - Keyset cursor.
   * @param {number} [params.limit] - Page size.
   * @returns {Promise<import('axios').AxiosResponse<NotificationListResponse>>}
   */
  getNotifications: (params?: { cursor?: string; limit?: number }) =>
    api.get<NotificationListResponse>('/notifications', {
      params: { limit: DEFAULT_PAGE_SIZE, ...params },
    }),

  /**
   * Marks a specific notification as read.
   *
   * @param {string} id - Notification identifier.
   * @returns {Promise<import('axios').AxiosResponse<any>>}
   */
  markRead: (id: string) => api.post(`/notifications/${id}/read`),
};

/**
 * User endpoints for profile and preferences management.
 */
export const usersApi = {
  /**
   * Updates current user's profile preferences (e.g., desired weekly hours, timezone).
   *
   * @param {UpdateProfileRequest} data - Profile updates.
   * @returns {Promise<import('axios').AxiosResponse<SafeUser>>}
   */
  updateProfile: (data: UpdateProfileRequest) =>
    api.patch<SafeUser>('/users/profile', data),
};

/**
 * Authentication endpoints for user login.
 */
export const authApi = {
  /**
   * Authenticates user credentials and issues a JWT token.
   *
   * @param {LoginRequest} credentials - Email and password.
   * @returns {Promise<import('axios').AxiosResponse<AuthResponse>>}
   */
  login: (credentials: LoginRequest) =>
    api.post<AuthResponse>('/auth/login', credentials),
};
