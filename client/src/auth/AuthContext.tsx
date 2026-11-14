import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '../lib/api';
import type { AdminUser } from '../lib/types';

const TOKEN_KEY = 'credvault.admin.token';
const ADMIN_KEY = 'credvault.admin.profile';

interface AuthContextValue {
  token: string | null;
  admin: AdminUser | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredAdmin(): AdminUser | null {
  try {
    const raw = localStorage.getItem(ADMIN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdminUser;
    return parsed && typeof parsed.email === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [admin, setAdmin] = useState<AdminUser | null>(() => readStoredAdmin());
  const [ready, setReady] = useState(false);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ADMIN_KEY);
    setToken(null);
    setAdmin(null);
  }, []);

  // Validate a stored token against the backend once on load.
  useEffect(() => {
    let cancelled = false;

    async function validate() {
      if (!token) {
        setReady(true);
        return;
      }
      try {
        const result = await api.me(token);
        if (!cancelled) {
          setAdmin(result.admin);
          localStorage.setItem(ADMIN_KEY, JSON.stringify(result.admin));
        }
      } catch {
        if (!cancelled) logout();
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    void validate();
    return () => {
      cancelled = true;
    };
  }, [token, logout]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.login(email, password);
    localStorage.setItem(TOKEN_KEY, result.token);
    localStorage.setItem(ADMIN_KEY, JSON.stringify(result.admin));
    setToken(result.token);
    setAdmin(result.admin);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ token, admin, ready, login, logout }),
    [token, admin, ready, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside an AuthProvider');
  return context;
}
