import axios from 'axios';

import { env } from '@/config/env';
import { DEFAULT_PAGE_LIMIT } from '@shiftsync/data-access';

const API_URL = env.API_URL;

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
