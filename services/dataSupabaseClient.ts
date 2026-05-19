/**

 * DATA SUPABASE CLIENT

 * Purpose: Hosted database for ALL operational data

 * URL: https://<project-ref>.supabase.co (recommended)

 * Operations: Employees, Units, Attendance, Requests, Documents, etc.

 * Port: N/A for hosted (54321 only for local auto mode)

 * Note: NO authentication operations should use this client

 */



import { authSupabase } from './authSupabaseClient';



let configuredDataUrl = import.meta.env.VITE_DATA_SUPABASE_URL?.trim();



if (configuredDataUrl && configuredDataUrl.includes('<IP_KOMPUTER_SERVER>')) {

  configuredDataUrl = configuredDataUrl.replace('<IP_KOMPUTER_SERVER>', window.location.hostname);

}



const dataSupabaseUrl =

  (configuredDataUrl && typeof configuredDataUrl === 'string' && configuredDataUrl.toLowerCase() === 'auto')

    ? `${window.location.protocol}//${window.location.hostname}:54321`

    : configuredDataUrl;



const dataSupabaseKey = import.meta.env.VITE_DATA_SUPABASE_ANON_KEY?.trim();



if (!dataSupabaseUrl || !dataSupabaseKey) {

  console.error('❌ Supabase Data configuration missing!');

  console.error('VITE_DATA_SUPABASE_URL:', configuredDataUrl ? 'SET' : 'MISSING');

  console.error('VITE_DATA_SUPABASE_ANON_KEY:', dataSupabaseKey ? 'SET' : 'MISSING');

  console.error('Please set hosted Supabase URL/key (or use auto for local mode).');

} else {

  console.log('✅ Supabase Data Client Initialized');

  console.log('📍 URL:', dataSupabaseUrl);

  console.log('🗄️  Purpose: Operational Data (Employees, Units, Attendance, etc.)');

  console.log((configuredDataUrl && typeof configuredDataUrl === 'string' && configuredDataUrl.toLowerCase() === 'auto') ? '🐳 Environment: Local auto mode (Port 54321)' : '☁️ Environment: Hosted Supabase');

}



// Reuse auth client to avoid auth/session race and duplicate GoTrue instances.

export const dataSupabase = authSupabase;



