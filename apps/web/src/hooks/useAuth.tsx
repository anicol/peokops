import { useState, createContext, useContext, ReactNode } from 'react';
import { useQuery, useMutation } from 'react-query';
import { authAPI } from '@/services/api';
import type { User, LoginCredentials } from '@/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  refetchUser: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if user is already logged in
  const { isLoading: isLoadingProfile, refetch: refetchProfile } = useQuery(
    'profile',
    authAPI.getProfile,
    {
      enabled: !!localStorage.getItem('access_token'),
      onSuccess: (userData) => {
        setUser(userData);
        setError(null);
      },
      onError: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setUser(null);
      },
      retry: false,
    }
  );

  const loginMutation = useMutation(authAPI.login, {
    onSuccess: (response) => {
      localStorage.setItem('access_token', response.access);
      localStorage.setItem('refresh_token', response.refresh);
      setUser(response.user);
      setError(null);
    },
    onError: (error: any) => {
      setError(error.response?.data?.detail || 'Login failed');
    },
  });

  const login = async (credentials: LoginCredentials) => {
    setError(null);
    await loginMutation.mutateAsync(credentials);
  };

  const logout = () => {
    authAPI.logout();
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    setError(null);
  };

  const refetchUser = async () => {
    await refetchProfile();
  };

  const isAuthenticated = !!user;
  const isLoading = isLoadingProfile || loginMutation.isLoading;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        login,
        logout,
        refetchUser,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}