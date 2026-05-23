#!/bin/bash

# ===========================================
# PRODUCTION DEPLOYMENT SCRIPT - PHASE 3
# HRMS Production Deployment Orchestrator
# ===========================================

set -e

echo "🚀 Starting HRMS Production Deployment - Phase 3"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_ENV="${DEPLOY_ENV:-production}"
BACKUP_DIR="$PROJECT_ROOT/backups/$(date +%Y%m%d-%H%M%S)"

# Function to print colored output
print_header() {
    echo -e "${PURPLE}🔧 $1${NC}"
    echo -e "${PURPLE}$(printf '%.0s=' {1..50})${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"

    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running. Please start Docker."
        exit 1
    fi

    # Check if Docker Compose is available
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose."
        exit 1
    fi

    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js."
        exit 1
    fi

    # Check if environment file exists
    if [ ! -f ".env.production" ]; then
        print_warning ".env.production not found. Copying from .env.loadbalancer..."
        cp .env.loadbalancer .env.production
        print_warning "Please edit .env.production with your production values before redeploying."
        exit 1
    fi

    print_success "Prerequisites check completed"
}

# Create backup
create_backup() {
    print_header "Creating Backup"

    mkdir -p "$BACKUP_DIR"

    # Backup environment files
    cp .env* "$BACKUP_DIR/" 2>/dev/null || true

    # Backup database if running
    if docker ps | grep -q hrms-postgres; then
        print_info "Backing up database..."
        docker exec hrms-postgres pg_dump -U hrms_user hrms_prod > "$BACKUP_DIR/database.sql" 2>/dev/null || true
    fi

    # Backup Redis data
    if docker ps | grep -q hrms-redis; then
        print_info "Backing up Redis data..."
        docker exec hrms-redis redis-cli SAVE
        docker cp hrms-redis:/data/dump.rdb "$BACKUP_DIR/redis-dump.rdb" 2>/dev/null || true
    fi

    print_success "Backup created at $BACKUP_DIR"
}

# Stop existing services
stop_services() {
    print_header "Stopping Existing Services"

    # Stop PM2 processes
    if command -v pm2 &> /dev/null; then
        pm2 stop all 2>/dev/null || true
        pm2 delete all 2>/dev/null || true
    fi

    # Stop Docker containers
    if [ -f "docker-compose.prod.yml" ]; then
        docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
        docker compose -f docker-compose.prod.yml down 2>/dev/null || true
    fi

    print_success "Services stopped"
}

# Build application
build_application() {
    print_header "Building Application"

    # Install dependencies
    print_info "Installing dependencies..."
    npm ci

    # Build application
    print_info "Building production bundle..."
    npm run build

    # Create logs directory
    mkdir -p logs
    mkdir -p uploads
    mkdir -p ssl

    print_success "Application built successfully"
}

# Start infrastructure services
start_infrastructure() {
    print_header "Starting Infrastructure Services"

    # Start database and Redis first
    print_info "Starting database and Redis..."
    docker-compose -f docker-compose.prod.yml up -d postgres redis 2>/dev/null || \
    docker compose -f docker-compose.prod.yml up -d postgres redis

    # Wait for services to be ready
    print_info "Waiting for database..."
    sleep 10

    # Run database migrations if needed
    if [ -f "database-setup.sql" ]; then
        print_info "Running database setup..."
        docker exec -i hrms-postgres psql -U hrms_user -d hrms_prod < database-setup.sql || true
    fi

    print_success "Infrastructure services started"
}

# Start monitoring stack
start_monitoring() {
    print_header "Starting Monitoring Stack"

    # Start monitoring services
    docker-compose -f docker-compose.prod.yml up -d prometheus grafana node-exporter redis-exporter 2>/dev/null || \
    docker compose -f docker-compose.prod.yml up -d prometheus grafana node-exporter redis-exporter

    # Start logging stack
    docker-compose -f docker-compose.prod.yml up -d elasticsearch logstash kibana 2>/dev/null || \
    docker compose -f docker-compose.prod.yml up -d elasticsearch logstash kibana

    print_success "Monitoring stack started"
}

# Start application with PM2
start_application() {
    print_header "Starting Application"

    # Install PM2 globally if not installed
    if ! command -v pm2 &> /dev/null; then
        print_info "Installing PM2..."
        npm install -g pm2
    fi

    # Start application with PM2
    print_info "Starting application with PM2..."
    pm2 start ecosystem.config.js --env production

    # Save PM2 configuration
    pm2 save

    # Start PM2 on boot
    pm2 startup
    pm2 save

    print_success "Application started with PM2"
}

# Start load balancer
start_load_balancer() {
    print_header "Starting Load Balancer"

    # Start Nginx
    docker-compose -f docker-compose.prod.yml up -d nginx 2>/dev/null || \
    docker compose -f docker-compose.prod.yml up -d nginx

    print_success "Load balancer started"
}

# Start auto-scaling
start_auto_scaling() {
    print_header "Starting Auto-scaling"

    # Start auto-scaling manager
    pm2 start ecosystem.config.js --only hrms-autoscaler

    print_success "Auto-scaling manager started"
}

# Health checks
run_health_checks() {
    print_header "Running Health Checks"

    # Wait for services to start
    sleep 30

    # Check application health
    print_info "Checking application health..."
    if curl -f http://localhost:3000/api/health &>/dev/null; then
        print_success "Application health check passed"
    else
        print_warning "Application health check failed - may still be starting"
    fi

    # Check load balancer
    print_info "Checking load balancer..."
    if curl -f http://localhost/api/health &>/dev/null; then
        print_success "Load balancer health check passed"
    else
        print_warning "Load balancer health check failed"
    fi

    # Check monitoring
    print_info "Checking monitoring services..."
    if curl -f http://localhost:9090/-/healthy &>/dev/null; then
        print_success "Prometheus health check passed"
    else
        print_warning "Prometheus health check failed"
    fi

    if curl -f http://localhost:3001/api/health &>/dev/null; then
        print_success "Grafana health check passed"
    else
        print_warning "Grafana health check failed"
    fi
}

# Show deployment summary
show_summary() {
    print_header "Deployment Summary"

    echo ""
    echo "🎉 HRMS Production Deployment Completed!"
    echo ""
    echo "📍 Access Points:"
    echo "   • Application: http://your-server"
    echo "   • Health Check: http://your-server/api/health"
    echo "   • Grafana: http://your-server:3001 (admin/admin)"
    echo "   • Prometheus: http://your-server:9090"
    echo "   • Kibana: http://your-server:5601"
    echo ""
    echo "🔧 Management Commands:"
    echo "   • View logs: pm2 logs"
    echo "   • Monitor: pm2 monit"
    echo "   • Restart: pm2 restart hrms-app"
    echo "   • Scale: pm2 scale hrms-app <number>"
    echo ""
    echo "📊 Monitoring:"
    echo "   • Auto-scaling: pm2 logs hrms-autoscaler"
    echo "   • System metrics: http://your-server:9090"
    echo "   • Application metrics: http://your-server/api/metrics"
    echo ""
    echo "🛑 Emergency Stop:"
    echo "   • Stop all: pm2 stop all && docker-compose down"
    echo "   • Quick restart: pm2 restart all"
    echo ""
}

# Main deployment function
deploy() {
    check_prerequisites
    create_backup
    stop_services
    build_application
    start_infrastructure
    start_monitoring
    start_application
    start_load_balancer
    start_auto_scaling
    run_health_checks
    show_summary
}

# Rollback function
rollback() {
    print_header "Rolling Back Deployment"

    stop_services

    # Restore from backup if available
    if [ -d "$BACKUP_DIR" ]; then
        print_info "Restoring from backup..."
        cp "$BACKUP_DIR/.env.production" . 2>/dev/null || true
    fi

    # Restart previous version
    if [ -f "docker-compose.prod.yml" ]; then
        docker-compose -f docker-compose.prod.yml up -d 2>/dev/null || \
        docker compose -f docker-compose.prod.yml up -d
    fi

    print_success "Rollback completed"
}

# CLI interface
case "${1:-deploy}" in
    "deploy")
        deploy
        ;;
    "rollback")
        rollback
        ;;
    "stop")
        stop_services
        ;;
    "restart")
        stop_services
        deploy
        ;;
    "status")
        echo "📊 Deployment Status:"
        echo "PM2 processes:"
        pm2 list
        echo ""
        echo "Docker containers:"
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        ;;
    "logs")
        pm2 logs ${2:-hrms-app}
        ;;
    *)
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  deploy    - Full production deployment (default)"
        echo "  rollback  - Rollback to previous version"
        echo "  stop      - Stop all services"
        echo "  restart   - Stop and redeploy"
        echo "  status    - Show deployment status"
        echo "  logs [app] - Show logs for specific app"
        echo ""
        exit 1
        ;;
esac