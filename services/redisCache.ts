# ===========================================
# REDIS CACHING LAYER - PHASE 2
# HRMS Production Readiness
# ===========================================

# Jalankan script ini untuk setup Redis caching
# npm install redis @types/redis

import Redis from 'redis';

export interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  ttl: {
    user: number;        // 5 minutes
    dashboard: number;   // 2 minutes
    employees: number;   // 10 minutes
    attendance: number;  // 1 minute
    reports: number;     // 30 minutes
  };
}

export class RedisCache {
  private client: any;
  private config: CacheConfig;

  constructor(config: CacheConfig) {
    this.config = config;
    this.client = Redis.createClient({
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db || 0,
      retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          console.error('Redis server connection refused');
          return new Error('Redis server connection refused');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          console.error('Redis retry time exhausted');
          return new Error('Retry time exhausted');
        }
        if (options.attempt > 10) {
          return undefined;
        }
        // Exponential backoff
        return Math.min(options.attempt * 100, 3000);
      }
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    this.client.on('connect', () => {
      console.log('✅ Redis client connected');
    });
  }

  // Generic cache methods
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Redis GET error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, serializedValue);
      } else {
        await this.client.set(key, serializedValue);
      }
    } catch (error) {
      console.error('Redis SET error:', error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      console.error('Redis DEL error:', error);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis EXISTS error:', error);
      return false;
    }
  }

  // Cache key generators
  static generateKey(type: string, ...params: any[]): string {
    return `${type}:${params.join(':')}`;
  }

  // User-specific cache methods
  async getUser(userId: string) {
    const key = RedisCache.generateKey('user', userId);
    return this.get(key);
  }

  async setUser(userId: string, userData: any) {
    const key = RedisCache.generateKey('user', userId);
    await this.set(key, userData, this.config.ttl.user);
  }

  async invalidateUser(userId: string) {
    const key = RedisCache.generateKey('user', userId);
    await this.del(key);
  }

  // Dashboard cache methods
  async getDashboardStats(unitId?: string) {
    const key = RedisCache.generateKey('dashboard', unitId || 'global');
    return this.get(key);
  }

  async setDashboardStats(unitId: string | undefined, stats: any) {
    const key = RedisCache.generateKey('dashboard', unitId || 'global');
    await this.set(key, stats, this.config.ttl.dashboard);
  }

  // Employee cache methods
  async getEmployeesPage(page: number, limit: number, filters: any) {
    const filterStr = JSON.stringify(filters);
    const key = RedisCache.generateKey('employees', page, limit, filterStr);
    return this.get(key);
  }

  async setEmployeesPage(page: number, limit: number, filters: any, data: any) {
    const filterStr = JSON.stringify(filters);
    const key = RedisCache.generateKey('employees', page, limit, filterStr);
    await this.set(key, data, this.config.ttl.employees);
  }

  // Attendance cache methods
  async getAttendancePage(employeeId: string, page: number, limit: number) {
    const key = RedisCache.generateKey('attendance', employeeId, page, limit);
    return this.get(key);
  }

  async setAttendancePage(employeeId: string, page: number, limit: number, data: any) {
    const key = RedisCache.generateKey('attendance', employeeId, page, limit);
    await this.set(key, data, this.config.ttl.attendance);
  }

  // Report cache methods (longer TTL)
  async getReport(reportType: string, params: any) {
    const paramStr = JSON.stringify(params);
    const key = RedisCache.generateKey('report', reportType, paramStr);
    return this.get(key);
  }

  async setReport(reportType: string, params: any, data: any) {
    const paramStr = JSON.stringify(params);
    const key = RedisCache.generateKey('report', reportType, paramStr);
    await this.set(key, data, this.config.ttl.reports);
  }

  // Bulk operations
  async invalidatePattern(pattern: string) {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
    } catch (error) {
      console.error('Redis invalidate pattern error:', error);
    }
  }

  // Invalidate all user caches
  async invalidateAllUsers() {
    await this.invalidatePattern('user:*');
  }

  // Invalidate all dashboard caches
  async invalidateAllDashboards() {
    await this.invalidatePattern('dashboard:*');
  }

  // Health check
  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis ping error:', error);
      return false;
    }
  }

  // Graceful shutdown
  async close() {
    try {
      await this.client.quit();
      console.log('✅ Redis client disconnected');
    } catch (error) {
      console.error('Redis close error:', error);
    }
  }

  // Cache statistics
  async getStats() {
    try {
      const info = await this.client.info();
      const stats = {
        connected_clients: info.match(/connected_clients:(\d+)/)?.[1],
        used_memory: info.match(/used_memory:(\d+)/)?.[1],
        total_connections_received: info.match(/total_connections_received:(\d+)/)?.[1],
        keyspace_hits: info.match(/keyspace_hits:(\d+)/)?.[1],
        keyspace_misses: info.match(/keyspace_misses:(\d+)/)?.[1],
      };
      return stats;
    } catch (error) {
      console.error('Redis stats error:', error);
      return null;
    }
  }
}

// Default configuration
export const defaultCacheConfig: CacheConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  ttl: {
    user: 300,        // 5 minutes
    dashboard: 120,   // 2 minutes
    employees: 600,   // 10 minutes
    attendance: 60,   // 1 minute
    reports: 1800,    // 30 minutes
  }
};

// Singleton instance
let cacheInstance: RedisCache | null = null;

export const getCache = (): RedisCache => {
  if (!cacheInstance) {
    cacheInstance = new RedisCache(defaultCacheConfig);
  }
  return cacheInstance;
};

// Cache middleware for API routes
export const withCache = (handler: Function, ttlSeconds: number) => {
  return async (req: any, res: any, next: any) => {
    const key = `api:${req.method}:${req.originalUrl}`;

    try {
      // Try to get from cache
      const cached = await getCache().get(key);
      if (cached) {
        return res.json(cached);
      }

      // Override res.json to cache the response
      const originalJson = res.json;
      res.json = function(data: any) {
        getCache().set(key, data, ttlSeconds);
        return originalJson.call(this, data);
      };

      await handler(req, res, next);
    } catch (error) {
      console.error('Cache middleware error:', error);
      await handler(req, res, next);
    }
  };
};

// Export default cache instance
export default RedisCache;