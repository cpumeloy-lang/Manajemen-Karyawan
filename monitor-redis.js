#!/usr/bin/env node

// ===========================================
// REDIS CACHE MONITORING SCRIPT
// HRMS Production Readiness - Phase 2
// ===========================================

import Redis from 'redis';

class RedisMonitor {
  constructor(config = {}) {
    this.config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      ...config
    };

    this.client = null;
    this.interval = null;
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

  async getStats() {
    try {
      const info = await this.client.info();
      const stats = {};

      // Parse key metrics from INFO command
      const lines = info.split('\n');
      for (const line of lines) {
        if (line.includes(':')) {
          const [key, value] = line.split(':');
          stats[key] = value;
        }
      }

      return {
        server: {
          redis_version: stats.redis_version,
          uptime_in_seconds: parseInt(stats.uptime_in_seconds),
          connected_clients: parseInt(stats.connected_clients),
          total_connections_received: parseInt(stats.total_connections_received)
        },
        memory: {
          used_memory: parseInt(stats.used_memory),
          used_memory_human: stats.used_memory_human,
          used_memory_peak: parseInt(stats.used_memory_peak),
          used_memory_peak_human: stats.used_memory_peak_human,
          mem_fragmentation_ratio: parseFloat(stats.mem_fragmentation_ratio)
        },
        stats: {
          keyspace_hits: parseInt(stats.keyspace_hits),
          keyspace_misses: parseInt(stats.keyspace_misses),
          instantaneous_ops_per_sec: parseInt(stats.instantaneous_ops_per_sec),
          total_commands_processed: parseInt(stats.total_commands_processed)
        },
        cache: {
          hit_rate: this.calculateHitRate(stats.keyspace_hits, stats.keyspace_misses),
          total_keys: await this.getTotalKeys()
        }
      };
    } catch (error) {
      console.error('❌ Failed to get stats:', error.message);
      return null;
    }
  }

  calculateHitRate(hits, misses) {
    const total = parseInt(hits) + parseInt(misses);
    if (total === 0) return 0;
    return ((parseInt(hits) / total) * 100).toFixed(2);
  }

  async getTotalKeys() {
    try {
      const keys = await this.client.keys('*');
      return keys.length;
    } catch (error) {
      console.error('❌ Failed to get total keys:', error.message);
      return 0;
    }
  }

  async getKeyDetails() {
    try {
      const keys = await this.client.keys('*');
      const keyDetails = {};

      for (const key of keys.slice(0, 100)) { // Limit to first 100 keys for performance
        const type = await this.client.type(key);
        const ttl = await this.client.ttl(key);

        if (!keyDetails[type]) {
          keyDetails[type] = { count: 0, keys: [] };
        }

        keyDetails[type].count++;
        keyDetails[type].keys.push({ key, ttl });
      }

      return keyDetails;
    } catch (error) {
      console.error('❌ Failed to get key details:', error.message);
      return {};
    }
  }

  async monitor(intervalMs = 5000) {
    console.log(`🔍 Starting Redis monitoring (interval: ${intervalMs}ms)`);
    console.log('Press Ctrl+C to stop\n');

    this.interval = setInterval(async () => {
      const stats = await this.getStats();
      if (stats) {
        console.log(`\n📊 Redis Stats - ${new Date().toLocaleTimeString()}`);
        console.log('='.repeat(50));
        console.log(`Server: Redis ${stats.server.redis_version} (${stats.server.uptime_in_seconds}s uptime)`);
        console.log(`Clients: ${stats.server.connected_clients} connected`);
        console.log(`Memory: ${stats.memory.used_memory_human} used (${stats.memory.mem_fragmentation_ratio}x fragmentation)`);
        console.log(`Operations: ${stats.stats.instantaneous_ops_per_sec} ops/sec`);
        console.log(`Cache: ${stats.cache.hit_rate}% hit rate, ${stats.cache.total_keys} total keys`);
      }
    }, intervalMs);
  }

  stopMonitoring() {
    if (this.interval) {
      clearInterval(this.interval);
      console.log('\n🛑 Monitoring stopped');
    }
  }

  async healthCheck() {
    try {
      const pong = await this.client.ping();
      return pong === 'PONG';
    } catch (error) {
      return false;
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const monitor = new RedisMonitor();

  if (!(await monitor.connect())) {
    process.exit(1);
  }

  try {
    switch (command) {
      case 'stats':
        const stats = await monitor.getStats();
        console.log('\n📊 Redis Statistics:');
        console.log(JSON.stringify(stats, null, 2));
        break;

      case 'keys':
        const keyDetails = await monitor.getKeyDetails();
        console.log('\n🔑 Key Details:');
        console.log(JSON.stringify(keyDetails, null, 2));
        break;

      case 'monitor':
        const interval = parseInt(args[1]) || 5000;
        await monitor.monitor(interval);

        // Handle graceful shutdown
        process.on('SIGINT', async () => {
          monitor.stopMonitoring();
          await monitor.disconnect();
          process.exit(0);
        });

        // Keep the process running
        await new Promise(() => {});
        break;

      case 'health':
        const healthy = await monitor.healthCheck();
        console.log(healthy ? '✅ Redis is healthy' : '❌ Redis is not healthy');
        break;

      default:
        console.log('Usage: node monitor-redis.js <command>');
        console.log('Commands:');
        console.log('  stats    - Show detailed statistics');
        console.log('  keys     - Show key details and types');
        console.log('  monitor [interval] - Start real-time monitoring');
        console.log('  health   - Check Redis health');
        break;
    }
  } finally {
    await monitor.disconnect();
  }
}

// Run if called directly
main().catch(console.error);

export default RedisMonitor;