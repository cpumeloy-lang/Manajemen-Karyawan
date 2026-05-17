import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../components/AppButton';
import { Screen } from '../components/Screen';
import { BottomNav } from '../components/BottomNav';
import { DashboardScreen } from '../features/dashboard/DashboardScreen';
import { useAuth } from '../features/auth/AuthContext';
import { AttendanceScreen } from '../features/attendance/AttendanceScreen';
import { AttendanceHistoryScreen } from '../features/attendance/AttendanceHistoryScreen';
import { DeviceRegistrationScreen } from '../features/device/DeviceRegistrationScreen';
import { LoginScreen } from '../features/auth/LoginScreen';
import { ProfileScreen } from '../features/profile/ProfileScreen';
import { ScheduleScreen } from '../features/schedule/ScheduleScreen';
import { RequestsScreen } from '../features/requests/RequestsScreen';
import { FaceEnrollmentScreen } from '../features/profile/FaceEnrollmentScreen';
import { PrivacyConsentScreen, PRIVACY_POLICY_VERSION } from '../features/consent/PrivacyConsentScreen';
import { getConsentStatus } from '../services/consentService';
import { attendanceService } from '../services/attendanceService';
import { requestService, type LeaveRequest } from '../services/requestService';
import { registerForPushNotifications, subscribeToNotificationTap } from '../services/pushNotificationService';
import { setUserContext } from '../services/errorReportingService';
import { ConfigErrorScreen } from '../components/ConfigErrorScreen';
import { SyncBanner } from '../components/SyncBanner';
import { getSupabaseInitStatus } from '../config/supabase';
import { useConnectivity } from '../hooks/useConnectivity';
import { useQueueFlusher } from '../hooks/useQueueFlusher';
import { useOfflineQueue } from '../hooks/useOfflineQueue';
import { colors } from '../theme/colors';
import type { AttendanceRecord } from '../types';
import type { AttendanceTab } from '../types';

export function AppShell() {
  const { bootstrapping, user, login, logout } = useAuth();
  const [tab, setTab] = useState<AttendanceTab>('dashboard');
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [pendingRequests, setPendingRequests] = useState(0);
  // null = belum diketahui (loading), true = sudah setuju, false = belum.
  const [consentAccepted, setConsentAccepted] = useState<boolean | null>(null);

  const refreshPendingCount = async (uid: string) => {
    try {
      const data = await requestService.listForEmployee(uid, 100);
      setPendingRequests(data.filter((r) => r.status === 'Pending').length);
    } catch {
      // diam-diam saja; badge tidak kritis
    }
  };

  const loadAttendanceRecords = async () => {
    if (!user) return;
    setRecordsLoading(true);
    try {
      const records = await attendanceService.list(user.id);
      setAttendanceRecords(records);
    } catch (error) {
      console.error('Failed to load attendance records:', error);
    } finally {
      setRecordsLoading(false);
    }
  };

  const { isLanReachable } = useConnectivity();
  const queue = useOfflineQueue();
  useQueueFlusher({
    enabled: Boolean(user),
    isOnline: isLanReachable,
    onFlushed: () => {
      void loadAttendanceRecords();
    },
  });

  useEffect(() => {
    // Defer loading records slightly to avoid blocking UI
    const timer = setTimeout(() => {
      void loadAttendanceRecords();
      if (user?.id) {
        void refreshPendingCount(user.id);
        // Register push token (silent best-effort).
        void registerForPushNotifications(user.id);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [user?.id]);

  // Sync user context ke Sentry sesuai status auth.
  useEffect(() => {
    setUserContext(user?.id || null);
  }, [user?.id]);

  // Cek status consent setiap kali user berubah (login baru / re-auth).
  useEffect(() => {
    if (!user) {
      setConsentAccepted(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const rec = await getConsentStatus(user, PRIVACY_POLICY_VERSION);
      if (!cancelled) setConsentAccepted(!!rec);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Tap notif → buka tab requests dan refresh.
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToNotificationTap((data) => {
      const target = (data?.tab as AttendanceTab) || 'requests';
      setTab(target);
      void refreshPendingCount(user.id);
    });
    return () => {
      if (unsub) unsub();
    };
  }, [user?.id]);

  const handleRequestsChange = (list: LeaveRequest[]) => {
    setPendingRequests(list.filter((r) => r.status === 'Pending').length);
  };

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
    schedule: user ? <ScheduleScreen user={user} /> : null,
    requests: user ? <RequestsScreen user={user} onListChange={handleRequestsChange} /> : null,
    history: user ? (
      <AttendanceHistoryScreen
        records={attendanceRecords}
        onRefresh={loadAttendanceRecords}
        loading={recordsLoading}
      />
    ) : null,
    device: user ? <DeviceRegistrationScreen user={user} /> : null,
    face: user ? <FaceEnrollmentScreen user={user} onDone={() => setTab('profile')} /> : null,
    profile: user ? (
      <ProfileScreen
        user={user}
        onGoDevice={() => setTab('device')}
        onGoFaceEnrollment={() => setTab('face')}
      />
    ) : null,
  }), [attendanceRecords, user, recordsLoading, pendingRequests]);

  const supabaseStatus = getSupabaseInitStatus();
  if (!supabaseStatus.ready) {
    return <ConfigErrorScreen reason={supabaseStatus.reason || 'Konfigurasi tidak valid.'} />;
  }

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

  // Gate: tampilkan privacy consent bila belum setuju versi terbaru.
  if (consentAccepted === null) {
    return (
      <Screen>
        <Text style={styles.loading}>Memeriksa kebijakan privasi…</Text>
      </Screen>
    );
  }
  if (!consentAccepted) {
    return (
      <PrivacyConsentScreen
        user={user}
        onAccepted={() => setConsentAccepted(true)}
        onDeclined={() => {
          void logout();
        }}
      />
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.headerTextWrap}>
          <Text style={styles.brand}>HRMS Absensi</Text>
          <Text style={styles.subtitle}>{user.name}</Text>
          <Text style={styles.meta}>{user.jabatan || 'Karyawan'} {user.unitName ? `· ${user.unitName}` : ''}</Text>
        </View>
        <AppButton
          title="Keluar"
          onPress={logout}
          variant="secondary"
          style={{ width: 'auto', minHeight: 0, paddingHorizontal: 14, paddingVertical: 8 }}
        />
      </View>

      <SyncBanner isOnline={isLanReachable} pendingCount={queue.length} />

      <View style={styles.content}>{screens[tab]}</View>

      <BottomNav value={tab} onChange={setTab} badges={{ requests: pendingRequests }} />
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
