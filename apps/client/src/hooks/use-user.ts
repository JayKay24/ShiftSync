'use client';

import { useState } from 'react';
import { usersApi } from '@/lib/api';
import { UpdateProfileRequest } from '@shiftsync/data-access';
import { useAuth } from './use-auth';

export function useUser() {
  const { setUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateProfile = async (data: UpdateProfileRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await usersApi.updateProfile(data);
      const updatedUser = res.data;
      
      // Update global auth state
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      return updatedUser;
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to update profile';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    updateProfile,
    isLoading,
    error
  };
}
