import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import type { MobileUser } from '../types';

const STORAGE_KEY_DEVICE_ID = 'hrms_mobile_device_id';
const STORAGE_KEY_DEVICE_NAME = 'hrms_mobile_device_name';

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  platform: 'Android' | 'iOS' | 'web' | 'unknown';
  deviceFingerprint: string;
  isPrimary: boolean;
}

// Lazy-load expo-crypto (optional dependency)
let ExpoCrypto: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ExpoCrypto = require('expo-crypto');
} catch {
  /* fallback below */
}

const generateDeviceId = (): string => {
  // Prefer Web Crypto randomUUID (RFC 4122 v4)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Prefer expo-crypto for cryptographically secure random bytes
  if (ExpoCrypto && typeof ExpoCrypto.randomUUID === 'function') {
    return ExpoCrypto.randomUUID();
  }

  if (ExpoCrypto && typeof ExpoCrypto.getRandomBytes === 'function') {
    const bytes = ExpoCrypto.getRandomBytes(16);
    const hex = Array.from(bytes as Uint8Array)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  }

  // Last-resort fallback: log warning so it's visible device IDs may not be unique
  console.warn('[deviceService] No crypto API available — device ID fallback is NOT cryptographically secure');
  return `device-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
};

const normalizePlatform = (): DeviceInfo['platform'] => {
  if (Platform.OS === 'android') return 'Android';
  if (Platform.OS === 'ios') return 'iOS';
  if (Platform.OS === 'web') return 'web';
  return 'unknown';
};

export const deviceService = {
  async getLocalDeviceId(): Promise<string> {
    const existing = await AsyncStorage.getItem(STORAGE_KEY_DEVICE_ID);
    if (existing) return existing;

    const newId = generateDeviceId();
    await AsyncStorage.setItem(STORAGE_KEY_DEVICE_ID, newId);
    return newId;
  },

  async getDeviceName(): Promise<string> {
    const existing = await AsyncStorage.getItem(STORAGE_KEY_DEVICE_NAME);
    if (existing) return existing;

    const name = `${Platform.OS}-${Platform.Version || 'unknown'}`;
    await AsyncStorage.setItem(STORAGE_KEY_DEVICE_NAME, name);
    return name;
  },

  async getDeviceInfo(): Promise<DeviceInfo> {
    const deviceId = await this.getLocalDeviceId();
    const deviceName = await this.getDeviceName();
    const platform = normalizePlatform();
    const deviceFingerprint = `${platform}:${deviceId}:${deviceName}`;

    return {
      deviceId,
      deviceName,
      platform,
      deviceFingerprint,
      isPrimary: true,
    };
  },

  async isDeviceRegistered(user: MobileUser): Promise<boolean> {
    const deviceInfo = await this.getDeviceInfo();
    const { data, error } = await supabase
      .from('employee_devices')
      .select('id')
      .eq('employee_id', user.id)
      .eq('device_id', deviceInfo.deviceId)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('Failed to check device registration:', error.message);
      return false;
    }

    return Boolean(data);
  },

  async registerDevice(user: MobileUser, deviceInfo: DeviceInfo): Promise<DeviceInfo> {
    const payload = {
      employee_id: user.id,
      device_id: deviceInfo.deviceId,
      device_name: deviceInfo.deviceName,
      platform: deviceInfo.platform,
      device_fingerprint: deviceInfo.deviceFingerprint,
      biometric_enabled: true,
      is_primary: deviceInfo.isPrimary,
      status: 'Active',
    };

    const { error } = await supabase
      .from('employee_devices')
      .upsert(payload, { onConflict: ['employee_id', 'device_id'] });

    if (error) {
      throw new Error(`Gagal mendaftarkan device: ${error.message}`);
    }

    return deviceInfo;
  },

  async ensureDeviceRegistered(user: MobileUser): Promise<DeviceInfo> {
    const deviceInfo = await this.getDeviceInfo();
    const registered = await this.isDeviceRegistered(user);

    if (registered) {
      return deviceInfo;
    }

    return this.registerDevice(user, deviceInfo);
  },
};
