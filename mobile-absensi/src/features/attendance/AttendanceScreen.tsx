import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { AppCard } from '../../components/AppCard';
import { Screen } from '../../components/Screen';
import { useConnectivity } from '../../hooks/useConnectivity';
import { attendanceService } from '../../services/attendanceService';
import { getAttendanceLocation } from '../../services/locationService';
import { colors } from '../../theme/colors';
import { formatClock, formatDate } from '../../utils/date';
import type { AttendanceRecord, CheckInDraft, MobileUser } from '../../types';

interface AttendanceScreenProps {
  user: MobileUser;
  records: AttendanceRecord[];
  onRefresh: () => Promise<void>;
}

export function AttendanceScreen({ user, records, onRefresh }: AttendanceScreenProps) {
  const { isLanReachable, isChecking } = useConnectivity();
  const [draft, setDraft] = useState<CheckInDraft | null>(null);
  const [busy, setBusy] = useState(false);

  const checkIn = async () => {
    setBusy(true);
    try {
      const location = await getAttendanceLocation();
      const nextDraft: CheckInDraft = {
        tanggal: formatDate(),
        clockIn: formatClock(),
        location: location.label,
        latitude: location.latitude,
        longitude: location.longitude,
      };

      await attendanceService.checkIn(user, nextDraft);
      setDraft(nextDraft);
      Alert.alert('Check-in tersimpan sementara', 'Lanjutkan check-out saat selesai shift.');
    } catch (error: any) {
      Alert.alert('Check-in gagal', error?.message || 'Silakan coba lagi.');
    } finally {
      setBusy(false);
    }
  };

  const checkOut = async () => {
    if (!draft) return;
    if (!isLanReachable) {
      Alert.alert('Jaringan LAN belum tersedia', 'Silakan sambungkan ke jaringan LAN RS untuk menyimpan check-out.');
      return;
    }

    setBusy(true);
    try {
      const result = await attendanceService.checkOut(user, draft);
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
        <Text style={styles.label}>Karyawan</Text>
        <Text style={styles.value}>{user.name}</Text>
        <Text style={styles.label}>Unit</Text>
        <Text style={styles.value}>{user.unitName || '-'}</Text>
        <Text style={styles.label}>Jaringan</Text>
        <Text style={[styles.value, { color: isLanReachable ? colors.success : colors.danger }]}>
          {isChecking ? 'Memeriksa...' : isLanReachable ? 'LAN RS aktif' : 'LAN RS tidak tersedia'}
        </Text>
      </AppCard>

      <AppCard title="Aksi Absensi">
        {!draft ? (
          <AppButton title={busy ? 'Memproses...' : 'Check In'} onPress={checkIn} loading={busy} />
        ) : (
          <View style={{ gap: 12 }}>
            <Text style={styles.value}>Check-in {draft.clockIn} - {draft.location}</Text>
            <AppButton title={busy ? 'Menyimpan...' : 'Check Out'} onPress={checkOut} loading={busy} />
          </View>
        )}
      </AppCard>

      <AppCard title="Riwayat 5 Terakhir">
        {records.slice(0, 5).map((item) => (
          <View key={item.id} style={styles.historyRow}>
            <View>
              <Text style={styles.value}>{item.tanggal}</Text>
              <Text style={styles.label}>{item.clockIn} - {item.clockOut || '-'}</Text>
            </View>
            <Text style={[styles.badge, { color: item.isLate ? colors.warning : colors.success }]}>
              {item.isLate ? 'Terlambat' : 'Tepat Waktu'}
            </Text>
          </View>
        ))}
        {records.length === 0 ? <Text style={styles.label}>Belum ada riwayat absensi.</Text> : null}
      </AppCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  value: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  badge: {
    fontWeight: '800',
  },
});
