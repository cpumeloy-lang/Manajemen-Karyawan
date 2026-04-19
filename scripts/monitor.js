#!/usr/bin/env node

// ===========================================
// MONITORING DASHBOARD - PHASE 3
// HRMS Production Monitoring
// ===========================================

import Redis from 'redis';

class MonitoringDashboard {
  constructor() {
    this.redis = null;
  }

  async connect() {
    try {
      this.redis = Redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      });
      await this.redis.connect();
      console.log('✅ Connected to Redis for monitoring');
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to Redis:', error.message);
      return false;
    }
  }

  async getSystemStatus() {
    const status = {
      timestamp: new Date().toISOString(),
      services: {},
      metrics: {},
    };

    // Check Redis
    try {
      const ping = await this.redis.ping();
      status.services.redis = { status: 'healthy', response_time: 0 };
    } catch (error) {
      status.services.redis = { status: 'unhealthy', error: error.message };
    }

    // Check application (simplified - would need actual health check)
    status.services.application = { status: 'unknown', message: 'Check PM2 status' };
    status.services.nginx = { status: 'unknown', message: 'Check Docker status' };
    status.services.database = { status: 'unknown', message: 'Check Docker status' };

    // Get cache metrics
    try {
      const cacheStats = await this.getCacheMetrics();
      status.metrics.cache = cacheStats;
    } catch (error) {
      status.metrics.cache = { error: error.message };
    }

    return status;
  }

  async getCacheMetrics() {
    try {
      const keys = await this.redis.keys('*');
      const totalKeys = keys.length;

      // Get cache hit rate (simplified - would need actual metrics)
      const info = await this.redis.info();
      const hits = info.match(/keyspace_hits:(\d+)/)?.[1] || 0;
      const misses = info.match(/keyspace_misses:(\d+)/)?.[1] || 0;
      const hitRate = totalKeys > 0 ? ((parseInt(hits) / (parseInt(hits) + parseInt(misses))) * 100).toFixed(2) : 0;

      return {
        total_keys: totalKeys,
        hit_rate: `${hitRate}%`,
        memory_usage: info.match(/used_memory_human:(.+)/)?.[1] || 'unknown',
        connected_clients: info.match(/connected_clients:(\d+)/)?.[1] || 0,
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  async showDashboard() {
    console.clear();
    console.log('🚀 HRMS Production Monitoring Dashboard');
    console.log('======================================');
    console.log(`📅 ${new Date().toLocaleString()}`);
    console.log('');

    const status = await this.getSystemStatus();

    // Services Status
    console.log('🔧 Services Status:');
    Object.entries(status.services).forEach(([service, info]) => {
      const icon = info.status === 'healthy' ? '✅' : info.status === 'unhealthy' ? '❌' : '⚠️';
      console.log(`   ${icon} ${service}: ${info.status}`);
      if (info.message) console.log(`      ${info.message}`);
      if (info.error) console.log(`      Error: ${info.error}`);
    });

    console.log('');

    // Cache Metrics
    console.log('📊 Cache Metrics:');
    if (status.metrics.cache.error) {
      console.log(`   ❌ Cache: ${status.metrics.cache.error}`);
    } else {
      console.log(`   🔑 Total Keys: ${status.metrics.cache.total_keys}`);
      console.log(`   🎯 Hit Rate: ${status.metrics.cache.hit_rate}`);
      console.log(`   💾 Memory: ${status.metrics.cache.memory_usage}`);
      console.log(`   👥 Clients: ${status.metrics.cache.connected_clients}`);
    }

    console.log('');
    console.log('💡 Commands:');
    console.log('   r - Refresh dashboard');
    console.log('   q - Quit');
    console.log('   h - Show help');
  }

  async startInteractive() {
    if (!(await this.connect())) {
      console.error('Failed to connect to Redis. Monitoring unavailable.');
      return;
    }

    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'monitor> '
    });

    rl.prompt();

    rl.on('line', async (line) => {
      const command = line.trim().toLowerCase();

      switch (command) {
        case 'r':
        case 'refresh':
          await this.showDashboard();
          break;

        case 'q':
        case 'quit':
        case 'exit':
          console.log('👋 Goodbye!');
          rl.close();
          await this.redis.quit();
          process.exit(0);
          break;

        case 'h':
        case 'help':
          console.log('📚 Available Commands:');
          console.log('   r, refresh - Refresh the dashboard');
          console.log('   q, quit    - Exit the monitoring dashboard');
          console.log('   h, help    - Show this help message');
          break;

        default:
          console.log('❓ Unknown command. Type "h" for help.');
          break;
      }

      rl.prompt();
    });

    rl.on('close', () => {
      console.log('👋 Monitoring session ended');
      process.exit(0);
    });

    // Show initial dashboard
    await this.showDashboard();
  }

  async startAutoRefresh(intervalMs = 30000) {
    if (!(await this.connect())) {
      return;
    }

    console.log(`🔄 Auto-refresh monitoring started (interval: ${intervalMs}ms)`);
    console.log('Press Ctrl+C to stop\n');

    const refresh = async () => {
      await this.showDashboard();
    };

    // Initial display
    await refresh();

    // Set up interval
    const interval = setInterval(refresh, intervalMs);

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Stopping monitoring...');
      clearInterval(interval);
      await this.redis.quit();
      process.exit(0);
    });
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const dashboard = new MonitoringDashboard();

  switch (command) {
    case 'dashboard':
    case 'interactive':
      await dashboard.startInteractive();
      break;

    case 'auto':
      const interval = parseInt(args[1]) || 30000;
      await dashboard.startAutoRefresh(interval);
      break;

    case 'status':
      if (await dashboard.connect()) {
        const status = await dashboard.getSystemStatus();
        console.log(JSON.stringify(status, null, 2));
        await dashboard.redis.quit();
      }
      break;

    default:
      console.log('Usage: node monitor.js <command>');
      console.log('');
      console.log('Commands:');
      console.log('  dashboard    - Start interactive monitoring dashboard');
      console.log('  auto [ms]    - Start auto-refresh monitoring (default 30s)');
      console.log('  status       - Show current system status as JSON');
      console.log('');
      break;
  }
}

// Run if called directly
main().catch(console.error);