#!/usr/bin/env bash
# scripts/hrms-healthcheck.sh
#
# Quick health-check: cek semua service & resource server.
# Cocok dipanggil mingguan atau via UptimeRobot webhook.
#
# Exit code:
#   0 = semua OK
#   1 = ada warning
#   2 = ada critical issue

set -uo pipefail

WARN=0
CRIT=0

ok()   { echo "  [OK]   $*"; }
warn() { echo "  [WARN] $*"; WARN=1; }
crit() { echo "  [CRIT] $*"; CRIT=1; }

echo "===> HRMS Server Health Check ($(date -Is))"

# 1) Docker containers
echo "[1] Docker containers"
EXPECTED_CONTAINERS=(supabase-db supabase-kong supabase-auth supabase-rest supabase-realtime supabase-storage)
for c in "${EXPECTED_CONTAINERS[@]}"; do
  status=$(docker inspect -f '{{.State.Status}}' "$c" 2>/dev/null || echo "missing")
  if [[ "$status" == "running" ]]; then
    ok "$c → running"
  else
    crit "$c → $status"
  fi
done

# 2) Cloudflare tunnel
echo "[2] Cloudflare Tunnel"
if systemctl is-active --quiet cloudflared; then
  ok "cloudflared service active"
else
  crit "cloudflared service inactive"
fi

# 3) Disk usage
echo "[3] Disk usage"
ROOT_USAGE=$(df / | awk 'NR==2 {print $5}' | tr -d '%')
if   [[ $ROOT_USAGE -lt 70 ]]; then ok   "/ → ${ROOT_USAGE}%"
elif [[ $ROOT_USAGE -lt 85 ]]; then warn "/ → ${ROOT_USAGE}% (mulai penuh)"
else                               crit "/ → ${ROOT_USAGE}% (CRITICAL)"
fi

DOCKER_USAGE=$(df /var/lib/docker 2>/dev/null | awk 'NR==2 {print $5}' | tr -d '%' || echo 0)
if   [[ $DOCKER_USAGE -lt 70 ]]; then ok   "/var/lib/docker → ${DOCKER_USAGE}%"
elif [[ $DOCKER_USAGE -lt 85 ]]; then warn "/var/lib/docker → ${DOCKER_USAGE}%"
else                                  crit "/var/lib/docker → ${DOCKER_USAGE}%"
fi

# 4) RAM
echo "[4] Memory"
MEM_USED=$(free | awk 'NR==2 {printf "%d", $3/$2 * 100}')
if   [[ $MEM_USED -lt 80 ]]; then ok   "RAM → ${MEM_USED}%"
elif [[ $MEM_USED -lt 90 ]]; then warn "RAM → ${MEM_USED}%"
else                              crit "RAM → ${MEM_USED}%"
fi

# 5) HTTP endpoint
echo "[5] HTTP endpoint"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 \
  https://hrms.rsanda.id/auth/v1/health 2>/dev/null || echo "000")
if [[ "$HTTP_CODE" == "200" ]]; then
  ok "https://hrms.rsanda.id/auth/v1/health → 200"
else
  crit "https://hrms.rsanda.id → HTTP $HTTP_CODE"
fi

# 6) Backup terbaru
echo "[6] Backup status"
if [[ -d /var/backups/hrms ]]; then
  LATEST=$(find /var/backups/hrms -name "*.enc" -type f -printf '%T@ %p\n' 2>/dev/null \
           | sort -n | tail -1 | awk '{print $2}')
  if [[ -n "$LATEST" ]]; then
    AGE_HOURS=$(( ( $(date +%s) - $(stat -c %Y "$LATEST") ) / 3600 ))
    if   [[ $AGE_HOURS -lt 30 ]]; then ok   "Backup terbaru: $AGE_HOURS jam yang lalu"
    elif [[ $AGE_HOURS -lt 50 ]]; then warn "Backup terbaru: $AGE_HOURS jam (>1 hari)"
    else                                crit "Backup terbaru: $AGE_HOURS jam (LAMA)"
    fi
  else
    crit "Tidak ada file backup di /var/backups/hrms"
  fi
else
  warn "Folder /var/backups/hrms tidak ada"
fi

# 7) Failed login attempts
echo "[7] Security"
BANNED=$(sudo fail2ban-client status sshd 2>/dev/null | grep "Currently banned" | awk '{print $NF}' || echo 0)
ok "fail2ban: $BANNED IP banned"

echo
echo "===> Summary"
if   [[ $CRIT -eq 1 ]]; then echo "STATUS: ❌ CRITICAL — segera tindakan"; exit 2
elif [[ $WARN -eq 1 ]]; then echo "STATUS: ⚠️  WARNING — perlu perhatian"; exit 1
else                          echo "STATUS: ✅ ALL GOOD"; exit 0
fi
