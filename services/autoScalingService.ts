import { EventEmitter } from 'events';
import * as os from 'os';
import { spawn, ChildProcess } from 'child_process';
import { performance } from 'perf_hooks';

export interface ScalingConfig {
  minInstances: number;
  maxInstances: number;
  scaleUpThreshold: {
    cpu: number;      // CPU usage percentage
    memory: number;   // Memory usage percentage
    responseTime: number; // Average response time in ms
    queueLength: number;  // Request queue length
  };
  scaleDownThreshold: {
    cpu: number;
    memory: number;
    responseTime: number;
    queueLength: number;
  };
  cooldownPeriod: number;     // Cooldown between scaling actions (ms)
  scaleUpStep: number;        // Number of instances to add
  scaleDownStep: number;      // Number of instances to remove
  evaluationInterval: number; // How often to check metrics (ms)
}

export interface InstanceMetrics {
  instanceId: string;
  cpu: number;
  memory: number;
  responseTime: number;
  requestCount: number;
  errorRate: number;
  uptime: number;
  lastHealthCheck: number;
}

export interface ScalingDecision {
  action: 'scale-up' | 'scale-down' | 'maintain';
  reason: string;
  timestamp: number;
  currentInstances: number;
  targetInstances: number;
  metrics: {
    avgCpu: number;
    avgMemory: number;
    avgResponseTime: number;
    totalRequests: number;
  };
}

export class AutoScalingService extends EventEmitter {
  private config: ScalingConfig;
  private instances: Map<string, ChildProcess> = new Map();
  private metrics: Map<string, InstanceMetrics> = new Map();
  private lastScalingAction: number = 0;
  private evaluationTimer?: NodeJS.Timeout;
  private scalingHistory: ScalingDecision[] = [];

  constructor(config: ScalingConfig) {
    super();
    this.config = config;
    this.initializeAutoScaling();
  }

  private initializeAutoScaling() {
    // Start with minimum instances
    for (let i = 0; i < this.config.minInstances; i++) {
      this.spawnInstance();
    }

    // Start metrics evaluation
    this.evaluationTimer = setInterval(() => {
      this.evaluateScaling();
    }, this.config.evaluationInterval);

    // Setup cleanup on process exit
    process.on('SIGTERM', () => this.gracefulShutdown());
    process.on('SIGINT', () => this.gracefulShutdown());
  }

  private spawnInstance(): string {
    const instanceId = `instance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Spawn new application instance
    const instance = spawn('node', ['dist/index.js'], {
      env: {
        ...process.env,
        INSTANCE_ID: instanceId,
        PORT: this.getAvailablePort().toString()
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Setup instance monitoring
    this.setupInstanceMonitoring(instanceId, instance);

    this.instances.set(instanceId, instance);

    this.emit('instance-spawned', { instanceId, timestamp: Date.now() });

    return instanceId;
  }

  private getAvailablePort(): number {
    // Simple port allocation strategy
    const basePort = 3000;
    const usedPorts = Array.from(this.instances.values()).map(inst => {
      return parseInt(inst.spawnargs.find(arg => arg.startsWith('PORT='))?.split('=')[1] || '3000');
    });

    let port = basePort;
    while (usedPorts.includes(port)) {
      port++;
    }
    return port;
  }

  private setupInstanceMonitoring(instanceId: string, instance: ChildProcess) {
    // Initialize metrics
    this.metrics.set(instanceId, {
      instanceId,
      cpu: 0,
      memory: 0,
      responseTime: 0,
      requestCount: 0,
      errorRate: 0,
      uptime: performance.now(),
      lastHealthCheck: Date.now()
    });

    // Monitor instance stdout for metrics
    instance.stdout?.on('data', (data) => {
      this.parseInstanceMetrics(instanceId, data.toString());
    });

    // Monitor stderr for errors
    instance.stderr?.on('data', (data) => {
      console.error(`Instance ${instanceId} error:`, data.toString());
      this.updateErrorMetrics(instanceId);
    });

    // Handle instance exit
    instance.on('exit', (code, signal) => {
      console.log(`Instance ${instanceId} exited with code ${code}, signal ${signal}`);
      this.handleInstanceExit(instanceId);
    });

    // Periodic health checks
    const healthCheckInterval = setInterval(() => {
      this.performHealthCheck(instanceId);
    }, 30000); // Every 30 seconds

    // Store health check interval for cleanup
    (instance as any).healthCheckInterval = healthCheckInterval;
  }

  private parseInstanceMetrics(instanceId: string, data: string) {
    try {
      // Parse metrics from application logs
      // Expected format: METRICS: {"cpu": 45.2, "memory": 67.8, "responseTime": 234, "requestCount": 150}
      const metricsMatch = data.match(/METRICS:\s*({.+})/);
      if (metricsMatch) {
        const metrics = JSON.parse(metricsMatch[1]);
        this.updateInstanceMetrics(instanceId, metrics);
      }
    } catch (error) {
      console.warn(`Failed to parse metrics for ${instanceId}:`, error);
    }
  }

  private updateInstanceMetrics(instanceId: string, newMetrics: Partial<InstanceMetrics>) {
    const currentMetrics = this.metrics.get(instanceId);
    if (currentMetrics) {
      Object.assign(currentMetrics, newMetrics, {
        lastHealthCheck: Date.now()
      });
    }
  }

  private updateErrorMetrics(instanceId: string) {
    const metrics = this.metrics.get(instanceId);
    if (metrics) {
      metrics.errorRate = (metrics.errorRate + 1) / (metrics.requestCount + 1) * 100;
    }
  }

  private performHealthCheck(instanceId: string) {
    const instance = this.instances.get(instanceId);
    if (!instance) return;

    // Simple health check - in production, this would make HTTP request
    const isHealthy = !instance.killed && instance.exitCode === null;

    if (!isHealthy) {
      console.warn(`Health check failed for instance ${instanceId}`);
      this.handleUnhealthyInstance(instanceId);
    }
  }

  private handleUnhealthyInstance(instanceId: string) {
    console.log(`Removing unhealthy instance ${instanceId}`);
    this.removeInstance(instanceId);

    // Spawn replacement instance if above minimum
    if (this.instances.size >= this.config.minInstances) {
      this.spawnInstance();
    }
  }

  private handleInstanceExit(instanceId: string) {
    this.removeInstance(instanceId);

    // Auto-spawn replacement if we haven't reached scaling decision
    const timeSinceLastScaling = Date.now() - this.lastScalingAction;
    if (timeSinceLastScaling > this.config.cooldownPeriod &&
        this.instances.size < this.config.minInstances) {
      this.spawnInstance();
    }
  }

  private removeInstance(instanceId: string) {
    const instance = this.instances.get(instanceId);
    if (instance) {
      // Clear health check interval
      if ((instance as any).healthCheckInterval) {
        clearInterval((instance as any).healthCheckInterval);
      }

      // Graceful shutdown
      instance.kill('SIGTERM');

      // Force kill after timeout
      setTimeout(() => {
        if (!instance.killed) {
          instance.kill('SIGKILL');
        }
      }, 10000);
    }

    this.instances.delete(instanceId);
    this.metrics.delete(instanceId);

    this.emit('instance-removed', { instanceId, timestamp: Date.now() });
  }

  private evaluateScaling() {
    const now = Date.now();
    const timeSinceLastScaling = now - this.lastScalingAction;

    // Respect cooldown period
    if (timeSinceLastScaling < this.config.cooldownPeriod) {
      return;
    }

    const currentInstances = this.instances.size;
    const avgMetrics = this.calculateAverageMetrics();

    let decision: ScalingDecision = {
      action: 'maintain',
      reason: 'Conditions normal',
      timestamp: now,
      currentInstances,
      targetInstances: currentInstances,
      metrics: avgMetrics
    };

    // Scale up conditions
    if (this.shouldScaleUp(avgMetrics)) {
      const targetInstances = Math.min(
        currentInstances + this.config.scaleUpStep,
        this.config.maxInstances
      );

      if (targetInstances > currentInstances) {
        decision = {
          action: 'scale-up',
          reason: this.getScaleUpReason(avgMetrics),
          timestamp: now,
          currentInstances,
          targetInstances,
          metrics: avgMetrics
        };
      }
    }
    // Scale down conditions
    else if (this.shouldScaleDown(avgMetrics)) {
      const targetInstances = Math.max(
        currentInstances - this.config.scaleDownStep,
        this.config.minInstances
      );

      if (targetInstances < currentInstances) {
        decision = {
          action: 'scale-down',
          reason: this.getScaleDownReason(avgMetrics),
          timestamp: now,
          currentInstances,
          targetInstances,
          metrics: avgMetrics
        };
      }
    }

    // Execute scaling decision
    if (decision.action !== 'maintain') {
      this.executeScalingDecision(decision);
    }

    // Record decision for history
    this.scalingHistory.push(decision);

    // Keep only last 100 decisions
    if (this.scalingHistory.length > 100) {
      this.scalingHistory.shift();
    }
  }

  private calculateAverageMetrics() {
    if (this.metrics.size === 0) {
      return { avgCpu: 0, avgMemory: 0, avgResponseTime: 0, totalRequests: 0 };
    }

    let totalCpu = 0;
    let totalMemory = 0;
    let totalResponseTime = 0;
    let totalRequests = 0;

    for (const metrics of this.metrics.values()) {
      totalCpu += metrics.cpu;
      totalMemory += metrics.memory;
      totalResponseTime += metrics.responseTime;
      totalRequests += metrics.requestCount;
    }

    return {
      avgCpu: totalCpu / this.metrics.size,
      avgMemory: totalMemory / this.metrics.size,
      avgResponseTime: totalResponseTime / this.metrics.size,
      totalRequests
    };
  }

  private shouldScaleUp(metrics: { avgCpu: number; avgMemory: number; avgResponseTime: number; totalRequests: number }): boolean {
    const { scaleUpThreshold } = this.config;

    return (
      metrics.avgCpu > scaleUpThreshold.cpu ||
      metrics.avgMemory > scaleUpThreshold.memory ||
      metrics.avgResponseTime > scaleUpThreshold.responseTime ||
      metrics.totalRequests > scaleUpThreshold.queueLength
    );
  }

  private shouldScaleDown(metrics: { avgCpu: number; avgMemory: number; avgResponseTime: number; totalRequests: number }): boolean {
    const { scaleDownThreshold } = this.config;

    return (
      metrics.avgCpu < scaleDownThreshold.cpu &&
      metrics.avgMemory < scaleDownThreshold.memory &&
      metrics.avgResponseTime < scaleDownThreshold.responseTime &&
      metrics.totalRequests < scaleDownThreshold.queueLength
    );
  }

  private getScaleUpReason(metrics: { avgCpu: number; avgMemory: number; avgResponseTime: number; totalRequests: number }): string {
    const reasons = [];

    if (metrics.avgCpu > this.config.scaleUpThreshold.cpu) {
      reasons.push(`High CPU usage (${metrics.avgCpu.toFixed(1)}%)`);
    }
    if (metrics.avgMemory > this.config.scaleUpThreshold.memory) {
      reasons.push(`High memory usage (${metrics.avgMemory.toFixed(1)}%)`);
    }
    if (metrics.avgResponseTime > this.config.scaleUpThreshold.responseTime) {
      reasons.push(`Slow response time (${metrics.avgResponseTime.toFixed(0)}ms)`);
    }
    if (metrics.totalRequests > this.config.scaleUpThreshold.queueLength) {
      reasons.push(`High request queue (${metrics.totalRequests})`);
    }

    return reasons.join(', ');
  }

  private getScaleDownReason(metrics: { avgCpu: number; avgMemory: number; avgResponseTime: number; totalRequests: number }): string {
    return `Low resource usage: CPU ${metrics.avgCpu.toFixed(1)}%, Memory ${metrics.avgMemory.toFixed(1)}%, Response ${metrics.avgResponseTime.toFixed(0)}ms`;
  }

  private executeScalingDecision(decision: ScalingDecision) {
    console.log(`🔄 Scaling decision: ${decision.action} - ${decision.reason}`);

    this.lastScalingAction = decision.timestamp;

    switch (decision.action) {
      case 'scale-up':
        for (let i = decision.currentInstances; i < decision.targetInstances; i++) {
          this.spawnInstance();
        }
        break;

      case 'scale-down':
        const instancesToRemove = decision.currentInstances - decision.targetInstances;
        const instanceIds = Array.from(this.instances.keys()).slice(0, instancesToRemove);

        for (const instanceId of instanceIds) {
          this.removeInstance(instanceId);
        }
        break;
    }

    this.emit('scaling-decision', decision);
  }

  public getStatus() {
    return {
      currentInstances: this.instances.size,
      minInstances: this.config.minInstances,
      maxInstances: this.config.maxInstances,
      averageMetrics: this.calculateAverageMetrics(),
      lastScalingAction: this.lastScalingAction,
      scalingHistory: this.scalingHistory.slice(-10), // Last 10 decisions
      instanceDetails: Array.from(this.metrics.entries()).map(([id, metrics]) => ({
        id,
        ...metrics,
        healthy: this.isInstanceHealthy(id)
      }))
    };
  }

  private isInstanceHealthy(instanceId: string): boolean {
    const metrics = this.metrics.get(instanceId);
    if (!metrics) return false;

    const timeSinceHealthCheck = Date.now() - metrics.lastHealthCheck;
    return timeSinceHealthCheck < 60000; // Healthy if checked within last minute
  }

  public forceScaleUp(count: number = 1) {
    const targetInstances = Math.min(
      this.instances.size + count,
      this.config.maxInstances
    );

    for (let i = this.instances.size; i < targetInstances; i++) {
      this.spawnInstance();
    }
  }

  public forceScaleDown(count: number = 1) {
    const targetInstances = Math.max(
      this.instances.size - count,
      this.config.minInstances
    );

    const instancesToRemove = this.instances.size - targetInstances;
    const instanceIds = Array.from(this.instances.keys()).slice(0, instancesToRemove);

    for (const instanceId of instanceIds) {
      this.removeInstance(instanceId);
    }
  }

  private gracefulShutdown() {
    console.log('🛑 Auto-scaling service shutting down...');

    if (this.evaluationTimer) {
      clearInterval(this.evaluationTimer);
    }

    // Gracefully shutdown all instances
    const shutdownPromises = Array.from(this.instances.keys()).map(instanceId =>
      new Promise<void>((resolve) => {
        this.removeInstance(instanceId);
        setTimeout(resolve, 5000); // Wait 5 seconds per instance
      })
    );

    Promise.all(shutdownPromises).then(() => {
      console.log('✅ All instances shut down gracefully');
      process.exit(0);
    });
  }
}

// Default scaling configuration
export const defaultScalingConfig: ScalingConfig = {
  minInstances: 2,
  maxInstances: 8,
  scaleUpThreshold: {
    cpu: 80,        // Scale up if CPU > 80%
    memory: 85,     // Scale up if memory > 85%
    responseTime: 1000, // Scale up if avg response time > 1s
    queueLength: 100   // Scale up if request queue > 100
  },
  scaleDownThreshold: {
    cpu: 30,        // Scale down if CPU < 30%
    memory: 40,     // Scale down if memory < 40%
    responseTime: 200, // Scale down if avg response time < 200ms
    queueLength: 10    // Scale down if request queue < 10
  },
  cooldownPeriod: 300000,    // 5 minutes cooldown
  scaleUpStep: 1,            // Add 1 instance at a time
  scaleDownStep: 1,          // Remove 1 instance at a time
  evaluationInterval: 30000  // Evaluate every 30 seconds
};

// Factory function to create auto-scaling service
export function createAutoScalingService(config: Partial<ScalingConfig> = {}): AutoScalingService {
  const finalConfig = { ...defaultScalingConfig, ...config };
  return new AutoScalingService(finalConfig);
}