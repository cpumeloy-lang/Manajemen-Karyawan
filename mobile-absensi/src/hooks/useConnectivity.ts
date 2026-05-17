import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { getSupabaseHealthCheckUrl } from '../config/supabase';

/**
 * Optional NetInfo binding. Bila paket `@react-native-community/netinfo` belum
 * terinstal (mis. dev-client lama), fallback ke null tanpa crash.
 * Setelah `expo install @react-native-community/netinfo` dan rebuild dev-client,
 * hook otomatis memakai event-driven dari NetInfo.
 */
let NetInfoModule: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  NetInfoModule = require('@react-native-community/netinfo').default;
} catch {
  NetInfoModule = null;
}

const HEALTH_TIMEOUT_MS = 4000;
/** Hindari spam ping; minimum jeda antar pengecekan otomatis. */
const MIN_PING_INTERVAL_MS = 30_000;

/**
 * Status koneksi ke server Supabase. Dirancang event-driven:
 * - Cek saat mount.
 * - Cek setiap kali aplikasi kembali ke foreground.
 * - Bisa dipanggil manual via `recheck()` (mis. sebelum submit).
 *
 * Tidak ada timer polling 30s seperti sebelumnya — hemat baterai & data.
 */
export function useConnectivity() {
  const [isLanReachable, setIsLanReachable] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const lastPingRef = useRef<number>(0);
  const mountedRef = useRef(true);

  const ping = useCallback(async (force = false): Promise<boolean> => {
    const now = Date.now();
    if (!force && now - lastPingRef.current < MIN_PING_INTERVAL_MS) {
      return isLanReachable;
    }
    lastPingRef.current = now;

    setIsChecking(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
      const response = await fetch(getSupabaseHealthCheckUrl(), { signal: controller.signal });
      clearTimeout(timeout);
      const ok = response.ok;
      if (mountedRef.current) setIsLanReachable(ok);
      return ok;
    } catch {
      if (mountedRef.current) setIsLanReachable(false);
      return false;
    } finally {
      if (mountedRef.current) setIsChecking(false);
    }
  }, [isLanReachable]);

  useEffect(() => {
    mountedRef.current = true;
    void ping(true);

    const handleAppStateChange = (state: AppStateStatus) => {
      if (state === 'active') {
        void ping(true);
      }
    };
    const appStateSub = AppState.addEventListener('change', handleAppStateChange);

    // Subscribe NetInfo bila tersedia.
    let netInfoUnsub: (() => void) | null = null;
    if (NetInfoModule && typeof NetInfoModule.addEventListener === 'function') {
      netInfoUnsub = NetInfoModule.addEventListener((state: any) => {
        if (!mountedRef.current) return;
        const reachable = !!(state?.isConnected && (state?.isInternetReachable ?? true));
        if (!reachable) {
          setIsLanReachable(false);
          return;
        }
        // Saat baru online kembali, validasi reachability ke Supabase.
        void ping(true);
      });
    }

    return () => {
      mountedRef.current = false;
      appStateSub.remove();
      if (netInfoUnsub) netInfoUnsub();
    };
    // ping is stable enough; intentionally not in deps to avoid re-subscribing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { isLanReachable, isChecking, recheck: ping };
}
