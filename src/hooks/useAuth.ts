'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserProfile, UserRole } from '@/types';

export interface UseAuthReturn {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: (
    email: string,
    password: string,
    role?: UserRole
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refetchUser: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async (updateLoadingState = false) => {
    if (updateLoadingState) {
      setIsLoading(true);
      setError(null);
    }
    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      setError(null);
      if (res.ok) {
        const data = await res.json();
        if (data && data.id) {
          setUser(data);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Error in useAuth fetching user:', err);
      setUser(null);
      setError('No se pudo verificar la sesión');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const initFetch = async () => {
      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            'Cache-Control': 'no-cache',
          },
        });
        if (!active) return;
        setError(null);
        if (res.ok) {
          const data = await res.json();
          if (data && data.id) {
            setUser(data);
          } else {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        if (!active) return;
        console.error('Error in useAuth fetching user:', err);
        setUser(null);
        setError('No se pudo verificar la sesión');
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };
    initFetch();
    return () => {
      active = false;
    };
  }, []);

  const login = async (
    email: string,
    password: string,
    role: UserRole = 'tutor'
  ): Promise<{ success: boolean; error?: string }> => {
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data.error || 'Credenciales inválidas';
        setError(msg);
        return { success: false, error: msg };
      }

      await fetchUser(true);
      return { success: true };
    } catch (err) {
      console.error('Error logging in:', err);
      const msg = 'Error de red al intentar iniciar sesión';
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Error during logout:', err);
    } finally {
      setUser(null);
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    login,
    logout,
    refetchUser: () => fetchUser(true),
  };
}
