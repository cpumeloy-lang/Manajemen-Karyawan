import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { AppCard } from '../../components/AppCard';
import { Screen } from '../../components/Screen';
import { deviceService } from '../../services/deviceService';
import { colors } from '../../theme/colors';
import type { DeviceInfo, MobileUser } from '../../types';

interface DeviceRegistrationScreenProps {
  user: MobileUser;
  onRegistered?: (deviceInfo: DeviceInfo) => void;
}

export function DeviceRegistrationScreen({ user, onRegistered }: DeviceRegistrationScreenProps) {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [registered, setRegistered] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const info = await deviceService.getDeviceInfo();
        setDeviceInfo(info);
        const isRegistered = await deviceService.isDeviceRegistered(user);
        setRegistered(isRegistered);
      } catch (error: any) {
        console.warn('Error loading device info:', error?.message || error);
      }
    })();
  }, [user]);

  const handleRegister = async () => {
    if (!deviceInfo) return;
    setBusy(true);
    try {
      const registeredDevice = await deviceService.registerDevice(user, deviceInfo);
      setRegistered(true);
      setDeviceInfo(registeredDevice);
      onRegistered?.(registeredDevice);
      Alert.alert('Berhasil', 'Perangkat Anda berhasil didaftarkan untuk absensi.');
    } catch (error: any) {
      Alert.alert('Gagal mendaftarkan perangkat', error?.message || 'Silakan coba lagi.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <AppCard title="Pendaftaran Perangkat">
        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <Text style={styles.label}>Nama Perangkat</Text>
            <Text style={styles.value}>{deviceInfo?.deviceName || 'Memuat...'}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.label}>Platform</Text>
            <Text style={styles.value}>{deviceInfo?.platform || 'Memuat...'}</Text>
          </View>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <Text style={styles.label}>ID Perangkat</Text>
            <Text style={styles.value}>{deviceInfo?.deviceId || 'Memuat...'}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.label}>Fingerprint</Text>
            <Text style={styles.value}>{deviceInfo?.deviceFingerprint || 'Memuat...'}</Text>
          </View>
        </View>

        <View style={styles.statusWrap}>
          <Text style={styles.statusLabel}>Status Pendaftaran</Text>
          <Text style={[styles.statusValue, registered ? styles.success : styles.warning]}>
            {registered ? 'Perangkat sudah terdaftar' : 'Perangkat belum terdaftar'}
          </Text>
        </View>

        <AppButton
          title={registered ? 'Perangkat Terdaftar' : busy ? 'Memproses...' : 'Daftarkan Perangkat'}
          onPress={handleRegister}
          disabled={registered || busy || !deviceInfo}
        />
      </AppCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
  },
  infoCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: '#f7fcfb',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    marginBottom: 6,
  },
  value: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
  statusWrap: {
    marginBottom: 16,
  },
  statusLabel: {
    color: colors.muted,
    fontSize: 12,
    marginBottom: 6,
  },
  statusValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  success: {
    color: colors.success,
  },
  warning: {
    color: colors.warning,
  },
});
