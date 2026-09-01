import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getToken } from '@/lib/auth';
import { api } from '@/lib/api';
import LoadingSpinner from './LoadingSpinner';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const verifyAuth = async () => {
      const token = getToken();
      if (!token) {
        if (location.pathname !== '/login') {
          navigate('/login', { replace: true });
        }
        setIsLoading(false);
        return;
      }

      try {
        await api.getMe();
        setIsAuthenticated(true);
      } catch {
        if (location.pathname !== '/login') {
          navigate('/login', { replace: true });
        }
      } finally {
        setIsLoading(false);
      }
    };

    verifyAuth();
  }, [location.pathname, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isAuthenticated && location.pathname !== '/login') {
    return null;
  }

  return <>{children}</>;
}
