// Redis caching layer using singleton client from services/redisClient.js
import { getRedisClient } from './redisClient.js';
import loggingService from './loggingService.js';

export interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  ttl: {
    user: number;
    dashboard: number;
    employees: number;
    attendance: number;
    reports: number;
  };
}

export class RedisCache {
  private config: CacheConfig;

  constructor(config: CacheConfig) {
    this.config = config;
  }

  static generateKey(type: string, ...params: any[]): string {
    return `${type}:${params.join(':')}`;
  }

  async get<T = any>(key: string): Promise<T | null> {
    try {
      const client = await getRedisClient();
      const data = await client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      loggingService.error('Redis GET error', { error: err.message });
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    try {
      const client = await getRedisClient();
      const serialized = JSON.stringify(value);
      if (ttlSeconds) await client.set(key, serialized, { EX: ttlSeconds });
      else await client.set(key, serialized);
    } catch (err) {
      loggingService.error('Redis SET error', { error: err.message });
    }
  }

  async del(key: string): Promise<void> {
    try {
      const client = await getRedisClient();
      await client.del(key);
    } catch (err) {
      loggingService.error('Redis DEL error', { error: err.message });
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const client = await getRedisClient();
      const r = await client.exists(key);
      return r === 1;
    } catch (err) {
      loggingService.error('Redis EXISTS error', { error: err.message });
      return false;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      const client = await getRedisClient();
      return await client.keys(pattern);
    } catch (err) {
      console.error('Redis KEYS error', err);
      return [];
    }
  }

  async invalidatePattern(pattern: string) {
    try {
      const client = await getRedisClient();
      const keys = await client.keys(pattern);
      if (keys.length) await client.del(keys);
    } catch (err) {
      console.error('Redis invalidate pattern error', err);
    }
  }

  async ping(): Promise<boolean> {
    try {
      const client = await getRedisClient();
      const r = await client.ping();
      return r === 'PONG' || r === 'PONG\r';
    } catch (err) {
      console.error('Redis ping error', err);
      return false;
    }
  }

  async info(): Promise<Record<string, string> | null> {
    try {
      const client = await getRedisClient();
      const info = await client.info();
      const lines = info.split('\n').map(l => l.trim()).filter(Boolean);
      const map: Record<string, string> = {};
      for (const line of lines) {
        if (line.startsWith('#')) continue;
        const [k, v] = line.split(':');
        if (!k || v === undefined) continue;
        map[k] = v;
      }
      return map;
    } catch (err) {
      console.error('Redis info error', err);
      return null;
    }
  }

  // convenience wrappers used by app
  async getUser(userId: string) { return this.get(RedisCache.generateKey('user', userId)); }
  async setUser(userId: string, userData: any) { return this.set(RedisCache.generateKey('user', userId), userData, this.config.ttl.user); }
  async invalidateUser(userId: string) { return this.del(RedisCache.generateKey('user', userId)); }

  async getEmployeesPage(page: number, limit: number, filters: any) {
    const filterStr = JSON.stringify(filters || {});
    return this.get(RedisCache.generateKey('employees', page, limit, filterStr));
  }

  async setEmployeesPage(page: number, limit: number, filters: any, data: any) {
    const filterStr = JSON.stringify(filters || {});
    return this.set(RedisCache.generateKey('employees', page, limit, filterStr), data, this.config.ttl.employees);
  }
}

export const defaultCacheConfig: CacheConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  ttl: {
    user: 300,
    dashboard: 120,
    employees: 600,
    attendance: 60,
    reports: 1800,
  }
};

let cacheInstance: RedisCache | null = null;
export const getCache = (): RedisCache => {
  if (!cacheInstance) cacheInstance = new RedisCache(defaultCacheConfig);
  return cacheInstance;
};

export const withCache = (handler: Function, ttlSeconds: number) => {
  return async (req: any, res: any, next: any) => {
    const key = `api:${req.method}:${req.originalUrl}`;
    try {
      const cached = await getCache().get(key);
      if (cached) return res.json(cached);
      const originalJson = res.json;
      res.json = function (data: any) {
        getCache().set(key, data, ttlSeconds).catch(() => {});
        return originalJson.call(this, data);
      };
      await handler(req, res, next);
    } catch (err) {
      console.error('Cache middleware error', err);
      await handler(req, res, next);
    }
  };
};

export default RedisCache;
