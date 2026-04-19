#!/usr/bin/env node

// ===========================================
// AUTO-SCALING MANAGER - PHASE 3
// HRMS Production Auto-scaling
// ===========================================

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import fs from 'fs/promises';

const execAsync = promisify(exec);

class AutoScaler {
  constructor(config = {}) {
    this.config = {
      minWorkers: parseInt(process.env.MIN_WORKERS || '2'),
      maxWorkers: parseInt(process.env.MAX_WORKERS || '8'),
      cpuThreshold: parseInt(process.env.CPU_THRESHOLD || '80'),
      memoryThreshold: parseInt(process.env.MEMORY_THRESHOLD || '85'),
      scaleUpCooldown: parseInt(process.env.SCALE_UP_COOLDOWN || '300000'), // 5 minutes
      scaleDownCooldown: parseInt(process.env.SCALE_DOWN_COOLDOWN || '600000'), // 10 minutes
      checkInterval: parseInt(process.env.AUTO_SCALE_CHECK_INTERVAL || '30000'), // 30 seconds
      ...config
    };

    this.lastScaleUp = 0;
    this.lastScaleDown = 0;
    this.currentWorkers = this.config.minWorkers;
    this.isRunning = false;
  }

  async start() {
    console.log('🚀 Starting Auto-scaling Manager...');
    console.log(`📊 Configuration: ${this.config.minWorkers}-${this.config.maxWorkers} workers`);
    console.log(`🎯 Thresholds: CPU ${this.config.cpuThreshold}%, Memory ${this.config.memoryThreshold}%`);

    this.isRunning = true;
    this.monitor();
  }

  stop() {
    console.log('🛑 Stopping Auto-scaling Manager...');
    this.isRunning = false;
  }

  async monitor() {
    while (this.isRunning) {
      try {
        await this.checkAndScale();
        await this.sleep(this.config.checkInterval);
      } catch (error) {
        console.error('❌ Auto-scaling check failed:', error.message);
        await this.sleep(this.config.checkInterval);
      }
    }
  }

  async checkAndScale() {
    const metrics = await this.getSystemMetrics();
    const pm2Metrics = await this.getPM2Metrics();

    console.log(`📊 System: CPU ${metrics.cpu}%, Memory ${metrics.memory}%`);
    console.log(`👥 Workers: ${pm2Metrics.running}/${this.currentWorkers} running`);

    const shouldScaleUp = this.shouldScaleUp(metrics, pm2Metrics);
    const shouldScaleDown = this.shouldScaleDown(metrics, pm2Metrics);

    if (shouldScaleUp && this.canScaleUp()) {
      await this.scaleUp();
    } else if (shouldScaleDown && this.canScaleDown()) {
      await this.scaleDown();
    } else {
      console.log('✅ System operating within thresholds');
    }
  }

  shouldScaleUp(metrics, pm2Metrics) {
    const highCPU = metrics.cpu > this.config.cpuThreshold;
    const highMemory = metrics.memory > this.config.memoryThreshold;
    const workersAtCapacity = pm2Metrics.running >= this.currentWorkers;

    return (highCPU || highMemory) && workersAtCapacity;
  }

  shouldScaleDown(metrics, pm2Metrics) {
    const lowCPU = metrics.cpu < (this.config.cpuThreshold * 0.6); // 60% of threshold
    const lowMemory = metrics.memory < (this.config.memoryThreshold * 0.7); // 70% of threshold
    const hasExtraWorkers = this.currentWorkers > this.config.minWorkers;

    return lowCPU && lowMemory && hasExtraWorkers;
  }

  canScaleUp() {
    const now = Date.now();
    const timeSinceLastScaleUp = now - this.lastScaleUp;

    if (this.currentWorkers >= this.config.maxWorkers) {
      console.log('⚠️  Already at maximum workers');
      return false;
    }

    if (timeSinceLastScaleUp < this.config.scaleUpCooldown) {
      console.log('⏳  Scale-up cooldown active');
      return false;
    }

    return true;
  }

  canScaleDown() {
    const now = Date.now();
    const timeSinceLastScaleDown = now - this.lastScaleDown;

    if (this.currentWorkers <= this.config.minWorkers) {
      console.log('⚠️  Already at minimum workers');
      return false;
    }

    if (timeSinceLastScaleDown < this.config.scaleDownCooldown) {
      console.log('⏳  Scale-down cooldown active');
      return false;
    }

    return true;
  }

  async scaleUp() {
    const newWorkers = Math.min(this.currentWorkers + 1, this.config.maxWorkers);
    console.log(`📈 Scaling up from ${this.currentWorkers} to ${newWorkers} workers`);

    try {
      await this.setWorkerCount(newWorkers);
      this.currentWorkers = newWorkers;
      this.lastScaleUp = Date.now();
      console.log('✅ Successfully scaled up');
    } catch (error) {
      console.error('❌ Failed to scale up:', error.message);
    }
  }

  async scaleDown() {
    const newWorkers = Math.max(this.currentWorkers - 1, this.config.minWorkers);
    console.log(`📉 Scaling down from ${this.currentWorkers} to ${newWorkers} workers`);

    try {
      await this.setWorkerCount(newWorkers);
      this.currentWorkers = newWorkers;
      this.lastScaleDown = Date.now();
      console.log('✅ Successfully scaled down');
    } catch (error) {
      console.error('❌ Failed to scale down:', error.message);
    }
  }

  async setWorkerCount(count) {
    return new Promise((resolve, reject) => {
      const pm2 = spawn('pm2', ['scale', 'hrms-app', count], {
        stdio: 'inherit',
        cwd: process.cwd()
      });

      pm2.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`PM2 scale failed with code ${code}`));
        }
      });

      pm2.on('error', (error) => {
        reject(error);
      });
    });
  }

  async getSystemMetrics() {
    const cpus = os.cpus();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();

    // Calculate CPU usage (simplified)
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const cpuUsage = 100 - ~~(100 * idle / total);

    const memoryUsage = Math.round(((totalMemory - freeMemory) / totalMemory) * 100);

    return {
      cpu: cpuUsage,
      memory: memoryUsage,
      totalMemory: totalMemory,
      freeMemory: freeMemory
    };
  }

  async getPM2Metrics() {
    try {
      const { stdout } = await execAsync('pm2 jlist');
      const pm2Data = JSON.parse(stdout);

      const hrmsApp = pm2Data.find(app => app.name === 'hrms-app');
      if (!hrmsApp) {
        return { running: 0, total: 0 };
      }

      return {
        running: hrmsApp.pm2_env.instances || 1,
        total: hrmsApp.pm2_env.instances || 1,
        status: hrmsApp.pm2_env.status
      };
    } catch (error) {
      console.error('❌ Failed to get PM2 metrics:', error.message);
      return { running: 0, total: 0 };
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async gracefulShutdown() {
    console.log('🛑 Received shutdown signal, scaling to minimum workers...');
    try {
      await this.setWorkerCount(this.config.minWorkers);
      console.log('✅ Scaled to minimum workers for shutdown');
    } catch (error) {
      console.error('❌ Failed to scale down during shutdown:', error.message);
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const scaler = new AutoScaler();

  switch (command) {
    case 'start':
      await scaler.start();
      break;

    case 'stop':
      scaler.stop();
      break;

    case 'status':
      const metrics = await scaler.getSystemMetrics();
      const pm2Metrics = await scaler.getPM2Metrics();
      console.log('📊 Current Status:');
      console.log(`   System: CPU ${metrics.cpu}%, Memory ${metrics.memory}%`);
      console.log(`   Workers: ${pm2Metrics.running} running`);
      console.log(`   Config: ${scaler.config.minWorkers}-${scaler.config.maxWorkers} workers`);
      break;

    case 'scale-up':
      if (scaler.canScaleUp()) {
        await scaler.scaleUp();
      } else {
        console.log('❌ Cannot scale up at this time');
      }
      break;

    case 'scale-down':
      if (scaler.canScaleDown()) {
        await scaler.scaleDown();
      } else {
        console.log('❌ Cannot scale down at this time');
      }
      break;

    default:
      console.log('Usage: node auto-scaler.js <command>');
      console.log('Commands:');
      console.log('  start      - Start auto-scaling manager');
      console.log('  stop       - Stop auto-scaling manager');
      console.log('  status     - Show current status');
      console.log('  scale-up   - Manually scale up by 1 worker');
      console.log('  scale-down - Manually scale down by 1 worker');
      break;
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down auto-scaler...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down auto-scaler...');
  process.exit(0);
});

// Run if called directly
main().catch(console.error);

export default AutoScaler;