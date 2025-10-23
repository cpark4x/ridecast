'use client';

/**
 * Auth Context
 * React Context provider for authentication
 */

import React, { createContext, useContext, useEffect } from 'react';
import { useAuthStore } from './auth-store';
import { User } from '@/lib/api/types';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const authStore = useAuthStore();

  // Refresh authentication on mount
  useEffect(() => {
    if (authStore.isAuthenticated && !authStore.user) {
      authStore.refreshAuth();
    }
  }, []);

  return (
    <AuthContext.Provider value={authStore}>
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
