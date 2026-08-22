import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  storeToken,
  storeUser,
  getToken,
  getStoredUser,
  clearAuthStorage,
  tokenExpiresIn,
} from '../utils/security';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  _id?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  role: 'SYSTEM_ADMIN' | 'ADMIN' | 'TRAINER' | 'STAFF' | 'MEMBER' | string;
  isSystemAdmin?: boolean;
  bio?: string;
  gender?: string;
  dateOfBirth?: string;
  /** Cloudinary secure_url for the profile avatar */
  profileImage?: string | null;
  /** Cloudinary public_id for clean deletion/replacement */
  profileImagePublicId?: string | null;
  /** Alias: same as profileImage (Cloudinary secure_url) */
  avatarUrl?: string | null;
  /** Alias: same as profileImagePublicId */
  avatarPublicId?: string | null;
  weight?: number;
  height?: number;
  isEmailVerified?: boolean;
  subscriptionStatus?: string;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  sessionWarning: boolean;
  login: (token: string, user: User, refreshToken?: string) => void;
  logout: (reason?: 'manual' | 'expired' | 'security') => void;
  updateUser: (user: Partial<User>) => void;
  extendSession: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAuthenticated: false,
  sessionWarning: false,
  login: () => {},
  logout: () => {},
  updateUser: () => {},
  extendSession: () => {},
});

export const useAuth = () => useContext(AuthContext);

// ─── Provider ─────────────────────────────────────────────────────────────────

const SESSION_WARN_MS = 5 * 60 * 1000;
const TOKEN_CHECK_INTERVAL = 30_000;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionWarning, setSessionWarning] = useState(false);
  const checkInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const logoutCallbackRef = useRef<((reason?: 'manual' | 'expired' | 'security') => void) | null>(null);

  const clearSession = useCallback(() => {
    clearAuthStorage();
    setUser(null);
    setSessionWarning(false);
    if (checkInterval.current) {
      clearInterval(checkInterval.current);
      checkInterval.current = null;
    }
  }, []);

  const startTokenWatcher = useCallback(() => {
    if (checkInterval.current) clearInterval(checkInterval.current);
    checkInterval.current = setInterval(() => {
      const expiresIn = tokenExpiresIn();
      if (expiresIn < 0) {
        clearSession();
        logoutCallbackRef.current?.('expired');
        return;
      }
      setSessionWarning(expiresIn <= SESSION_WARN_MS);
    }, TOKEN_CHECK_INTERVAL);
  }, [clearSession]);

  useEffect(() => {
    const token = getToken();
    const storedUser = getStoredUser();
    if (token && storedUser) {
      setUser(storedUser as unknown as User);
      startTokenWatcher();
    }
    setLoading(false);
    return () => {
      if (checkInterval.current) clearInterval(checkInterval.current);
    };
  }, [startTokenWatcher]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const token = getToken();
        if (!token && user) clearSession();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, clearSession]);

  const login = useCallback(
    (token: string, userData: User, refreshToken?: string) => {
      storeToken(token, refreshToken);
      storeUser(userData as unknown as Record<string, unknown>);
      setUser(userData);
      setSessionWarning(false);
      startTokenWatcher();
    },
    [startTokenWatcher]
  );

  const logout = useCallback(
    (reason?: 'manual' | 'expired' | 'security') => {
      clearSession();
      if (reason === 'expired') {
        window.location.href = '/login?reason=session_expired';
        return;
      }
      if (reason === 'security') {
        window.location.href = '/login?reason=security';
        return;
      }
    },
    [clearSession]
  );

  useEffect(() => {
    logoutCallbackRef.current = logout;
  }, [logout]);

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      storeUser(updated as unknown as Record<string, unknown>);
      return updated;
    });
  }, []);

  const extendSession = useCallback(() => {
    setSessionWarning(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, isAuthenticated: !!user, sessionWarning, login, logout, updateUser, extendSession }}
    >
      {sessionWarning && user && (
        <div className="fixed top-0 inset-x-0 z-[9999] bg-amber-500 text-black text-sm font-semibold px-4 py-2 flex items-center justify-between">
          <span>⚠️ Your session is about to expire. Save your work.</span>
          <div className="flex gap-3">
            <button onClick={extendSession} className="px-3 py-1 bg-black/20 hover:bg-black/30 rounded text-xs font-bold transition-colors">
              Stay Logged In
            </button>
            <button onClick={() => logout('manual')} className="px-3 py-1 bg-black/20 hover:bg-black/30 rounded text-xs font-bold transition-colors">
              Log Out
            </button>
          </div>
        </div>
      )}
      {children}
    </AuthContext.Provider>
  );
};
