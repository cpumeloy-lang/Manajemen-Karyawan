import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const configuredSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || '';
const supabaseUrl = configuredSupabaseUrl.toLowerCase() === 'auto'
  ? 'http://127.0.0.1:54321'
  : configuredSupabaseUrl;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() || '';

/** Same host the app uses for Supabase API (bukan localhost di perangkat fisik). */
export function getSupabaseHealthCheckUrl(): string {
  return `${supabaseUrl.replace(/\/$/, '')}/health`;
}

/** Status inisialisasi Supabase. Dipakai AppShell untuk menampilkan layar error config. */
export interface SupabaseInitStatus {
  ready: boolean;
  reason?: string;
}

let initStatus: SupabaseInitStatus = { ready: false, reason: 'not_initialized' };
let supabase: SupabaseClient | null = null;

if (!supabaseUrl) {
  initStatus = {
    ready: false,
    reason:
      'EXPO_PUBLIC_SUPABASE_URL belum diatur. Set di file .env, contoh:\nEXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co',
  };
  console.error('[supabase] EXPO_PUBLIC_SUPABASE_URL is missing.');
} else if (!supabaseAnonKey) {
  initStatus = {
    ready: false,
    reason:
      'EXPO_PUBLIC_SUPABASE_ANON_KEY belum diatur. Salin anon key dari Supabase dashboard.',
  };
  console.error('[supabase] EXPO_PUBLIC_SUPABASE_ANON_KEY is missing.');
} else {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
    initStatus = { ready: true };
  } catch (error: any) {
    const message = error?.message || String(error);
    initStatus = { ready: false, reason: `Gagal inisialisasi Supabase: ${message}` };
    console.error('[supabase] createClient failed:', message);
  }
}

/**
 * Proxy yang memberi error eksplisit jika Supabase belum siap.
 * Lebih baik daripada client palsu yang menutupi root cause.
 */
const notReadyError = () =>
  new Error(initStatus.reason || 'Supabase belum dikonfigurasi. Cek file .env.');

const fallbackClient: SupabaseClient = new Proxy({} as SupabaseClient, {
  get() {
    throw notReadyError();
  },
});

export function getSupabaseInitStatus(): SupabaseInitStatus {
  return initStatus;
}

const exportedSupabase: SupabaseClient = supabase || fallbackClient;
export { exportedSupabase as supabase };
