import { api } from '@/lib/api';
import { AuthResponse, LoginRequest } from '@shiftsync/data-access';

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
