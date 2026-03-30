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
  AuditLogResponse
} from '@shiftsync/data-access';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to add Bearer token to requests
api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
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
  }
);

/**
 * Shifts API
 */
export const shiftsApi = {
  getShifts: (params?: { start?: string; end?: string; locationId?: string }) => 
    api.get<ShiftResponse[]>('/shifts', { params }),
  
  getShift: (id: string) => 
    api.get<ShiftResponse>(`/shifts/${id}`),
  
  createShift: (data: CreateShiftRequest) => 
    api.post<ShiftResponse>('/shifts', data),
  
  updateShift: (id: string, data: UpdateShiftRequest) => 
    api.patch<ShiftResponse>(`/shifts/${id}`, data),
  
  assignStaff: (shiftId: string, userId: string, overrideReason?: string) => 
    api.post<AssignmentResult>(`/shifts/${shiftId}/assign`, { userId, overrideReason } as AssignStaffRequest),
  
  getAvailableStaff: (shiftId: string) => 
    api.get<AvailableStaffResponse[]>(`/shifts/${shiftId}/available-staff`),
  
  getOnDutyNow: () => 
    api.get<OnDutyStaffResponse[]>('/shifts/on-duty'),

  getStaffAssignments: (userId: string) =>
    api.get<AssignmentResult[]>(`/shifts/staff/${userId}/assignments`),
};

/**
 * Swaps API
 */
export const swapsApi = {
  getSwaps: () => 
    api.get<SwapRequestResponse[]>('/swaps'),
  
  createRequest: (data: CreateSwapRequest) => 
    api.post<SwapRequestResponse>('/swaps/request', data),
  
  acceptRequest: (id: string) => 
    api.put<SwapRequestResponse>(`/swaps/accept/${id}`),
  
  rejectRequest: (id: string) => 
    api.put<SwapRequestResponse>(`/swaps/reject/${id}`),

  cancelRequest: (id: string) => 
    api.put<SwapRequestResponse>(`/swaps/cancel/${id}`),

  approveRequest: (id: string, data: ApproveSwapRequest) =>
    api.put<SwapRequestResponse>(`/swaps/approve/${id}`, data),
};

/**
 * Analytics API
 */
export const analyticsApi = {
  getFairness: (params?: { startDate?: string; endDate?: string }) => 
    api.get<FairnessScoreResponse>('/analytics/fairness', { params }),
  
  getDistribution: (params?: { startDate?: string; endDate?: string }) => 
    api.get<HourDistributionRecord[]>('/analytics/distribution', { params }),
};

/**
 * Audit API
 */
export const auditApi = {
  getLogs: (params?: { startDate?: string; endDate?: string }) => 
    api.get<AuditLogResponse[]>('/audit', { params }),
  
  getLogsByEntity: (type: string, id: string) => 
    api.get<AuditLogResponse[]>(`/audit/entity/${type}/${id}`),
};

/**
 * Notifications API
 */
export const notificationsApi = {
  getNotifications: () => 
    api.get<NotificationListResponse>('/notifications'),
  
  markRead: (id: string) => 
    api.post(`/notifications/${id}/read`),
};

/**
 * Users API
 */
export const usersApi = {
  updateProfile: (data: UpdateProfileRequest) => 
    api.patch<SafeUser>('/users/profile', data),
};

/**
 * Auth API
 */
export const authApi = {
  login: (credentials: LoginRequest) => 
    api.post<AuthResponse>('/auth/login', credentials),
};
