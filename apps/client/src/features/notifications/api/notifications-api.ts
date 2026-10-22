import { api, DEFAULT_PAGE_SIZE } from '@/lib/api';
import { NotificationListResponse } from '@shiftsync/data-access';

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
