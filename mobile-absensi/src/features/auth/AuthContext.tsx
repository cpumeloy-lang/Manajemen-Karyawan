import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authService, type MobileSession } from '../../services/authService';
import { logMobileAudit } from '../../services/auditService';
import { supabase, getSupabaseInitStatus } from '../../config/supabase';
import { secureStorage } from '../../lib/storage';
import type { MobileUser } from '../../types';

const SESSION_KEY = 'hrms.mobile.session';

interface AuthState {
  bootstrapping: boolean;
  session: MobileSession | null;
  user: MobileUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [bootstrapping, setBootstrapping] = useState(true);
  const [session, setSession] = useState<MobileSession | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const current = await authService.getSession();
        setSession(current);
      } catch (error) {
        console.error('Failed to restore session:', error);
      } finally {
        setBootstrapping(false);
      }
    })();
  }, []);

  // Sinkronisasi token Supabase: jika auth lib refresh access_token / sign-out
  // dari device lain, kita ikut update penyimpanan lokal.
  useEffect(() => {
    if (!getSupabaseInitStatus().ready) return;

    const subscription = supabase.auth.onAuthStateChange((event, supaSession) => {
      if (event === 'SIGNED_OUT') {
        setSession(null);
        void secureStorage.remove(SESSION_KEY);
        return;
      }

      if (event === 'TOKEN_REFRESHED' && supaSession) {
        setSession((prev) => {
          if (!prev) return prev;
          const refreshed: MobileSession = {
            ...prev,
            token: supaSession.access_token,
            refreshToken: supaSession.refresh_token,
          };
          void secureStorage.setJSON(SESSION_KEY, refreshed);
          return refreshed;
        });
      }
    });

    // supabase-js v2 returns { data: { subscription } }
    const sub = (subscription as any)?.data?.subscription || (subscription as any)?.subscription;
    return () => {
      try {
        sub?.unsubscribe?.();
      } catch (err) {
        console.warn('[AuthContext] failed to unsubscribe auth listener:', err);
      }
    };
  }, []);

  const value = useMemo<AuthState>(() => ({
    bootstrapping,
    session,
    user: session?.user || null,
    login: async (email: string, password: string) => {
      const nextSession = await authService.login(email, password);
      setSession(nextSession);
    },
    logout: async () => {
      const currentUser = session?.user;
      if (currentUser) {
        await logMobileAudit({ user: currentUser, action: 'LOGOUT' });
      }
      await authService.logout();
      setSession(null);
    },
    refreshProfile: async () => {
      const refreshed = await authService.refreshProfile();
      if (refreshed) {
        setSession((prev) => (prev ? { ...prev, user: refreshed } : prev));
      }
    },
  }), [bootstrapping, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
