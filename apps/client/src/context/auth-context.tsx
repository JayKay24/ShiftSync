import React, { createContext, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SafeUser, LoginRequest } from '@shiftsync/data-access';
import { authApi } from '@/lib/api';

/**
 * Contract representing client authentication state and actions.
 */
export interface AuthContextType {
  /** Authenticated user profile, or null if guest. */
  user: SafeUser | null;
  /** JWT bearer token, or null if unauthenticated. */
  token: string | null;
  /** Flag indicating initial session restoration from local storage. */
  isLoading: boolean;
  /** Authenticates user with credentials and performs role-based redirect. */
  login: (credentials: LoginRequest) => Promise<void>;
  /** Clears local session and navigates to login screen. */
  logout: () => void;
  /** Updates the local user state. */
  setUser: (user: SafeUser | null) => void;
}

/**
 * React context storing active authentication state.
 */
export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

/**
 * Provider component wrapping application subtree with authentication state and route protection.
 *
 * @param {Object} props - Component props.
 * @param {React.ReactNode} props.children - Child elements.
 * @returns {React.JSX.Element} Context provider element.
 */
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
