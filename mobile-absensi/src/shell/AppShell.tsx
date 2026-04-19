import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../components/AppButton';
import { Screen } from '../components/Screen';
import { BottomNav } from '../components/BottomNav';
import { DashboardScreen } from '../features/dashboard/DashboardScreen';
import { useAuth } from '../features/auth/AuthContext';
import { AttendanceScreen } from '../features/attendance/AttendanceScreen';
import { AttendanceHistoryScreen } from '../features/attendance/AttendanceHistoryScreen';
import { LoginScreen } from '../features/auth/LoginScreen';
import { ProfileScreen } from '../features/profile/ProfileScreen';
import { attendanceService } from '../services/attendanceService';
import { colors } from '../theme/colors';
import type { AttendanceRecord } from '../types';
import type { AttendanceTab } from '../types';

export function AppShell() {
  const { bootstrapping, user, login, logout } = useAuth();
  const [tab, setTab] = useState<AttendanceTab>('dashboard');
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

  const loadAttendanceRecords = async () => {
    if (!user) return;
    try {
      const records = await attendanceService.list(user.id);
      setAttendanceRecords(records);
    } catch (error) {
      console.error('Failed to load attendance records:', error);
    }
  };

  useEffect(() => {
    // Defer loading records slightly to avoid blocking UI
    const timer = setTimeout(() => {
      void loadAttendanceRecords();
    }, 100);
    return () => clearTimeout(timer);
  }, [user?.id]);

  const screens = useMemo(() => ({
    dashboard: user ? (
      <DashboardScreen
        user={user}
        records={attendanceRecords}
        onGoAttendance={() => setTab('attendance')}
        onGoHistory={() => setTab('history')}
      />
    ) : null,
    attendance: user ? <AttendanceScreen user={user} records={attendanceRecords} onRefresh={loadAttendanceRecords} /> : null,
    history: user ? <AttendanceHistoryScreen records={attendanceRecords} /> : null,
    profile: user ? <ProfileScreen user={user} /> : null,
  }), [attendanceRecords, user]);

  if (bootstrapping) {
    return (
      <Screen>
        <Text style={styles.loading}>Memuat sesi...</Text>
      </Screen>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={login} />;
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.headerTextWrap}>
          <Text style={styles.brand}>HRMS Absensi</Text>
          <Text style={styles.subtitle}>{user.name}</Text>
          <Text style={styles.meta}>{user.jabatan || 'Karyawan'} {user.unitName ? `· ${user.unitName}` : ''}</Text>
        </View>
        <AppButton title="Keluar" onPress={logout} variant="secondary" />
      </View>

      <BottomNav value={tab} onChange={setTab} />

      <View style={styles.content}>{screens[tab]}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 54,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  brand: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  subtitle: {
    color: colors.muted,
    marginTop: 2,
    fontWeight: '600',
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  loading: {
    marginTop: 40,
    textAlign: 'center',
    color: colors.muted,
  },
});
