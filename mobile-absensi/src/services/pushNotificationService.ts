/**
 * src/services/pushNotificationService.ts
 *
 * Wrapper di atas `expo-notifications` untuk:
 *  - Meminta izin notifikasi.
 *  - Mengambil Expo push token.
 *  - Menyimpan token ke Supabase (kolom `employees.expo_push_token`).
 *  - Subscribe handler tap notifikasi.
 *
 * Modul ini tahan-banting: bila `expo-notifications` belum tersedia
 * (mis. dev-client lama), seluruh API mengembalikan no-op tanpa crash.
 */
import { Platform } from 'react-native';
import { supabase } from '../config/supabase';

let Notifications: any = null;
let Device: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Notifications = require('expo-notifications');
} catch {
  Notifications = null;
}
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Device = require('expo-device');
} catch {
  Device = null;
}

export type PushTapHandler = (data: Record<string, any>) => void;

/**
 * Setup default notification handler. Aman dipanggil di modul-load karena
 * tidak melakukan I/O.
 */
function setupDefaultHandler() {
  if (!Notifications?.setNotificationHandler) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}
setupDefaultHandler();

async function requestPermission(): Promise<boolean> {
  if (!Notifications?.getPermissionsAsync) return false;
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted || settings.status === 'granted') return true;
  const ask = await Notifications.requestPermissionsAsync();
  return ask.granted || ask.status === 'granted';
}

async function fetchExpoToken(): Promise<string | null> {
  if (!Notifications?.getExpoPushTokenAsync) return null;
  try {
    // projectId opsional bila pakai EAS; tanpa EAS, fallback ke nilai dari Constants.
    let projectId: string | undefined;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Constants = require('expo-constants').default;
      projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ||
        Constants?.easConfig?.projectId ||
        undefined;
    } catch {
      projectId = undefined;
    }
    const result = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    return result?.data ?? null;
  } catch (err) {
    console.warn('[push] gagal getExpoPushTokenAsync', err);
    return null;
  }
}

async function saveTokenToSupabase(employeeId: string, token: string): Promise<void> {
  // Coba snake_case dulu (skema produksi).
  const tryUpdate = async (column: string, tsColumn: string) =>
    supabase
      .from('employees')
      .update({ [column]: token, [tsColumn]: new Date().toISOString() })
      .eq('id', employeeId);

  let { error } = await tryUpdate('expo_push_token', 'push_token_updated_at');
  if (error && /column|does not exist|schema cache/i.test(error.message)) {
    const retry = await tryUpdate('expoPushToken', 'pushTokenUpdatedAt');
    error = retry.error;
  }
  if (error) {
    console.warn('[push] gagal simpan token ke supabase', error.message);
  }
}

/**
 * Daftarkan device untuk push notification dan simpan token ke profil
 * karyawan. Aman dipanggil meski izin ditolak — tidak akan throw.
 */
export async function registerForPushNotifications(employeeId: string): Promise<string | null> {
  if (!Notifications) return null;
  if (Device && Device.isDevice === false) {
    // Emulator/simulator tidak dapat menerima push remote.
    return null;
  }

  const granted = await requestPermission();
  if (!granted) return null;

  // Android channel default agar notifikasi muncul dengan benar.
  if (Platform.OS === 'android' && Notifications.setNotificationChannelAsync) {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance?.DEFAULT ?? 3,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1f8a7a',
      });
    } catch {
      /* ignore */
    }
  }

  const token = await fetchExpoToken();
  if (!token) return null;

  await saveTokenToSupabase(employeeId, token);
  return token;
}

/**
 * Subscribe handler ketika user tap notifikasi.
 * Returns unsubscribe function; null bila tidak didukung.
 */
export function subscribeToNotificationTap(handler: PushTapHandler): (() => void) | null {
  if (!Notifications?.addNotificationResponseReceivedListener) return null;
  const sub = Notifications.addNotificationResponseReceivedListener((response: any) => {
    const data = response?.notification?.request?.content?.data ?? {};
    try {
      handler(data);
    } catch (err) {
      console.warn('[push] tap handler error', err);
    }
  });
  return () => {
    try {
      sub?.remove?.();
    } catch {
      /* ignore */
    }
  };
}
