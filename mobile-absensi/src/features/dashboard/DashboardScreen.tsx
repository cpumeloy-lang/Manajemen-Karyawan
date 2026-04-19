import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { AppCard } from '../../components/AppCard';
import { Screen } from '../../components/Screen';
import { colors } from '../../theme/colors';
import type { AttendanceRecord, MobileUser } from '../../types';

interface DashboardScreenProps {
  user: MobileUser;
  records: AttendanceRecord[];
  onGoAttendance: () => void;
  onGoHistory: () => void;
}

export function DashboardScreen({ user, records, onGoAttendance, onGoHistory }: DashboardScreenProps) {
  const totalRecords = records.length;
  const lateCount = records.filter((item) => item.isLate).length;
  const presentCount = totalRecords - lateCount;
  const lastRecord = records[0] || null;

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.kicker}>Dashboard Karyawan</Text>
        <Text style={styles.title}>Selamat datang, {user.name}</Text>
        <Text style={styles.subtitle}>{user.jabatan || 'Karyawan'}{user.unitName ? ` · ${user.unitName}` : ''}</Text>
      </View>

      <View style={styles.grid}>
        <AppCard>
          <Text style={styles.cardLabel}>Total Absensi</Text>
          <Text style={styles.cardValue}>{totalRecords}</Text>
        </AppCard>
        <AppCard>
          <Text style={styles.cardLabel}>Tepat Waktu</Text>
          <Text style={styles.cardValue}>{presentCount}</Text>
        </AppCard>
        <AppCard>
          <Text style={styles.cardLabel}>Terlambat</Text>
          <Text style={styles.cardValue}>{lateCount}</Text>
        </AppCard>
        <AppCard>
          <Text style={styles.cardLabel}>Shift</Text>
          <Text style={styles.cardValue}>{user.shift || '-'}</Text>
        </AppCard>
      </View>

      <AppCard title="Absensi Terakhir">
        {lastRecord ? (
          <View style={{ gap: 4 }}>
            <Text style={styles.detail}>{lastRecord.tanggal}</Text>
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cardLabel: {
    color: colors.muted,
    fontSize: 12,
  },
  cardValue: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: '800',
  },
  detail: {
    color: colors.text,
    fontWeight: '700',
  },
  muted: {
    color: colors.muted,
  },
  actions: {
    gap: 12,
  },
});
