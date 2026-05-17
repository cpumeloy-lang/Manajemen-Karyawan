// Vercel serverless function untuk DELETE /api/audit-logs
// File ini auto-detected oleh Vercel sebagai API route
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_DATA_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

const adminSupabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

const getBearerToken = (req) => {
  const authHeader = String(req.headers.authorization || '');
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
};

const getRequesterContext = async (req) => {
  const token = getBearerToken(req);
  if (!token) return { ok: false, status: 401, error: 'Token autentikasi diperlukan' };

  const { data: { user }, error: userError } = await adminSupabase.auth.getUser(token);
  if (userError || !user) return { ok: false, status: 401, error: 'Token tidak valid atau kadaluarsa' };

  const { data: profile } = await adminSupabase
    .from('employees')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  return { ok: true, role: profile?.role || 'karyawan', userId: user.id };
};

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'DELETE') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    if (!adminSupabase) {
      return res.status(503).json({ success: false, error: 'Supabase server clients are not configured' });
    }

    const context = await getRequesterContext(req);
    if (!context.ok) {
      return res.status(context.status).json({ success: false, error: context.error });
    }

    if (context.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Hanya admin yang dapat menghapus audit log' });
    }

    const olderThanDays = parseInt(req.query.olderThanDays, 10) || 0;

    if (olderThanDays > 0) {
      const { data, error } = await adminSupabase.rpc('cleanup_old_audit_logs', {
        older_than_days: olderThanDays,
      });

      if (error) {
        return res.status(400).json({ success: false, error: error.message || 'Gagal membersihkan log lama' });
      }

      const deletedCount = data?.[0]?.deleted_count || 0;
      return res.json({ success: true, data: { deletedCount, olderThanDays } });
    } else {
      const { data, error } = await adminSupabase.rpc('delete_all_audit_logs');

      if (error) {
        return res.status(400).json({ success: false, error: error.message || 'Gagal menghapus semua log' });
      }

      const deletedCount = data?.[0]?.deleted_count || 0;
      return res.json({ success: true, data: { deletedCount } });
    }
  } catch (err) {
    console.error('AuditLog.delete.error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
