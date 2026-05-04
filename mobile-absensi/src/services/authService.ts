import { secureStorage as storage } from '../lib/storage';
import type { MobileUser } from '../types';
import { supabase } from '../config/supabase';
import { mapEmployeeRowToMobileUser } from './profileMapper';

const SESSION_KEY = 'hrms.mobile.session';

export interface MobileSession {
  token: string;
  refreshToken: string;
  user: MobileUser;
}

export const authService = {
  async login(email: string, password: string): Promise<MobileSession> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.session || !data.user) {
      throw new Error(error?.message || 'Login gagal');
    }

    const { data: employee, error: profileError } = await supabase
      .from('employees')
      .select('id,nik,nama,email,role,jabatan,departemen,unitKerjaId,managedUnitId,shift,status')
      .eq('user_id', data.user.id)
      .single();

    if (profileError || !employee) {
      throw new Error(profileError?.message || 'Profil karyawan tidak ditemukan');
    }

    const session: MobileSession = {
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: mapEmployeeRowToMobileUser(employee, data.user.email || email, data.user.id),
    };

    await storage.setJSON(SESSION_KEY, session);
    return session;
  },

  async getSession(): Promise<MobileSession | null> {
    const stored = await storage.getJSON<MobileSession | null>(SESSION_KEY, null);
    if (!stored?.token || !stored.refreshToken) {
      if (stored) await storage.remove(SESSION_KEY);
      return null;
    }

    try {
      const { data, error } = await supabase.auth.setSession({
        access_token: stored.token,
        refresh_token: stored.refreshToken,
      });

      if (error || !data.session) {
        await storage.remove(SESSION_KEY);
        return null;
      }

      const session: MobileSession = {
        token: data.session.access_token,
        refreshToken: data.session.refresh_token,
        user: stored.user,
      };
      await storage.setJSON(SESSION_KEY, session);
      return session;
    } catch {
      await storage.remove(SESSION_KEY);
      return null;
    }
  },

  async logout(): Promise<void> {
    await supabase.auth.signOut();
    await storage.remove(SESSION_KEY);
  },
};
