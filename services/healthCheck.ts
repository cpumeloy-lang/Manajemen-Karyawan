// ===========================================
// HEALTH CHECK ENDPOINTS - PHASE 3
// Application Health Monitoring
// ===========================================

import express from 'express';
import { getCache } from './redisCache.js';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

interface HealthCheck {
  status: string;
  timestamp: string;
  uptime: number;
  memory: NodeJS.MemoryUsage;
  version: string;
  checks: {
    redis: { status: string; response_time: number; error?: string };
    database: { status: string; response_time: number; error?: string };
    filesystem: { status: string; error?: string };
  };
  error?: string;
}

// Basic health check
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0',
    };

    res.json(health);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Detailed health check with dependencies
router.get('/health/detailed', async (req, res) => {
  const health: HealthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0',
    checks: {
      redis: { status: 'unknown', response_time: 0 },
      database: { status: 'unknown', response_time: 0 },
      filesystem: { status: 'unknown' },
    },
  };

  try {
    // Redis health check
    const redisStart = Date.now();
    const cache = getCache();
    const redisHealthy = await cache.ping();
    health.checks.redis = {
      status: redisHealthy ? 'healthy' : 'unhealthy',
      response_time: Date.now() - redisStart,
    };

    // Database health check
    const dbStart = Date.now();
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data, error } = await supabase.from('units').select('count').limit(1);
      health.checks.database = {
        status: error ? 'unhealthy' : 'healthy',
        response_time: Date.now() - dbStart,
        error: error?.message,
      };
    } else {
      health.checks.database = {
        status: 'unhealthy',
        response_time: Date.now() - dbStart,
        error: 'Supabase configuration missing',
      };
    }

    // Filesystem health check
    const fs = require('fs').promises;
    try {
      await fs.access('./package.json');
      health.checks.filesystem = { status: 'healthy' };
    } catch (error) {
      health.checks.filesystem = {
        status: 'unhealthy',
        error: 'Cannot access package.json',
      };
    }

    // Determine overall status
    const allHealthy = Object.values(health.checks).every(
      (check) => check.status === 'healthy'
    );
    health.status = allHealthy ? 'healthy' : 'degraded';

    const statusCode = allHealthy ? 200 : 503;
    res.status(statusCode).json(health);

  } catch (error) {
    health.status = 'unhealthy';
    health.error = error.message;
    res.status(503).json(health);
  }
});

// Metrics endpoint for monitoring
router.get('/metrics', async (req, res) => {
  try {
    const metrics = {
      timestamp: new Date().toISOString(),
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
      },
      cache: null,
      database: null,
    };

    // Cache metrics
    try {
      const cache = getCache();
      const cacheStats = await cache.getStats();
      metrics.cache = cacheStats;
    } catch (error) {
      metrics.cache = { error: error.message };
    }

    // Database metrics (basic connection count)
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        // Note: Supabase doesn't expose connection pool metrics directly
        metrics.database = { configured: true };
      } else {
        metrics.database = { configured: false };
      }
    } catch (error) {
      metrics.database = { error: error.message };
    }

    res.json(metrics);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to collect metrics',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Readiness probe (for Kubernetes/Docker)
router.get('/ready', async (req, res) => {
  try {
    // Quick checks for readiness
    const cache = getCache();
    const redisReady = await cache.ping();

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

    let dbReady = false;
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { error } = await supabase.from('units').select('count').limit(1);
      dbReady = !error;
    }

    if (redisReady && dbReady) {
      res.json({
        status: 'ready',
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        status: 'not ready',
        redis: redisReady,
        database: dbReady,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;