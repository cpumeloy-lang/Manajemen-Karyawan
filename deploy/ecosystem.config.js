// ===========================================
// PM2 ECOSYSTEM CONFIGURATION - PHASE 3
// Load Balancing & Auto-scaling Setup
// ===========================================

module.exports = {
  apps: [
    {
      name: 'hrms-app',
      script: 'dist/index.js',
      instances: process.env.WORKERS || 4,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3000,
        WORKER_PORT: process.env.WORKER_PORT || 3001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3000,
        WORKER_PORT: process.env.WORKER_PORT || 3001,
      },
      // Auto-scaling configuration
      max_memory_restart: '1G',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',

      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Monitoring
      merge_logs: true,
      time: true,

      // Health checks
      health_check: {
        enabled: true,
        max_memory: '1G',
        max_cpu: 90,
        check_url: `http://localhost:${process.env.PORT || 3000}/api/health`,
        check_interval: process.env.HEALTH_CHECK_INTERVAL || 30000,
      },

      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },

    // Auto-scaling manager
    {
      name: 'hrms-autoscaler',
      script: 'scripts/auto-scaler.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      // Run continuously
      autorestart: true,
      max_restarts: 5,
      min_uptime: '10s',

      // Logging
      log_file: './logs/autoscaler.log',
      out_file: './logs/autoscaler-out.log',
      error_file: './logs/autoscaler-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },

    // Monitoring agent
    {
      name: 'hrms-monitor',
      script: 'scripts/monitor.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      // Run continuously
      autorestart: true,
      max_restarts: 5,
      min_uptime: '10s',

      // Logging
      log_file: './logs/monitor.log',
      out_file: './logs/monitor-out.log',
      error_file: './logs/monitor-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    }
  ],

  deploy: {
    production: {
      user: 'node',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-username/hrms-pro.git',
      path: '/var/www/hrms-production',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};