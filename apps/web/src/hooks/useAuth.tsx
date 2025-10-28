import { useState, createContext, useContext, ReactNode } from 'react';
import { useQuery, useMutation } from 'react-query';
import { authAPI } from '@/services/api';
import type { User, LoginCredentials, ImpersonationContext } from '@/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  refetchUser: () => Promise<void>;
  error: string | null;
  impersonationContext: ImpersonationContext | null;
  startImpersonation: (userId: number) => Promise<void>;
  stopImpersonation: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode}) {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [impersonationContext, setImpersonationContext] = useState<ImpersonationContext | null>(null);

  // Check if user is already logged in
  const { isLoading: isLoadingProfile, refetch: refetchProfile } = useQuery(
    'profile',
    authAPI.getProfile,
    {
      enabled: !!localStorage.getItem('access_token'),
      onSuccess: (userData) => {
        setUser(userData);
        setImpersonationContext(userData.impersonation_context || null);
        setError(null);
      },
      onError: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setUser(null);
        setImpersonationContext(null);
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
      const errorData = error.response?.data;
      let errorMessage = 'Login failed';

      if (errorData) {
        // Handle different error response formats
        if (errorData.non_field_errors) {
          errorMessage = Array.isArray(errorData.non_field_errors)
            ? errorData.non_field_errors[0]
            : errorData.non_field_errors;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.email) {
          errorMessage = Array.isArray(errorData.email) ? errorData.email[0] : errorData.email;
        } else if (errorData.password) {
          errorMessage = Array.isArray(errorData.password) ? errorData.password[0] : errorData.password;
        }
      }

      // Make error message more user-friendly
      if (errorMessage === 'Invalid credentials') {
        errorMessage = 'Invalid email or password. Please try again.';
      }

      setError(errorMessage);
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

  const impersonationMutation = useMutation(authAPI.startImpersonation, {
    onSuccess: (response) => {
      localStorage.setItem('access_token', response.access);
      localStorage.setItem('refresh_token', response.refresh);
      setUser(response.user);
      setImpersonationContext(response.impersonation_context);
      setError(null);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || 'Failed to impersonate user';
      setError(errorMessage);
    },
  });

  const stopImpersonationMutation = useMutation(authAPI.stopImpersonation, {
    onSuccess: (response) => {
      localStorage.setItem('access_token', response.access);
      localStorage.setItem('refresh_token', response.refresh);
      setUser(response.user);
      setImpersonationContext(null);
      setError(null);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || 'Failed to stop impersonation';
      setError(errorMessage);
    },
  });

  const startImpersonation = async (userId: number) => {
    setError(null);
    await impersonationMutation.mutateAsync(userId);
  };

  const stopImpersonation = async () => {
    setError(null);
    await stopImpersonationMutation.mutateAsync();
  };

  const isAuthenticated = !!user;
  const isLoading = isLoadingProfile || loginMutation.isLoading || impersonationMutation.isLoading || stopImpersonationMutation.isLoading;

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
        impersonationContext,
        startImpersonation,
        stopImpersonation,
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