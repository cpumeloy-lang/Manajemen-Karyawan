import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Lazy-load expo-secure-store only on native; web fallback to AsyncStorage
let SecureStore: any = null;
if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    SecureStore = require('expo-secure-store');
  } catch {
    console.warn('[storage] expo-secure-store not installed. Sensitive data will fall back to AsyncStorage. Run: npx expo install expo-secure-store');
  }
}

// ── Plain storage (non-sensitive: device ID, UI preferences) ──
export const storage = {
  async getJSON<T>(key: string, fallback: T): Promise<T> {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? (JSON.parse(value) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  async setJSON(key: string, value: unknown): Promise<void> {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  },
  async remove(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  },
};

// ── Secure storage (auth tokens, session) — uses Keystore/Keychain ──
// SecureStore has a 2KB value limit per item; auth session fits comfortably.
export const secureStorage = {
  async getJSON<T>(key: string, fallback: T): Promise<T> {
    try {
      const value = SecureStore
        ? await SecureStore.getItemAsync(key)
        : await AsyncStorage.getItem(key);
      return value ? (JSON.parse(value) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  async setJSON(key: string, value: unknown): Promise<void> {
    const serialized = JSON.stringify(value);
    if (SecureStore) {
      await SecureStore.setItemAsync(key, serialized, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    } else {
      await AsyncStorage.setItem(key, serialized);
    }
  },
  async remove(key: string): Promise<void> {
    if (SecureStore) {
      await SecureStore.deleteItemAsync(key);
    } else {
      await AsyncStorage.removeItem(key);
    }
  },
};
