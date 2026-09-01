import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from '@/lib/types';
import { api } from '@/lib/api';
import { getToken, setToken as saveToken, removeToken as clearToken } from '@/lib/auth';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, userData?: User) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    // Initial sync read from localStorage if cached
    const saved = localStorage.getItem('study_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!getToken());
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const refreshUser = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('study_user');
      return;
    }

    try {
      const userData = await api.getMe();
      setUser(userData);
      setIsAuthenticated(true);
      localStorage.setItem('study_user', JSON.stringify(userData));
    } catch (error) {
      console.error('Failed to verify token on boot:', error);
      clearToken();
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('study_user');
    }
  }, []);

  // On initial mount only, verify auth in the background once
  useEffect(() => {
    if (getToken() && !user) {
      refreshUser();
    }
  }, [refreshUser, user]);

  const login = async (token: string, userData?: User) => {
    saveToken(token);
    setIsAuthenticated(true);
    if (userData) {
      setUser(userData);
      localStorage.setItem('study_user', JSON.stringify(userData));
    } else {
      await refreshUser();
    }
  };

  const logout = () => {
    clearToken();
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('study_user');
    api.clearCache();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
