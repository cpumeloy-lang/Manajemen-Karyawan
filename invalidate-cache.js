#!/usr/bin/env node

// ===========================================
// REDIS CACHE INVALIDATION SCRIPT
// HRMS Production Readiness - Phase 2
// ===========================================

import Redis from 'redis';

class CacheInvalidator {
  constructor(config = {}) {
    this.config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      ...config
    };

    this.client = null;
  }

  async connect() {
    try {
      this.client = Redis.createClient({
        host: this.config.host,
        port: this.config.port,
        password: this.config.password,
        db: this.config.db
      });

      await this.client.connect();
      console.log('✅ Connected to Redis server');
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to Redis:', error.message);
      return false;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      console.log('✅ Disconnected from Redis');
    }
  }

  async invalidateKeys(pattern) {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length === 0) {
        console.log(`ℹ️  No keys found matching pattern: ${pattern}`);
        return 0;
      }

      console.log(`🗑️  Found ${keys.length} keys matching pattern: ${pattern}`);
      console.log('Keys to be deleted:');
      keys.forEach(key => console.log(`  - ${key}`));

      const deleted = await this.client.del(keys);
      console.log(`✅ Successfully deleted ${deleted} keys`);
      return deleted;
    } catch (error) {
      console.error('❌ Failed to invalidate keys:', error.message);
      return 0;
    }
  }

  async invalidateUser(userId) {
    const patterns = [
      `user:${userId}`,
      `user:${userId}:*`,
      `dashboard:*${userId}*`,
      `employees:*${userId}*`,
      `attendance:${userId}:*`
    ];

    let totalDeleted = 0;
    for (const pattern of patterns) {
      const deleted = await this.invalidateKeys(pattern);
      totalDeleted += deleted;
    }

    console.log(`✅ Invalidated all cache for user ${userId} (${totalDeleted} keys)`);
    return totalDeleted;
  }

  async invalidateAllUsers() {
    return await this.invalidateKeys('user:*');
  }

  async invalidateAllDashboards() {
    return await this.invalidateKeys('dashboard:*');
  }

  async invalidateAllEmployees() {
    return await this.invalidateKeys('employees:*');
  }

  async invalidateAllAttendance() {
    return await this.invalidateKeys('attendance:*');
  }

  async invalidateAllReports() {
    return await this.invalidateKeys('report:*');
  }

  async clearAllCache() {
    try {
      const keys = await this.client.keys('*');
      if (keys.length === 0) {
        console.log('ℹ️  Cache is already empty');
        return 0;
      }

      console.log(`🗑️  Clearing all ${keys.length} keys from cache...`);
      const deleted = await this.client.flushdb();
      console.log(`✅ Successfully cleared all cache (${deleted} keys)`);
      return keys.length;
    } catch (error) {
      console.error('❌ Failed to clear cache:', error.message);
      return 0;
    }
  }

  async getCacheSize() {
    try {
      const keys = await this.client.keys('*');
      return keys.length;
    } catch (error) {
      console.error('❌ Failed to get cache size:', error.message);
      return 0;
    }
  }

  async showCacheContents(limit = 50) {
    try {
      const keys = await this.client.keys('*');
      console.log(`\n📋 Cache Contents (${keys.length} total keys, showing first ${limit}):`);

      for (let i = 0; i < Math.min(keys.length, limit); i++) {
        const key = keys[i];
        const type = await this.client.type(key);
        const ttl = await this.client.ttl(key);

        let value = 'N/A';
        try {
          if (type === 'string') {
            const rawValue = await this.client.get(key);
            // Try to parse as JSON, show truncated if too long
            try {
              const parsed = JSON.parse(rawValue);
              value = JSON.stringify(parsed).substring(0, 100);
              if (JSON.stringify(parsed).length > 100) value += '...';
            } catch {
              value = rawValue.substring(0, 100);
              if (rawValue.length > 100) value += '...';
            }
          } else if (type === 'hash') {
            const hashData = await this.client.hgetall(key);
            value = `Hash with ${Object.keys(hashData).length} fields`;
          } else if (type === 'list') {
            const length = await this.client.llen(key);
            value = `List with ${length} items`;
          } else if (type === 'set') {
            const size = await this.client.scard(key);
            value = `Set with ${size} members`;
          }
        } catch (e) {
          value = 'Error reading value';
        }

        console.log(`${i + 1}. ${key} (${type}, TTL: ${ttl === -1 ? 'no expiry' : ttl + 's'})`);
        console.log(`   Value: ${value}`);
      }

      if (keys.length > limit) {
        console.log(`\n... and ${keys.length - limit} more keys`);
      }

      return keys.length;
    } catch (error) {
      console.error('❌ Failed to show cache contents:', error.message);
      return 0;
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const invalidator = new CacheInvalidator();

  if (!(await invalidator.connect())) {
    process.exit(1);
  }

  try {
    switch (command) {
      case 'user':
        if (!args[1]) {
          console.log('❌ Please provide user ID: node invalidate-cache.js user <userId>');
          break;
        }
        await invalidator.invalidateUser(args[1]);
        break;

      case 'users':
        await invalidator.invalidateAllUsers();
        break;

      case 'dashboards':
        await invalidator.invalidateAllDashboards();
        break;

      case 'employees':
        await invalidator.invalidateAllEmployees();
        break;

      case 'attendance':
        await invalidator.invalidateAllAttendance();
        break;

      case 'reports':
        await invalidator.invalidateAllReports();
        break;

      case 'pattern':
        if (!args[1]) {
          console.log('❌ Please provide pattern: node invalidate-cache.js pattern <pattern>');
          break;
        }
        await invalidator.invalidateKeys(args[1]);
        break;

      case 'clear':
        const confirm = args[1] === '--confirm';
        if (!confirm) {
          console.log('❌ This will clear ALL cache data. Use --confirm to proceed:');
          console.log('   node invalidate-cache.js clear --confirm');
          break;
        }
        await invalidator.clearAllCache();
        break;

      case 'size':
        const size = await invalidator.getCacheSize();
        console.log(`📊 Cache contains ${size} keys`);
        break;

      case 'show':
        const limit = parseInt(args[1]) || 50;
        await invalidator.showCacheContents(limit);
        break;

      default:
        console.log('Usage: node invalidate-cache.js <command> [options]');
        console.log('\nCommands:');
        console.log('  user <userId>        - Invalidate all cache for specific user');
        console.log('  users                - Invalidate all user-related cache');
        console.log('  dashboards           - Invalidate all dashboard cache');
        console.log('  employees            - Invalidate all employee cache');
        console.log('  attendance           - Invalidate all attendance cache');
        console.log('  reports              - Invalidate all report cache');
        console.log('  pattern <pattern>    - Invalidate keys matching pattern');
        console.log('  clear --confirm      - Clear ALL cache data');
        console.log('  size                 - Show total number of cached keys');
        console.log('  show [limit]         - Show cache contents (default 50 keys)');
        break;
    }
  } finally {
    await invalidator.disconnect();
  }
}

// Run if called directly
main().catch(console.error);

export default CacheInvalidator;