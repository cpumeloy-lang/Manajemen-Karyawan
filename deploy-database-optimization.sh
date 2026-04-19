#!/bin/bash

# ===========================================
# DATABASE OPTIMIZATION DEPLOYMENT SCRIPT
# HRMS Production Readiness - Phase 1
# ===========================================

echo "🚀 Starting HRMS Database Optimization..."
echo "==========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/database-optimization-$(date +%Y%m%d-%H%M%S).log"

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

# Check if files exist
check_files() {
    info "Checking required files..."

    if [ ! -f "$SCRIPT_DIR/database-optimization-indexes.sql" ]; then
        error_exit "database-optimization-indexes.sql not found!"
    fi

    if [ ! -f "$SCRIPT_DIR/database-optimization-pagination.sql" ]; then
        error_exit "database-optimization-pagination.sql not found!"
    fi

    success "All required files found"
}

# Backup database (recommendation)
backup_database() {
    warning "IMPORTANT: Please backup your database before proceeding!"
    echo ""
    echo "Recommended backup commands:"
    echo "pg_dump -h your-host -U your-user -d your-database > backup_$(date +%Y%m%d).sql"
    echo "or use Supabase dashboard backup feature"
    echo ""

    read -p "Have you backed up your database? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        warning "Please backup your database first, then run this script again."
        exit 0
    fi
}

# Execute SQL file
execute_sql() {
    local sql_file="$1"
    local description="$2"

    info "Executing $description..."

    # For Supabase, we'll provide instructions since we can't connect directly
    echo ""
    echo "📋 COPY AND PASTE THE FOLLOWING INTO SUPABASE SQL EDITOR:"
    echo "=========================================================="
    echo ""
    echo "-- $description"
    echo "-- File: $sql_file"
    echo "-- Executed at: $(date)"
    echo ""

    cat "$sql_file"

    echo ""
    echo "=========================================================="
    echo ""

    read -p "Press Enter after executing the SQL in Supabase..."
    success "$description completed"
}

# Verify optimization
verify_optimization() {
    info "Verification queries to run in Supabase SQL Editor:"
    echo ""
    echo "-- 1. Check indexes created"
    echo "SELECT schemaname, tablename, indexname"
    echo "FROM pg_indexes"
    echo "WHERE schemaname = 'public'"
    echo "  AND tablename IN ('employees', 'attendance', 'payroll', 'requests', 'work_units')"
    echo "ORDER BY tablename, indexname;"
    echo ""

    echo "-- 2. Check table sizes"
    echo "SELECT schemaname, tablename,"
    echo "       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size"
    echo "FROM pg_tables"
    echo "WHERE schemaname = 'public'"
    echo "  AND tablename IN ('employees', 'attendance', 'payroll', 'requests', 'work_units')"
    echo "ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"
    echo ""

    echo "-- 3. Test pagination function"
    echo "SELECT * FROM get_paginated_employees(10, 0, NULL, NULL, 'active');"
    echo ""

    read -p "Run these verification queries and press Enter when done..."
    success "Verification completed"
}

# Update frontend components
update_frontend() {
    info "Checking frontend components..."

    if [ ! -f "$SCRIPT_DIR/services/paginationUtils.ts" ]; then
        warning "paginationUtils.ts not found - please ensure it's created"
    else
        success "paginationUtils.ts found"
    fi

    if [ ! -f "$SCRIPT_DIR/components/AttendanceManagementOptimized.tsx" ]; then
        warning "AttendanceManagementOptimized.tsx not found - please ensure it's created"
    else
        success "AttendanceManagementOptimized.tsx found"
    fi

    info "Update your components to use the optimized versions"
    info "See DATABASE_OPTIMIZATION_README.md for implementation details"
}

# Performance testing
performance_test() {
    info "Performance testing recommendations:"
    echo ""
    echo "1. Test query performance before/after:"
    echo "   EXPLAIN ANALYZE SELECT * FROM employees WHERE role = 'karyawan' LIMIT 50;"
    echo ""

    echo "2. Test pagination performance:"
    echo "   SELECT * FROM get_paginated_employees(50, 0, 'karyawan');"
    echo ""

    echo "3. Monitor slow queries:"
    echo "   SELECT * FROM slow_queries LIMIT 5;"
    echo ""

    echo "4. Check index usage:"
    echo "   SELECT indexname, idx_scan FROM pg_stat_user_indexes"
    echo "   WHERE schemaname = 'public' ORDER BY idx_scan DESC;"
    echo ""
}

# Main execution
main() {
    echo "🔧 HRMS Database Optimization Script"
    echo "===================================="
    log "Starting database optimization process"

    check_files
    echo ""

    backup_database
    echo ""

    execute_sql "$SCRIPT_DIR/database-optimization-indexes.sql" "Database Indexes Optimization"
    echo ""

    execute_sql "$SCRIPT_DIR/database-optimization-pagination.sql" "Pagination & Query Optimization"
    echo ""

    verify_optimization
    echo ""

    update_frontend
    echo ""

    performance_test
    echo ""

    success "Database optimization completed successfully!"
    success "Check DATABASE_OPTIMIZATION_README.md for usage instructions"
    success "Monitor performance improvements over the next few days"

    log "Database optimization process completed"
}

# Run main function
main "$@"