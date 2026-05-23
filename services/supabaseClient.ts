import { authSupabase } from './authSupabaseClient';
import logger from './logger.ts';

// Menggunakan variabel lingkungan untuk konfigurasi Supabase
let configuredSupabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || '').trim();

if (configuredSupabaseUrl && configuredSupabaseUrl.includes('<IP_KOMPUTER_SERVER>')) {
  configuredSupabaseUrl = configuredSupabaseUrl.replace('<IP_KOMPUTER_SERVER>', window.location.hostname);
}

const supabaseUrl =
  (!configuredSupabaseUrl || String(configuredSupabaseUrl).toLowerCase() === 'auto')
    ? `${window.location.protocol}//${window.location.hostname}:54321`
    : configuredSupabaseUrl;
const supabaseKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '');

// Validasi konfigurasi untuk mencegah error
if (!supabaseUrl || !supabaseKey) {
  logger.error('Konfigurasi Supabase tidak lengkap!', undefined, {
    url: configuredSupabaseUrl ? 'SET' : 'MISSING',
    key: supabaseKey ? 'SET' : 'MISSING',
  });
} else {
  logger.info('Supabase configuration loaded', { url: supabaseUrl });
}

// Reuse auth client to avoid spawning another GoTrue client instance.
export const supabase = authSupabase;

// Fungsi helper untuk mengubah objek dari snake_case (DB) ke camelCase (JS)
// Diabaikan untuk saat ini karena kita menggunakan quoted identifiers
// export const fromSnakeCase = (data: any) => { ... }

// Fungsi helper untuk mengubah objek dari camelCase (JS) ke snake_case (DB)
// Diabaikan untuk saat ini
// export const toSnakeCase = (data: any) => { ... }


