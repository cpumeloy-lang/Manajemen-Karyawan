#!/bin/bash

# ===========================================
# PHASE 3: LOAD BALANCING & AUTO-SCALING SETUP
# HRMS Production Deployment Script
# ===========================================

set -e

echo "🚀 Starting Phase 3: Load Balancing & Auto-scaling Setup"
echo "======================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_COMPOSE_FILE="$PROJECT_ROOT/docker-compose.prod.yml"
NGINX_CONF="$PROJECT_ROOT/nginx.conf"
PM2_ECOSYSTEM_FILE="$PROJECT_ROOT/ecosystem.config.js"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."

    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi

    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi

    # Check if PM2 is installed
    if ! command -v pm2 &> /dev/null; then
        print_warning "PM2 is not installed. Installing PM2..."
        npm install -g pm2
    fi

    print_success "Prerequisites check completed"
}

# Setup environment variables
setup_environment() {
    print_status "Setting up environment variables..."

    if [ ! -f ".env.production" ]; then
        cp .env.loadbalancer .env.production
        print_warning "Created .env.production from .env.loadbalancer template"
        print_warning "Please review and update the configuration values"
    else
        print_status ".env.production already exists"
    fi

    # Load environment variables
    if [ -f ".env.production" ]; then
        set -a
        source .env.production
        set +a
        print_success "Environment variables loaded"
    fi
}

# Create Docker Compose production file
create_docker_compose() {
    print_status "Creating Docker Compose production configuration..."

    cat > "$DOCKER_COMPOSE_FILE" << 'EOF'
version: '3.8'

services:
  # Load Balancer (Nginx)
  nginx:
    image: nginx:alpine
    ports:
      - "${NGINX_PORT:-80}:80"
      - "${NGINX_SSL_PORT:-443}:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
      - nginx_logs:/var/log/nginx
    depends_on:
      - app
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Application (Multiple instances)
  app:
    build:
      context: .
      dockerfile: Dockerfile.prod
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    volumes:
      - app_logs:/app/logs
    deploy:
      replicas: ${WORKERS:-4}
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
        window: 120s
      resources:
        limits:
          cpus: '${CPU_LIMIT:-1.0}'
          memory: ${MEMORY_LIMIT:-1g}
        reservations:
          cpus: '${CPU_RESERVATION:-0.5}'
          memory: ${MEMORY_RESERVATION:-512m}
    depends_on:
      - redis
      - postgres
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:${PORT:-3000}/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Redis Cluster
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --cluster-enabled yes --cluster-config-file nodes.conf --cluster-node-timeout 5000
    ports:
      - "6379:6379"
      - "16379:16379"
    volumes:
      - redis_data:/data
      - ./redis.conf:/etc/redis/redis.conf:ro
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ${DB_NAME:-hrms_prod}
      POSTGRES_USER: ${DB_USER:-hrms_user}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "${DB_PORT:-5432}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database-setup.sql:/docker-entrypoint-initdb.d/01-setup.sql:ro
      - ./database-optimization-indexes.sql:/docker-entrypoint-initdb.d/02-indexes.sql:ro
      - ./database-optimization-pagination.sql:/docker-entrypoint-initdb.d/03-pagination.sql:ro
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-hrms_user} -d ${DB_NAME:-hrms_prod}"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Monitoring (Prometheus)
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
    restart: unless-stopped

  # Monitoring (Grafana)
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_ADMIN_PASSWORD:-admin}
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/provisioning:/etc/grafana/provisioning:ro
    restart: unless-stopped

  # Log aggregation (ELK Stack)
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    restart: unless-stopped

  logstash:
    image: docker.elastic.co/logstash/logstash:8.11.0
    ports:
      - "5044:5044"
    volumes:
      - ./monitoring/logstash.conf:/usr/share/logstash/pipeline/logstash.conf:ro
    depends_on:
      - elasticsearch
    restart: unless-stopped

  kibana:
    image: kibana:8.11.0
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch
    restart: unless-stopped

volumes:
  nginx_logs:
  app_logs:
  redis_data:
  postgres_data:
  prometheus_data:
  grafana_data:
  elasticsearch_data:

networks:
  default:
    driver: bridge
EOF

    print_success "Docker Compose production configuration created"
}

# Create Nginx configuration
create_nginx_config() {
    print_status "Creating Nginx load balancer configuration..."

    cat > "$NGINX_CONF" << 'EOF'
events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for" '
                    'rt=$request_time uct="$upstream_connect_time" '
                    'uht="$upstream_header_time" urt="$upstream_response_time"';

    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;

    # Performance tuning
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 100M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/s;

    # Upstream backend servers
    upstream hrms_backend {
        least_conn;
        server app:3000 max_fails=3 fail_timeout=30s;
        server app:3001 max_fails=3 fail_timeout=30s;
        server app:3002 max_fails=3 fail_timeout=30s;
        server app:3003 max_fails=3 fail_timeout=30s;

        # Health checks
        check interval=3000 rise=2 fall=3 timeout=1000 type=http;
        check_http_send "GET /api/health HTTP/1.0\r\n\r\n";
        check_http_expect_alive http_2xx http_3xx;
    }

    # CDN upstream for static assets
    upstream cdn_backend {
        server cdn.hrms-hospital.com:443;
        keepalive 32;
    }

    server {
        listen 80;
        server_name _;

        # Redirect to HTTPS
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name _;

        # SSL configuration
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;

        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
        add_header Referrer-Policy "strict-origin-when-cross-origin";

        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }

        # Static assets with CDN fallback
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";

            # Try local first, then CDN
            try_files $uri @cdn;
        }

        location @cdn {
            proxy_pass https://cdn_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # API endpoints with rate limiting
        location /api/ {
            # Rate limiting for API
            limit_req zone=api burst=20 nodelay;

            # CORS
            add_header Access-Control-Allow-Origin *;
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
            add_header Access-Control-Allow-Headers "Authorization, Content-Type, X-Requested-With";

            # Proxy to backend
            proxy_pass http://hrms_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;

            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # Authentication endpoints with stricter rate limiting
        location /api/auth/ {
            limit_req zone=auth burst=5 nodelay;

            proxy_pass http://hrms_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # Main application
        location / {
            # Rate limiting for main app
            limit_req zone=api burst=50 nodelay;

            proxy_pass http://hrms_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;

            # Timeouts
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }

        # Monitoring endpoints (internal only)
        location /metrics {
            allow 127.0.0.1;
            allow 10.0.0.0/8;
            allow 172.16.0.0/12;
            allow 192.168.0.0/16;
            deny all;

            proxy_pass http://prometheus:9090;
        }

        location /grafana/ {
            allow 127.0.0.1;
            allow 10.0.0.0/8;
            allow 172.16.0.0/12;
            allow 192.168.0.0/16;
            deny all;

            proxy_pass http://grafana:3000/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
    }
}
EOF

    print_success "Nginx configuration created"
}

# Create PM2 ecosystem file
create_pm2_config() {
    print_status "Creating PM2 ecosystem configuration..."

    cat > "$PM2_ECOSYSTEM_FILE" << 'EOF'
module.exports = {
  apps: [{
    name: 'hrms-app',
    script: 'dist/index.js',
    instances: process.env.WORKERS || 4,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s',
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'dist'],
    env_file: '.env.production'
  }],

  deploy: {
    production: {
      user: 'node',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-username/hrms.git',
      path: '/var/www/hrms',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
EOF

    print_success "PM2 ecosystem configuration created"
}

# Create monitoring configuration
create_monitoring_config() {
    print_status "Creating monitoring configuration..."

    # Create monitoring directory
    mkdir -p monitoring/grafana/provisioning/datasources
    mkdir -p monitoring/grafana/provisioning/dashboards

    # Prometheus configuration
    cat > "monitoring/prometheus.yml" << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  # - "first_rules.yml"
  # - "second_rules.yml"

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'hrms-app'
    static_configs:
      - targets: ['app:3000', 'app:3001', 'app:3002', 'app:3003']
    scrape_interval: 5s
    metrics_path: '/api/metrics'

  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx:80']
    scrape_interval: 10s

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']
    scrape_interval: 10s

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres:5432']
    scrape_interval: 30s
EOF

    # Grafana datasource configuration
    cat > "monitoring/grafana/provisioning/datasources/prometheus.yml" << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
EOF

    # Logstash configuration
    cat > "monitoring/logstash.conf" << 'EOF'
input {
  tcp {
    port => 5044
    codec => json_lines
  }
}

filter {
  if [type] == "hrms-log" {
    json {
      source => "message"
    }
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "hrms-%{+YYYY.MM.dd}"
  }
  stdout { codec => rubydebug }
}
EOF

    print_success "Monitoring configuration created"
}

# Create Redis cluster configuration
create_redis_config() {
    print_status "Creating Redis cluster configuration..."

    cat > "redis.conf" << 'EOF'
# Redis configuration for clustering
cluster-enabled yes
cluster-config-file nodes.conf
cluster-node-timeout 5000
cluster-migration-barrier 1
cluster-require-full-coverage no

# Memory management
maxmemory 512mb
maxmemory-policy allkeys-lru

# Persistence
appendonly yes
appendfilename "appendonly.aof"

# Logging
loglevel notice
logfile ""

# Network
bind 0.0.0.0
port 6379
timeout 0
tcp-keepalive 300

# Security
protected-mode no
requirepass ""

# Performance
tcp-backlog 511
databases 16
EOF

    print_success "Redis cluster configuration created"
}

# Create Dockerfile for production
create_dockerfile() {
    print_status "Creating production Dockerfile..."

    cat > "Dockerfile.prod" << 'EOF'
FROM node:18-alpine AS base

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Production stage
FROM base AS production

# Copy application code
COPY --from=base /app/node_modules ./node_modules
COPY . .

# Build application
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Change ownership
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]
EOF

    print_success "Production Dockerfile created"
}

# Setup SSL certificates (self-signed for development)
setup_ssl() {
    print_status "Setting up SSL certificates..."

    mkdir -p ssl

    # Generate self-signed certificate (for development only)
    if [ ! -f "ssl/cert.pem" ]; then
        openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes \
            -subj "/C=ID/ST=Jakarta/L=Jakarta/O=Hospital/OU=IT/CN=hrms.hospital.local"
        print_warning "Generated self-signed SSL certificate (development only)"
        print_warning "Replace with proper SSL certificate for production"
    else
        print_status "SSL certificates already exist"
    fi
}

# Create deployment scripts
create_deployment_scripts() {
    print_status "Creating deployment scripts..."

    # Deploy script
    cat > "deploy.sh" << 'EOF'
#!/bin/bash
set -e

echo "🚀 Deploying HRMS Application..."

# Load environment
if [ -f ".env.production" ]; then
    export $(cat .env.production | xargs)
fi

# Build and deploy
echo "Building application..."
npm run build

echo "Running database migrations..."
npm run db:migrate

echo "Starting services with Docker Compose..."
docker-compose -f docker-compose.prod.yml up -d --build

echo "Waiting for services to be healthy..."
sleep 30

echo "Running health checks..."
curl -f http://localhost/api/health || exit 1

echo "✅ Deployment completed successfully!"
echo "Application is running at: https://your-domain.com"
EOF

    # Rollback script
    cat > "rollback.sh" << 'EOF'
#!/bin/bash
set -e

echo "🔄 Rolling back HRMS Application..."

# Stop current deployment
docker-compose -f docker-compose.prod.yml down

# Restore from backup (if available)
if [ -d "backup" ]; then
    echo "Restoring from backup..."
    cp -r backup/* .
fi

# Restart previous version
docker-compose -f docker-compose.prod.yml up -d

echo "✅ Rollback completed!"
EOF

    # Monitoring script
    cat > "monitor.sh" << 'EOF'
#!/bin/bash

echo "📊 HRMS Monitoring Dashboard"
echo "============================"

# Check service status
echo "Service Status:"
docker-compose -f docker-compose.prod.yml ps

echo -e "\nApplication Health:"
curl -s http://localhost/api/health | jq . || echo "Health check failed"

echo -e "\nSystem Resources:"
echo "CPU Usage: $(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1"%"}')"
echo "Memory Usage: $(free | grep Mem | awk '{printf "%.2f%%", $3/$2 * 100.0}')"

echo -e "\nRedis Status:"
docker exec $(docker ps -q -f name=redis) redis-cli info | grep -E "(connected_clients|used_memory_human|total_connections_received)" || echo "Redis check failed"

echo -e "\nDatabase Connections:"
docker exec $(docker ps -q -f name=postgres) psql -U $DB_USER -d $DB_NAME -c "SELECT count(*) as active_connections FROM pg_stat_activity;" || echo "Database check failed"
EOF

    chmod +x deploy.sh rollback.sh monitor.sh

    print_success "Deployment scripts created"
}

# Main setup function
main() {
    echo "🔧 Phase 3 Setup Starting..."
    echo "=========================="

    check_prerequisites
    setup_environment
    create_docker_compose
    create_nginx_config
    create_pm2_config
    create_monitoring_config
    create_redis_config
    create_dockerfile
    setup_ssl
    create_deployment_scripts

    echo ""
    print_success "Phase 3 setup completed!"
    echo ""
    echo "Next steps:"
    echo "1. Review and update .env.production configuration"
    echo "2. Update SSL certificates for production"
    echo "3. Configure domain and DNS settings"
    echo "4. Run: ./deploy.sh to start the application"
    echo "5. Run: ./monitor.sh to check system status"
    echo ""
    echo "Services will be available at:"
    echo "- Application: https://your-domain.com"
    echo "- Monitoring: http://your-server:3001 (Grafana)"
    echo "- Metrics: http://your-server:9090 (Prometheus)"
    echo "- Logs: http://your-server:5601 (Kibana)"
}

# Run main function
main "$@"
EOF

    print_success "Phase 3 setup script created"
}

# Create monitoring dashboard
create_monitoring_dashboard() {
    print_status "Creating monitoring dashboard..."

    cat > "monitoring/README.md" << 'EOF'
# HRMS Monitoring Dashboard

## Overview
This monitoring setup provides comprehensive observability for the HRMS application including:

- **Application Metrics**: Response times, error rates, throughput
- **System Metrics**: CPU, memory, disk usage
- **Database Metrics**: Connection pools, query performance
- **Cache Metrics**: Hit rates, memory usage, eviction rates
- **Load Balancer Metrics**: Request distribution, health status

## Services

### Grafana (Visualization)
- **URL**: http://localhost:3001
- **Default Login**: admin / admin
- **Dashboards**: Pre-configured HRMS dashboard available

### Prometheus (Metrics Collection)
- **URL**: http://localhost:9090
- **Metrics Endpoint**: /api/metrics on each app instance

### ELK Stack (Logging)
- **Elasticsearch**: http://localhost:9200
- **Logstash**: Processes application logs
- **Kibana**: http://localhost:5601 (log visualization)

## Key Metrics to Monitor

### Application Performance
- Response time percentiles (p50, p95, p99)
- Error rate percentage
- Requests per second (RPS)
- Active connections

### System Resources
- CPU usage per instance
- Memory usage per instance
- Disk I/O operations
- Network traffic

### Database Performance
- Active connections
- Query execution time
- Connection pool utilization
- Deadlock count

### Cache Performance
- Cache hit rate
- Cache miss rate
- Memory usage
- Eviction rate

## Alerting Rules

Configure alerts for:
- High error rates (>5%)
- Response time degradation (>2s p95)
- Resource exhaustion (>90% CPU/Memory)
- Service unavailability
- Database connection issues

## Log Analysis

Use Kibana to analyze:
- Application errors and exceptions
- User activity patterns
- Performance bottlenecks
- Security events

## Maintenance

### Regular Tasks
- Monitor disk space usage
- Review and rotate logs
- Update monitoring rules
- Backup monitoring data

### Troubleshooting
- Check service health endpoints
- Review application logs
- Analyze performance metrics
- Test failover scenarios
EOF

    print_success "Monitoring dashboard documentation created"
}

# Run the setup
main() {
    echo "🚀 Phase 3: Load Balancing & Auto-scaling Setup"
    echo "=============================================="

    check_prerequisites
    setup_environment
    create_docker_compose
    create_nginx_config
    create_pm2_config
    create_monitoring_config
    create_redis_config
    create_dockerfile
    setup_ssl
    create_deployment_scripts
    create_monitoring_dashboard

    echo ""
    print_success "Phase 3 setup completed successfully! 🎉"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Review .env.production configuration"
    echo "2. Update SSL certificates for production use"
    echo "3. Configure your domain DNS settings"
    echo "4. Run: chmod +x *.sh && ./deploy.sh"
    echo "5. Access application at: https://your-domain.com"
    echo "6. Monitor at: http://your-server:3001 (Grafana)"
    echo ""
    echo "🔧 Useful Commands:"
    echo "- ./monitor.sh          # Check system status"
    echo "- ./deploy.sh           # Deploy application"
    echo "- ./rollback.sh         # Rollback deployment"
    echo "- docker-compose logs   # View all logs"
    echo ""
}

# Execute main function
main "$@"