import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authService, type MobileSession } from '../../services/authService';
import type { MobileUser } from '../../types';

interface AuthState {
  bootstrapping: boolean;
  session: MobileSession | null;
  user: MobileUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
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

  const value = useMemo<AuthState>(() => ({
    bootstrapping,
    session,
    user: session?.user || null,
    login: async (email: string, password: string) => {
      const nextSession = await authService.login(email, password);
      setSession(nextSession);
    },
    logout: async () => {
      await authService.logout();
      setSession(null);
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
