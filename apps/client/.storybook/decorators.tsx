import type { Decorator } from '@storybook/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

import { AuthContext } from '../src/features/auth/context/auth-context';
import { NotificationContext } from '../src/features/notifications/context/notification-context';

import { mockAdminUser, mockManagerUser, mockStaffUser } from './msw-fixtures';

/**
 * Storybook decorator wrapping components in MemoryRouter and simulated
 * AuthContext and NotificationContext providers.
 *
 * @param {Function} Story - Story component render function.
 * @param {Object} context - Story context containing parameters.
 * @returns {React.JSX.Element} Decorated element.
 */
export const withAppProviders: Decorator = (Story, context) => {
  const roleParam = context.parameters.appContext?.role || 'Manager';
  const initialUser =
    context.parameters.appContext?.user !== undefined
      ? context.parameters.appContext.user
      : roleParam === 'Admin'
        ? mockAdminUser
        : roleParam === 'Staff'
          ? mockStaffUser
          : roleParam === 'none'
            ? null
            : mockManagerUser;

  const initialEntries =
    context.parameters.appContext?.initialEntries ||
    (roleParam === 'Staff'
      ? ['/dashboard/staff']
      : roleParam === 'Admin'
        ? ['/dashboard/admin/audit']
        : ['/dashboard/manager']);

  const unreadCount = context.parameters.appContext?.unreadCount ?? 2;

  const mockAuthValue = {
    user: initialUser,
    token: 'mock-storybook-jwt-token',
    isLoading: false,
    login: async () => {
      // No-op for story preview
    },
    logout: () => {
      // No-op for story preview
    },
    setUser: () => {
      // No-op for story preview
    },
  };

  const mockNotificationValue = {
    notifications: [],
    unreadCount,
    isLoading: false,
    isLoadingMore: false,
    nextCursor: null,
    hasMore: false,
    fetchNotifications: async () => {
      // No-op for story preview
    },
    loadMoreNotifications: async () => {
      // No-op for story preview
    },
    markAsRead: async () => {
      // No-op for story preview
    },
    markAllAsRead: async () => {
      // No-op for story preview
    },
    socket: null,
  };

  return (
    <MemoryRouter initialEntries={initialEntries}>
      <AuthContext.Provider value={mockAuthValue}>
        <NotificationContext.Provider value={mockNotificationValue}>
          <Story />
        </NotificationContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>
  );
};
