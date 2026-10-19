import React, { createContext, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SafeUser, LoginRequest } from '@shiftsync/data-access';
import { authApi } from '@/lib/api';

export interface AuthContextType {
  user: SafeUser | null;
  token: string | null;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  setUser: (user: SafeUser | null) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;

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

  const login = async (credentials: LoginRequest) => {
    const response = await authApi.login(credentials);
    const authData = response.data;
    setToken(authData.access_token);
    setUser(authData.user);
    localStorage.setItem('token', authData.access_token);
    localStorage.setItem('user', JSON.stringify(authData.user));

    // Redirect based on role
    if (authData.user.role === 'Admin' || authData.user.role === 'Manager') {
      navigate('/dashboard/manager');
    } else {
      navigate('/dashboard/staff');
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Basic route protection logic
  useEffect(() => {
    if (!isLoading) {
      const publicRoutes = ['/login', '/register', '/'];
      const isPublic = publicRoutes.includes(pathname);

      if (!token && !isPublic) {
        navigate('/login');
      }
    }
  }, [token, isLoading, pathname, navigate]);

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, login, logout, setUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}
