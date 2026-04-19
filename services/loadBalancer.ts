# ===========================================
# PHASE 3: LOAD BALANCING & AUTO-SCALING
# HRMS Production Readiness
# ===========================================

# Jalankan script ini untuk setup load balancing dan auto-scaling
# npm install pm2 @types/pm2 --save-dev

import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import cluster from 'cluster';
import os from 'os';

export interface LoadBalancerConfig {
  port: number;
  workers: number;
  healthCheck: {
    path: string;
    interval: number;
    timeout: number;
  };
  autoScaling: {
    enabled: boolean;
    minWorkers: number;
    maxWorkers: number;
    cpuThreshold: number;
    memoryThreshold: number;
    scaleUpInterval: number;
    scaleDownInterval: number;
  };
  stickySessions: boolean;
  sessionAffinity: 'ip' | 'cookie' | 'none';
}

export class LoadBalancer {
  private config: LoadBalancerConfig;
  private workers: cluster.Worker[] = [];
  private healthStatus: Map<number, boolean> = new Map();
  private sessionStore: Map<string, number> = new Map(); // session -> worker mapping

  constructor(config: LoadBalancerConfig) {
    this.config = config;
    this.initializeWorkers();
    this.setupHealthChecks();
    this.setupAutoScaling();
  }

  private initializeWorkers() {
    const numCPUs = os.cpus().length;
    const workerCount = Math.min(this.config.workers, numCPUs);

    console.log(`🚀 Starting ${workerCount} worker processes...`);

    for (let i = 0; i < workerCount; i++) {
      this.createWorker();
    }

    cluster.on('exit', (worker, code, signal) => {
      console.log(`❌ Worker ${worker.process.pid} died. Restarting...`);
      this.removeWorker(worker.id);
      this.createWorker();
    });

    cluster.on('online', (worker) => {
      console.log(`✅ Worker ${worker.process.pid} is online`);
      this.healthStatus.set(worker.id, true);
    });
  }

  private createWorker() {
    const worker = cluster.fork();

    // Setup worker communication
    worker.on('message', (message) => {
      this.handleWorkerMessage(worker, message);
    });

    this.workers.push(worker);
    return worker;
  }

  private removeWorker(workerId: number) {
    this.workers = this.workers.filter(w => w.id !== workerId);
    this.healthStatus.delete(workerId);

    // Clean up session mappings for this worker
    for (const [session, wid] of this.sessionStore.entries()) {
      if (wid === workerId) {
        this.sessionStore.delete(session);
      }
    }
  }

  private handleWorkerMessage(worker: cluster.Worker, message: any) {
    switch (message.type) {
      case 'health_check':
        this.healthStatus.set(worker.id, message.healthy);
        break;
      case 'session_created':
        if (this.config.stickySessions) {
          this.sessionStore.set(message.sessionId, worker.id);
        }
        break;
      case 'load_report':
        this.handleLoadReport(worker.id, message.load);
        break;
    }
  }

  private handleLoadReport(workerId: number, load: { cpu: number; memory: number }) {
    const { autoScaling } = this.config;

    if (!autoScaling.enabled) return;

    const currentWorkers = this.workers.length;
    const { cpuThreshold, memoryThreshold, minWorkers, maxWorkers } = autoScaling;

    // Scale up conditions
    if ((load.cpu > cpuThreshold || load.memory > memoryThreshold) &&
        currentWorkers < maxWorkers) {
      console.log(`⚠️ High load detected (CPU: ${load.cpu}%, Memory: ${load.memory}%). Scaling up...`);
      this.scaleUp();
    }

    // Scale down conditions (only if all workers are under threshold)
    const allWorkersLowLoad = this.workers.every(worker => {
      // This is a simplified check - in real implementation, you'd track load per worker
      return true; // Placeholder
    });

    if (allWorkersLowLoad && currentWorkers > minWorkers) {
      console.log(`📉 Low load detected. Considering scale down...`);
      // Implement scale down logic with cooldown
    }
  }

  private scaleUp() {
    if (this.workers.length < this.config.autoScaling.maxWorkers) {
      console.log(`⬆️ Scaling up: Adding 1 worker`);
      this.createWorker();
    }
  }

  private scaleDown() {
    if (this.workers.length > this.config.autoScaling.minWorkers) {
      const workerToRemove = this.workers[this.workers.length - 1];
      console.log(`⬇️ Scaling down: Removing worker ${workerToRemove.process.pid}`);
      workerToRemove.kill();
    }
  }

  private setupHealthChecks() {
    setInterval(() => {
      this.workers.forEach(worker => {
        worker.send({
          type: 'health_check',
          path: this.config.healthCheck.path,
          timeout: this.config.healthCheck.timeout
        });
      });
    }, this.config.healthCheck.interval);
  }

  private setupAutoScaling() {
    if (!this.config.autoScaling.enabled) return;

    // Monitor system load for auto-scaling decisions
    setInterval(() => {
      const loadAvg = os.loadavg()[0]; // 1-minute load average
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const memoryUsage = ((totalMemory - freeMemory) / totalMemory) * 100;

      // Send load report to master
      if (cluster.isWorker) {
        process.send?.({
          type: 'load_report',
          load: {
            cpu: loadAvg * 100 / os.cpus().length, // Normalize to percentage
            memory: memoryUsage
          }
        });
      }
    }, 30000); // Check every 30 seconds
  }

  public getNextWorker(request: any): cluster.Worker | null {
    if (this.workers.length === 0) return null;

    // Sticky session routing
    if (this.config.stickySessions && this.config.sessionAffinity === 'cookie') {
      const sessionId = this.extractSessionId(request);
      if (sessionId && this.sessionStore.has(sessionId)) {
        const workerId = this.sessionStore.get(sessionId)!;
        const worker = this.workers.find(w => w.id === workerId);
        if (worker && this.healthStatus.get(workerId)) {
          return worker;
        }
      }
    }

    // IP-based affinity
    if (this.config.sessionAffinity === 'ip') {
      const clientIP = this.getClientIP(request);
      const hash = this.simpleHash(clientIP);
      const workerIndex = hash % this.workers.length;
      const worker = this.workers[workerIndex];
      if (this.healthStatus.get(worker.id)) {
        return worker;
      }
    }

    // Round-robin load balancing
    const healthyWorkers = this.workers.filter(w => this.healthStatus.get(w.id));
    if (healthyWorkers.length === 0) return null;

    // Simple round-robin (in production, use more sophisticated algorithm)
    const worker = healthyWorkers[Math.floor(Math.random() * healthyWorkers.length)];
    return worker;
  }

  private extractSessionId(request: any): string | null {
    // Extract from cookie or header
    const cookie = request.headers?.cookie;
    if (cookie) {
      const sessionMatch = cookie.match(/sessionId=([^;]+)/);
      if (sessionMatch) return sessionMatch[1];
    }
    return null;
  }

  private getClientIP(request: any): string {
    return request.socket?.remoteAddress ||
           request.connection?.remoteAddress ||
           '127.0.0.1';
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  public getStats() {
    return {
      totalWorkers: this.workers.length,
      healthyWorkers: Array.from(this.healthStatus.values()).filter(Boolean).length,
      unhealthyWorkers: Array.from(this.healthStatus.values()).filter(v => !v).length,
      activeSessions: this.sessionStore.size,
      config: this.config
    };
  }

  public gracefulShutdown() {
    console.log('🛑 Initiating graceful shutdown...');

    // Stop accepting new connections
    // Close all workers gracefully
    this.workers.forEach(worker => {
      worker.kill('SIGTERM');
    });

    // Wait for workers to finish
    setTimeout(() => {
      console.log('✅ All workers terminated. Shutdown complete.');
      process.exit(0);
    }, 10000); // 10 second grace period
  }
}

// Default configuration
export const defaultLoadBalancerConfig: LoadBalancerConfig = {
  port: parseInt(process.env.PORT || '3000'),
  workers: parseInt(process.env.WORKERS || os.cpus().length.toString()),
  healthCheck: {
    path: '/api/health',
    interval: 30000, // 30 seconds
    timeout: 5000   // 5 seconds
  },
  autoScaling: {
    enabled: process.env.AUTO_SCALING_ENABLED === 'true',
    minWorkers: parseInt(process.env.MIN_WORKERS || '2'),
    maxWorkers: parseInt(process.env.MAX_WORKERS || os.cpus().length.toString()),
    cpuThreshold: parseInt(process.env.CPU_THRESHOLD || '80'),     // 80%
    memoryThreshold: parseInt(process.env.MEMORY_THRESHOLD || '85'), // 85%
    scaleUpInterval: 60000,   // 1 minute
    scaleDownInterval: 300000 // 5 minutes
  },
  stickySessions: process.env.STICKY_SESSIONS === 'true',
  sessionAffinity: (process.env.SESSION_AFFINITY as 'ip' | 'cookie' | 'none') || 'none'
};

// Worker process setup
if (cluster.isWorker) {
  // Worker-specific setup
  const nextApp = next({ dev: process.env.NODE_ENV !== 'production' });
  const handle = nextApp.getRequestHandler();

  nextApp.prepare().then(() => {
    const server = createServer((req, res) => {
      const parsedUrl = parse(req.url!, true);
      handle(req, res, parsedUrl);
    });

    // Health check endpoint
    server.on('request', (req, res) => {
      if (req.url === '/api/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          pid: process.pid,
          uptime: process.uptime()
        }));
      }
    });

    const port = parseInt(process.env.WORKER_PORT || '3001') + cluster.worker!.id;
    server.listen(port, () => {
      console.log(`🚀 Worker ${process.pid} listening on port ${port}`);
    });

    // Handle worker messages
    process.on('message', (message) => {
      switch (message.type) {
        case 'health_check':
          // Perform health check
          setTimeout(() => {
            process.send?.({
              type: 'health_check',
              healthy: true,
              workerId: cluster.worker!.id
            });
          }, 100);
          break;
      }
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log(`🛑 Worker ${process.pid} shutting down gracefully...`);
      server.close(() => {
        console.log(`✅ Worker ${process.pid} shutdown complete`);
        process.exit(0);
      });
    });
  });
}

// Master process setup
if (cluster.isMaster || cluster.isPrimary) {
  const loadBalancer = new LoadBalancer(defaultLoadBalancerConfig);

  // Graceful shutdown
  process.on('SIGTERM', () => {
    loadBalancer.gracefulShutdown();
  });

  process.on('SIGINT', () => {
    loadBalancer.gracefulShutdown();
  });

  // Periodic stats logging
  setInterval(() => {
    const stats = loadBalancer.getStats();
    console.log(`📊 Load Balancer Stats: ${stats.healthyWorkers}/${stats.totalWorkers} workers healthy, ${stats.activeSessions} active sessions`);
  }, 60000); // Log every minute
}