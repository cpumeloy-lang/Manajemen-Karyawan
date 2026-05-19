#!/bin/bash

# ============================================================================
# AUTOMATIC DATABASE BACKUP SCRIPT
# Schedule this via cron to run daily backups
# 
# Cron example (run daily at 2 AM):
#   0 2 * * * /path/to/scripts/backup-database.sh
#
# Environment variables required:
#   - SUPABASE_URL
#   - SUPABASE_DB_PASSWORD
#   - BACKUP_RETENTION_DAYS (default: 30)
#   - BACKUP_DIR (default: ./backups)
# ============================================================================

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/hrms_backup_${TIMESTAMP}.sql.gz"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Check required environment variables
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_DB_PASSWORD" ]; then
    log "${RED}❌ SUPABASE_URL and SUPABASE_DB_PASSWORD must be set${NC}"
    exit 1
fi

# Extract connection details from SUPABASE_URL
# Example: postgresql://postgres:[password]@db.xxx.supabase.co:5432/postgres
DB_HOST=$(echo "$SUPABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo "$SUPABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo "$SUPABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_USER="postgres"

log "${GREEN}Starting database backup...${NC}"
log "Host: $DB_HOST:$DB_PORT"
log "Database: $DB_NAME"
log "Backup file: $BACKUP_FILE"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Perform backup using pg_dump
if PGPASSWORD="$SUPABASE_DB_PASSWORD" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --no-owner \
    --no-acl \
    --format=plain \
    --compress=9 \
    > "$BACKUP_FILE"; then
    log "${GREEN}✅ Backup completed successfully${NC}"
    log "Backup size: $(du -h "$BACKUP_FILE" | cut -f1)"
else
    log "${RED}❌ Backup failed${NC}"
    exit 1
fi

# Clean up old backups (keep only last RETENTION_DAYS days)
log "Cleaning up backups older than $RETENTION_DAYS days..."
DELETED=$(find "$BACKUP_DIR" -name "hrms_backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete -print | wc -l)
if [ "$DELETED" -gt 0 ]; then
    log "${YELLOW}Deleted $DELETED old backup(s)${NC}"
else
    log "No old backups to delete"
fi

# Verify backup was created
if [ -f "$BACKUP_FILE" ]; then
    log "${GREEN}✅ Backup verification passed${NC}"
    
    # Show current backups
    log "\nCurrent backups:"
    ls -lh "$BACKUP_DIR"/hrms_backup_*.sql.gz | tail -5
    
    exit 0
else
    log "${RED}❌ Backup file was not created${NC}"
    exit 1
fi
