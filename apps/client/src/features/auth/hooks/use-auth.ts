import { useContext } from 'react';

import { AuthContext } from '@/features/auth/context/auth-context';

/**
 * Hook to access current authentication state and actions (login, logout, active user).
 *
 * @returns {import('@/features/auth/context/auth-context').AuthContextType} Auth context value.
 * @throws {Error} If called outside of an AuthProvider.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
