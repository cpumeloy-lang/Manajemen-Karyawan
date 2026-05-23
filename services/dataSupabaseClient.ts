/**

 * DATA SUPABASE CLIENT

 * Purpose: Hosted database for ALL operational data

 * URL: https://<project-ref>.supabase.co (recommended)

 * Operations: Employees, Units, Attendance, Requests, Documents, etc.

 * Port: N/A for hosted (54321 only for local auto mode)

 * Note: NO authentication operations should use this client

 */



import logger from './logger.ts';
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

  logger.error('Supabase Data configuration missing!', undefined, {
    url: configuredDataUrl ? 'SET' : 'MISSING',
    key: dataSupabaseKey ? 'SET' : 'MISSING',
  });

} else {

  logger.info('Supabase Data Client Initialized', {
    url: dataSupabaseUrl,
    env: (configuredDataUrl && typeof configuredDataUrl === 'string' && configuredDataUrl.toLowerCase() === 'auto') ? 'local-auto' : 'hosted',
  });

}



// Reuse auth client to avoid auth/session race and duplicate GoTrue instances.

export const dataSupabase = authSupabase;



