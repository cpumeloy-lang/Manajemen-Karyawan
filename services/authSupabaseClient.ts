/**
 * AUTH SUPABASE CLIENT
 * Purpose: Hosted Supabase Authentication service
 * URL: https://<project-ref>.supabase.co (recommended)
 * Operations: Login, Logout, Password Reset, Session Management
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

let configuredAuthUrl = String(import.meta.env.VITE_AUTH_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '').trim();

if (configuredAuthUrl && configuredAuthUrl.includes('<IP_KOMPUTER_SERVER>')) {
  configuredAuthUrl = configuredAuthUrl.replace('<IP_KOMPUTER_SERVER>', window.location.hostname);
}

const authSupabaseUrl =
  (!configuredAuthUrl || String(configuredAuthUrl).toLowerCase() === 'auto')
    ? `${window.location.protocol}//${window.location.hostname}:54321`
    : configuredAuthUrl;

const authSupabaseKey = String(import.meta.env.VITE_AUTH_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '');


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
  [authClientKey]?: ReturnType<typeof createClient<Database>>;
};

export const authSupabase =
  globalAuthScope[authClientKey] ||
  createClient<Database>(authSupabaseUrl || 'http://localhost:54321', authSupabaseKey || 'dummy-key-to-prevent-crash-if-env-is-missing', {
  auth: {
    storageKey: 'hrms-auth-session',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});

globalAuthScope[authClientKey] = authSupabase;


