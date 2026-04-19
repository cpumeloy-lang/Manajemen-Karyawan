import { EventEmitter } from 'events';
import * as os from 'os';
import { performance } from 'perf_hooks';

export interface MonitoringConfig {
  metricsInterval: number;      // How often to collect metrics (ms)
  retentionPeriod: number;      // How long to keep metrics (ms)
  alertThresholds: {
    cpu: number;
    memory: number;
    responseTime: number;
    errorRate: number;
  };
  enablePrometheus: boolean;
  prometheusPort: number;
}

export interface SystemMetrics {
  timestamp: number;
  cpu: {
    usage: number;
    cores: number;
    loadAverage: number[];
  };
  memory: {
    used: number;
    total: number;
    usage: number;
  };
  disk: {
    used: number;
    total: number;
    usage: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
  };
}

export interface ApplicationMetrics {
  timestamp: number;
  responseTime: {
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  };
  requests: {
    total: number;
    perSecond: number;
    errors: number;
    errorRate: number;
  };
  cache: {
    hitRate: number;
    hits: number;
    misses: number;
    size: number;
  };
  database: {
    connections: number;
    queryTime: number;
    slowQueries: number;
  };
}

export interface Alert {
  id: string;
  type: 'cpu' | 'memory' | 'response_time' | 'error_rate' | 'disk' | 'network';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
  resolved: boolean;
  resolvedAt?: number;
}

export class MonitoringService extends EventEmitter {
  private config: MonitoringConfig;
  private systemMetrics: SystemMetrics[] = [];
  private applicationMetrics: ApplicationMetrics[] = [];
  private alerts: Alert[] = [];
  private activeAlerts: Map<string, Alert> = new Map();
  private metricsTimer?: NodeJS.Timeout;
  private previousNetworkStats = { bytesIn: 0, bytesOut: 0 };

  constructor(config: MonitoringConfig) {
    super();
    this.config = config;
    this.initializeMonitoring();
  }

  private initializeMonitoring() {
    // Start metrics collection
    this.metricsTimer = setInterval(() => {
      this.collectSystemMetrics();
      this.cleanupOldMetrics();
      this.checkAlerts();
    }, this.config.metricsInterval);

    // Initialize network stats
    this.updateNetworkStats();

    console.log(`📊 Monitoring service started - collecting metrics every ${this.config.metricsInterval}ms`);
  }

  private async collectSystemMetrics() {
    const timestamp = Date.now();

    // CPU metrics
    const cpuUsage = await this.getCpuUsage();
    const loadAverage = os.loadavg();

    // Memory metrics
    const memUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const usedMemory = totalMemory - os.freemem();
    const memoryUsagePercent = (usedMemory / totalMemory) * 100;

    // Disk metrics (simplified)
    const diskUsage = await this.getDiskUsage();

    // Network metrics
    const networkStats = this.updateNetworkStats();

    const metrics: SystemMetrics = {
      timestamp,
      cpu: {
        usage: cpuUsage,
        cores: os.cpus().length,
        loadAverage
      },
      memory: {
        used: usedMemory,
        total: totalMemory,
        usage: memoryUsagePercent
      },
      disk: {
        used: diskUsage.used,
        total: diskUsage.total,
        usage: diskUsage.usage
      },
      network: networkStats
    };

    this.systemMetrics.push(metrics);

    // Keep only recent metrics
    if (this.systemMetrics.length > 1000) {
      this.systemMetrics = this.systemMetrics.slice(-1000);
    }

    this.emit('system-metrics', metrics);
  }

  private async getCpuUsage(): Promise<number> {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();

      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const totalUsage = (endUsage.user + endUsage.system) / 1000000; // Convert to seconds
        const cpuPercent = (totalUsage / 0.1) * 100; // 0.1 second interval
        resolve(Math.min(cpuPercent / os.cpus().length, 100)); // Normalize per core
      }, 100);
    });
  }

  private async getDiskUsage(): Promise<{ used: number; total: number; usage: number }> {
    try {
      // In a real implementation, you'd use a library like 'diskusage'
      // For now, return mock data
      const total = 100 * 1024 * 1024 * 1024; // 100GB
      const used = total * 0.6; // 60% used
      const usage = (used / total) * 100;

      return { used, total, usage };
    } catch {
      return { used: 0, total: 100, usage: 0 };
    }
  }

  private updateNetworkStats(): { bytesIn: number; bytesOut: number } {
    // In a real implementation, you'd read from /proc/net/dev or use a network monitoring library
    // For now, return mock incremental data
    const bytesIn = this.previousNetworkStats.bytesIn + Math.random() * 1000;
    const bytesOut = this.previousNetworkStats.bytesOut + Math.random() * 1000;

    const currentStats = { bytesIn, bytesOut };
    this.previousNetworkStats = currentStats;

    return currentStats;
  }

  public recordApplicationMetrics(metrics: Partial<ApplicationMetrics>) {
    const timestamp = Date.now();

    const appMetrics: ApplicationMetrics = {
      timestamp,
      responseTime: metrics.responseTime || { avg: 0, p50: 0, p95: 0, p99: 0 },
      requests: metrics.requests || { total: 0, perSecond: 0, errors: 0, errorRate: 0 },
      cache: metrics.cache || { hitRate: 0, hits: 0, misses: 0, size: 0 },
      database: metrics.database || { connections: 0, queryTime: 0, slowQueries: 0 }
    };

    this.applicationMetrics.push(appMetrics);

    // Keep only recent metrics
    if (this.applicationMetrics.length > 1000) {
      this.applicationMetrics = this.applicationMetrics.slice(-1000);
    }

    this.emit('application-metrics', appMetrics);
  }

  private checkAlerts() {
    const latestSystem = this.systemMetrics[this.systemMetrics.length - 1];
    const latestApp = this.applicationMetrics[this.applicationMetrics.length - 1];

    if (!latestSystem) return;

    // CPU alert
    this.checkThreshold(
      'cpu',
      latestSystem.cpu.usage,
      this.config.alertThresholds.cpu,
      `High CPU usage: ${latestSystem.cpu.usage.toFixed(1)}%`
    );

    // Memory alert
    this.checkThreshold(
      'memory',
      latestSystem.memory.usage,
      this.config.alertThresholds.memory,
      `High memory usage: ${latestSystem.memory.usage.toFixed(1)}%`
    );

    // Disk alert
    this.checkThreshold(
      'disk',
      latestSystem.disk.usage,
      90, // Fixed threshold for disk
      `High disk usage: ${latestSystem.disk.usage.toFixed(1)}%`
    );

    if (latestApp) {
      // Response time alert
      this.checkThreshold(
        'response_time',
        latestApp.responseTime.avg,
        this.config.alertThresholds.responseTime,
        `Slow response time: ${latestApp.responseTime.avg.toFixed(0)}ms`
      );

      // Error rate alert
      this.checkThreshold(
        'error_rate',
        latestApp.requests.errorRate,
        this.config.alertThresholds.errorRate,
        `High error rate: ${latestApp.requests.errorRate.toFixed(1)}%`
      );
    }
  }

  private checkThreshold(
    type: Alert['type'],
    value: number,
    threshold: number,
    message: string
  ) {
    const alertId = `${type}_alert`;
    const isAboveThreshold = value > threshold;
    const existingAlert = this.activeAlerts.get(alertId);

    if (isAboveThreshold && !existingAlert) {
      // Create new alert
      const severity = this.getSeverity(type, value, threshold);
      const alert: Alert = {
        id: alertId,
        type,
        severity,
        message,
        value,
        threshold,
        timestamp: Date.now(),
        resolved: false
      };

      this.activeAlerts.set(alertId, alert);
      this.alerts.push(alert);

      this.emit('alert-created', alert);

    } else if (!isAboveThreshold && existingAlert) {
      // Resolve existing alert
      existingAlert.resolved = true;
      existingAlert.resolvedAt = Date.now();

      this.activeAlerts.delete(alertId);
      this.emit('alert-resolved', existingAlert);
    }
  }

  private getSeverity(type: Alert['type'], value: number, threshold: number): Alert['severity'] {
    const ratio = value / threshold;

    if (ratio >= 2) return 'critical';
    if (ratio >= 1.5) return 'high';
    if (ratio >= 1.2) return 'medium';
    return 'low';
  }

  private cleanupOldMetrics() {
    const cutoffTime = Date.now() - this.config.retentionPeriod;

    this.systemMetrics = this.systemMetrics.filter(m => m.timestamp > cutoffTime);
    this.applicationMetrics = this.applicationMetrics.filter(m => m.timestamp > cutoffTime);
    this.alerts = this.alerts.filter(a => !a.resolved || (a.resolvedAt && a.resolvedAt > cutoffTime));
  }

  public getSystemMetrics(hours: number = 1): SystemMetrics[] {
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
    return this.systemMetrics.filter(m => m.timestamp > cutoffTime);
  }

  public getApplicationMetrics(hours: number = 1): ApplicationMetrics[] {
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
    return this.applicationMetrics.filter(m => m.timestamp > cutoffTime);
  }

  public getAlerts(hours: number = 24): Alert[] {
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
    return this.alerts.filter(a => a.timestamp > cutoffTime);
  }

  public getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  public getDashboardData() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);

    const recentSystem = this.systemMetrics.filter(m => m.timestamp > oneHourAgo);
    const recentApp = this.applicationMetrics.filter(m => m.timestamp > oneHourAgo);

    return {
      current: {
        cpu: recentSystem.length > 0 ? recentSystem[recentSystem.length - 1].cpu.usage : 0,
        memory: recentSystem.length > 0 ? recentSystem[recentSystem.length - 1].memory.usage : 0,
        responseTime: recentApp.length > 0 ? recentApp[recentApp.length - 1].responseTime.avg : 0,
        errorRate: recentApp.length > 0 ? recentApp[recentApp.length - 1].requests.errorRate : 0
      },
      trends: {
        cpu: recentSystem.map(m => ({ timestamp: m.timestamp, value: m.cpu.usage })),
        memory: recentSystem.map(m => ({ timestamp: m.timestamp, value: m.memory.usage })),
        responseTime: recentApp.map(m => ({ timestamp: m.timestamp, value: m.responseTime.avg })),
        errorRate: recentApp.map(m => ({ timestamp: m.timestamp, value: m.requests.errorRate }))
      },
      alerts: this.getActiveAlerts()
    };
  }

  public generatePrometheusMetrics(): string {
    const data = this.getDashboardData();

    return `# HRMS Monitoring Metrics
# HELP hrms_cpu_usage Current CPU usage percentage
# TYPE hrms_cpu_usage gauge
hrms_cpu_usage ${data.current.cpu}

# HELP hrms_memory_usage Current memory usage percentage
# TYPE hrms_memory_usage gauge
hrms_memory_usage ${data.current.memory}

# HELP hrms_response_time_avg Average response time in milliseconds
# TYPE hrms_response_time_avg gauge
hrms_response_time_avg ${data.current.responseTime}

# HELP hrms_error_rate Current error rate percentage
# TYPE hrms_error_rate gauge
hrms_error_rate ${data.current.errorRate}

# HELP hrms_active_alerts Number of active alerts
# TYPE hrms_active_alerts gauge
hrms_active_alerts ${data.alerts.length}
`;
  }

  public async close(): Promise<void> {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
    }

    console.log('📊 Monitoring service stopped');
  }
}

// Default monitoring configuration
export const defaultMonitoringConfig: MonitoringConfig = {
  metricsInterval: 30000,     // 30 seconds
  retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
  alertThresholds: {
    cpu: 80,
    memory: 85,
    responseTime: 1000,
    errorRate: 5
  },
  enablePrometheus: true,
  prometheusPort: 9091
};

// Factory function
export function createMonitoringService(config: Partial<MonitoringConfig> = {}): MonitoringService {
  const finalConfig = { ...defaultMonitoringConfig, ...config };
  return new MonitoringService(finalConfig);
}