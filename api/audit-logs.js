import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const supabaseUrl = process.env.VITE_DATA_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(503).json({ success: false, error: 'Supabase service role key not configured' });
  }

  const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { mode = 'all', days = 90 } = req.body || {};

    if (mode === 'old') {
      const { error } = await adminSupabase.rpc('cleanup_old_audit_logs', { days_old: days });
      if (error) {
        return res.status(400).json({ success: false, error: 'Failed to clean old audit logs' });
      }
    } else {
      const { error } = await adminSupabase.rpc('delete_all_audit_logs');
      if (error) {
        return res.status(400).json({ success: false, error: 'Failed to delete all audit logs' });
      }
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Audit log delete error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
