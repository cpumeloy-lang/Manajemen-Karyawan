import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { AppCard } from '../../components/AppCard';
import { Screen } from '../../components/Screen';
import { requestService } from '../../services/requestService';
import { colors } from '../../theme/colors';
import { formatDateID } from '../../utils/date';
import type { AttendanceRecord, MobileUser } from '../../types';

interface DashboardScreenProps {
  user: MobileUser;
  records: AttendanceRecord[];
  onGoAttendance: () => void;
  onGoHistory: () => void;
}

export function DashboardScreen({ user, records, onGoAttendance, onGoHistory }: DashboardScreenProps) {
  // Scope statistik ke bulan berjalan agar tidak akumulatif sepanjang waktu.
  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthRecords = records.filter((r) => r.tanggal.startsWith(monthPrefix));

  const presentCount = monthRecords.filter((r) => !r.isLate && r.status !== 'Cuti' && r.status !== 'Sakit' && r.status !== 'Absen').length;
  const lateCount = monthRecords.filter((r) => r.isLate).length;
  const leaveCount = monthRecords.filter((r) => r.status === 'Cuti' || r.status === 'Sakit').length;
  const lastRecord = records[0] || null;

  // Sisa cuti realtime: snapshot karyawan minus cuti tahun ini yang sudah disetujui.
  const [usedLeaveDays, setUsedLeaveDays] = useState<number>(0);
  useEffect(() => {
    let cancelled = false;
    void requestService
      .getApprovedLeaveDaysThisYear(user.id)
      .then((n) => {
        if (!cancelled) setUsedLeaveDays(n);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [user.id]);
  const remainingLeave =
    typeof user.sisaCuti === 'number' ? Math.max(0, user.sisaCuti - usedLeaveDays) : null;

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.kicker}>Dashboard Karyawan</Text>
        <Text style={styles.title}>Selamat datang, {user.name}</Text>
        <Text style={styles.subtitle}>{user.jabatan || 'Karyawan'}{user.unitName ? ` · ${user.unitName}` : ''}</Text>
      </View>

      <Text style={styles.statsLabel}>Statistik Bulan Ini</Text>
      <View style={styles.grid}>
        <AppCard style={styles.summaryCard}>
          <Text style={styles.cardLabel}>Tepat Waktu</Text>
          <Text style={[styles.cardValue, { color: colors.success }]}>{presentCount}</Text>
        </AppCard>
        <AppCard style={styles.summaryCard}>
          <Text style={styles.cardLabel}>Terlambat</Text>
          <Text style={[styles.cardValue, { color: colors.warning }]}>{lateCount}</Text>
        </AppCard>
        <AppCard style={styles.summaryCard}>
          <Text style={styles.cardLabel}>Izin/Cuti</Text>
          <Text style={[styles.cardValue, { color: colors.primary }]}>{leaveCount}</Text>
        </AppCard>
        <AppCard style={styles.summaryCard}>
          <Text style={styles.cardLabel}>Sisa Cuti Tahunan</Text>
          <Text style={styles.cardValue}>{remainingLeave ?? '-'}</Text>
          {usedLeaveDays > 0 ? (
            <Text style={styles.cardSubValue}>terpakai {usedLeaveDays} hari</Text>
          ) : null}
        </AppCard>
      </View>

      <AppCard title="Absensi Terakhir">
        {lastRecord ? (
          <View style={{ gap: 4 }}>
            <Text style={styles.detail}>{formatDateID(lastRecord.tanggal)}</Text>
            <Text style={styles.detail}>{lastRecord.clockIn} - {lastRecord.clockOut || '-'}</Text>
            <Text style={styles.detail}>{lastRecord.location}</Text>
          </View>
        ) : (
          <Text style={styles.muted}>Belum ada riwayat absensi.</Text>
        )}
      </AppCard>

      <AppCard title="Aksi Cepat">
        <View style={styles.actions}>
          <AppButton title="Buka Absensi" onPress={onGoAttendance} />
          <AppButton title="Lihat Riwayat" onPress={onGoHistory} variant="secondary" />
        </View>
      </AppCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: 6,
    marginBottom: 10,
  },
  kicker: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 32,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
  },
  statsLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 6,
    marginBottom: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryCard: {
    flexBasis: '47%',
    minWidth: 150,
  },
  cardLabel: {
    color: colors.muted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  cardValue: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4,
  },
  cardSubValue: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  detail: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
  muted: {
    color: colors.muted,
    fontSize: 14,
  },
  actions: {
    gap: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});
