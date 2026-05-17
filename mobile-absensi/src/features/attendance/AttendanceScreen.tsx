import React, { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { AppCard } from '../../components/AppCard';
import { Screen } from '../../components/Screen';
import { LiveLivenessModal, isLiveLivenessAvailable } from '../../components/LiveLivenessModal';
import { verifyFace as verifyFaceFromUri } from '../../services/faceRecognitionService';
import { useConnectivity } from '../../hooks/useConnectivity';
import { attendanceService } from '../../services/attendanceService';
import { biometricService } from '../../services/biometricService';
import { deviceService } from '../../services/deviceService';
import { getAttendanceLocation } from '../../services/locationService';
import { logMobileAudit } from '../../services/auditService';
import { offlineQueue } from '../../services/offlineQueue';
import { geofenceService } from '../../services/geofenceService';
import { colors } from '../../theme/colors';
import { formatClock, formatDate, formatDateID } from '../../utils/date';
import { haptics } from '../../utils/haptics';
import type { AttendanceRecord, CheckInDraft, DeviceInfo, MobileUser } from '../../types';

/** Deteksi error yang masih berpeluang sukses jika dicoba ulang nanti. */
const isTransientNetworkError = (message: string): boolean => {
  const m = String(message || '').toLowerCase();
  return (
    m.includes('network') ||
    m.includes('failed to fetch') ||
    m.includes('timeout') ||
    m.includes('timed out') ||
    m.includes('aborted') ||
    m.includes('econnrefused') ||
    m.includes('enetunreach')
  );
};

interface AttendanceScreenProps {
  user: MobileUser;
  records: AttendanceRecord[];
  onRefresh: () => Promise<void>;
}

export function AttendanceScreen({ user, records, onRefresh }: AttendanceScreenProps) {
  const { isLanReachable, isChecking } = useConnectivity();
  const [draft, setDraft] = useState<CheckInDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [biometricStatus, setBiometricStatus] = useState<string>('Menunggu verifikasi');
  // Phase 9 (frame-level liveness) modal — primary jika native modules tersedia.
  const [liveVisible, setLiveVisible] = useState(false);
  const liveResolverRef = useRef<((uri: string | null) => void) | null>(null);

  const today = formatDate();

  /**
   * Verifikasi wajah otomatis: pilih jalur frame-level (Phase 9) bila tersedia,
   * fallback ke multi-photo (Phase 8). Kembalikan {verified, score, details}.
   */
  const captureAndVerify = async (
    phase: 'check_in' | 'check_out'
  ): Promise<{ verified: boolean; score: number; details?: any } | null> => {
    if (!user.employeeId) {
      throw new Error('employeeId tidak ditemukan pada sesi.');
    }

    // PRIMARY: frame-level liveness.
    if (isLiveLivenessAvailable()) {
      const uri: string | null = await new Promise((resolve) => {
        liveResolverRef.current = resolve;
        setLiveVisible(true);
      });
      if (!uri) return null;
      try {
        const res = await verifyFaceFromUri(user.employeeId, uri);
        return {
          verified: res.verified,
          score: res.similarity,
          details: { method: 'mobilefacenet+ml-kit-liveness', threshold: res.threshold },
        };
      } catch (err: any) {
        Alert.alert('Verifikasi gagal', err?.message || 'Coba lagi.');
        return null;
      }
    }

    // FALLBACK: selfie capture via expo-image-picker.
    try {
      const res = await biometricService.captureAndVerifyFace(user.employeeId);
      return {
        verified: res.verified,
        score: res.score,
        details: res.details,
      };
    } catch (err: any) {
      Alert.alert('Verifikasi gagal', err?.message || 'Coba lagi.');
      return null;
    }
  };

  const finishLive = (uri: string | null) => {
    setLiveVisible(false);
    const r = liveResolverRef.current;
    liveResolverRef.current = null;
    if (r) r(uri);
  };

  useEffect(() => {
    if (draft) return;

    const pendingRecord = records.find((item) => item.tanggal === today && !item.clockOut);
    if (pendingRecord) {
      setDraft({
        tanggal: pendingRecord.tanggal,
        clockIn: pendingRecord.clockIn,
        location: pendingRecord.location,
        latitude: pendingRecord.latitude,
        longitude: pendingRecord.longitude,
      });
    }
  }, [draft, records, today]);

  useEffect(() => {
    (async () => {
      try {
        const info = await deviceService.ensureDeviceRegistered(user);
        setDeviceInfo(info);
      } catch (error: any) {
        console.warn('Device registration failed:', error?.message || error);
      }
    })();
  }, [user]);

  const checkIn = async () => {
    const existingPending = records.find((item) => item.tanggal === today && !item.clockOut);
    if (existingPending) {
      setDraft({
        tanggal: existingPending.tanggal,
        clockIn: existingPending.clockIn,
        location: existingPending.location,
        latitude: existingPending.latitude,
        longitude: existingPending.longitude,
      });
      Alert.alert('Check-in sudah ada', 'Anda sudah melakukan check-in hari ini. Silakan check-out terlebih dahulu.');
      return;
    }

    setBusy(true);
    try {
      if (!deviceInfo) {
        throw new Error('Device belum siap. Tunggu sebentar lalu coba lagi.');
      }
      const device = deviceInfo;

      const verification = await captureAndVerify('check_in');
      if (!verification) {
        setBusy(false);
        return; // user batal / error sudah ditangani
      }
      setBiometricStatus(verification.verified ? 'Wajah terverifikasi' : 'Verifikasi wajah gagal');
      if (!verification.verified) {
        const reason = verification.details?.reason as string | undefined;
        const msg =
          reason === 'spoof_static_image'
            ? 'Terdeteksi foto statis. Liveness gagal — gerakkan kepala saat verifikasi.'
            : reason === 'pose_mismatch_or_different_person'
            ? 'Wajah antar pose tidak konsisten.'
            : reason === 'not_enrolled'
            ? 'Wajah belum didaftarkan. Buka Profil → Daftar Wajah.'
            : `Skor kecocokan rendah (${verification.score}). Pastikan pencahayaan cukup.`;
        Alert.alert('Verifikasi wajah gagal', msg);
        void logMobileAudit({
          user,
          action: 'BIOMETRIC_FAILED',
          metadata: {
            phase: 'check_in',
            score: verification.score,
            method: verification.details?.method,
            reason,
          },
          description: 'Biometrik gagal saat check-in',
        });
        return;
      }

      const location = await getAttendanceLocation();
      // Anti-fraud: tolak jika mock location atau akurasi terlalu rendah
      if (location.error === 'mock_location' || location.mocked) {
        Alert.alert(
          'Lokasi tidak valid',
          'Aplikasi mendeteksi mock GPS aktif. Nonaktifkan aplikasi pemalsu lokasi sebelum absen.'
        );
        void logMobileAudit({
          user,
          action: 'MOCK_LOCATION_BLOCKED',
          metadata: { phase: 'check_in', deviceId: device.deviceId },
          description: 'Check-in diblokir karena mock GPS',
        });
        return;
      }
      if (location.error === 'low_accuracy') {
        Alert.alert(
          'Akurasi GPS rendah',
          location.label + ' Pastikan Anda berada di area terbuka, lalu coba lagi.'
        );
        return;
      }
      if (location.error || location.latitude === undefined || location.longitude === undefined) {
        Alert.alert('Lokasi tidak tersedia', location.label);
        return;
      }

      // Validasi geofence (jika diaktifkan oleh admin).
      const geofence = await geofenceService.evaluate(location.latitude, location.longitude);
      if (geofence && !geofence.withinRadius) {
        const distanceKm = (geofence.distanceMeters / 1000).toFixed(2);
        Alert.alert(
          'Di luar area RS',
          `Anda berada ${distanceKm} km dari titik pusat RS (batas ${geofence.radiusMeters} m). ` +
            'Silakan datang ke area RS untuk melakukan absensi.'
        );
        void logMobileAudit({
          user,
          action: 'MOCK_LOCATION_BLOCKED',
          metadata: {
            phase: 'check_in',
            deviceId: device.deviceId,
            reason: 'outside_geofence',
            distanceMeters: Math.round(geofence.distanceMeters),
            radiusMeters: geofence.radiusMeters,
          },
          description: 'Check-in diblokir: di luar geofence',
        });
        return;
      }

      const nextDraft: CheckInDraft = {
        tanggal: today,
        clockIn: formatClock(),
        clockOut: '',
        location: location.label,
        latitude: location.latitude,
        longitude: location.longitude,
      };

      const extra = {
        deviceId: device.deviceId,
        biometricType: 'face' as const,
        biometricVerified: true,
        faceMatchScoreCheckIn: verification.score,
        status: 'Pending' as const,
        source: 'mobile' as const,
        notes: 'Check-in face verified dari aplikasi mobile',
      };
      const auditMetadata = {
        deviceId: device.deviceId,
        location: nextDraft.location,
        latitude: nextDraft.latitude,
        longitude: nextDraft.longitude,
        accuracy: location.accuracy,
        biometricScore: verification.score,
      };

      try {
        await attendanceService.checkIn(user, nextDraft, extra);
        setDraft(nextDraft);
        await onRefresh();
        void logMobileAudit({ user, action: 'CHECK_IN', entityName: nextDraft.tanggal, metadata: auditMetadata });
        haptics.success();
        Alert.alert('Check-in tersimpan', 'Lanjutkan check-out saat selesai shift.');
      } catch (error: any) {
        // Sinyal lemah / server tak terjangkau? Simpan di antrian dan kirim nanti.
        if (isTransientNetworkError(error?.message)) {
          await offlineQueue.enqueue({ type: 'check_in', user, draft: nextDraft, extra });
          setDraft(nextDraft);
          void logMobileAudit({
            user,
            action: 'CHECK_IN',
            entityName: nextDraft.tanggal,
            metadata: { ...auditMetadata, queued: true, reason: error?.message },
            description: 'Check-in masuk antrian offline',
          });
          haptics.warning();
          Alert.alert(
            'Tersimpan offline',
            'Sinyal lemah/server tak tersedia. Check-in akan dikirim otomatis saat koneksi pulih.'
          );
        } else {
          throw error;
        }
      }
    } catch (error: any) {
      haptics.error();
      Alert.alert('Check-in gagal', error?.message || 'Silakan coba lagi.');
    } finally {
      setBusy(false);
    }
  };

  const checkOut = async () => {
    let activeDraft = draft;
    if (!activeDraft) {
      const existingPending = records.find((item) => item.tanggal === today && !item.clockOut);
      if (existingPending) {
        activeDraft = {
          tanggal: existingPending.tanggal,
          clockIn: existingPending.clockIn,
          location: existingPending.location,
          latitude: existingPending.latitude,
          longitude: existingPending.longitude,
        };
      }
    }

    if (!activeDraft) return;

    setBusy(true);
    try {
      if (!deviceInfo) {
        throw new Error('Device belum siap. Tunggu sebentar lalu coba lagi.');
      }
      const device = deviceInfo;

      const verification = await captureAndVerify('check_out');
      if (!verification) {
        setBusy(false);
        return;
      }
      setBiometricStatus(verification.verified ? 'Wajah terverifikasi' : 'Verifikasi wajah gagal');
      if (!verification.verified) {
        const reason = verification.details?.reason as string | undefined;
        const msg =
          reason === 'spoof_static_image'
            ? 'Terdeteksi foto statis.'
            : reason === 'pose_mismatch_or_different_person'
            ? 'Wajah antar pose tidak konsisten.'
            : reason === 'not_enrolled'
            ? 'Wajah belum didaftarkan.'
            : `Skor kecocokan rendah (${verification.score}).`;
        Alert.alert('Verifikasi wajah gagal', msg);
        void logMobileAudit({
          user,
          action: 'BIOMETRIC_FAILED',
          metadata: {
            phase: 'check_out',
            score: verification.score,
            method: verification.details?.method,
            reason,
          },
          description: 'Biometrik gagal saat check-out',
        });
        return;
      }

      const extra = {
        deviceId: device.deviceId,
        biometricType: 'face' as const,
        biometricVerified: true,
        faceMatchScoreCheckOut: verification.score,
        source: 'mobile' as const,
        notes: 'Check-out face verified dari aplikasi mobile',
      };
      const auditMetadata = {
        deviceId: device.deviceId,
        location: activeDraft.location,
        latitude: activeDraft.latitude,
        longitude: activeDraft.longitude,
        biometricScore: verification.score,
      };

      try {
        await attendanceService.checkOut(user, activeDraft, extra);
        setDraft(null);
        await onRefresh();
        void logMobileAudit({ user, action: 'CHECK_OUT', entityName: activeDraft.tanggal, metadata: auditMetadata });
        haptics.success();
        Alert.alert('Berhasil', 'Absensi berhasil disimpan.');
      } catch (error: any) {
        if (isTransientNetworkError(error?.message)) {
          await offlineQueue.enqueue({ type: 'check_out', user, draft: activeDraft, extra });
          setDraft(null);
          void logMobileAudit({
            user,
            action: 'CHECK_OUT',
            entityName: activeDraft.tanggal,
            metadata: { ...auditMetadata, queued: true, reason: error?.message },
            description: 'Check-out masuk antrian offline',
          });
          haptics.warning();
          Alert.alert(
            'Tersimpan offline',
            'Sinyal lemah/server tak tersedia. Check-out akan dikirim otomatis saat koneksi pulih.'
          );
        } else {
          throw error;
        }
      }
    } catch (error: any) {
      haptics.error();
      Alert.alert('Check-out gagal', error?.message || 'Silakan coba lagi.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <AppCard title="Status Absensi">
        <View style={styles.infoRow}>
          <View style={styles.infoGroup}>
            <Text style={styles.infoLabel}>Karyawan</Text>
            <Text style={styles.infoValue}>{user.name}</Text>
          </View>
          <View style={styles.infoGroup}>
            <Text style={styles.infoLabel}>Unit</Text>
            <Text style={styles.infoValue}>{user.unitName || '-'}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoGroup}>
            <Text style={styles.infoLabel}>Device</Text>
            <Text style={styles.infoValue}>{deviceInfo?.deviceName || 'Memuat...'}</Text>
          </View>
          <View style={styles.infoGroup}>
            <Text style={styles.infoLabel}>Biometrik</Text>
            <Text style={styles.infoValue}>{biometricStatus}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoGroup}>
            <Text style={styles.infoLabel}>Jaringan</Text>
            <Text style={[styles.infoValue, { color: isLanReachable ? colors.success : colors.danger }]}> 
              {isChecking ? 'Memeriksa...' : isLanReachable ? 'LAN RS aktif' : 'LAN RS tidak tersedia'}
            </Text>
          </View>
        </View>
      </AppCard>

      <AppCard title="Aksi Absensi">
        {!draft ? (
          <AppButton title={busy ? 'Memproses...' : 'Check In'} onPress={checkIn} loading={busy} />
        ) : (
          <View style={styles.actionGroup}>
            <Text style={styles.detailsText}>Check-in {draft.clockIn} • {draft.location}</Text>
            <AppButton title={busy ? 'Menyimpan...' : 'Check Out'} onPress={checkOut} loading={busy} />
          </View>
        )}
      </AppCard>

      <AppCard title="Riwayat 5 Terakhir">
        {records.slice(0, 5).map((item) => (
          <View key={item.id} style={styles.historyRow}>
            <View>
              <Text style={styles.historyDate}>{formatDateID(item.tanggal)}</Text>
              <Text style={styles.historyText}>{item.clockIn} - {item.clockOut || '-'}</Text>
            </View>
            <Text style={[styles.badge, { color: item.isLate ? colors.warning : colors.success }]}> 
              {item.isLate ? 'Terlambat' : 'Tepat Waktu'}
            </Text>
          </View>
        ))}
        {records.length === 0 ? <Text style={styles.noHistory}>Belum ada riwayat absensi.</Text> : null}
      </AppCard>

      <LiveLivenessModal
        visible={liveVisible}
        onComplete={(uri) => finishLive(uri)}
        onCancel={() => finishLive(null)}
      />

    </Screen>
  );
}

const styles = StyleSheet.create({
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  infoGroup: {
    flex: 1,
    minWidth: 140,
  },
  infoLabel: {
    color: colors.muted,
    fontSize: 12,
    marginBottom: 4,
  },
  infoValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  actionGroup: {
    gap: 12,
  },
  detailsText: {
    color: colors.muted,
    fontSize: 14,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historyDate: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  historyText: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 4,
  },
  badge: {
    fontWeight: '800',
  },
  noHistory: {
    color: colors.muted,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 14,
  },
});
