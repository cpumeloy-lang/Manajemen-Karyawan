/**
 * src/services/appConfigService.ts
 *
 * Mengelola konfigurasi aplikasi remote dari Supabase tabel `app_config`.
 * Digunakan untuk:
 *   - Force update mechanism (versi minimum yang didukung).
 *   - Maintenance mode flag.
 *   - Feature flags ringan (mis. enable/disable fitur per environment).
 *
 * Cache lokal di AsyncStorage agar app tetap bisa start saat offline.
 *
 * Tabel `app_config` (lihat database/MOBILE_PRODUCTION_MIGRATIONS.sql):
 *   key TEXT PRIMARY KEY
 *   value JSONB
 *   updated_at TIMESTAMPTZ
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';

const CACHE_KEY = 'hrms.appConfig.cache';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 jam

export interface AppConfig {
  /** versionCode minimum (Android) atau buildNumber minimum (iOS) yang didukung. */
  minVersionCode: number;
  /** versionCode terbaru yang tersedia (untuk soft-prompt update). */
  latestVersionCode?: number;
  /** URL download APK terbaru / Play Store. */
  updateUrl?: string;
  /** Pesan custom untuk dialog force-update. */
  updateMessage?: string;
  /** Bila true → tampilkan layar maintenance. */
  maintenanceMode: boolean;
  /** Pesan saat maintenance mode aktif. */
  maintenanceMessage?: string;
  /** Feature flags umum. */
  features?: Record<string, boolean>;
}

const DEFAULT_CONFIG: AppConfig = {
  minVersionCode: 1,
  maintenanceMode: false,
};

interface CachedConfig {
  config: AppConfig;
  fetchedAt: number;
}

/**
 * Ambil config: prefer cache fresh (<TTL), fallback ke remote, fallback ke
 * cache stale, fallback ke default.
 */
export async function getAppConfig(forceRefresh = false): Promise<AppConfig> {
  // 1. Cek cache fresh
  if (!forceRefresh) {
    const cached = await loadCache();
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return cached.config;
    }
  }

  // 2. Coba fetch dari Supabase
  try {
    const { data, error } = await supabase
      .from('app_config')
      .select('key, value');

    if (error) throw error;

    const config: AppConfig = { ...DEFAULT_CONFIG };
    for (const row of data || []) {
      const key = row.key as string;
      const value = row.value;
      switch (key) {
        case 'min_version_code':
          config.minVersionCode = Number(value) || 1;
          break;
        case 'latest_version_code':
          config.latestVersionCode = Number(value) || undefined;
          break;
        case 'update_url':
          config.updateUrl = String(value || '') || undefined;
          break;
        case 'update_message':
          config.updateMessage = String(value || '') || undefined;
          break;
        case 'maintenance_mode':
          config.maintenanceMode = !!value;
          break;
        case 'maintenance_message':
          config.maintenanceMessage = String(value || '') || undefined;
          break;
        case 'features':
          if (typeof value === 'object' && value !== null) {
            config.features = value as Record<string, boolean>;
          }
          break;
      }
    }

    await saveCache({ config, fetchedAt: Date.now() });
    return config;
  } catch (err) {
    console.warn('[appConfig] Fetch failed, falling back to cache/default:', err);
    // 3. Fallback cache stale
    const stale = await loadCache();
    if (stale) return stale.config;
    // 4. Default
    return DEFAULT_CONFIG;
  }
}

async function loadCache(): Promise<CachedConfig | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachedConfig;
  } catch {
    return null;
  }
}

async function saveCache(c: CachedConfig): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch {}
}

/**
 * Cek apakah versi app saat ini perlu di-force-update.
 */
export function isUpdateRequired(
  currentVersionCode: number,
  config: AppConfig
): boolean {
  return currentVersionCode < (config.minVersionCode || 1);
}

/**
 * Cek apakah ada update tersedia tapi tidak wajib (soft prompt).
 */
export function isUpdateAvailable(
  currentVersionCode: number,
  config: AppConfig
): boolean {
  if (!config.latestVersionCode) return false;
  return currentVersionCode < config.latestVersionCode;
}
