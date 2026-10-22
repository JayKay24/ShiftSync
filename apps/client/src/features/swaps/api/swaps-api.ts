import { api, DEFAULT_PAGE_SIZE } from '@/lib/api';
import {
  CursorPaginatedResponse,
  SwapRequestResponse,
  CreateSwapRequest,
  ApproveSwapRequest,
} from '@shiftsync/data-access';

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
