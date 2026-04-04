/**
 * ARCANE 2 — Auth Context
 * =======================
 * JWT Bearer authentication. Wraps entire app.
 * On mount: tries GET /api/auth/me to restore session.
 * On 401: clears token, redirects to login.
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api, setToken, clearToken, getToken, type AuthUser } from '@/lib/api';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isManager: boolean;
  login: (loginId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  const refresh = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const res = await api.auth.me();
      setUser(res.user);
    } catch {
      clearToken();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Listen for 401 events from api.ts
  useEffect(() => {
    const handler = () => {
      setUser(null);
      clearToken();
    };
    window.addEventListener('arcane:unauthorized', handler);
    return () => window.removeEventListener('arcane:unauthorized', handler);
  }, []);

  const login = useCallback(async (loginId: string, password: string) => {
    const res = await api.auth.login({ login_id: loginId, password });
    setToken(res.token);
    setUser(res.user);
  }, []);

  const logout = useCallback(async () => {
    try { await api.auth.logout(); } catch { /* ignore */ }
    clearToken();
    setUser(null);
  }, []);

  const isAuthenticated = !!user;
  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin = user?.role === 'admin' || isSuperAdmin;
  const isManager = user?.role === 'group_manager' || isAdmin;

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated, isSuperAdmin, isAdmin, isManager, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
