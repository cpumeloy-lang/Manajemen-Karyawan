import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { performance } from 'perf_hooks';

export interface HealthCheckConfig {
  port: number;
  path: string;
  databaseCheck: boolean;
  redisCheck: boolean;
  externalServices: string[];
  responseTimeout: number;
  healthyThreshold: number;
  unhealthyThreshold: number;
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: number;
  uptime: number;
  version: string;
  checks: {
    database: ServiceHealth;
    redis: ServiceHealth;
    memory: ResourceHealth;
    cpu: ResourceHealth;
    disk: ResourceHealth;
    external: { [key: string]: ServiceHealth };
  };
  responseTime: number;
}

export interface ServiceHealth {
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  error?: string;
  details?: any;
}

export interface ResourceHealth {
  status: 'healthy' | 'warning' | 'critical';
  usage: number;
  threshold: number;
  details?: any;
}

export class HealthCheckService {
  private app: express.Application;
  private server: any;
  private config: HealthCheckConfig;
  private healthHistory: HealthStatus[] = [];
  private consecutiveFailures = 0;
  private lastHealthCheck: HealthStatus | null = null;

  constructor(config: HealthCheckConfig) {
    this.config = config;
    this.app = express();
    this.setupRoutes();
    this.startServer();
  }

  private setupRoutes() {
    // Main health check endpoint
    this.app.get(this.config.path, async (req: Request, res: Response) => {
      const startTime = performance.now();

      try {
        const healthStatus = await this.performHealthCheck();
        const responseTime = performance.now() - startTime;

        // Update health history
        healthStatus.responseTime = responseTime;
        this.updateHealthHistory(healthStatus);

        // Determine HTTP status code
        const statusCode = this.getHttpStatusCode(healthStatus);

        res.status(statusCode).json({
          ...healthStatus,
          responseTime: `${responseTime.toFixed(2)}ms`
        });

      } catch (error) {
        const responseTime = performance.now() - startTime;
        console.error('Health check failed:', error);

        const errorStatus: HealthStatus = {
          status: 'unhealthy',
          timestamp: Date.now(),
          uptime: process.uptime(),
          version: process.env.npm_package_version || '1.0.0',
          checks: {
            database: { status: 'down', error: 'Health check failed' },
            redis: { status: 'down', error: 'Health check failed' },
            memory: { status: 'critical', usage: 100, threshold: 90 },
            cpu: { status: 'critical', usage: 100, threshold: 90 },
            disk: { status: 'critical', usage: 100, threshold: 90 },
            external: {}
          },
          responseTime
        };

        res.status(503).json(errorStatus);
      }
    });

    // Detailed health check endpoint
    this.app.get(`${this.config.path}/detailed`, async (req: Request, res: Response) => {
      const healthStatus = await this.performHealthCheck();

      res.json({
        ...healthStatus,
        history: this.healthHistory.slice(-10), // Last 10 checks
        config: this.config
      });
    });

    // Readiness probe
    this.app.get('/ready', async (req: Request, res: Response) => {
      const isReady = await this.checkReadiness();

      if (isReady) {
        res.status(200).json({ status: 'ready' });
      } else {
        res.status(503).json({ status: 'not ready' });
      }
    });

    // Liveness probe
    this.app.get('/live', (req: Request, res: Response) => {
      res.status(200).json({ status: 'alive' });
    });
  }

  private async performHealthCheck(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkSystemResources(),
      this.checkExternalServices()
    ]);

    const [dbResult, redisResult, systemResult, externalResult] = checks;

    const database = dbResult.status === 'fulfilled' ? dbResult.value.database :
                    { status: 'down' as const, error: 'Check failed' };

    const redis = redisResult.status === 'fulfilled' ? redisResult.value.redis :
                 { status: 'down' as const, error: 'Check failed' };

    const system = systemResult.status === 'fulfilled' ? systemResult.value :
                  {
                    memory: { status: 'critical' as const, usage: 100, threshold: 90 },
                    cpu: { status: 'critical' as const, usage: 100, threshold: 90 },
                    disk: { status: 'critical' as const, usage: 100, threshold: 90 }
                  };

    const external = externalResult.status === 'fulfilled' ? externalResult.value :
                    {};

    // Determine overall status
    const overallStatus = this.determineOverallStatus(database, redis, system, external);

    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: Date.now(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      checks: {
        database,
        redis,
        memory: system.memory,
        cpu: system.cpu,
        disk: system.disk,
        external
      },
      responseTime: 0 // Will be set by caller
    };

    this.lastHealthCheck = healthStatus;
    return healthStatus;
  }

  private async checkDatabase(): Promise<{ database: ServiceHealth }> {
    if (!this.config.databaseCheck) {
      return { database: { status: 'up' } };
    }

    const startTime = performance.now();

    try {
      // Import database client dynamically to avoid circular dependencies
      const { supabaseClient } = await import('../supabaseClient');

      // Simple query to check database connectivity
      const { data, error } = await supabaseClient
        .from('employees')
        .select('count', { count: 'exact', head: true });

      const responseTime = performance.now() - startTime;

      if (error) {
        return {
          database: {
            status: 'down',
            responseTime,
            error: error.message
          }
        };
      }

      return {
        database: {
          status: 'up',
          responseTime,
          details: { recordCount: data }
        }
      };

    } catch (error: any) {
      const responseTime = performance.now() - startTime;
      return {
        database: {
          status: 'down',
          responseTime,
          error: error.message
        }
      };
    }
  }

  private async checkRedis(): Promise<{ redis: ServiceHealth }> {
    if (!this.config.redisCheck) {
      return { redis: { status: 'up' } };
    }

    const startTime = performance.now();

    try {
      // Use centralized Redis cache singleton
      const { getCache } = await import('./redisCache');
      const cache = getCache();

      // Simple ping to check Redis connectivity
      const isConnected = await cache.ping();

      const responseTime = performance.now() - startTime;

      if (!isConnected) {
        return {
          redis: {
            status: 'down',
            responseTime,
            error: 'Redis ping failed'
          }
        };
      }

      // Get Redis stats
      const info = await cache.info();
      const stats = info ? {
        connected_clients: info.connected_clients,
        used_memory: info.used_memory,
        total_connections_received: info.total_connections_received,
        keyspace_hits: info.keyspace_hits,
        keyspace_misses: info.keyspace_misses
      } : null;

      return {
        redis: {
          status: 'up',
          responseTime,
          details: stats
        }
      };

    } catch (error: any) {
      const responseTime = performance.now() - startTime;
      return {
        redis: {
          status: 'down',
          responseTime,
          error: error.message
        }
      };
    }
  }

  private async checkSystemResources(): Promise<{
    memory: ResourceHealth;
    cpu: ResourceHealth;
    disk: ResourceHealth;
  }> {
    const memUsage = process.memoryUsage();
    const totalMemory = memUsage.heapTotal + memUsage.external;
    const usedMemory = memUsage.heapUsed + memUsage.external;
    const memoryUsagePercent = (usedMemory / totalMemory) * 100;

    // CPU usage (simplified - in production use a proper monitoring library)
    const cpuUsage = await this.getCpuUsage();

    // Disk usage (simplified - check available disk space)
    const diskUsage = await this.getDiskUsage();

    return {
      memory: {
        status: this.getResourceStatus(memoryUsagePercent, 85, 95),
        usage: memoryUsagePercent,
        threshold: 85,
        details: {
          used: Math.round(usedMemory / 1024 / 1024), // MB
          total: Math.round(totalMemory / 1024 / 1024), // MB
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024)
        }
      },
      cpu: {
        status: this.getResourceStatus(cpuUsage, 80, 90),
        usage: cpuUsage,
        threshold: 80,
        details: {
          cores: require('os').cpus().length
        }
      },
      disk: {
        status: this.getResourceStatus(diskUsage, 85, 95),
        usage: diskUsage,
        threshold: 85,
        details: {
          // Disk details would be populated by a disk monitoring library
        }
      }
    };
  }

  private async checkExternalServices(): Promise<{ [key: string]: ServiceHealth }> {
    const results: { [key: string]: ServiceHealth } = {};

    for (const service of this.config.externalServices) {
      results[service] = await this.checkExternalService(service);
    }

    return results;
  }

  private async checkExternalService(serviceUrl: string): Promise<ServiceHealth> {
    const startTime = performance.now();

    try {
      const https = require('https');
      const http = require('http');

      const url = new URL(serviceUrl);
      const client = url.protocol === 'https:' ? https : http;

      return new Promise((resolve) => {
        const req = client.request({
          hostname: url.hostname,
          port: url.port,
          path: url.pathname,
          method: 'GET',
          timeout: this.config.responseTimeout
        }, (res: any) => {
          const responseTime = performance.now() - startTime;

          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({
              status: 'up',
              responseTime,
              details: { statusCode: res.statusCode }
            });
          } else {
            resolve({
              status: 'degraded',
              responseTime,
              error: `HTTP ${res.statusCode}`,
              details: { statusCode: res.statusCode }
            });
          }
        });

        req.on('error', (error: any) => {
          const responseTime = performance.now() - startTime;
          resolve({
            status: 'down',
            responseTime,
            error: error.message
          });
        });

        req.on('timeout', () => {
          const responseTime = performance.now() - startTime;
          req.destroy();
          resolve({
            status: 'down',
            responseTime,
            error: 'Timeout'
          });
        });

        req.end();
      });

    } catch (error: any) {
      const responseTime = performance.now() - startTime;
      return {
        status: 'down',
        responseTime,
        error: error.message
      };
    }
  }

  private async getCpuUsage(): Promise<number> {
    // Simplified CPU usage calculation
    // In production, use a proper monitoring library like 'pidusage'
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();

      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const totalUsage = (endUsage.user + endUsage.system) / 1000000; // Convert to seconds
        const cpuPercent = (totalUsage / 0.1) * 100; // 0.1 second interval
        resolve(Math.min(cpuPercent, 100));
      }, 100);
    });
  }

  private async getDiskUsage(): Promise<number> {
    // Simplified disk usage - in production use 'diskusage' or similar
    try {
      const fs = require('fs').promises;
      const stats = await fs.statvfs?.('/') || { f_bavail: 1, f_blocks: 1 };
      const usage = ((stats.f_blocks - stats.f_bavail) / stats.f_blocks) * 100;
      return Math.min(usage, 100);
    } catch {
      return 50; // Default assumption
    }
  }

  private getResourceStatus(usage: number, warningThreshold: number, criticalThreshold: number): 'healthy' | 'warning' | 'critical' {
    if (usage >= criticalThreshold) return 'critical';
    if (usage >= warningThreshold) return 'warning';
    return 'healthy';
  }

  private determineOverallStatus(
    database: ServiceHealth,
    redis: ServiceHealth,
    system: any,
    external: any
  ): 'healthy' | 'unhealthy' | 'degraded' {

    // Critical failures
    if (database.status === 'down' || system.memory.status === 'critical' || system.cpu.status === 'critical') {
      return 'unhealthy';
    }

    // Degraded services
    const hasDegradedServices =
      database.status === 'degraded' ||
      redis.status === 'degraded' ||
      system.memory.status === 'warning' ||
      system.cpu.status === 'warning' ||
      Object.values(external).some((s: any) => s.status === 'degraded' || s.status === 'down');

    if (hasDegradedServices) {
      return 'degraded';
    }

    return 'healthy';
  }

  private getHttpStatusCode(healthStatus: HealthStatus): number {
    switch (healthStatus.status) {
      case 'healthy': return 200;
      case 'degraded': return 200; // Still serve requests but with warnings
      case 'unhealthy': return 503;
      default: return 503;
    }
  }

  private updateHealthHistory(healthStatus: HealthStatus) {
    this.healthHistory.push(healthStatus);

    // Keep only last 50 health checks
    if (this.healthHistory.length > 50) {
      this.healthHistory.shift();
    }

    // Update consecutive failures
    if (healthStatus.status === 'unhealthy') {
      this.consecutiveFailures++;
    } else {
      this.consecutiveFailures = 0;
    }
  }

  private async checkReadiness(): Promise<boolean> {
    // Readiness check - ensure all critical services are available
    try {
      const health = await this.performHealthCheck();
      return health.status !== 'unhealthy';
    } catch {
      return false;
    }
  }

  private startServer() {
    this.server = createServer(this.app);
    this.server.listen(this.config.port, () => {
      console.log(`🏥 Health check service listening on port ${this.config.port}`);
    });
  }

  public getHealthStatus(): HealthStatus | null {
    return this.lastHealthCheck;
  }

  public getHealthHistory(): HealthStatus[] {
    return [...this.healthHistory];
  }

  private getRedisConfig() {
    return {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      ttl: {
        user: 300,
        dashboard: 120,
        employees: 600,
        attendance: 60,
        reports: 1800
      }
    };
  }
}

// Default health check configuration
export const defaultHealthCheckConfig: HealthCheckConfig = {
  port: parseInt(process.env.HEALTH_CHECK_PORT || '3001'),
  path: '/api/health',
  databaseCheck: true,
  redisCheck: true,
  externalServices: [],
  responseTimeout: 5000,
  healthyThreshold: 3,
  unhealthyThreshold: 2
};

// Factory function
export function createHealthCheckService(config: Partial<HealthCheckConfig> = {}): HealthCheckService {
  const finalConfig = { ...defaultHealthCheckConfig, ...config };
  return new HealthCheckService(finalConfig);
}