import { api } from '@/lib/api';
import { SafeUser, UpdateProfileRequest } from '@shiftsync/data-access';

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
