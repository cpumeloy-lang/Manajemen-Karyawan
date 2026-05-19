import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.VITE_DATA_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE URL or service role key');
  process.exit(2);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

(async () => {
  try {
    const now = Date.now();
    const payload = { nama: `test-pos-${now}` };
    const { data, error } = await admin.from('positions').insert(payload).select('*').single();
    if (error) {
      console.error('Insert error:', error);
      process.exit(1);
    }
    console.log('Insert success:', data);
    process.exit(0);
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
})();
