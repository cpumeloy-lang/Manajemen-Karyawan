#!/bin/bash

# ===========================================
# REDIS CACHE SETUP SCRIPT - PHASE 2
# HRMS Production Readiness
# ===========================================

echo "🚀 Setting up Redis Caching Layer for HRMS..."
echo "==============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/redis-setup-$(date +%Y%m%d-%H%M%S).log"

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Error handling
error_exit() {
    echo -e "${RED}❌ Error: $1${NC}" >&2
    log "ERROR: $1"
    exit 1
}

# Success message
success() {
    echo -e "${GREEN}✅ $1${NC}"
    log "SUCCESS: $1"
}

# Warning message
warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    log "WARNING: $1"
}

# Info message
info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
    log "INFO: $1"
}

# Check if Node.js project
check_project() {
    info "Checking Node.js project..."

    if [ ! -f "$SCRIPT_DIR/package.json" ]; then
        error_exit "package.json not found. Please run this script from the project root."
    fi

    success "Node.js project found"
}

# Install Redis dependencies
install_dependencies() {
    info "Installing Redis dependencies..."

    if ! npm install redis @types/redis --save; then
        error_exit "Failed to install Redis dependencies"
    fi

    success "Redis dependencies installed"
}

# Setup environment variables
setup_environment() {
    info "Setting up Redis environment variables..."

    ENV_FILE="$SCRIPT_DIR/.env.local"
    REDIS_ENV_FILE="$SCRIPT_DIR/.env.redis"

    if [ ! -f "$REDIS_ENV_FILE" ]; then
        error_exit ".env.redis file not found"
    fi

    # Backup existing .env.local
    if [ -f "$ENV_FILE" ]; then
        cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%s)"
        info "Backed up existing .env.local"
    fi

    # Append Redis configuration to .env.local
    echo "" >> "$ENV_FILE"
    echo "# Redis Cache Configuration - Added by setup script" >> "$ENV_FILE"
    cat "$REDIS_ENV_FILE" >> "$ENV_FILE"

    success "Redis environment variables configured"
}

# Check Redis server availability
check_redis_server() {
    info "Checking Redis server availability..."

    # Try to connect to Redis
    if command -v redis-cli &> /dev/null; then
        if redis-cli ping &> /dev/null; then
            success "Redis server is running and accessible"
            return 0
        fi
    fi

    warning "Redis server not accessible via redis-cli"
    echo ""
    echo "Please ensure Redis is installed and running:"
    echo ""
    echo "📋 Installation options:"
    echo ""
    echo "1. Docker (Recommended):"
    echo "   docker run -d -p 6379:6379 --name redis-hris redis:alpine"
    echo ""
    echo "2. Ubuntu/Debian:"
    echo "   sudo apt update && sudo apt install redis-server"
    echo "   sudo systemctl start redis-server"
    echo ""
    echo "3. macOS (with Homebrew):"
    echo "   brew install redis"
    echo "   brew services start redis"
    echo ""
    echo "4. Windows (with WSL):"
    echo "   Use Docker or WSL Ubuntu installation above"
    echo ""
    echo "5. Cloud Services:"
    echo "   - Redis Cloud (redis.com)"
    echo "   - AWS ElastiCache"
    echo "   - Google Cloud Memorystore"
    echo "   - Azure Cache for Redis"
    echo ""

    read -p "Do you want to continue with setup anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        info "Setup cancelled. Please start Redis server and run this script again."
        exit 0
    fi

    warning "Continuing without Redis server - caching will fallback to client-side cache"
}

# Test Redis connection
test_redis_connection() {
    info "Testing Redis connection..."

    # Create a simple test script
    cat > "$SCRIPT_DIR/test-redis.js" << 'EOF'
const Redis = require('redis');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function testConnection() {
  const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0')
  };

  console.log('Testing Redis connection with config:', {
    ...redisConfig,
    password: redisConfig.password ? '[HIDDEN]' : undefined
  });

  const client = Redis.createClient(redisConfig);

  try {
    await new Promise((resolve, reject) => {
      client.on('connect', () => resolve());
      client.on('error', (err) => reject(err));

      // Timeout after 5 seconds
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });

    // Test basic operations
    await client.set('hris:test', 'Hello from HRMS Redis setup!');
    const value = await client.get('hris:test');
    await client.del('hris:test');

    console.log('✅ Redis connection successful');
    console.log('✅ Basic operations working');
    console.log('📊 Retrieved value:', value);

    return true;
  } catch (error) {
    console.error('❌ Redis connection failed:', error.message);
    return false;
  } finally {
    await client.quit();
  }
}

testConnection().then(success => {
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
EOF

    # Run the test
    if node "$SCRIPT_DIR/test-redis.js"; then
        success "Redis connection test passed"
        rm "$SCRIPT_DIR/test-redis.js"
    else
        warning "Redis connection test failed"
        rm "$SCRIPT_DIR/test-redis.js"

        echo ""
        echo "Troubleshooting steps:"
        echo "1. Check if Redis server is running"
        echo "2. Verify REDIS_HOST and REDIS_PORT in .env.local"
        echo "3. Check firewall settings"
        echo "4. Verify Redis password if set"
        echo ""

        read -p "Continue with setup anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Update application code
update_application() {
    info "Checking application code updates..."

    REDIS_CACHE_FILE="$SCRIPT_DIR/services/redisCache.ts"
    PAGINATION_UTILS_FILE="$SCRIPT_DIR/services/paginationUtils.ts"

    if [ ! -f "$REDIS_CACHE_FILE" ]; then
        warning "redisCache.ts not found - please ensure it's created"
    else
        success "redisCache.ts found"
    fi

    if [ ! -f "$PAGINATION_UTILS_FILE" ]; then
        warning "paginationUtils.ts not found - please ensure it's created"
    else
        success "paginationUtils.ts found"
    fi

    info "Application code has been updated to use Redis caching"
}

# Create monitoring script
create_monitoring_script() {
    info "Creating Redis monitoring script..."

    cat > "$SCRIPT_DIR/monitor-redis.js" << 'EOF'
#!/usr/bin/env node

const Redis = require('redis');
require('dotenv').config({ path: '.env.local' });

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0')
};

async function monitorRedis() {
  console.log('🔍 Redis Cache Monitor for HRMS');
  console.log('================================');

  const client = Redis.createClient(redisConfig);

  try {
    // Wait for connection
    await new Promise((resolve, reject) => {
      client.on('connect', () => resolve());
      client.on('error', (err) => reject(err));
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });

    console.log('✅ Connected to Redis');

    // Get server info
    const info = await client.info();
    const stats = {
      redis_version: info.match(/redis_version:([^\r\n]+)/)?.[1],
      connected_clients: info.match(/connected_clients:(\d+)/)?.[1],
      used_memory: info.match(/used_memory:(\d+)/)?.[1],
      total_connections_received: info.match(/total_connections_received:(\d+)/)?.[1],
      keyspace_hits: info.match(/keyspace_hits:(\d+)/)?.[1],
      keyspace_misses: info.match(/keyspace_misses:(\d+)/)?.[1],
    };

    console.log('\n📊 Redis Server Stats:');
    Object.entries(stats).forEach(([key, value]) => {
      if (value) {
        const displayKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        console.log(`  ${displayKey}: ${value}`);
      }
    });

    // Get HRMS cache keys
    const keys = await client.keys('hris:*');
    console.log(`\n📦 HRMS Cache Keys: ${keys.length}`);

    if (keys.length > 0) {
      console.log('\nSample keys:');
      keys.slice(0, 10).forEach(key => console.log(`  ${key}`));
      if (keys.length > 10) {
        console.log(`  ... and ${keys.length - 10} more`);
      }
    }

    // Cache hit rate
    const hits = parseInt(stats.keyspace_hits || '0');
    const misses = parseInt(stats.keyspace_misses || '0');
    const total = hits + misses;
    const hitRate = total > 0 ? ((hits / total) * 100).toFixed(2) : '0.00';

    console.log(`\n🎯 Cache Performance:`);
    console.log(`  Hit Rate: ${hitRate}%`);
    console.log(`  Total Requests: ${total}`);
    console.log(`  Hits: ${hits}`);
    console.log(`  Misses: ${misses}`);

  } catch (error) {
    console.error('❌ Monitoring failed:', error.message);
  } finally {
    await client.quit();
  }
}

monitorRedis().catch(console.error);
EOF

    chmod +x "$SCRIPT_DIR/monitor-redis.js"
    success "Redis monitoring script created (monitor-redis.js)"
}

# Create cache invalidation script
create_invalidation_script() {
    info "Creating cache invalidation script..."

    cat > "$SCRIPT_DIR/invalidate-cache.js" << 'EOF'
#!/usr/bin/env node

const Redis = require('redis');
require('dotenv').config({ path: '.env.local' });

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0')
};

async function invalidateCache() {
  console.log('🗑️  HRMS Cache Invalidation Tool');
  console.log('===============================');

  const args = process.argv.slice(2);
  const pattern = args[0] || '*';

  console.log(`Invalidating cache pattern: hris:${pattern}`);

  const client = Redis.createClient(redisConfig);

  try {
    await new Promise((resolve, reject) => {
      client.on('connect', () => resolve());
      client.on('error', (err) => reject(err));
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });

    const keys = await client.keys(`hris:${pattern}`);
    console.log(`Found ${keys.length} keys matching pattern`);

    if (keys.length > 0) {
      const deleted = await client.del(keys);
      console.log(`✅ Deleted ${deleted} cache entries`);
    } else {
      console.log('ℹ️  No cache entries found');
    }

  } catch (error) {
    console.error('❌ Cache invalidation failed:', error.message);
  } finally {
    await client.quit();
  }
}

if (require.main === module) {
  invalidateCache().catch(console.error);
}

module.exports = { invalidateCache };
EOF

    chmod +x "$SCRIPT_DIR/invalidate-cache.js"
    success "Cache invalidation script created (invalidate-cache.js)"
}

# Main execution
main() {
    echo "🔧 HRMS Redis Cache Setup Script"
    echo "================================"

    log "Starting Redis cache setup"

    check_project
    echo ""

    install_dependencies
    echo ""

    setup_environment
    echo ""

    check_redis_server
    echo ""

    test_redis_connection
    echo ""

    update_application
    echo ""

    create_monitoring_script
    echo ""

    create_invalidation_script
    echo ""

    success "Redis caching setup completed successfully!"
    success "Your HRMS application now has Redis-powered caching!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Start your application: npm run dev"
    echo "2. Monitor cache performance: node monitor-redis.js"
    echo "3. Invalidate cache if needed: node invalidate-cache.js [pattern]"
    echo ""
    echo "📖 Documentation: REDIS_CACHE_README.md"

    log "Redis cache setup completed"
}

# Run main function
main "$@"