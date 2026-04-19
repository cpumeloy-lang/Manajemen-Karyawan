import { createClient } from '@supabase/supabase-js';

const configuredSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || '';
const supabaseUrl = configuredSupabaseUrl.toLowerCase() === 'auto'
  ? 'http://127.0.0.1:54321'
  : configuredSupabaseUrl;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() || '';

/** Same host the app uses for Supabase API (bukan localhost di perangkat fisik). */
export function getSupabaseHealthCheckUrl(): string {
  return `${supabaseUrl.replace(/\/$/, '')}/health`;
}

if (!supabaseUrl) {
  console.error('EXPO_PUBLIC_SUPABASE_URL is missing! Use your hosted Supabase URL, e.g. https://<project-ref>.supabase.co');
}
if (!supabaseAnonKey) {
  console.error('EXPO_PUBLIC_SUPABASE_ANON_KEY is missing. Mobile auth/data calls will fail until it is provided.');
}

let supabase: any = null;
try {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
} catch (error) {
  console.error('Failed to create Supabase client:', error);
  // Create a dummy client for safety
  supabase = {
    auth: { signInWithPassword: () => Promise.reject(new Error('Supabase not initialized')), signOut: () => Promise.resolve() },
    from: () => ({ select: () => ({ eq: () => ({ single: () => Promise.reject(new Error('Supabase not initialized')) }) }) }),
  };
}

export { supabase };
