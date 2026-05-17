#!/usr/bin/env bash
# scripts/hrms-restore.sh
#
# Restore Postgres dari backup terenkripsi (lokal atau dari B2).
# Default: restore ke database TEMPORARY untuk verifikasi.
# Untuk restore production, jalankan dengan PROD_RESTORE=1 (HATI-HATI).
#
# Usage:
#   ./hrms-restore.sh /var/backups/hrms/hrms-20260508-020000.dump.gz.enc
#   PROD_RESTORE=1 ./hrms-restore.sh <file>     # restore ke DB production!
#   ./hrms-restore.sh --from-b2 latest          # download dari B2 terbaru

set -euo pipefail

ENC_KEY_FILE="${ENC_KEY_FILE:-/etc/hrms/backup-key}"
DB_CONTAINER="${DB_CONTAINER:-supabase-db}"
B2_REMOTE="${B2_REMOTE:-b2:hrms-rs-backup}"
PROD_RESTORE="${PROD_RESTORE:-0}"

log() { echo "[$(date -Is)] $*"; }
fatal() { log "FATAL: $*"; exit 1; }

[[ $# -ge 1 ]] || fatal "Usage: $0 <encrypted-dump-file> | --from-b2 latest"

if [[ "$1" == "--from-b2" ]]; then
  log "==> Mencari backup terbaru di B2"
  LATEST=$(rclone lsf "$B2_REMOTE/db/" --format=tp | sort | tail -1 | awk -F';' '{print $2}')
  [[ -n "$LATEST" ]] || fatal "Tidak ada backup di B2"
  TMP_FILE="/tmp/$LATEST"
  rclone copy "$B2_REMOTE/db/$LATEST" /tmp/
  ENC_FILE="$TMP_FILE"
  log "    Downloaded: $ENC_FILE"
else
  ENC_FILE="$1"
fi

[[ -f "$ENC_FILE" ]] || fatal "File tidak ada: $ENC_FILE"
[[ -r "$ENC_KEY_FILE" ]] || fatal "Encryption key tidak readable: $ENC_KEY_FILE"

DUMP_FILE="/tmp/hrms-restore-$(date +%s).dump"

log "==> Decrypt + decompress → $DUMP_FILE"
openssl enc -d -aes-256-cbc -pbkdf2 -pass file:"$ENC_KEY_FILE" -in "$ENC_FILE" \
  | gunzip > "$DUMP_FILE"

if [[ "$PROD_RESTORE" == "1" ]]; then
  log "==> ⚠️  RESTORE PRODUCTION — ini akan OVERWRITE database 'postgres'"
  read -rp "Yakin? Ketik 'YA SAYA YAKIN': " confirm
  [[ "$confirm" == "YA SAYA YAKIN" ]] || fatal "Dibatalkan"

  log "==> Stop services pengguna DB"
  docker compose -f /home/hrmsadmin/apps/supabase/docker/docker-compose.yml \
    stop auth rest realtime storage || true

  log "==> Restore ke database 'postgres'"
  docker exec -i "$DB_CONTAINER" pg_restore \
    -U postgres -d postgres \
    --clean --if-exists < "$DUMP_FILE"

  log "==> Restart services"
  docker compose -f /home/hrmsadmin/apps/supabase/docker/docker-compose.yml \
    start auth rest realtime storage

  log "==> RESTORE PRODUCTION SELESAI"
else
  TMP_DB="hrms_test_restore_$(date +%s)"
  log "==> Restore ke database temporary: $TMP_DB (DRY-RUN MODE)"

  docker exec -i "$DB_CONTAINER" createdb -U postgres "$TMP_DB"
  docker exec -i "$DB_CONTAINER" pg_restore -U postgres -d "$TMP_DB" < "$DUMP_FILE" || true

  log "==> Verifikasi:"
  docker exec -i "$DB_CONTAINER" psql -U postgres -d "$TMP_DB" \
    -c "\dt public.*"
  docker exec -i "$DB_CONTAINER" psql -U postgres -d "$TMP_DB" \
    -c "SELECT 'employees' AS tbl, COUNT(*) AS rows FROM public.employees
        UNION ALL SELECT 'attendance', COUNT(*) FROM public.attendance;"

  log "==> Cleanup: drop database temporary"
  docker exec -i "$DB_CONTAINER" dropdb -U postgres "$TMP_DB"
  log "==> DRY-RUN SELESAI — backup integritas OK"
fi

rm -f "$DUMP_FILE"
