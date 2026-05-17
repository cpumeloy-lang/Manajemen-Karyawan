import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createReadStream, existsSync } from 'fs';
import { createGzip } from 'zlib';
import { createClient } from '@supabase/supabase-js';
import loggingService from './services/loggingService.js';
import { getRedisStats } from './services/redisAdapter.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

const SUPABASE_URL = process.env.VITE_DATA_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_DATA_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

const publicSupabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

const adminSupabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

// Fallback for local development: use anon key if service role key not available
const auditLogSupabase = adminSupabase || publicSupabase;

const invalidateEmployeeCaches = async (employee) => {
  try {
    const { getCache } = await import('./services/redisCache.js');
    const cache = getCache();
    await cache.invalidatePattern('employees:*');
    const identifiers = [employee?.user_id, employee?.id].filter(Boolean);
    for (const identifier of identifiers) {
      await cache.invalidateUser(identifier);
    }
  } catch (err) {
    console.warn('Employee cache invalidation failed', err);
  }
};

const invalidateOrganizationCaches = async () => {
  try {
    const { getCache } = await import('./services/redisCache.js');
    const cache = getCache();
    await cache.invalidatePattern('employees:*');
    await cache.invalidatePattern('organization:*');
    await cache.invalidatePattern('units:*');
  } catch (err) {
    console.warn('Organization cache invalidation failed', err);
  }
};

const getBearerToken = (req) => {
  const authHeader = String(req.headers.authorization || '');
  if (!authHeader.startsWith('Bearer ')) return '';
  return authHeader.slice(7).trim();
};

const getRequesterContext = async (req) => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { ok: false, status: 503, error: 'Supabase server clients are not configured' };
  }

  const token = getBearerToken(req);
  if (!token) {
    return { ok: false, status: 401, error: 'Missing authorization token' };
  }

  const { data: { user }, error: userError } = await publicSupabase.auth.getUser(token);
  if (userError || !user) {
    return { ok: false, status: 401, error: 'Invalid or expired session' };
  }

  // Use adminSupabase (bypasses RLS) if available, otherwise create
  // a per-request authenticated client with the user's JWT token
  let dbClient = adminSupabase;
  if (!dbClient) {
    dbClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
  }

  const { data: employee, error: employeeError } = await dbClient
    .from('employees')
    .select('id, user_id, role, "unitKerjaId", nama, email')
    .eq('user_id', user.id)
    .maybeSingle();

  if (employeeError || !employee) {
    return { ok: false, status: 403, error: 'Employee profile not found' };
  }

  return {
    ok: true,
    user,
    employee,
    role: String(employee.role || '').toLowerCase(),
    dbClient, // reusable DB client for subsequent operations
  };
};

const canManageEmployeesRole = (role) => role === 'admin' || role === 'hrd';
const canDeleteEmployeesRole = (role) => role === 'admin' || role === 'hrd';
const canManageOrganizationRole = (role) => role === 'admin';

// ── Error message helper ──
const getClientErrorMessage = (errorType, fallback = 'Operation failed') => {
  // Production: Always return generic message
  // Dev: Can show more details if needed
  if (IS_PROD) {
    return fallback;
  }
  // Dev mode can return the fallback or more detail
  return fallback;
};

const logDetailedError = (context, error, details = {}) => {
  try {
    loggingService.error(`[${context}]`, {
      error: error?.message || String(error),
      code: error?.code,
      status: error?.status,
      details,
    });
  } catch (e) {
    console.error(`[${context}] Logging failed:`, e?.message);
  }
};
const canManageOperationalRequestsRole = (role) => role === 'admin' || role === 'hrd' || role === 'kepala_ruangan';

const pick = (source, allowedKeys) => {
  const result = {};
  if (!source || typeof source !== 'object') return result;
  for (const key of allowedKeys) {
    if (Object.prototype.hasOwnProperty.call(source, key) && source[key] !== undefined) {
      result[key] = source[key];
    }
  }
  return result;
};

const normalizeEmployeeData = (employeeData) => pick(employeeData, [
  'user_id',
  'nik',
  'nama',
  'foto',
  'jabatan',
  'departemen',
  'email',
  'telepon',
  'hireDate',
  'birthDate',
  'status',
  'shift',
  'sisaCuti',
  'role',
  'spesialisasi',
  'kredensial',
  'nomorSTR',
  'tanggalKadaluarsaSTR',
  'unitKerjaId',
  'gajiPokok',
  'tunjanganProfesi',
  'sertifikasi',
  'kompetensi',
  'npwp',
  'agama',
  'dependents',
  'address',
  'education',
  // Extended fields (snake_case - matches DB columns from cloud_migration_patch)
  'ktp_number',
  'bpjs_kesehatan',
  'bpjs_ketenagakerjaan',
  'marital_status',
  'emergency_contacts',
  'work_history',
  'bank_account',
  'is_profile_completed',
  'is_verified',
  'verified_by',
  'verified_at',
  'is_locked',
  'managed_unit_id',
]);

const normalizeEmployeeUpdateData = (updateData) => pick(updateData, [
  'nik',
  'nama',
  'foto',
  'jabatan',
  'departemen',
  'email',
  'telepon',
  'hireDate',
  'birthDate',
  'status',
  'shift',
  'sisaCuti',
  'role',
  'spesialisasi',
  'kredensial',
  'nomorSTR',
  'tanggalKadaluarsaSTR',
  'unitKerjaId',
  'gajiPokok',
  'tunjanganProfesi',
  'sertifikasi',
  'kompetensi',
  'npwp',
  'agama',
  'dependents',
  'address',
  'education',
  // Extended fields (snake_case - matches DB columns from cloud_migration_patch)
  'ktp_number',
  'bpjs_kesehatan',
  'bpjs_ketenagakerjaan',
  'marital_status',
  'emergency_contacts',
  'work_history',
  'bank_account',
  'is_profile_completed',
  'is_verified',
  'verified_by',
  'verified_at',
  'is_locked',
  'managed_unit_id',
]);

const normalizeUnitData = (unit) => pick(unit, ['id', 'nama', 'shifts', 'shift_assignments']);
const normalizeSimpleNameEntity = (entity) => pick(entity, ['id', 'nama']);
const normalizeAttendanceData = (attendance) => pick(attendance, [
  'employeeId',
  'tanggal',
  'clockIn',
  'clockOut',
  'status',
  'shift',
  'notes',
  'source',
  'lat',
  'lng',
  'deviceId',
  'photoUrl',
]);

const normalizeRequestPayload = (payload) => pick(payload, [
  'employee_id',
  'attendance_date',
  'request_type',
  'reason_code',
  'reason_detail',
  'proposed_data',
  'current_data',
  'source_portal',
  'maker_user_id',
  'maker_employee_id',
  'maker_user_agent',
  'status',
]);

// (Duplicate block of pick + normalize* helpers removed.)

// Parse JSON bodies for API endpoints
app.use(express.json());

// ── Security Headers (Helmet-like, zero dependency) ──
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(self)');
  if (IS_PROD) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  res.removeHeader('X-Powered-By');
  next();
});

// ── CORS ──
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || '').split(',').filter(Boolean);
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ── Simple Rate Limiter (in-memory, per IP) ──
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 120;

app.use((req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress;
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record || now - record.start > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { start: now, count: 1 });
  } else {
    record.count++;
    if (record.count > RATE_LIMIT_MAX) {
      res.setHeader('Retry-After', Math.ceil((record.start + RATE_LIMIT_WINDOW_MS - now) / 1000));
      return res.status(429).json({ error: 'Too many requests' });
    }
  }
  next();
});

// Clean up rate limit map periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap) {
    if (now - record.start > RATE_LIMIT_WINDOW_MS) rateLimitMap.delete(ip);
  }
}, RATE_LIMIT_WINDOW_MS);

// ── Request Logging ──
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const msg = `${req.method} ${req.path} ${res.statusCode} ${duration}ms`;
    try {
      if (res.statusCode >= 500) loggingService.error(msg, { status: res.statusCode, duration });
      else if (res.statusCode >= 400) loggingService.warn(msg, { status: res.statusCode, duration });
      else if (!IS_PROD) loggingService.info(msg, { status: res.statusCode, duration });
      // In production we avoid noisy info logs
    } catch (err) {
      // fallback
      console.log(msg);
    }
  });
  next();
});

// ── Serve static files with caching ──
app.use(express.static(path.join(__dirname, 'dist'), {
  maxAge: IS_PROD ? '1y' : 0,
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    // Immutable cache for hashed assets
    if (filePath.includes('/assets/')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
    // No cache for index.html
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// ── Health check ──
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage().rss,
    nodeVersion: process.version,
  });
});

// ── Prometheus metrics endpoint ──
app.get('/metrics', async (req, res) => {
  try {
    const lines = [];
    lines.push('# HELP node_process_uptime_seconds Process uptime in seconds');
    lines.push('# TYPE node_process_uptime_seconds gauge');
    lines.push(`node_process_uptime_seconds ${process.uptime()}`);
    lines.push('# HELP node_memory_rss_bytes Resident set size in bytes');
    lines.push('# TYPE node_memory_rss_bytes gauge');
    lines.push(`node_memory_rss_bytes ${process.memoryUsage().rss}`);
    lines.push('# HELP hrms_rate_limit_map_size Number of IPs tracked by rate limiter');
    lines.push('# TYPE hrms_rate_limit_map_size gauge');
    lines.push(`hrms_rate_limit_map_size ${rateLimitMap.size}`);
    // Append Redis stats if available
    const redisStats = await getRedisStats().catch(() => null);
    if (redisStats) {
      lines.push('# HELP redis_connected_clients Number of connected Redis clients');
      lines.push('# TYPE redis_connected_clients gauge');
      lines.push(`redis_connected_clients ${redisStats.connected_clients}`);
      lines.push('# HELP redis_used_memory_bytes Redis used memory in bytes');
      lines.push('# TYPE redis_used_memory_bytes gauge');
      lines.push(`redis_used_memory_bytes ${redisStats.used_memory}`);
      lines.push('# HELP redis_keyspace_hits Redis keyspace hits');
      lines.push('# TYPE redis_keyspace_hits gauge');
      lines.push(`redis_keyspace_hits ${redisStats.keyspace_hits}`);
      lines.push('# HELP redis_keyspace_misses Redis keyspace misses');
      lines.push('# TYPE redis_keyspace_misses gauge');
      lines.push(`redis_keyspace_misses ${redisStats.keyspace_misses}`);
    }

    res.setHeader('Content-Type', 'text/plain; version=0.0.4');
    res.send(lines.join('\n'));
  } catch (err) {
    res.status(500).send('');
  }
});

// ── Employee CRUD API ──
app.post('/api/employees', async (req, res) => {
  try {
    const context = await getRequesterContext(req);
    if (!context.ok) {
      return res.status(context.status).json({ success: false, error: context.error });
    }

    if (!canManageEmployeesRole(context.role)) {
      return res.status(403).json({ success: false, error: 'Hanya admin & HRD yang dapat membuat karyawan baru' });
    }

    const { employeeData, password, documents = [] } = req.body || {};
    if (!employeeData || typeof employeeData !== 'object') {
      return res.status(400).json({ success: false, error: 'employeeData is required' });
    }

    let userId = employeeData.user_id || employeeData.userId || null;

    if (password && String(password).trim()) {
      const authClient = adminSupabase || context.dbClient;
      const { data: authData, error: authError } = await authClient.auth.admin.createUser({
        email: employeeData.email,
        password: String(password),
        email_confirm: true,
        user_metadata: {
          name: employeeData.nama || employeeData.name || employeeData.email,
        },
      });

      if (authError || !authData?.user) {
        logDetailedError('Employee.create.auth', authError, { email: employeeData.email });
        return res.status(400).json({ success: false, error: getClientErrorMessage('auth_create_failed', 'Gagal membuat akun login') });
      }

      userId = authData.user.id;
    }

    const profilePayload = normalizeEmployeeData(employeeData);
    if (userId) {
      profilePayload.user_id = userId;
    }

    const { data: newEmployee, error: profileError } = await context.dbClient
      .from('employees')
      .insert(profilePayload)
      .select('*')
      .single();

    if (profileError || !newEmployee) {
      if (userId && password) {
        await (adminSupabase || context.dbClient).auth.admin.deleteUser(userId).catch(() => {});
      }
      logDetailedError('Employee.create.profile', profileError, { userId, email: employeeData.email });
      return res.status(400).json({ success: false, error: getClientErrorMessage('profile_save_failed', 'Gagal menyimpan profil karyawan') });
    }

    if (Array.isArray(documents) && documents.length > 0) {
      const docsToInsert = documents.map((doc) => ({
        employeeId: newEmployee.id,
        name: doc?.name,
        type: doc?.type,
        fileUrl: doc?.fileUrl,
        uploadedAt: doc?.uploadedAt || new Date().toISOString(),
      }));

      const { error: docError } = await context.dbClient.from('documents').insert(docsToInsert);
      if (docError) {
        console.warn('Document insert failed after employee creation', docError);
      }
    }

    await invalidateEmployeeCaches(newEmployee);

    return res.status(201).json({
      success: true,
      data: newEmployee,
    });
  } catch (err) {
    logDetailedError('Employee.create.endpoint', err, { email: req.body?.employeeData?.email });
    return res.status(500).json({ success: false, error: getClientErrorMessage('internal_error', 'internal_error') });
  }
});

app.put('/api/employees/:id', async (req, res) => {
  try {
    const context = await getRequesterContext(req);
    if (!context.ok) {
      return res.status(context.status).json({ success: false, error: context.error });
    }

    if (!canManageEmployeesRole(context.role)) {
      return res.status(403).json({ success: false, error: 'Hanya admin & HRD yang dapat mengubah data karyawan' });
    }

    const { updateData } = req.body || {};
    if (!updateData || typeof updateData !== 'object') {
      return res.status(400).json({ success: false, error: 'updateData is required' });
    }

    const sanitizedUpdate = normalizeEmployeeUpdateData(updateData);

    const { data: updatedEmployee, error } = await context.dbClient
      .from('employees')
      .update(sanitizedUpdate)
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error || !updatedEmployee) {
      logDetailedError('Employee.update', error, { employeeId: req.params.id, sanitizedKeys: Object.keys(sanitizedUpdate) });
      const errMsg = IS_PROD
        ? `Gagal memperbarui: ${error?.message || error?.details || 'karyawan tidak ditemukan'}`
        : `Gagal memperbarui: ${error?.message || error?.details || 'karyawan tidak ditemukan'}`;
      return res.status(400).json({ success: false, error: errMsg });
    }

    await invalidateEmployeeCaches(updatedEmployee);

    return res.json({ success: true, data: updatedEmployee });
  } catch (err) {
    logDetailedError('Employee.update.endpoint', err, { employeeId: req.params.id });
    return res.status(500).json({ success: false, error: getClientErrorMessage('internal_error', 'internal_error') });
  }
});

app.delete('/api/employees/:id', async (req, res) => {
  try {
    const context = await getRequesterContext(req);
    if (!context.ok) {
      return res.status(context.status).json({ success: false, error: context.error });
    }

    if (!canDeleteEmployeesRole(context.role)) {
      return res.status(403).json({ success: false, error: 'Hanya admin yang dapat menghapus karyawan' });
    }

    const { data: targetEmployee, error: fetchError } = await context.dbClient
      .from('employees')
      .select('id, user_id, nama')
      .eq('id', req.params.id)
      .maybeSingle();

    if (fetchError || !targetEmployee) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    const { error } = await context.dbClient
      .from('employees')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      logDetailedError('Employee.delete', error, { employeeId: req.params.id });
      return res.status(400).json({ success: false, error: getClientErrorMessage('delete_failed', 'Gagal menghapus data') });
    }

    await invalidateEmployeeCaches(targetEmployee);

    return res.json({ success: true, data: { id: req.params.id } });
  } catch (err) {
    logDetailedError('Employee.delete.endpoint', err, { employeeId: req.params.id });
    return res.status(500).json({ success: false, error: getClientErrorMessage('internal_error', 'internal_error') });
  }
});

// ── Audit Log Cleanup (Admin only) ──
app.delete('/api/audit-logs', async (req, res) => {
  try {
    if (!auditLogSupabase) {
      return res.status(503).json({ success: false, error: 'Supabase client not configured' });
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
      // Delete logs older than X days via RPC
      const { data, error } = await auditLogSupabase.rpc('cleanup_old_audit_logs', {
        older_than_days: olderThanDays,
      });

      if (error) {
        logDetailedError('AuditLog.cleanup', error, { olderThanDays });
        return res.status(400).json({ success: false, error: error.message || 'Gagal membersihkan log lama' });
      }

      const deletedCount = data?.[0]?.deleted_count || 0;
      return res.json({ success: true, data: { deletedCount, olderThanDays } });
    } else {
      // Delete all logs via RPC
      const { data, error } = await auditLogSupabase.rpc('delete_all_audit_logs');

      if (error) {
        logDetailedError('AuditLog.deleteAll', error, {});
        return res.status(400).json({ success: false, error: error.message || 'Gagal menghapus semua log' });
      }

      const deletedCount = data?.[0]?.deleted_count || 0;
      return res.json({ success: true, data: { deletedCount } });
    }
  } catch (err) {
    logDetailedError('AuditLog.delete.endpoint', err, {});
    return res.status(500).json({ success: false, error: getClientErrorMessage('internal_error', 'internal_error') });
  }
});

app.post('/api/organization/units', async (req, res) => {
  try {
    const context = await getRequesterContext(req);
    if (!context.ok) {
      return res.status(context.status).json({ success: false, error: context.error });
    }

    if (!canManageOrganizationRole(context.role)) {
      return res.status(403).json({ success: false, error: 'Hanya admin yang dapat mengelola unit kerja' });
    }

    const { unit } = req.body || {};
    if (!unit || typeof unit !== 'object') {
      return res.status(400).json({ success: false, error: 'unit is required' });
    }

    const safeUnit = normalizeUnitData(unit);
    const payload = {
      nama: safeUnit.nama,
      shifts: safeUnit.shifts ?? null,
      shift_assignments: safeUnit.shift_assignments ?? null,
    };
    let result;
    if (unit.id) {
      const { data, error } = await context.dbClient
        .from('units')
        .update(payload)
        .eq('id', unit.id)
        .select('*')
        .single();
      if (error || !data) {
        logDetailedError('Unit.update', error, { unitId: unit.id });
        return res.status(400).json({ success: false, error: getClientErrorMessage('unit_save_failed', 'Gagal menyimpan unit kerja') });
      }
      result = data;
    } else {
      const { data, error } = await context.dbClient
        .from('units')
        .insert(payload)
        .select('*')
        .single();
      if (error || !data) {
        logDetailedError('Unit.create', error, { unitName: payload.nama });
        return res.status(400).json({ success: false, error: getClientErrorMessage('unit_save_failed', 'Gagal menyimpan unit kerja') });
      }
      result = data;
    }

    await invalidateOrganizationCaches();
    return res.json({ success: true, data: result });
  } catch (err) {
    logDetailedError('Unit.save.endpoint', err);
    return res.status(500).json({ success: false, error: getClientErrorMessage('internal_error', 'internal_error') });
  }
});

app.delete('/api/organization/units/:id', async (req, res) => {
  try {
    const context = await getRequesterContext(req);
    if (!context.ok) {
      return res.status(context.status).json({ success: false, error: context.error });
    }

    if (!canManageOrganizationRole(context.role)) {
      return res.status(403).json({ success: false, error: 'Hanya admin yang dapat menghapus unit kerja' });
    }

    const { data: targetUnit, error: fetchError } = await context.dbClient
      .from('units')
      .select('id, nama')
      .eq('id', req.params.id)
      .maybeSingle();

    if (fetchError || !targetUnit) {
      return res.status(404).json({ success: false, error: 'Unit kerja tidak ditemukan' });
    }

    const { error } = await context.dbClient.from('units').delete().eq('id', req.params.id);
    if (error) {
      logDetailedError('Unit.delete', error, { unitId: req.params.id });
      return res.status(400).json({ success: false, error: getClientErrorMessage('delete_failed', 'Gagal menghapus unit kerja') });
    }

    await context.dbClient
      .from('employees')
      .update({ unitKerjaId: null })
      .eq('unitKerjaId', req.params.id)
      .catch(() => {});

    await invalidateOrganizationCaches();
    return res.json({ success: true, data: { id: req.params.id } });
  } catch (err) {
    logDetailedError('Unit.delete.endpoint', err, { unitId: req.params.id });
    return res.status(500).json({ success: false, error: getClientErrorMessage('internal_error', 'internal_error') });
  }
});

app.post('/api/organization/departments', async (req, res) => {
  try {
    const context = await getRequesterContext(req);
    if (!context.ok) {
      return res.status(context.status).json({ success: false, error: context.error });
    }

    if (!canManageOrganizationRole(context.role)) {
      return res.status(403).json({ success: false, error: 'Hanya admin yang dapat mengelola departemen' });
    }

    const { department } = req.body || {};
    if (!department || typeof department !== 'object') {
      return res.status(400).json({ success: false, error: 'department is required' });
    }

    const payload = normalizeSimpleNameEntity(department);
    let result;
    if (department.id) {
      const { data, error } = await context.dbClient.from('departments').update(payload).eq('id', department.id).select('*').single();
      if (error || !data) {
        logDetailedError('Department.update', error, { departmentId: department.id });
        return res.status(400).json({ success: false, error: getClientErrorMessage('department_save_failed', 'Gagal menyimpan departemen') });
      }
      result = data;
    } else {
      const { data, error } = await context.dbClient.from('departments').insert(payload).select('*').single();
      if (error || !data) {
        logDetailedError('Department.create', error, { departmentName: payload.nama });
        return res.status(400).json({ success: false, error: getClientErrorMessage('department_save_failed', 'Gagal menyimpan departemen') });
      }
      result = data;
    }

    await invalidateOrganizationCaches();
    return res.json({ success: true, data: result });
  } catch (err) {
    logDetailedError('Department.save.endpoint', err);
    return res.status(500).json({ success: false, error: getClientErrorMessage('internal_error', 'internal_error') });
  }
});

app.delete('/api/organization/departments/:id', async (req, res) => {
  try {
    const context = await getRequesterContext(req);
    if (!context.ok) {
      return res.status(context.status).json({ success: false, error: context.error });
    }

    if (!canManageOrganizationRole(context.role)) {
      return res.status(403).json({ success: false, error: 'Hanya admin yang dapat menghapus departemen' });
    }

    const { data: targetDept, error: fetchError } = await context.dbClient.from('departments').select('id, nama').eq('id', req.params.id).maybeSingle();
    if (fetchError || !targetDept) {
      return res.status(404).json({ success: false, error: 'Departemen tidak ditemukan' });
    }

    const { error } = await context.dbClient.from('departments').delete().eq('id', req.params.id);
    if (error) {
      logDetailedError('Department.delete', error, { departmentId: req.params.id });
      return res.status(400).json({ success: false, error: getClientErrorMessage('delete_failed', 'Gagal menghapus departemen') });
    }

    await context.dbClient
      .from('employees')
      .update({ departemen: '' })
      .eq('departemen', targetDept.nama)
      .catch(() => {});

    await invalidateOrganizationCaches();
    return res.json({ success: true, data: { id: req.params.id } });
  } catch (err) {
    logDetailedError('Department.delete.endpoint', err, { departmentId: req.params.id });
    return res.status(500).json({ success: false, error: getClientErrorMessage('internal_error', 'internal_error') });
  }
});

app.post('/api/organization/positions', async (req, res) => {
  try {
    const context = await getRequesterContext(req);
    if (!context.ok) {
      return res.status(context.status).json({ success: false, error: context.error });
    }

    if (!canManageOrganizationRole(context.role)) {
      return res.status(403).json({ success: false, error: 'Hanya admin yang dapat mengelola jabatan' });
    }

    const { position } = req.body || {};
    if (!position || typeof position !== 'object') {
      return res.status(400).json({ success: false, error: 'position is required' });
    }

    const payload = normalizeSimpleNameEntity(position);
    let result;
    if (position.id) {
      const { data, error } = await context.dbClient.from('positions').update(payload).eq('id', position.id).select('*').single();
      if (error || !data) {
        logDetailedError('Position.update', error, { positionId: position.id });
        return res.status(400).json({ success: false, error: getClientErrorMessage('position_save_failed', 'Gagal menyimpan jabatan') });
      }
      result = data;
    } else {
      const { data, error } = await context.dbClient.from('positions').insert(payload).select('*').single();
      if (error || !data) {
        logDetailedError('Position.create', error, { positionName: payload.nama });
        return res.status(400).json({ success: false, error: getClientErrorMessage('position_save_failed', 'Gagal menyimpan jabatan') });
      }
      result = data;
    }

    await invalidateOrganizationCaches();
    return res.json({ success: true, data: result });
  } catch (err) {
    logDetailedError('Position.save.endpoint', err);
    return res.status(500).json({ success: false, error: getClientErrorMessage('internal_error', 'internal_error') });
  }
});

app.delete('/api/organization/positions/:id', async (req, res) => {
  try {
    const context = await getRequesterContext(req);
    if (!context.ok) {
      return res.status(context.status).json({ success: false, error: context.error });
    }

    if (!canManageOrganizationRole(context.role)) {
      return res.status(403).json({ success: false, error: 'Hanya admin yang dapat menghapus jabatan' });
    }

    const { data: targetPos, error: fetchError } = await context.dbClient.from('positions').select('id, nama').eq('id', req.params.id).maybeSingle();
    if (fetchError || !targetPos) {
      return res.status(404).json({ success: false, error: 'Jabatan tidak ditemukan' });
    }

    const { error } = await context.dbClient.from('positions').delete().eq('id', req.params.id);
    if (error) {
      logDetailedError('Position.delete', error, { positionId: req.params.id });
      return res.status(400).json({ success: false, error: getClientErrorMessage('delete_failed', 'Gagal menghapus jabatan') });
    }

    await context.dbClient
      .from('employees')
      .update({ jabatan: '' })
      .eq('jabatan', targetPos.nama)
      .catch(() => {});

    await invalidateOrganizationCaches();
    return res.json({ success: true, data: { id: req.params.id } });
  } catch (err) {
    logDetailedError('Position.delete.endpoint', err, { positionId: req.params.id });
    return res.status(500).json({ success: false, error: getClientErrorMessage('internal_error', 'internal_error') });
  }
});

app.post('/api/attendance-change-requests/bulk', async (req, res) => {
  try {
    const context = await getRequesterContext(req);
    if (!context.ok) {
      return res.status(context.status).json({ success: false, error: context.error });
    }

    if (!canManageOperationalRequestsRole(context.role)) {
      return res.status(403).json({ success: false, error: 'Tidak memiliki izin membuat request perubahan absensi' });
    }

    const { payloads } = req.body || {};
    if (!Array.isArray(payloads) || payloads.length === 0) {
      return res.status(400).json({ success: false, error: 'payloads is required' });
    }

    const normalizedPayloads = payloads.map((payload) => ({
      ...normalizeRequestPayload(payload),
      maker_user_id: context.user.id,
      maker_employee_id: context.employee.id,
      source_portal: payload.source_portal || 'operational',
      status: payload.status || 'pending',
    }));

    const { error } = await context.dbClient
      .from('attendance_change_requests')
      .insert(normalizedPayloads);

    if (error) {
      logDetailedError('AttendanceRequest.bulkCreate', error, { count: normalizedPayloads.length });
      return res.status(400).json({ success: false, error: getClientErrorMessage('request_save_failed', 'Gagal menyimpan request') });
    }

    return res.json({ success: true, count: normalizedPayloads.length });
  } catch (err) {
    logDetailedError('AttendanceRequest.bulkCreate.endpoint', err);
    return res.status(500).json({ success: false, error: getClientErrorMessage('internal_error', 'internal_error') });
  }
});

// ── Cache invalidation endpoint (internal) ──
app.post('/api/cache/invalidate', async (req, res) => {
  try {
    const secret = req.header('x-internal-auth') || req.query.key;
    const configured = process.env.INTERNAL_API_KEY;

    // Require INTERNAL_API_KEY to be configured for this endpoint to work
    if (!configured) {
      console.error('Cache invalidate attempted but INTERNAL_API_KEY not configured');
      return res.status(503).json({ error: 'internal_api_not_enabled' });
    }

    if (secret !== configured) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { pattern, userId } = req.body || {};
    const { getCache } = await import('./services/redisCache.js');
    const cache = getCache();
    if (pattern) await cache.invalidatePattern(pattern);
    if (userId) await cache.invalidateUser(userId);
    return res.json({ success: true });
  } catch (err) {
    console.error('Cache invalidate API error', err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

// ── SPA fallback ──
app.get('*', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// ── Global error handler ──
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
  res.status(500).json({ error: IS_PROD ? 'Internal server error' : err.message });
});

// ── Start (skip listen in Vercel serverless environment) ──
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`HRMS Pro server running on port ${PORT} [${IS_PROD ? 'PRODUCTION' : 'DEVELOPMENT'}]`);
  });
}

export default app;