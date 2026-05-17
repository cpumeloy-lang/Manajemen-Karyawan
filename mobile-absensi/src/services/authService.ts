import { secureStorage as storage } from '../lib/storage';
import type { MobileUser } from '../types';
import { supabase } from '../config/supabase';
import { mapEmployeeRowToMobileUser } from './profileMapper';
import { logMobileAudit } from './auditService';

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
      .select('id,nik,nama,email,role,jabatan,departemen,unitKerjaId,managedUnitId,shift,status,sisaCuti,telepon,foto')
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
    void logMobileAudit({ user: session.user, action: 'LOGIN' });
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

  /**
   * Refresh data profil dari `employees` lalu persist ke sesi lokal.
   * Berguna saat data karyawan diubah HR (jabatan, unit, shift) — mobile
   * akan ikut update tanpa perlu logout/login.
   */
  async refreshProfile(): Promise<MobileUser | null> {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return null;

    const { data: employee, error } = await supabase
      .from('employees')
      .select('id,nik,nama,email,role,jabatan,departemen,unitKerjaId,managedUnitId,shift,status,sisaCuti,telepon,foto')
      .eq('user_id', authData.user.id)
      .single();
    if (error || !employee) return null;

    const refreshed = mapEmployeeRowToMobileUser(
      employee,
      authData.user.email || undefined,
      authData.user.id
    );

    const stored = await storage.getJSON<MobileSession | null>(SESSION_KEY, null);
    if (stored) {
      await storage.setJSON(SESSION_KEY, { ...stored, user: refreshed });
    }
    return refreshed;
  },

  /**
   * Update kontak (nomor telepon) milik karyawan yang sedang login.
   * RLS server harus membatasi `update` hanya pada baris dengan
   * `user_id = auth.uid()` agar aman.
   */
  async updateContactInfo(input: { telepon?: string }): Promise<MobileUser | null> {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) throw new Error('Sesi tidak valid.');

    const phone = (input.telepon || '').trim();
    if (phone && !/^[\d+\-\s]{6,20}$/.test(phone)) {
      throw new Error('Format nomor telepon tidak valid (6–20 digit).');
    }

    const tryUpdate = async (col: 'telepon' | 'phone') => {
      const { error } = await supabase
        .from('employees')
        .update({ [col]: phone || null })
        .eq('user_id', authData.user!.id);
      return error;
    };

    let err = await tryUpdate('telepon');
    if (err) {
      const m = String(err.message || '').toLowerCase();
      if (m.includes('does not exist') || m.includes('column')) {
        err = await tryUpdate('phone');
      }
    }
    if (err) throw new Error(err.message);

    return await this.refreshProfile();
  },

  /**
   * Kirim email reset password lewat Supabase. Karyawan akan menerima link
   * untuk mengganti password di portal web (atau deep-link mobile bila
   * sudah dikonfigurasi).
   */
  async requestPasswordReset(email: string): Promise<void> {
    const normalized = email.trim();
    if (!normalized) throw new Error('Email wajib diisi');

    const redirectTo =
      process.env.EXPO_PUBLIC_PASSWORD_RESET_URL?.trim() || undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(normalized, {
      redirectTo,
    });
    if (error) {
      throw new Error(error.message || 'Gagal mengirim email reset password');
    }
  },
};
