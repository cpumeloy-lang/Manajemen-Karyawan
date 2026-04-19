import { authSupabase } from './authSupabaseClient';

// Menggunakan variabel lingkungan untuk konfigurasi Supabase
let configuredSupabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();

if (configuredSupabaseUrl && configuredSupabaseUrl.includes('<IP_KOMPUTER_SERVER>')) {
  configuredSupabaseUrl = configuredSupabaseUrl.replace('<IP_KOMPUTER_SERVER>', window.location.hostname);
}

const supabaseUrl =
  configuredSupabaseUrl.toLowerCase() === 'auto'
    ? `${window.location.protocol}//${window.location.hostname}:54321`
    : configuredSupabaseUrl;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validasi konfigurasi untuk mencegah error
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Konfigurasi Supabase tidak lengkap!');
  console.error('VITE_SUPABASE_URL:', configuredSupabaseUrl ? 'SET' : 'MISSING');
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseKey ? 'SET' : 'MISSING');
  console.error('Pastikan VITE_SUPABASE_URL berisi URL hosted Supabase (atau gunakan nilai "auto" untuk mode lokal) dan VITE_SUPABASE_ANON_KEY telah diatur.');
} else {
  console.log('✅ Supabase configuration loaded');
  console.log('📍 URL:', supabaseUrl);
}

// Reuse auth client to avoid spawning another GoTrue client instance.
export const supabase = authSupabase;

// Fungsi helper untuk mengubah objek dari snake_case (DB) ke camelCase (JS)
// Diabaikan untuk saat ini karena kita menggunakan quoted identifiers
// export const fromSnakeCase = (data: any) => { ... }

// Fungsi helper untuk mengubah objek dari camelCase (JS) ke snake_case (DB)
// Diabaikan untuk saat ini
// export const toSnakeCase = (data: any) => { ... }


