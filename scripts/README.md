# HRMS Server Operations Scripts

Script-script ini di-deploy ke **server lokal RS** (bukan ke laptop developer).
Target server: Ubuntu Server 22.04 LTS dengan Docker Compose Supabase self-hosted.

## File

| File | Fungsi | Schedule |
|---|---|---|
| `hrms-backup.sh` | Backup Postgres + Storage → encrypted → upload B2 | Cron daily 02:00 |
| `hrms-restore.sh` | Restore dari backup (dry-run / production) | On-demand |
| `hrms-healthcheck.sh` | Health-check semua service & resource | Cron weekly Senin 08:00 |

## Instalasi di Server

```bash
# 1) Copy ke /usr/local/bin
sudo cp scripts/*.sh /usr/local/bin/
sudo chmod +x /usr/local/bin/hrms-*.sh

# 2) Buat encryption key (sekali saja)
sudo mkdir -p /etc/hrms
echo "$(openssl rand -base64 32)" | sudo tee /etc/hrms/backup-key > /dev/null
sudo chmod 600 /etc/hrms/backup-key

# 3) WAJIB: backup encryption key ke USB/brankas RS
sudo cat /etc/hrms/backup-key
# Catat & simpan di tempat aman. Tanpa ini backup tidak bisa di-restore.

# 4) Test rclone configured
rclone lsd b2:
# Harus list bucket "hrms-rs-backup"

# 5) Test backup script manual
sudo /usr/local/bin/hrms-backup.sh

# 6) Schedule cron
sudo crontab -e
```

Tambah baris berikut di crontab:
```cron
# Backup harian 02:00
0 2 * * * /usr/local/bin/hrms-backup.sh >> /var/log/hrms-backup.log 2>&1

# Healthcheck mingguan Senin 08:00
0 8 * * 1 /usr/local/bin/hrms-healthcheck.sh >> /var/log/hrms-health.log 2>&1
```

## Penggunaan

### Backup manual

```bash
sudo /usr/local/bin/hrms-backup.sh
tail -f /var/log/hrms-backup.log
```

### Test restore (dry-run, AMAN — restore ke DB temporary)

```bash
sudo /usr/local/bin/hrms-restore.sh /var/backups/hrms/hrms-20260508-020000.dump.gz.enc
```

### Test restore dari B2

```bash
sudo /usr/local/bin/hrms-restore.sh --from-b2 latest
```

### Restore PRODUCTION (BAHAYA!)

```bash
# Hanya saat DR (disaster recovery), DB production akan ter-overwrite
sudo PROD_RESTORE=1 /usr/local/bin/hrms-restore.sh /var/backups/hrms/hrms-20260508-020000.dump.gz.enc
```

### Health-check

```bash
sudo /usr/local/bin/hrms-healthcheck.sh
# Exit code 0=OK, 1=warning, 2=critical
```

## Environment Variables

Bisa di-override dengan env-var (default sudah cukup untuk setup standar):

```bash
BACKUP_DIR=/custom/path \
B2_REMOTE=b2:my-bucket \
ENC_KEY_FILE=/path/to/key \
DB_CONTAINER=my-postgres \
RETENTION_LOCAL_DAYS=14 \
RETENTION_REMOTE_DAYS=180 \
sudo -E /usr/local/bin/hrms-backup.sh
```

## Pemantauan

### Cek hasil backup terakhir

```bash
ls -lh /var/backups/hrms/ | tail -5
tail -50 /var/log/hrms-backup.log
```

### List backup di B2

```bash
rclone ls b2:hrms-rs-backup/db/ | tail
rclone size b2:hrms-rs-backup
```

### Setup notifikasi gagal (opsional)

Kirim email kalau backup gagal:

```bash
sudo apt install -y mailutils

# Update crontab agar pipe ke mail
0 2 * * * /usr/local/bin/hrms-backup.sh 2>&1 | tee -a /var/log/hrms-backup.log | grep -E "FATAL|Error" && /usr/local/bin/hrms-backup.sh 2>&1 | mail -s "HRMS Backup FAILED" admin@rsanda.id
```

Atau pakai healthcheck.io / Cronitor (gratis tier):
```bash
0 2 * * * /usr/local/bin/hrms-backup.sh && curl -fsS https://hc-ping.com/<UUID>
```

## Lihat juga

- `docs/SELF_HOSTED_RUNBOOK.md` — runbook deployment lengkap
