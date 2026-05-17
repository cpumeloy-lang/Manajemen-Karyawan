/**
 * src/services/consentService.ts
 *
 * Mengelola persetujuan privacy policy karyawan sesuai UU PDP No. 27/2022.
 *
 * Strategi penyimpanan:
 *  - Local: AsyncStorage (key per-user) → cek cepat saat startup.
 *  - Remote: tabel `audit_logs` (tidak butuh tabel baru, leverage existing
 *    audit infrastructure) untuk audit trail kepatuhan.
 *
 * Versi: bila kebijakan privasi diperbarui, naikkan
 * PRIVACY_POLICY_VERSION di PrivacyConsentScreen.tsx → user akan diminta
 * persetujuan ulang.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logMobileAudit } from './auditService';
import type { MobileUser } from '../types';

const KEY_PREFIX = 'hrms.consent.privacy.';

interface ConsentRecord {
  version: string;
  acceptedAt: string;
  scope: string[];
}

interface ConsentMeta {
  version: string;
  scope: string[];
}

/**
 * Cek apakah user sudah setuju versi terbaru.
 * Return null bila belum, atau record bila sudah.
 */
export async function getConsentStatus(
  user: MobileUser,
  currentVersion: string
): Promise<ConsentRecord | null> {
  if (!user?.id) return null;
  try {
    const raw = await AsyncStorage.getItem(KEY_PREFIX + user.id);
    if (!raw) return null;
    const rec = JSON.parse(raw) as ConsentRecord;
    // Bila versi berubah → minta persetujuan ulang.
    if (rec.version !== currentVersion) return null;
    return rec;
  } catch {
    return null;
  }
}

/**
 * Simpan persetujuan eksplisit user.
 * Tulis ke AsyncStorage + audit log untuk compliance.
 */
export async function saveConsent(
  user: MobileUser,
  meta: ConsentMeta
): Promise<void> {
  const record: ConsentRecord = {
    version: meta.version,
    acceptedAt: new Date().toISOString(),
    scope: meta.scope,
  };

  await AsyncStorage.setItem(
    KEY_PREFIX + user.id,
    JSON.stringify(record)
  );

  // Audit log untuk UU PDP — wajib ada bukti persetujuan eksplisit
  // dengan timestamp & device info.
  await logMobileAudit({
    user,
    action: 'PRIVACY_CONSENT_ACCEPTED',
    metadata: {
      version: meta.version,
      scope: meta.scope,
      acceptedAt: record.acceptedAt,
    },
    description: `Persetujuan kebijakan privasi v${meta.version} diberikan`,
  }).catch(() => {
    // Jangan gagalkan flow karena audit log; bila offline akan masuk queue.
  });
}

/**
 * Catat penolakan persetujuan (tetap di-audit untuk traceability).
 */
export async function declineConsent(
  user: MobileUser,
  version: string
): Promise<void> {
  await logMobileAudit({
    user,
    action: 'PRIVACY_CONSENT_DECLINED',
    metadata: {
      version,
      declinedAt: new Date().toISOString(),
    },
    description: `Penolakan kebijakan privasi v${version}`,
  }).catch(() => {});
}

/**
 * Hapus consent record (mis. saat user logout / akun di-revoke).
 */
export async function clearConsent(userId: string): Promise<void> {
  await AsyncStorage.removeItem(KEY_PREFIX + userId);
}
