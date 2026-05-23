// Redis caching layer using singleton client from services/redisClient.js
import { getRedisClient } from './redisClient.js';
import loggingService from './loggingService.js';
export class RedisCache {
    config;
    constructor(config) {
        this.config = config;
    }
    static generateKey(type, ...params) {
        return `${type}:${params.join(':')}`;
    }
    async get(key) {
        try {
            const client = await getRedisClient();
            const data = await client.get(key);
            return data ? JSON.parse(data) : null;
        }
        catch (err) {
            loggingService.error('Redis GET error', { error: err.message });
            return null;
        }
    }
    async set(key, value, ttlSeconds) {
        try {
            const client = await getRedisClient();
            const serialized = JSON.stringify(value);
            if (ttlSeconds)
                await client.set(key, serialized, { EX: ttlSeconds });
            else
                await client.set(key, serialized);
        }
        catch (err) {
            loggingService.error('Redis SET error', { error: err.message });
        }
    }
    async del(key) {
        try {
            const client = await getRedisClient();
            await client.del(key);
        }
        catch (err) {
            loggingService.error('Redis DEL error', { error: err.message });
        }
    }
    async exists(key) {
        try {
            const client = await getRedisClient();
            const r = await client.exists(key);
            return r === 1;
        }
        catch (err) {
            loggingService.error('Redis EXISTS error', { error: err.message });
            return false;
        }
    }
    async incr(key) {
        try {
            const client = await getRedisClient();
            return await client.incr(key);
        }
        catch (err) {
            loggingService.error('Redis INCR error', { error: err.message });
            return null;
        }
    }
    async expire(key, seconds) {
        try {
            const client = await getRedisClient();
            return await client.expire(key, seconds);
        }
        catch (err) {
            loggingService.error('Redis EXPIRE error', { error: err.message });
            return false;
        }
    }
    async keys(pattern) {
        try {
            const client = await getRedisClient();
            return await client.keys(pattern);
        }
        catch (err) {
            loggingService.error('Redis KEYS error', { error: err.message });
            return [];
        }
    }
    async invalidatePattern(pattern) {
        try {
            const client = await getRedisClient();
            const keys = await client.keys(pattern);
            if (keys.length)
                await client.del(keys);
        }
        catch (err) {
            loggingService.error('Redis invalidate pattern error', { error: err.message });
        }
    }
    async ping() {
        try {
            const client = await getRedisClient();
            const r = await client.ping();
            return r === 'PONG' || r === 'PONG\r';
        }
        catch (err) {
            loggingService.error('Redis ping error', { error: err.message });
            return false;
        }
    }
    async info() {
        try {
            const client = await getRedisClient();
            const info = await client.info();
            const lines = info.split('\n').map(l => l.trim()).filter(Boolean);
            const map = {};
            for (const line of lines) {
                if (line.startsWith('#'))
                    continue;
                const [k, v] = line.split(':');
                if (!k || v === undefined)
                    continue;
                map[k] = v;
            }
            return map;
        }
        catch (err) {
            loggingService.error('Redis info error', { error: err.message });
            return null;
        }
    }
    // convenience wrappers used by app
    async getUser(userId) { return this.get(RedisCache.generateKey('user', userId)); }
    async setUser(userId, userData) { return this.set(RedisCache.generateKey('user', userId), userData, this.config.ttl.user); }
    async invalidateUser(userId) { return this.del(RedisCache.generateKey('user', userId)); }
    async getEmployeesPage(page, limit, filters) {
        const filterStr = JSON.stringify(filters || {});
        return this.get(RedisCache.generateKey('employees', page, limit, filterStr));
    }
    async setEmployeesPage(page, limit, filters, data) {
        const filterStr = JSON.stringify(filters || {});
        return this.set(RedisCache.generateKey('employees', page, limit, filterStr), data, this.config.ttl.employees);
    }
}
export const defaultCacheConfig = {
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
let cacheInstance = null;
export const getCache = () => {
    if (!cacheInstance) {
        cacheInstance = new RedisCache(defaultCacheConfig);
        // Mock all methods to return safe defaults if offline
        const mock = async () => null;
        cacheInstance.get = mock;
        cacheInstance.set = mock;
        cacheInstance.del = mock;
        cacheInstance.exists = async () => false;
        cacheInstance.keys = async () => [];
        cacheInstance.invalidatePattern = mock;
        cacheInstance.getUser = mock;
        cacheInstance.setUser = mock;
        cacheInstance.invalidateUser = mock;
    }
    return cacheInstance;
};
export const withCache = (handler, ttlSeconds) => {
    return async (req, res, next) => {
        const key = `api:${req.method}:${req.originalUrl}`;
        try {
            const cached = await getCache().get(key);
            if (cached)
                return res.json(cached);
            const originalJson = res.json;
            res.json = function (data) {
                getCache().set(key, data, ttlSeconds).catch(() => { });
                return originalJson.call(this, data);
            };
            await handler(req, res, next);
        }
        catch (err) {
            loggingService.error('Cache middleware error', { error: err.message });
            await handler(req, res, next);
        }
    };
};
export default RedisCache;
