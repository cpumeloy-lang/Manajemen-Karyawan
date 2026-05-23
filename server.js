import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createReadStream, existsSync } from 'fs';
import { createGzip } from 'zlib';
import { createClient } from '@supabase/supabase-js';
import loggingService from './server/services/loggingService.js';
import { getRedisStats } from './server/services/redisAdapter.js';
import dotenv from 'dotenv';
import { Sentry } from './server/services/sentryService.js';

import helmet from 'helmet';
import cors from 'cors';
import { setupSystemRoutes, setupMetricsRoute } from './server/routes/systemRoutes.js';
import { setupEmployeeRoutes } from './server/routes/employeeRoutes.js';
import { setupOrganizationRoutes } from './server/routes/organizationRoutes.js';
import { setupOperationsRoutes } from './server/routes/operationsRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

const SUPABASE_URL = process.env.VITE_DATA_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_DATA_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

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

const invalidateEmployeeCaches = async (employee) => {
  try {
    const { getCache } = await import('./server/services/redisCache.js');
    const cache = getCache();
    await cache.invalidatePattern('employees:*');
    const identifiers = [employee?.user_id, employee?.id].filter(Boolean);
    for (const identifier of identifiers) {
      await cache.invalidateUser(identifier);
    }
  } catch (err) {
    loggingService.warn('Employee cache invalidation failed', { error: err.message });
  }
};

const invalidateOrganizationCaches = async () => {
  try {
    const { getCache } = await import('./server/services/redisCache.js');
    const cache = getCache();
    await cache.invalidatePattern('employees:*');
    await cache.invalidatePattern('organization:*');
    await cache.invalidatePattern('units:*');
  } catch (err) {
    loggingService.warn('Organization cache invalidation failed', { error: err.message });
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

  // Create a per-request authenticated client with the user's JWT token
  // to ensure Supabase Row Level Security (RLS) is strictly enforced.
  const dbClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

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
    dbClient,
  };
};

const canManageEmployeesRole = (role) => role === 'admin' || role === 'hrd';
const canDeleteEmployeesRole = (role) => role === 'admin' || role === 'hrd';
const canManageOrganizationRole = (role) => role === 'admin';

// ── Error message helper ──
const getClientErrorMessage = (errorType, fallback = 'Operation failed') => {
  const errorMap = {
    auth_create_failed: 'Gagal membuat akun login, email mungkin sudah terdaftar.',
    profile_save_failed: 'Gagal menyimpan profil karyawan, periksa data yang dimasukkan.',
    delete_failed: 'Data gagal dihapus karena masih digunakan atau terhubung dengan data lain.',
    cleanup_failed: 'Gagal membersihkan data terkait. Operasi dibatalkan.',
    internal_error: 'Terjadi kesalahan sistem internal. Silakan hubungi administrator.',
    request_save_failed: 'Gagal menyimpan pengajuan perubahan data.',
    // [BE-M9] Adding explicit fallback mapping
  };

  // Production: Always return predefined mapped message or fallback
  // Dev: Can return more detailed errors if needed
  if (IS_PROD) {
    return errorMap[errorType] || fallback;
  }
  return errorMap[errorType] || fallback;
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
    loggingService.error(`[${context}] Logging failed`, { error: e?.message });
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

const normalizeEmptyStringsToNull = (payload) => {
  if (!payload || typeof payload !== 'object') return payload;

  const normalized = {};
  for (const [key, value] of Object.entries(payload)) {
    normalized[key] = typeof value === 'string' && value.trim() === '' ? null : value;
  }

  return normalized;
};

const allowedEmployeeFields = [
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
  'unit_kerja_id',
  'sertifikasi',
  'kompetensi',
  'gajiPokok',
  'tunjanganProfesi',
  'gaji_pokok',
  'tunjangan_profesi',
  'ktpNumber',
  'ktp_number',
  'npwp',
  'bpjsKesehatan',
  'bpjs_kesehatan',
  'bpjsKetenagakerjaan',
  'bpjs_ketenagakerjaan',
  'agama',
  'maritalStatus',
  'marital_status',
  'dependents',
  'address',
  'emergencyContacts',
  'emergency_contacts',
  'education',
  'workHistory',
  'work_history',
  'bankAccount',
  'bank_account',
  'isProfileCompleted',
  'is_profile_completed',
  'isVerified',
  'is_verified',
  'verifiedBy',
  'verified_by',
  'verifiedAt',
  'verified_at',
  'isLocked',
  'is_locked',
  'managedUnitId',
  'managed_unit_id'
];

const normalizeEmployeeData = (employeeData) => normalizeEmptyStringsToNull(pick(employeeData, allowedEmployeeFields));
const normalizeEmployeeUpdateData = (updateData) => normalizeEmptyStringsToNull(pick(updateData, allowedEmployeeFields));

const normalizeUnitData = (unit) => pick(unit, ['id', 'nama', 'shifts', 'shift_assignments']);
const normalizeSimpleNameEntity = (entity) => pick(entity, ['nama']);
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

// Parse JSON bodies for API endpoints (limit to prevent DoS)
app.use(express.json({ limit: '10mb' }));

// ── Security Headers ──
app.use(helmet({
  contentSecurityPolicy: false, // CSP handled by Vite build
  crossOriginEmbedderPolicy: false,
}));

// ── CORS ──
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || '').split(',').filter(Boolean);

// In production, CORS_ORIGINS must be set for security
if (IS_PROD && ALLOWED_ORIGINS.length === 0) {
  console.error('❌ CORS_ORIGINS environment variable must be set in production');
  console.error('Set CORS_ORIGINS to a comma-separated list of allowed origins (e.g., https://yourdomain.com)');
  process.exit(1);
}

app.use(cors({
  origin: ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS : (IS_PROD ? false : true), // Only allow all in development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));

// ── Redis-based Rate Limiter (scalable for multi-instance) ──
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 120;

const redisRateLimiter = async (req, res, next) => {
  try {
    const { getCache } = await import('./server/services/redisCache.js');
    const cache = getCache();
    const ip = req.ip || req.socket.remoteAddress;
    const key = `ratelimit:${ip}`;
    const windowSeconds = RATE_LIMIT_WINDOW_MS / 1000;

    // [BE-M2] Use atomic INCR
    const currentCount = await cache.incr(key);
    
    if (currentCount === 1) {
      // First request in window, set expiration
      await cache.expire(key, windowSeconds);
      return next();
    }

    if (currentCount > RATE_LIMIT_MAX) {
      res.setHeader('Retry-After', windowSeconds);
      return res.status(429).json({ error: 'Too many requests' });
    }

    next();
  } catch (err) {
    loggingService.warn('Redis rate limiter failed, allowing request', { error: err.message });
    next();
  }
};

app.use(redisRateLimiter);

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
      loggingService.warn(msg, { error: err.message });
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

// ── System Routes (Health & Metrics & Cache) ──
app.use('/api', setupSystemRoutes(publicSupabase));
app.use(setupMetricsRoute(null));

// ── Employee CRUD API ──
app.use('/api/employees', setupEmployeeRoutes({
  getRequesterContext,
  canManageEmployeesRole,
  canDeleteEmployeesRole,
  adminSupabase,
  logDetailedError,
  getClientErrorMessage,
  invalidateEmployeeCaches,
  normalizeEmployeeData,
  normalizeEmployeeUpdateData,
  loggingService
}));

// ── Organization API ──
app.use('/api/organization', setupOrganizationRoutes({
  getRequesterContext,
  canManageOrganizationRole,
  logDetailedError,
  getClientErrorMessage,
  invalidateOrganizationCaches,
  normalizeUnitData,
  normalizeSimpleNameEntity
}));

// ── Operations API ──
app.use('/api', setupOperationsRoutes({
  getRequesterContext,
  canManageOperationalRequestsRole,
  canManageOrganizationRole,
  normalizeRequestPayload,
  logDetailedError,
  getClientErrorMessage
}));

// ── SPA fallback ──
app.get('*', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// ── Error Handling Middleware (Sentry + custom) ──
if (process.env.SENTRY_DSN || process.env.VITE_SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  // Log to logging service
  try {
    loggingService.error('Unhandled error', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
  } catch (logErr) {
    console.error('Failed to log error:', logErr);
  }

  // Send error response
  const status = err.status || 500;
  const message = IS_PROD ? 'Internal server error' : err.message;
  
  res.status(status).json({
    success: false,
    error: message,
    ...(IS_PROD ? {} : { stack: err.stack }),
  });
});

// ── Start ──
app.listen(PORT, () => {
  console.log(`HRMS Pro server running on port ${PORT} [${IS_PROD ? 'PRODUCTION' : 'DEVELOPMENT'}]`);
});