/**
 * src/services/auditService.ts
 *
 * Lightweight audit logger untuk aplikasi mobile.
 * Mencatat aksi sensitif (login, check-in, check-out, register device) ke
 * tabel `audit_logs` di Supabase agar HR/Admin dapat menelusuri jika ada
 * insiden dari sisi mobile.
 *
 * Catatan: gagal mencatat audit TIDAK boleh menggagalkan flow utama. Semua
 * error di sini hanya di-log ke console.
 */
import { Platform } from 'react-native';
import { supabase } from '../config/supabase';
import type { MobileUser } from '../types';

export type MobileAuditAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'CHECK_IN'
  | 'CHECK_OUT'
  | 'DEVICE_REGISTER'
  | 'BIOMETRIC_FAILED'
  | 'MOCK_LOCATION_BLOCKED'
  | 'REQUEST_SUBMIT'
  | 'PRIVACY_CONSENT_ACCEPTED'
  | 'PRIVACY_CONSENT_DECLINED';

export interface MobileAuditLogParams {
  user: MobileUser;
  action: MobileAuditAction;
  /** Nama entitas referensi (mis. tanggal absensi). */
  entityName?: string;
  /** Data kontekstual: lokasi, deviceId, error message, dll. */
  metadata?: Record<string, any>;
  description?: string;
}

const ACTION_TO_DB_ACTION: Record<MobileAuditAction, 'CREATE' | 'UPDATE' | 'DELETE'> = {
  LOGIN: 'CREATE',
  LOGOUT: 'DELETE',
  CHECK_IN: 'CREATE',
  CHECK_OUT: 'UPDATE',
  DEVICE_REGISTER: 'CREATE',
  BIOMETRIC_FAILED: 'CREATE',
  MOCK_LOCATION_BLOCKED: 'CREATE',
  REQUEST_SUBMIT: 'CREATE',
  PRIVACY_CONSENT_ACCEPTED: 'CREATE',
  PRIVACY_CONSENT_DECLINED: 'CREATE',
};

const ACTION_TO_ENTITY_TYPE: Record<MobileAuditAction, string> = {
  LOGIN: 'auth',
  LOGOUT: 'auth',
  CHECK_IN: 'attendance',
  CHECK_OUT: 'attendance',
  DEVICE_REGISTER: 'device',
  BIOMETRIC_FAILED: 'security',
  MOCK_LOCATION_BLOCKED: 'security',
  REQUEST_SUBMIT: 'request',
  PRIVACY_CONSENT_ACCEPTED: 'compliance',
  PRIVACY_CONSENT_DECLINED: 'compliance',
};

const DEFAULT_DESCRIPTIONS: Record<MobileAuditAction, string> = {
  LOGIN: 'Login dari aplikasi mobile',
  LOGOUT: 'Logout dari aplikasi mobile',
  CHECK_IN: 'Check-in absensi via mobile',
  CHECK_OUT: 'Check-out absensi via mobile',
  DEVICE_REGISTER: 'Registrasi perangkat baru',
  BIOMETRIC_FAILED: 'Verifikasi biometrik gagal',
  MOCK_LOCATION_BLOCKED: 'Mock GPS terdeteksi dan diblokir',
  REQUEST_SUBMIT: 'Pengajuan cuti/izin/lembur/reimburse dibuat',
  PRIVACY_CONSENT_ACCEPTED: 'Persetujuan kebijakan privasi diberikan',
  PRIVACY_CONSENT_DECLINED: 'Penolakan kebijakan privasi',
};

export async function logMobileAudit(params: MobileAuditLogParams): Promise<void> {
  const { user, action, entityName, metadata, description } = params;

  try {
    const { data: authData } = await supabase.auth.getUser();
    const authUserId = authData?.user?.id;

    const insertPayload: Record<string, any> = {
      user_id: authUserId || null,
      user_email: user.email || 'unknown',
      user_name: user.name || 'unknown',
      action: ACTION_TO_DB_ACTION[action],
      entity_type: ACTION_TO_ENTITY_TYPE[action],
      entity_id: user.id || null,
      entity_name: entityName || user.name || null,
      description: description || DEFAULT_DESCRIPTIONS[action],
      changes: {
        mobile_action: action,
        platform: Platform.OS,
        platform_version: String(Platform.Version || ''),
        app_source: 'mobile',
        metadata: metadata || {},
      },
      portal_type: 'personal',
    };

    const { error } = await supabase.from('audit_logs').insert(insertPayload);

    // Backward compatibility: tabel/kolom `portal_type` mungkin belum ada di schema lama.
    if (error) {
      const message = String(error.message || '').toLowerCase();
      if (message.includes('portal_type')) {
        delete insertPayload.portal_type;
        const retry = await supabase.from('audit_logs').insert(insertPayload);
        if (retry.error) {
          console.warn('[auditService] retry insert failed:', retry.error.message);
        }
        return;
      }
      // Tabel belum ada / RLS denied — silent fail (audit tidak boleh menggagalkan UX)
      console.warn('[auditService] insert failed:', error.message);
    }
  } catch (err: any) {
    console.warn('[auditService] unexpected error:', err?.message || err);
  }
}
