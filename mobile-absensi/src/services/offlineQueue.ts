/**
 * src/services/offlineQueue.ts
 *
 * Antrian aksi yang gagal terkirim (offline / network error) lalu di-flush
 * otomatis saat koneksi pulih. Disimpan di AsyncStorage agar tetap ada
 * meski aplikasi di-kill.
 *
 * Saat ini hanya mendukung check-in dan check-out — tujuan utamanya supaya
 * karyawan di area sinyal lemah (basement, IGD, ruang radiologi) tidak
 * kehilangan absensi.
 *
 * Setiap entry punya metadata `attempts` & `lastError` untuk debugging /
 * tampilan ke user.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { attendanceService } from './attendanceService';
import type { CheckInDraft, MobileUser } from '../types';

const QUEUE_KEY = 'hrms.mobile.attendance_queue.v1';
/** Limit antrian agar tidak balon kalau ada bug retry. */
const MAX_QUEUE_SIZE = 50;
/** Hapus entry setelah N kegagalan beruntun (mencegah loop tak terbatas). */
const MAX_ATTEMPTS = 8;

export type QueuedActionType = 'check_in' | 'check_out';

export interface QueuedAttendanceAction {
  id: string;
  type: QueuedActionType;
  user: MobileUser;
  draft: CheckInDraft;
  extra?: Record<string, any>;
  /** ISO timestamp saat aksi dibuat (waktu lokal device). */
  enqueuedAt: string;
  attempts: number;
  lastError?: string;
}

type QueueListener = (queue: QueuedAttendanceAction[]) => void;

const listeners = new Set<QueueListener>();
let cachedQueue: QueuedAttendanceAction[] | null = null;
let isFlushing = false;

const readQueue = async (): Promise<QueuedAttendanceAction[]> => {
  if (cachedQueue) return cachedQueue;
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    cachedQueue = raw ? (JSON.parse(raw) as QueuedAttendanceAction[]) : [];
  } catch (err) {
    console.warn('[offlineQueue] failed to parse queue, resetting:', err);
    cachedQueue = [];
  }
  return cachedQueue;
};

const writeQueue = async (queue: QueuedAttendanceAction[]): Promise<void> => {
  cachedQueue = queue;
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.warn('[offlineQueue] failed to persist queue:', err);
  }
  listeners.forEach((listener) => {
    try {
      listener([...queue]);
    } catch (err) {
      console.warn('[offlineQueue] listener error:', err);
    }
  });
};

const generateId = (): string => `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const isNetworkError = (message: string): boolean => {
  const m = message.toLowerCase();
  return (
    m.includes('network') ||
    m.includes('failed to fetch') ||
    m.includes('timeout') ||
    m.includes('timed out') ||
    m.includes('aborted') ||
    m.includes('econnrefused') ||
    m.includes('enetunreach')
  );
};

export const offlineQueue = {
  /** Subscribe untuk update jumlah / isi antrian. Return unsubscribe. */
  subscribe(listener: QueueListener): () => void {
    listeners.add(listener);
    void readQueue().then((q) => listener([...q]));
    return () => listeners.delete(listener);
  },

  async getAll(): Promise<QueuedAttendanceAction[]> {
    return [...(await readQueue())];
  },

  async size(): Promise<number> {
    return (await readQueue()).length;
  },

  /** Tambahkan aksi ke antrian. */
  async enqueue(
    action: Omit<QueuedAttendanceAction, 'id' | 'enqueuedAt' | 'attempts'>
  ): Promise<QueuedAttendanceAction> {
    const queue = await readQueue();
    if (queue.length >= MAX_QUEUE_SIZE) {
      throw new Error(
        `Antrian offline penuh (${MAX_QUEUE_SIZE}). Hubungi IT untuk membersihkan antrian.`
      );
    }

    const entry: QueuedAttendanceAction = {
      ...action,
      id: generateId(),
      enqueuedAt: new Date().toISOString(),
      attempts: 0,
    };
    await writeQueue([...queue, entry]);
    return entry;
  },

  /**
   * Coba kirim semua aksi dalam antrian. Aman dipanggil berulang kali
   * (idempotent karena guard `isFlushing`). Return jumlah yang sukses
   * dikirim.
   */
  async flush(): Promise<{ sent: number; failed: number; remaining: number }> {
    if (isFlushing) {
      const current = await readQueue();
      return { sent: 0, failed: 0, remaining: current.length };
    }
    isFlushing = true;

    let sent = 0;
    let failed = 0;
    try {
      let queue = await readQueue();
      const remaining: QueuedAttendanceAction[] = [];

      for (const entry of queue) {
        try {
          if (entry.type === 'check_in') {
            await attendanceService.checkIn(entry.user, entry.draft, entry.extra as any);
          } else {
            await attendanceService.checkOut(entry.user, entry.draft, entry.extra as any);
          }
          sent += 1;
        } catch (err: any) {
          const message = err?.message || String(err);
          const nextAttempts = entry.attempts + 1;

          // Jika error jaringan, simpan untuk dicoba lagi nanti.
          // Jika error logika (validation, permission), drop setelah MAX_ATTEMPTS.
          const transient = isNetworkError(message);
          if (transient || nextAttempts < MAX_ATTEMPTS) {
            remaining.push({
              ...entry,
              attempts: nextAttempts,
              lastError: message,
            });
          } else {
            console.warn(
              `[offlineQueue] dropping entry ${entry.id} after ${nextAttempts} attempts:`,
              message
            );
          }
          failed += 1;
        }
      }

      queue = remaining;
      await writeQueue(queue);
      return { sent, failed, remaining: queue.length };
    } finally {
      isFlushing = false;
    }
  },

  /** Hapus 1 entry secara manual (mis. dari layar admin/debug). */
  async remove(id: string): Promise<void> {
    const queue = await readQueue();
    await writeQueue(queue.filter((entry) => entry.id !== id));
  },

  /** Bersihkan antrian seluruhnya. Hanya untuk debug / reset darurat. */
  async clear(): Promise<void> {
    await writeQueue([]);
  },
};
