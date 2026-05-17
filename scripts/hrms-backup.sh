#!/usr/bin/env bash
# scripts/hrms-backup.sh
#
# Backup PostgreSQL Supabase + Storage volume → terenkripsi → upload ke
# Backblaze B2 via rclone. Dijadwalkan via cron setiap 02:00.
#
# Pre-requisites di server:
#   - Docker compose Supabase running (container "supabase-db", "supabase-storage")
#   - rclone configured dengan remote bernama "b2"
#   - Bucket B2 bernama "hrms-rs-backup"
#   - Encryption key di /etc/hrms/backup-key (chmod 600)
#
# Install:
#   sudo cp hrms-backup.sh /usr/local/bin/
#   sudo chmod +x /usr/local/bin/hrms-backup.sh
#   sudo crontab -e
#   # tambah: 0 2 * * * /usr/local/bin/hrms-backup.sh >> /var/log/hrms-backup.log 2>&1

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/hrms}"
B2_REMOTE="${B2_REMOTE:-b2:hrms-rs-backup}"
ENC_KEY_FILE="${ENC_KEY_FILE:-/etc/hrms/backup-key}"
DB_CONTAINER="${DB_CONTAINER:-supabase-db}"
STORAGE_CONTAINER="${STORAGE_CONTAINER:-supabase-storage}"
RETENTION_LOCAL_DAYS="${RETENTION_LOCAL_DAYS:-7}"
RETENTION_REMOTE_DAYS="${RETENTION_REMOTE_DAYS:-90}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"

log() { echo "[$(date -Is)] $*"; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || { log "FATAL: $1 tidak terinstall"; exit 1; }
}

require_cmd docker
require_cmd rclone
require_cmd openssl
require_cmd gzip

[[ -r "$ENC_KEY_FILE" ]] || { log "FATAL: encryption key tidak readable: $ENC_KEY_FILE"; exit 1; }

mkdir -p "$BACKUP_DIR"

DUMP_FILE="$BACKUP_DIR/hrms-$TIMESTAMP.dump.gz.enc"
STORAGE_FILE="$BACKUP_DIR/storage-$TIMESTAMP.tar.gz.enc"

log "==> Dump Postgres → $DUMP_FILE"
docker exec "$DB_CONTAINER" pg_dump -U postgres -F c -d postgres \
  | gzip \
  | openssl enc -aes-256-cbc -pbkdf2 -salt -pass file:"$ENC_KEY_FILE" \
  > "$DUMP_FILE"

DUMP_SIZE=$(du -h "$DUMP_FILE" | cut -f1)
log "    Postgres dump OK ($DUMP_SIZE)"

log "==> Dump Storage volume → $STORAGE_FILE"
# Tar storage volume container, encrypt langsung
docker run --rm \
  --volumes-from "$STORAGE_CONTAINER" \
  -v "$BACKUP_DIR":/backup \
  alpine sh -c "tar czf - /var/lib/storage 2>/dev/null" \
  | openssl enc -aes-256-cbc -pbkdf2 -salt -pass file:"$ENC_KEY_FILE" \
  > "$STORAGE_FILE"

STORAGE_SIZE=$(du -h "$STORAGE_FILE" | cut -f1)
log "    Storage dump OK ($STORAGE_SIZE)"

log "==> Upload ke B2: $B2_REMOTE"
rclone copy "$DUMP_FILE"    "$B2_REMOTE/db/"      --quiet
rclone copy "$STORAGE_FILE" "$B2_REMOTE/storage/" --quiet
log "    Upload OK"

log "==> Cleanup local (>$RETENTION_LOCAL_DAYS hari)"
find "$BACKUP_DIR" -type f -mtime +"$RETENTION_LOCAL_DAYS" -name "*.enc" -delete

log "==> Cleanup remote (>$RETENTION_REMOTE_DAYS hari)"
rclone delete --min-age "${RETENTION_REMOTE_DAYS}d" "$B2_REMOTE/db/"      --quiet || true
rclone delete --min-age "${RETENTION_REMOTE_DAYS}d" "$B2_REMOTE/storage/" --quiet || true

log "==> SELESAI: backup $TIMESTAMP berhasil"
