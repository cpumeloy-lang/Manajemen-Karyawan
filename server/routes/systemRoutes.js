import express from 'express';
import { getRedisStats } from '../services/redisAdapter.js';
import { getCache } from '../services/redisCache.js';
import { validate } from '../middleware/validate.js';
import { cacheInvalidateSchema } from '../schemas/operationsSchemas.js';

/**
 * Validates the x-internal-auth header against INTERNAL_API_KEY env var.
 * Returns true if authenticated, false otherwise.
 */
const validateInternalAuth = (req) => {
  const configured = process.env.INTERNAL_API_KEY;
  if (!configured) return false;
  // Only accept via header (NOT query string — query strings appear in logs/CDN/referrers)
  const secret = req.header('x-internal-auth');
  return secret === configured;
};

export const setupSystemRoutes = (publicSupabase) => {
  const router = express.Router();

  // ── Public health check (minimal, no sensitive info) ──
  router.get('/health', async (req, res) => {
    // Check database connection
    let dbStatus = 'unknown';
    let overallStatus = 'healthy';
    try {
      const { error } = await publicSupabase
        .from('employees')
        .select('id')
        .limit(1);
      dbStatus = error ? 'unhealthy' : 'healthy';
      if (error) overallStatus = 'degraded';
    } catch {
      dbStatus = 'error';
      overallStatus = 'degraded';
    }

    // Check Redis connection
    let redisStatus = 'unknown';
    try {
      const cache = getCache();
      const testKey = 'health-check';
      await cache.set(testKey, 'ok', 5);
      const result = await cache.get(testKey);
      redisStatus = result === 'ok' ? 'healthy' : 'unhealthy';
      if (result !== 'ok') overallStatus = 'degraded';
    } catch {
      redisStatus = 'error';
      overallStatus = 'degraded';
    }

    // Public response: no nodeVersion, no memoryUsage, no detailed internals
    const publicHealth = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: {
        database: dbStatus,
        redis: redisStatus,
      },
    };

    // Detailed response only for authenticated internal callers
    if (validateInternalAuth(req)) {
      return res.status(overallStatus === 'healthy' ? 200 : 503).json({
        ...publicHealth,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage().rss,
        nodeVersion: process.version,
      });
    }

    const statusCode = overallStatus === 'healthy' ? 200 : 503;
    return res.status(statusCode).json(publicHealth);
  });

  router.post('/cache/invalidate', validate(cacheInvalidateSchema), async (req, res) => {
    try {
      // [BE-min4] Only accept secret via header, NOT query string
      // (query strings are logged by CDN, proxy servers, browser history, referrer headers)
      if (!validateInternalAuth(req)) {
        const configured = process.env.INTERNAL_API_KEY;
        if (!configured) return res.status(503).json({ error: 'internal_api_not_enabled' });
        return res.status(403).json({ error: 'Forbidden' });
      }

      const { pattern, userId } = req.body || {};
      const cache = getCache();
      if (pattern) await cache.invalidatePattern(pattern);
      if (userId) await cache.invalidateUser(userId);
      return res.json({ success: true });
    } catch {
      return res.status(500).json({ error: 'internal_error' });
    }
  });

  return router;
};

export const setupMetricsRoute = (rateLimitMap) => {
  const router = express.Router();

  // ── Prometheus metrics endpoint — requires internal auth ──
  router.get('/metrics', async (req, res) => {
    // [BE-M6] Protect metrics endpoint: only internal callers with x-internal-auth header
    if (!validateInternalAuth(req)) {
      res.setHeader('Content-Type', 'text/plain');
      return res.status(403).send('# 403 Forbidden\n');
    }

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
      lines.push(`hrms_rate_limit_map_size ${rateLimitMap ? rateLimitMap.size : 0}`);
      
      // Append Redis stats if available
      const redisStats = await getRedisStats().catch(() => null);
      if (redisStats) {
        lines.push('# HELP redis_connected_clients Number of connected Redis clients');
        lines.push('# TYPE redis_connected_clients gauge');
        lines.push(`redis_connected_clients ${redisStats.connected_clients}`);
        lines.push('# HELP redis_used_memory_bytes Redis used memory in bytes');
        lines.push('# TYPE redis_used_memory_bytes gauge');
        lines.push(`redis_used_memory_bytes ${redisStats.used_memory}`);
      }

      res.setHeader('Content-Type', 'text/plain; version=0.0.4');
      res.send(lines.join('\n'));
    } catch {
      res.status(500).send('');
    }
  });

  return router;
};

