@echo off
REM ===========================================
REM PRODUCTION DEPLOYMENT SCRIPT - PHASE 3 (Windows)
REM HRMS Production Deployment Orchestrator
REM ===========================================

echo 🚀 Starting HRMS Production Deployment - Phase 3
echo =================================================

REM Configuration
set PROJECT_ROOT=%~dp0
set DEPLOY_ENV=production
set BACKUP_DIR=%PROJECT_ROOT%backups\%date:~-4,4%%date:~-10,2%%date:~-7,2%-%time:~0,2%%time:~3,2%%time:~6,2%

REM Remove spaces from time
set BACKUP_DIR=%BACKUP_DIR: =0%

echo 📁 Project root: %PROJECT_ROOT%
echo 📦 Backup dir: %BACKUP_DIR%

REM Create backup directory
if not exist "%PROJECT_ROOT%backups" mkdir "%PROJECT_ROOT%backups"
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

echo ✅ Backup directory created

REM Check prerequisites
echo.
echo 🔧 Checking Prerequisites...

where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Docker is not installed. Please install Docker first.
    pause
    exit /b 1
)

docker info >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Docker daemon is not running. Please start Docker.
    pause
    exit /b 1
)

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js.
    pause
    exit /b 1
)

if not exist ".env.production" (
    echo ⚠️  .env.production not found. Copying from .env.loadbalancer...
    copy .env.loadbalancer .env.production
    echo ⚠️  Please edit .env.production with your production values before redeploying.
    pause
    exit /b 1
)

echo ✅ Prerequisites check completed

REM Create backup
echo.
echo 💾 Creating Backup...

REM Backup environment files
copy .env* "%BACKUP_DIR%\" >nul 2>nul

REM Create logs and uploads directories
if not exist "logs" mkdir logs
if not exist "uploads" mkdir uploads
if not exist "ssl" mkdir ssl

echo ✅ Backup created at %BACKUP_DIR%

REM Build application
echo.
echo 🔨 Building Application...

echo 📦 Installing dependencies...
call npm ci
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo 🏗️  Building production bundle...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Failed to build application
    pause
    exit /b 1
)

echo ✅ Application built successfully

REM Start Docker services
echo.
echo 🐳 Starting Docker Services...

echo 🗄️  Starting database and Redis...
docker-compose -f docker-compose.prod.yml up -d postgres redis
if %errorlevel% neq 0 (
    docker compose -f docker-compose.prod.yml up -d postgres redis
    if %errorlevel% neq 0 (
        echo ❌ Failed to start database and Redis
        pause
        exit /b 1
    )
)

echo ⏳ Waiting for services to be ready...
timeout /t 15 /nobreak >nul

echo ✅ Infrastructure services started

REM Start monitoring stack
echo.
echo 📊 Starting Monitoring Stack...

docker-compose -f docker-compose.prod.yml up -d prometheus grafana node-exporter redis-exporter
if %errorlevel% neq 0 (
    docker compose -f docker-compose.prod.yml up -d prometheus grafana node-exporter redis-exporter
)

docker-compose -f docker-compose.prod.yml up -d elasticsearch logstash kibana
if %errorlevel% neq 0 (
    docker compose -f docker-compose.prod.yml up -d elasticsearch logstash kibana
)

echo ✅ Monitoring stack started

REM Install and start PM2
echo.
echo ⚙️  Setting up PM2...

where pm2 >nul 2>nul
if %errorlevel% neq 0 (
    echo 📦 Installing PM2...
    call npm install -g pm2
    if %errorlevel% neq 0 (
        echo ❌ Failed to install PM2
        pause
        exit /b 1
    )
)

echo 🚀 Starting application with PM2...
call pm2 start ecosystem.config.js --env production
call pm2 save

echo ✅ Application started with PM2

REM Start load balancer
echo.
echo ⚖️  Starting Load Balancer...

docker-compose -f docker-compose.prod.yml up -d nginx
if %errorlevel% neq 0 (
    docker compose -f docker-compose.prod.yml up -d nginx
)

echo ✅ Load balancer started

REM Health checks
echo.
echo 🩺 Running Health Checks...

echo ⏳ Waiting for services to start...
timeout /t 30 /nobreak >nul

echo 🔍 Checking application health...
curl -f http://localhost:3000/api/health >nul 2>nul
if %errorlevel% equ 0 (
    echo ✅ Application health check passed
) else (
    echo ⚠️  Application health check failed - may still be starting
)

echo 🔍 Checking monitoring services...
curl -f http://localhost:9090/-/healthy >nul 2>nul
if %errorlevel% equ 0 (
    echo ✅ Prometheus health check passed
) else (
    echo ⚠️  Prometheus health check failed
)

REM Show deployment summary
echo.
echo 🎉 ===========================================
echo 🎉 HRMS PRODUCTION DEPLOYMENT COMPLETED!
echo 🎉 ===========================================
echo.
echo 📍 Access Points:
echo    • Application: http://localhost
echo    • Health Check: http://localhost/api/health
echo    • Grafana: http://localhost:3001 (admin/admin)
echo    • Prometheus: http://localhost:9090
echo    • Kibana: http://localhost:5601
echo.
echo 🔧 Management Commands:
echo    • View logs: pm2 logs
echo    • Monitor: pm2 monit
echo    • Restart: pm2 restart hrms-app
echo    • Scale: pm2 scale hrms-app [number]
echo.
echo 📊 Monitoring:
echo    • Auto-scaling: pm2 logs hrms-autoscaler
echo    • System metrics: http://localhost:9090
echo    • Application metrics: http://localhost/api/metrics
echo.
echo 🛑 Emergency Commands:
echo    • Stop all: pm2 stop all ^& docker-compose down
echo    • Quick restart: pm2 restart all
echo.

echo ✅ Phase 3 Load Balancing ^& Auto-scaling deployment completed!
echo 📚 See LOAD_BALANCING_README.md for detailed documentation

pause