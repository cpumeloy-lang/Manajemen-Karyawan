/**
 * src/components/ForceUpdateGate.tsx
 *
 * Gate yang dirender sebelum AppShell.
 * Mengecek `app_config` dari Supabase:
 *   - maintenance_mode → tampilkan MaintenanceScreen.
 *   - versionCode < minVersionCode → tampilkan ForceUpdateScreen (block app).
 *   - versionCode < latestVersionCode → tampilkan banner soft-update (non-block).
 *
 * Saat offline / fetch gagal → fallback ke cache/default → app tetap jalan.
 */
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { APP_VERSION, APP_VERSION_CODE } from '../config/version';
import { Screen } from './Screen';
import { colors } from '../theme/colors';
import {
  getAppConfig,
  isUpdateRequired,
  isUpdateAvailable,
  type AppConfig,
} from '../services/appConfigService';

interface Props {
  children: React.ReactNode;
}

const CURRENT_VERSION_CODE = APP_VERSION_CODE;
const CURRENT_VERSION = APP_VERSION;

export function ForceUpdateGate({ children }: Props) {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [softDismissed, setSoftDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const c = await getAppConfig();
      if (!cancelled) setConfig(c);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!config) {
    return (
      <Screen>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.dim}>Memeriksa pembaruan…</Text>
        </View>
      </Screen>
    );
  }

  // 1. Maintenance mode — block total.
  if (config.maintenanceMode) {
    return <MaintenanceScreen message={config.maintenanceMessage} />;
  }

  // 2. Force update — block, harus update.
  if (isUpdateRequired(CURRENT_VERSION_CODE, config)) {
    return (
      <ForceUpdateScreen
        currentVersion={CURRENT_VERSION}
        message={config.updateMessage}
        updateUrl={config.updateUrl}
      />
    );
  }

  // 3. Soft update — banner non-block.
  const hasSoftUpdate =
    !softDismissed && isUpdateAvailable(CURRENT_VERSION_CODE, config);

  return (
    <>
      {hasSoftUpdate ? (
        <SoftUpdateBanner
          updateUrl={config.updateUrl}
          onDismiss={() => setSoftDismissed(true)}
        />
      ) : null}
      {children}
    </>
  );
}

function MaintenanceScreen({ message }: { message?: string }) {
  return (
    <Screen>
      <View style={styles.center}>
        <Text style={styles.emoji}>🛠️</Text>
        <Text style={styles.title}>Sistem dalam Pemeliharaan</Text>
        <Text style={styles.body}>
          {message ||
            'Aplikasi sementara tidak dapat digunakan karena sedang dilakukan pemeliharaan sistem. Mohon coba lagi beberapa saat lagi.'}
        </Text>
        <Text style={styles.foot}>
          Silakan hubungi HRD/IT bila Anda perlu absensi manual selama periode ini.
        </Text>
      </View>
    </Screen>
  );
}

function ForceUpdateScreen({
  currentVersion,
  message,
  updateUrl,
}: {
  currentVersion: string;
  message?: string;
  updateUrl?: string;
}) {
  const handleUpdate = () => {
    if (updateUrl) {
      Linking.openURL(updateUrl).catch(() => {});
    }
  };
  return (
    <Screen>
      <View style={styles.center}>
        <Text style={styles.emoji}>⬆️</Text>
        <Text style={styles.title}>Update Wajib Tersedia</Text>
        <Text style={styles.body}>
          {message ||
            'Versi aplikasi Anda sudah tidak didukung. Silakan unduh versi terbaru untuk melanjutkan.'}
        </Text>
        <Text style={styles.versionNote}>
          Versi Anda: <Text style={styles.bold}>{currentVersion}</Text>
        </Text>
        {updateUrl ? (
          <Pressable style={styles.btn} onPress={handleUpdate}>
            <Text style={styles.btnText}>Unduh Update</Text>
          </Pressable>
        ) : (
          <Text style={styles.foot}>
            Hubungi HRD/IT untuk mendapatkan APK terbaru.
          </Text>
        )}
      </View>
    </Screen>
  );
}

function SoftUpdateBanner({
  updateUrl,
  onDismiss,
}: {
  updateUrl?: string;
  onDismiss: () => void;
}) {
  const handleUpdate = () => {
    if (updateUrl) Linking.openURL(updateUrl).catch(() => {});
  };
  return (
    <View style={styles.softBanner}>
      <Text style={styles.softText}>
        🆕 Versi baru tersedia. Update untuk fitur dan perbaikan terbaru.
      </Text>
      <View style={styles.softActions}>
        {updateUrl ? (
          <Pressable onPress={handleUpdate}>
            <Text style={styles.softLink}>Update</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={onDismiss} style={{ marginLeft: 16 }}>
          <Text style={styles.softDismiss}>Tutup</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  dim: { color: colors.muted },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 14,
  },
  emoji: { fontSize: 56 },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    color: '#333',
    textAlign: 'center',
    lineHeight: 22,
  },
  foot: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginTop: 12,
  },
  bold: { fontWeight: '800' },
  versionNote: {
    fontSize: 13,
    color: '#666',
    marginTop: 6,
  },
  btn: {
    marginTop: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  softBanner: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FCD34D',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  softText: { flex: 1, color: '#92400E', fontSize: 13 },
  softActions: { flexDirection: 'row', alignItems: 'center' },
  softLink: { color: colors.primary, fontWeight: '800' },
  softDismiss: { color: '#92400E', fontWeight: '600' },
});
