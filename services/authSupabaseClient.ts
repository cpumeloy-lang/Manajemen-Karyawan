/**
 * AUTH SUPABASE CLIENT
 * Purpose: Hosted Supabase Authentication service
 * URL: https://<project-ref>.supabase.co (recommended)
 * Operations: Login, Logout, Password Reset, Session Management
 */

import { createClient } from '@supabase/supabase-js';

let configuredAuthUrl = import.meta.env.VITE_AUTH_SUPABASE_URL?.trim();

if (configuredAuthUrl && configuredAuthUrl.includes('<IP_KOMPUTER_SERVER>')) {
  configuredAuthUrl = configuredAuthUrl.replace('<IP_KOMPUTER_SERVER>', window.location.hostname);
}

const authSupabaseUrl =
  configuredAuthUrl.toLowerCase() === 'auto'
    ? `${window.location.protocol}//${window.location.hostname}:54321`
    : configuredAuthUrl;

const authSupabaseKey = import.meta.env.VITE_AUTH_SUPABASE_ANON_KEY?.trim();

if (!authSupabaseUrl || !authSupabaseKey) {
  console.error('❌ Supabase Auth configuration missing!');
  console.error('VITE_AUTH_SUPABASE_URL:', authSupabaseUrl ? 'SET' : 'MISSING');
  console.error('VITE_AUTH_SUPABASE_ANON_KEY:', authSupabaseKey ? 'SET' : 'MISSING');
} else {
  console.log('✅ Supabase Auth Client Initialized');
  console.log('📍 URL:', authSupabaseUrl);
  console.log('🔐 Purpose: Authentication Only (Login, Logout, Password Reset)');
}

const authClientKey = '__hrms_auth_supabase_client__';
const globalAuthScope = globalThis as typeof globalThis & {
  [authClientKey]?: ReturnType<typeof createClient>;
};

export const authSupabase =
  globalAuthScope[authClientKey] ||
  createClient(authSupabaseUrl || '', authSupabaseKey || '', {
  auth: {
    storageKey: 'hrms-auth-session',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});

globalAuthScope[authClientKey] = authSupabase;


