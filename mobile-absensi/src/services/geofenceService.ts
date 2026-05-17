/**
 * src/services/geofenceService.ts
 *
 * Sumber konfigurasi geofence (titik pusat RS + radius toleransi).
 *
 * Strategi:
 * 1. Coba baca dari `system_settings` (jika kolom `latitude/longitude/…`
 *    sudah ada lewat migration `database-add-geofence-settings.sql`).
 * 2. Jika tabel/kolom belum ada, fallback ke environment variable:
 *      EXPO_PUBLIC_HOSPITAL_LAT
 *      EXPO_PUBLIC_HOSPITAL_LNG
 *      EXPO_PUBLIC_HOSPITAL_RADIUS_M  (default 500)
 *      EXPO_PUBLIC_GEOFENCE_ENABLED   ("true"/"false")
 * 3. Jika keduanya tidak tersedia, `enabled=false` → tidak ada blok/warning.
 *
 * Hasil di-cache 10 menit di memory untuk menghindari round-trip di setiap
 * check-in.
 */
import { supabase } from '../config/supabase';
import { distanceMeters } from './locationService';

export interface GeofenceConfig {
  enabled: boolean;
  latitude?: number;
  longitude?: number;
  radiusMeters: number;
  /** Sumber data untuk debugging/log. */
  source: 'db' | 'env' | 'none';
}

const CACHE_TTL_MS = 10 * 60 * 1000;

let cache: { value: GeofenceConfig; expiresAt: number } | null = null;
let inflight: Promise<GeofenceConfig> | null = null;

const parseFloatSafe = (raw?: string): number | undefined => {
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
};

const readEnvConfig = (): GeofenceConfig => {
  const lat = parseFloatSafe(process.env.EXPO_PUBLIC_HOSPITAL_LAT);
  const lng = parseFloatSafe(process.env.EXPO_PUBLIC_HOSPITAL_LNG);
  const radius = parseFloatSafe(process.env.EXPO_PUBLIC_HOSPITAL_RADIUS_M) ?? 500;
  const flag = (process.env.EXPO_PUBLIC_GEOFENCE_ENABLED || '').toLowerCase();
  const enabledByEnv = flag === 'true' || flag === '1' || flag === 'yes';

  if (lat !== undefined && lng !== undefined) {
    return {
      enabled: enabledByEnv,
      latitude: lat,
      longitude: lng,
      radiusMeters: Math.max(50, radius),
      source: 'env',
    };
  }
  return { enabled: false, radiusMeters: radius, source: 'none' };
};

const fetchFromDb = async (): Promise<GeofenceConfig | null> => {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('latitude, longitude, geofence_radius_meters, geofence_enabled')
      .limit(1)
      .maybeSingle();
    if (error) {
      const msg = String(error.message || '').toLowerCase();
      if (msg.includes('does not exist') || msg.includes('column') || msg.includes('schema')) {
        return null; // Kolom belum ada → biarkan fallback env yang berbicara.
      }
      console.warn('[geofenceService] DB read error:', error.message);
      return null;
    }
    if (!data) return null;
    const lat = typeof data.latitude === 'number' ? data.latitude : undefined;
    const lng = typeof data.longitude === 'number' ? data.longitude : undefined;
    const radius =
      typeof data.geofence_radius_meters === 'number' ? data.geofence_radius_meters : 500;
    const enabled = Boolean(data.geofence_enabled) && lat !== undefined && lng !== undefined;
    return {
      enabled,
      latitude: lat,
      longitude: lng,
      radiusMeters: Math.max(50, radius),
      source: 'db',
    };
  } catch (err) {
    console.warn('[geofenceService] unexpected DB error:', err);
    return null;
  }
};

export const geofenceService = {
  /** Ambil konfigurasi geofence aktif. Cached 10 menit. */
  async getConfig(forceRefresh = false): Promise<GeofenceConfig> {
    const now = Date.now();
    if (!forceRefresh && cache && cache.expiresAt > now) {
      return cache.value;
    }
    if (inflight) return inflight;

    inflight = (async () => {
      const fromDb = await fetchFromDb();
      const config = fromDb || readEnvConfig();
      cache = { value: config, expiresAt: now + CACHE_TTL_MS };
      return config;
    })();

    try {
      return await inflight;
    } finally {
      inflight = null;
    }
  },

  /**
   * Evaluasi koordinat user relatif ke geofence RS.
   *
   * Return `null` jika geofence tidak aktif (tidak perlu warning / block).
   */
  async evaluate(
    latitude: number,
    longitude: number
  ): Promise<{
    enabled: boolean;
    withinRadius: boolean;
    distanceMeters: number;
    radiusMeters: number;
  } | null> {
    const config = await this.getConfig();
    if (!config.enabled || config.latitude === undefined || config.longitude === undefined) {
      return null;
    }
    const distance = distanceMeters(
      latitude,
      longitude,
      config.latitude,
      config.longitude
    );
    return {
      enabled: true,
      withinRadius: distance <= config.radiusMeters,
      distanceMeters: distance,
      radiusMeters: config.radiusMeters,
    };
  },

  /** Bersihkan cache (mis. setelah admin update setting). */
  invalidate() {
    cache = null;
  },
};
