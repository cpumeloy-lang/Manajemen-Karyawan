/**
 * src/services/reminderService.ts
 *
 * Local notification reminder untuk check-in pagi & check-out sore.
 * Menggunakan `expo-notifications` (sudah dipasang). Aman jika modul belum
 * tersedia (dev-client lama) — semua API menjadi no-op.
 *
 * Reminder dijadwalkan repeating-daily (calendar trigger) sehingga tidak
 * perlu di-reschedule manual. Saat user mengubah jam atau menonaktifkan,
 * jadwal lama akan dibatalkan dan dijadwalkan ulang.
 */
import { Platform } from 'react-native';
import { storage } from '../lib/storage';

let Notifications: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Notifications = require('expo-notifications');
} catch {
  Notifications = null;
}

const PREFS_KEY = 'hrms.mobile.reminders';

const ID_CHECK_IN = 'reminder.check_in';
const ID_CHECK_OUT = 'reminder.check_out';

export interface ReminderPrefs {
  enabled: boolean;
  /** Jam check-in (0-23) */
  checkInHour: number;
  /** Menit check-in (0-59) */
  checkInMinute: number;
  /** Jam check-out (0-23) */
  checkOutHour: number;
  /** Menit check-out (0-59) */
  checkOutMinute: number;
}

const DEFAULT_PREFS: ReminderPrefs = {
  enabled: false,
  checkInHour: 7,
  checkInMinute: 30,
  checkOutHour: 16,
  checkOutMinute: 0,
};

export async function getReminderPrefs(): Promise<ReminderPrefs> {
  return await storage.getJSON<ReminderPrefs>(PREFS_KEY, DEFAULT_PREFS);
}

async function savePrefs(prefs: ReminderPrefs): Promise<void> {
  await storage.setJSON(PREFS_KEY, prefs);
}

async function ensurePermission(): Promise<boolean> {
  if (!Notifications?.getPermissionsAsync) return false;
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted || cur.status === 'granted') return true;
  const ask = await Notifications.requestPermissionsAsync();
  return ask.granted || ask.status === 'granted';
}

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  if (!Notifications?.setNotificationChannelAsync) return;
  try {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Pengingat Absensi',
      importance: Notifications.AndroidImportance?.DEFAULT ?? 3,
      vibrationPattern: [0, 200, 200, 200],
    });
  } catch {
    /* ignore */
  }
}

async function cancelAll(): Promise<void> {
  if (!Notifications?.cancelScheduledNotificationAsync) return;
  await Promise.all(
    [ID_CHECK_IN, ID_CHECK_OUT].map((id) =>
      Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined)
    )
  );
}

async function scheduleDaily(
  identifier: string,
  hour: number,
  minute: number,
  title: string,
  body: string
): Promise<void> {
  if (!Notifications?.scheduleNotificationAsync) return;
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title,
      body,
      sound: 'default',
      data: { tab: 'attendance', kind: identifier },
    },
    trigger: {
      hour,
      minute,
      repeats: true,
      channelId: 'reminders',
    },
  });
}

/**
 * Terapkan preference: cancel semua reminder, lalu (bila enabled) reschedule.
 */
export async function applyReminderPrefs(prefs: ReminderPrefs): Promise<void> {
  await savePrefs(prefs);
  if (!Notifications) return;

  await cancelAll();
  if (!prefs.enabled) return;

  const granted = await ensurePermission();
  if (!granted) return;
  await ensureChannel();

  await scheduleDaily(
    ID_CHECK_IN,
    prefs.checkInHour,
    prefs.checkInMinute,
    'Saatnya Check-in',
    'Jangan lupa check-in untuk memulai shift Anda.'
  );
  await scheduleDaily(
    ID_CHECK_OUT,
    prefs.checkOutHour,
    prefs.checkOutMinute,
    'Saatnya Check-out',
    'Pastikan check-out sebelum meninggalkan area RS.'
  );
}

export const reminderDefaults = DEFAULT_PREFS;
