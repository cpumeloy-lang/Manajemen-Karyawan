import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { AppCard } from '../../components/AppCard';
import { Screen } from '../../components/Screen';
import { useConnectivity } from '../../hooks/useConnectivity';
import { attendanceService } from '../../services/attendanceService';
import { biometricService } from '../../services/biometricService';
import { deviceService } from '../../services/deviceService';
import { getAttendanceLocation } from '../../services/locationService';
import { colors } from '../../theme/colors';
import { formatClock, formatDate } from '../../utils/date';
import type { AttendanceRecord, CheckInDraft, DeviceInfo, MobileUser } from '../../types';

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
  const today = formatDate();

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
      const device = deviceInfo || (await deviceService.ensureDeviceRegistered(user));
      if (!device) {
        throw new Error('Device belum terdaftar. Coba ulangi lagi.');
      }

      const verification = await biometricService.captureAndVerifyFace();
      setBiometricStatus(verification.verified ? 'Wajah terverifikasi' : 'Verifikasi wajah gagal');
      if (!verification.verified) {
        Alert.alert('Verifikasi wajah gagal', 'Silakan coba lagi dengan kondisi pencahayaan yang lebih baik.');
        return;
      }

      const location = await getAttendanceLocation();
      const nextDraft: CheckInDraft = {
        tanggal: today,
        clockIn: formatClock(),
        clockOut: '',
        location: location.label,
        latitude: location.latitude,
        longitude: location.longitude,
      };

      await attendanceService.checkIn(user, nextDraft, {
        deviceId: device.deviceId,
        biometricType: 'face',
        biometricVerified: true,
        faceMatchScoreCheckIn: verification.score,
        status: 'Pending',
        source: 'mobile',
        notes: 'Check-in face verified dari aplikasi mobile',
      });

      setDraft(nextDraft);
      await onRefresh();
      Alert.alert('Check-in tersimpan', 'Lanjutkan check-out saat selesai shift.');
    } catch (error: any) {
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
    if (!isLanReachable) {
      Alert.alert('Jaringan LAN belum tersedia', 'Silakan sambungkan ke jaringan LAN RS untuk menyimpan check-out.');
      return;
    }

    setBusy(true);
    try {
      const device = deviceInfo || (await deviceService.ensureDeviceRegistered(user));
      if (!device) {
        throw new Error('Device belum terdaftar. Coba ulangi lagi.');
      }

      const verification = await biometricService.captureAndVerifyFace();
      setBiometricStatus(verification.verified ? 'Wajah terverifikasi' : 'Verifikasi wajah gagal');
      if (!verification.verified) {
        Alert.alert('Verifikasi wajah gagal', 'Silakan coba lagi dengan kondisi pencahayaan yang lebih baik.');
        return;
      }

      await attendanceService.checkOut(user, activeDraft, {
        deviceId: device.deviceId,
        biometricType: 'face',
        biometricVerified: true,
        faceMatchScoreCheckOut: verification.score,
        source: 'mobile',
        notes: 'Check-out face verified dari aplikasi mobile',
      });

      setDraft(null);
      await onRefresh();
      Alert.alert('Berhasil', 'Absensi berhasil disimpan ke server LAN.');
    } catch (error: any) {
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
              <Text style={styles.historyDate}>{item.tanggal}</Text>
              <Text style={styles.historyText}>{item.clockIn} - {item.clockOut || '-'}</Text>
            </View>
            <Text style={[styles.badge, { color: item.isLate ? colors.warning : colors.success }]}> 
              {item.isLate ? 'Terlambat' : 'Tepat Waktu'}
            </Text>
          </View>
        ))}
        {records.length === 0 ? <Text style={styles.noHistory}>Belum ada riwayat absensi.</Text> : null}
      </AppCard>
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
