import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { offlineQueue } from '../services/offlineQueue';

/**
 * Otomatis flush antrian offline saat:
 * - Mount (jika `enabled=true` dan koneksi sehat).
 * - Setiap perubahan `isOnline` dari false ke true.
 * - App kembali ke foreground.
 *
 * `onFlushed` dipanggil setelah flush selesai supaya UI bisa refresh data.
 */
export function useQueueFlusher(params: {
  enabled: boolean;
  isOnline: boolean;
  onFlushed?: (sent: number) => void;
}) {
  const { enabled, isOnline, onFlushed } = params;
  const wasOnlineRef = useRef<boolean>(isOnline);
  const onFlushedRef = useRef(onFlushed);
  onFlushedRef.current = onFlushed;

  const tryFlush = async () => {
    try {
      const result = await offlineQueue.flush();
      if (result.sent > 0) {
        onFlushedRef.current?.(result.sent);
      }
    } catch (err) {
      console.warn('[useQueueFlusher] flush error:', err);
    }
  };

  // Trigger saat enabled & online.
  useEffect(() => {
    if (!enabled) return;
    const wasOnline = wasOnlineRef.current;
    wasOnlineRef.current = isOnline;
    if (isOnline && (!wasOnline || true)) {
      // Cek antrian dan flush bila ada.
      void offlineQueue.size().then((n) => {
        if (n > 0) void tryFlush();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, isOnline]);

  // Flush saat app kembali ke foreground.
  useEffect(() => {
    if (!enabled) return;
    const handle = (state: AppStateStatus) => {
      if (state === 'active') {
        void offlineQueue.size().then((n) => {
          if (n > 0) void tryFlush();
        });
      }
    };
    const sub = AppState.addEventListener('change', handle);
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}
