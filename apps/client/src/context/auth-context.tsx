'use client';

import React, { createContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AuthResponse, SafeUser } from '@shiftsync/data-access';

export interface AuthContextType {
  user: SafeUser | null;
  token: string | null;
  isLoading: boolean;
  login: (authData: AuthResponse) => void;
  logout: () => void;
  setUser: (user: SafeUser | null) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check for existing session
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = (authData: AuthResponse) => {
    setToken(authData.access_token);
    setUser(authData.user);
    localStorage.setItem('token', authData.access_token);
    localStorage.setItem('user', JSON.stringify(authData.user));
    
    // Redirect based on role
    if (authData.user.role === 'Admin' || authData.user.role === 'Manager') {
      router.push('/dashboard/manager');
    } else {
      router.push('/dashboard/staff');
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  // Basic route protection logic
  useEffect(() => {
    if (!isLoading) {
      const publicRoutes = ['/login', '/register', '/'];
      const isPublic = publicRoutes.includes(pathname);

      if (!token && !isPublic) {
        router.push('/login');
      }
    }
  }, [token, isLoading, pathname, router]);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}
