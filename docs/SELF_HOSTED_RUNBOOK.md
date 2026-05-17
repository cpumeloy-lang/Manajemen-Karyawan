# Runbook: Self-Hosted Supabase + Cloudflare Tunnel untuk HRMS Pro

> Target audience: 1 staf IT RS yang familiar Linux dasar (`ssh`, `nano`, `cd`).
> Estimasi waktu setup: **2–3 hari** (Day 1: server prep, Day 2: Supabase + tunnel,
> Day 3: migrasi data + verify).

---

## Daftar Isi

1. [Prerequisites](#1-prerequisites)
2. [Day 1 — Server Preparation](#2-day-1--server-preparation)
3. [Day 1 — Hardening Dasar](#3-day-1--hardening-dasar)
4. [Day 2 — Install Docker](#4-day-2--install-docker)
5. [Day 2 — Deploy Supabase Self-Hosted](#5-day-2--deploy-supabase-self-hosted)
6. [Day 2 — Cloudflare Tunnel](#6-day-2--cloudflare-tunnel)
7. [Day 2 — Backup Otomatis](#7-day-2--backup-otomatis)
8. [Day 3 — Migrasi Data dari Supabase Cloud](#8-day-3--migrasi-data-dari-supabase-cloud)
9. [Day 3 — Update Aplikasi Mobile](#9-day-3--update-aplikasi-mobile)
10. [Day 3 — Verifikasi End-to-End](#10-day-3--verifikasi-end-to-end)
11. [Day-2 Operations (Harian/Mingguan)](#11-day-2-operations)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Prerequisites

### Hardware

- PC/server dengan minimum: **4 core CPU, 8GB RAM, 256GB SSD**.
- UPS minimum 1000VA (untuk safe-shutdown saat listrik mati).
- Koneksi internet RS (50+ Mbps direkomendasikan).

### Akun & Domain

- [ ] Domain (mis. `hrms.rsanda.id`) — daftar di Cloudflare Registrar atau Niagahoster.
- [ ] Akun **Cloudflare** (gratis) → DNS domain wajib di Cloudflare.
- [ ] Akun **Backblaze B2** (gratis 10GB) untuk off-site backup. Daftar: <https://www.backblaze.com/cloud-storage>
- [ ] Akun **Supabase Cloud existing** Anda (untuk export data).

### Tools di Laptop Admin

- SSH client (PowerShell/PuTTY).
- Editor (VS Code/Notepad++).

### Estimasi Biaya

- Domain: ±Rp 200rb/tahun
- Listrik server: ±Rp 50rb/bulan
- Backblaze B2: Gratis (<10GB)
- Cloudflare Tunnel: Gratis
- **Total: ±Rp 65rb/bulan**

---

## 2. Day 1 — Server Preparation

### 2.1 Install Ubuntu Server 22.04 LTS

1. Download ISO: <https://ubuntu.com/download/server>
2. Buat bootable USB pakai Rufus.
3. Boot dari USB, ikuti wizard instalasi:
   - **Hostname**: `hrms-server`
   - **User**: `hrmsadmin` (jangan pakai `root` langsung).
   - **Password**: kuat, minimal 16 karakter, simpan di password manager.
   - **OpenSSH**: ✅ install.
   - **Featured snaps**: skip semua.
   - **Disk**: full disk dengan LVM (default).
4. Reboot, login.

### 2.2 Catat IP Server

```bash
ip a | grep "inet "
# Cari IP LAN (mis. 192.168.1.50). Catat untuk akses SSH.
```

### 2.3 Set Static IP (di router atau di server)

**Opsi mudah**: di router admin panel, reservasi DHCP untuk MAC address server → kasih IP tetap (mis. `192.168.1.50`).

### 2.4 Update System

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git ufw fail2ban htop nano \
                    unattended-upgrades cron rsync openssl
sudo reboot
```

### 2.5 Setup Auto-Update Keamanan

```bash
sudo dpkg-reconfigure --priority=low unattended-upgrades
# Pilih "Yes" — sistem akan auto-install security patch.
```

---

## 3. Day 1 — Hardening Dasar

### 3.1 Disable SSH Root Login & Password (gunakan SSH key)

**Di laptop admin**, generate SSH key kalau belum punya:

```powershell
# PowerShell di laptop
ssh-keygen -t ed25519 -C "admin-laptop"
# Tekan Enter untuk default path, kasih passphrase
```

Copy public key ke server:

```powershell
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh hrmsadmin@192.168.1.50 "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

Edit SSH config di server:

```bash
sudo nano /etc/ssh/sshd_config
```

Set:
```
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

Restart SSH:
```bash
sudo systemctl restart ssh
```

**Test login dari laptop sebelum logout!**

### 3.2 Enable Firewall

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp        # SSH (LAN only nanti)
sudo ufw enable
sudo ufw status verbose
```

> **Catatan**: Cloudflare Tunnel **tidak butuh open port apapun di firewall** — agent membuat outbound connection. Jadi UFW tetap close untuk port 80/443.

### 3.3 Aktifkan fail2ban (anti brute-force SSH)

```bash
sudo systemctl enable --now fail2ban
sudo fail2ban-client status sshd
```

### 3.4 Set Timezone

```bash
sudo timedatectl set-timezone Asia/Jakarta
timedatectl
```

---

## 4. Day 2 — Install Docker

```bash
# Install Docker resmi
curl -fsSL https://get.docker.com | sudo sh

# Tambah user ke group docker (agar tidak perlu sudo)
sudo usermod -aG docker hrmsadmin
newgrp docker

# Verifikasi
docker --version
docker compose version
docker run hello-world
```

---

## 5. Day 2 — Deploy Supabase Self-Hosted

### 5.1 Clone Repository Supabase

```bash
mkdir -p ~/apps && cd ~/apps
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker
```

### 5.2 Generate Secrets

```bash
# JWT Secret (32+ chars random)
openssl rand -base64 48
# Catat → akan dipakai untuk JWT_SECRET

# Postgres Password
openssl rand -base64 32
# Catat → akan dipakai untuk POSTGRES_PASSWORD

# Dashboard Password
openssl rand -base64 16
# Catat → akan dipakai untuk DASHBOARD_PASSWORD
```

### 5.3 Generate Anon Key & Service Role Key

Pakai online tool: <https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys>

Atau pakai CLI Node:

```bash
# Install dependency sementara
sudo apt install -y nodejs npm
sudo npm install -g jsonwebtoken-cli

# Generate ANON key (role: anon)
JWT_SECRET="<paste JWT_SECRET dari atas>"
echo '{"role":"anon","iss":"supabase","iat":1735689600,"exp":2051222400}' | \
  jsonwebtoken-cli sign --secret "$JWT_SECRET" --algorithm HS256

# Generate SERVICE_ROLE key (role: service_role)
echo '{"role":"service_role","iss":"supabase","iat":1735689600,"exp":2051222400}' | \
  jsonwebtoken-cli sign --secret "$JWT_SECRET" --algorithm HS256
```

Catat output keduanya.

### 5.4 Konfigurasi `.env`

```bash
cp .env.example .env
nano .env
```

Wajib ubah field berikut:

```ini
# =====
# SECRETS — JANGAN PUBLISH
# =====
POSTGRES_PASSWORD=<paste dari step 5.2>
JWT_SECRET=<paste dari step 5.2>
ANON_KEY=<paste dari step 5.3>
SERVICE_ROLE_KEY=<paste dari step 5.3>
DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=<paste dari step 5.2>

# =====
# URLs — sesuaikan dengan domain RS
# =====
SITE_URL=https://hrms.rsanda.id
API_EXTERNAL_URL=https://hrms.rsanda.id
SUPABASE_PUBLIC_URL=https://hrms.rsanda.id

# =====
# SMTP (untuk reset password email) — opsional
# =====
SMTP_ADMIN_EMAIL=admin@rsanda.id
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<email-anda>@gmail.com
SMTP_PASS=<app-password-gmail>
SMTP_SENDER_NAME=HRMS RSANDA

# =====
# Disable signup publik (hanya admin yang bisa undang)
# =====
DISABLE_SIGNUP=true
ENABLE_EMAIL_AUTOCONFIRM=true
```

> **Penting**: Backup file `.env` ke USB drive aman. Bila hilang, semua user tidak bisa login.

### 5.5 Pull & Start Container

```bash
docker compose pull
docker compose up -d

# Tunggu 1-2 menit, lalu cek status
docker compose ps
# Semua service harus "running" / "healthy"

# Lihat log untuk troubleshoot
docker compose logs -f db        # Postgres
docker compose logs -f auth      # GoTrue
docker compose logs -f kong      # API Gateway
```

### 5.6 Test Akses Lokal

```bash
# Studio (dashboard)
curl -I http://localhost:3000
# Harus return HTTP 200

# REST API
curl http://localhost:8000/rest/v1/ \
  -H "apikey: <ANON_KEY>"
```

Buka browser di laptop (yang seLAN dengan server):
```
http://192.168.1.50:3000
```
Login pakai `admin` / `<DASHBOARD_PASSWORD>` dari `.env`.

---

## 6. Day 2 — Cloudflare Tunnel

### 6.1 Install cloudflared

```bash
curl -L --output cloudflared.deb \
  https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb

cloudflared --version
```

### 6.2 Pindahkan DNS Domain ke Cloudflare

1. Login Cloudflare → "Add Site" → masukkan `rsanda.id`.
2. Cloudflare scan record DNS existing → pilih plan **Free**.
3. Copy 2 nameserver yang Cloudflare berikan.
4. Login ke registrar domain (Niagahoster/dll) → ubah nameserver ke yang Cloudflare kasih.
5. Tunggu propagasi (1–24 jam). Cek dengan `dig hrms.rsanda.id NS`.

### 6.3 Login & Buat Tunnel

```bash
cloudflared tunnel login
# Browser akan terbuka — login Cloudflare → pilih domain rsanda.id
# Token akan tersimpan di ~/.cloudflared/cert.pem

cloudflared tunnel create hrms-rs
# Output: Created tunnel hrms-rs with id <UUID>
# Catat UUID tersebut.
```

### 6.4 Routing DNS

```bash
cloudflared tunnel route dns hrms-rs hrms.rsanda.id
# Otomatis buat CNAME hrms.rsanda.id → <UUID>.cfargotunnel.com
```

### 6.5 Konfigurasi Tunnel

```bash
sudo mkdir -p /etc/cloudflared
sudo nano /etc/cloudflared/config.yml
```

Isi:

```yaml
tunnel: <UUID-dari-step-6.3>
credentials-file: /home/hrmsadmin/.cloudflared/<UUID>.json

ingress:
  - hostname: hrms.rsanda.id
    service: http://localhost:8000
    originRequest:
      noTLSVerify: true
      connectTimeout: 30s
  - service: http_status:404
```

Copy credentials ke folder system:

```bash
sudo cp /home/hrmsadmin/.cloudflared/<UUID>.json /etc/cloudflared/
sudo chmod 600 /etc/cloudflared/<UUID>.json
```

Update `config.yml` agar `credentials-file` mengacu ke `/etc/cloudflared/<UUID>.json`.

### 6.6 Install sebagai Service

```bash
sudo cloudflared service install
sudo systemctl enable --now cloudflared
sudo systemctl status cloudflared
# Should be "active (running)"
```

### 6.7 Test dari Internet

Dari ponsel pakai data seluler (bukan WiFi RS):

```
https://hrms.rsanda.id
```

Harus muncul Supabase studio atau response API. SSL otomatis di-handle Cloudflare.

### 6.8 Hardening Cloudflare (di dashboard)

- **SSL/TLS** → Encryption mode: **Full** (atau **Full strict** kalau pasang cert internal).
- **Firewall** → Settings → Security level: **Medium**.
- **Firewall Rules** (opsional, gratis 5 rules):
  ```
  (http.request.uri.path contains "/admin") and (ip.geoip.country ne "ID") → Block
  ```
- **Rate Limiting** (gratis 10k requests/bulan): protect `/auth/v1/token` dari brute-force.

---

## 7. Day 2 — Backup Otomatis

### 7.1 Setup Backblaze B2

1. Login B2 → "Buckets" → Create Bucket: `hrms-rs-backup` (private).
2. "App Keys" → Add Application Key:
   - Name: `hrms-server-backup`
   - Bucket: `hrms-rs-backup`
   - Capabilities: `listFiles`, `readFiles`, `writeFiles`, `deleteFiles`
3. Catat `keyID` dan `applicationKey`.

### 7.2 Install rclone

```bash
curl https://rclone.org/install.sh | sudo bash
rclone config
```

Wizard:
```
n (new remote)
name> b2
Storage> b2
account> <keyID>
key> <applicationKey>
hard_delete> false
y (yes, save)
q (quit)
```

Test:
```bash
rclone lsd b2:
# Harus list bucket "hrms-rs-backup"
```

### 7.3 Backup Script

```bash
sudo nano /usr/local/bin/hrms-backup.sh
```

Isi:

```bash
#!/usr/bin/env bash
# /usr/local/bin/hrms-backup.sh
# Backup PostgreSQL Supabase ke local + B2.

set -euo pipefail

BACKUP_DIR="/var/backups/hrms"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
ENC_KEY_FILE="/etc/hrms/backup-key"   # 32-char password file
RETENTION_LOCAL_DAYS=7
RETENTION_REMOTE_DAYS=90

mkdir -p "$BACKUP_DIR"

# 1) Dump Postgres
docker exec supabase-db pg_dump -U postgres -F c -d postgres \
  | gzip \
  | openssl enc -aes-256-cbc -pbkdf2 -salt -pass file:"$ENC_KEY_FILE" \
  > "$BACKUP_DIR/hrms-$TIMESTAMP.dump.gz.enc"

# 2) Dump file storage (foto referensi wajah, dll)
docker run --rm \
  --volumes-from supabase-storage \
  -v "$BACKUP_DIR":/backup alpine \
  tar czf "/backup/storage-$TIMESTAMP.tar.gz" /var/lib/storage

# 3) Upload ke B2 (encrypt-at-rest)
rclone copy "$BACKUP_DIR/hrms-$TIMESTAMP.dump.gz.enc" b2:hrms-rs-backup/db/
rclone copy "$BACKUP_DIR/storage-$TIMESTAMP.tar.gz"   b2:hrms-rs-backup/storage/

# 4) Cleanup local lama
find "$BACKUP_DIR" -type f -mtime +$RETENTION_LOCAL_DAYS -delete

# 5) Cleanup B2 lama
rclone delete --min-age ${RETENTION_REMOTE_DAYS}d b2:hrms-rs-backup/

echo "[$(date)] Backup OK: $TIMESTAMP" >> /var/log/hrms-backup.log
```

Set permission:

```bash
sudo mkdir -p /etc/hrms
echo "$(openssl rand -base64 32)" | sudo tee /etc/hrms/backup-key > /dev/null
sudo chmod 600 /etc/hrms/backup-key
sudo chmod +x /usr/local/bin/hrms-backup.sh

# SIMPAN /etc/hrms/backup-key DI USB AMAN — tanpa ini backup tidak bisa di-restore!
```

### 7.4 Schedule Cron

```bash
sudo crontab -e
```

Tambah:

```
# HRMS backup setiap hari jam 02:00
0 2 * * * /usr/local/bin/hrms-backup.sh >> /var/log/hrms-backup.log 2>&1
```

### 7.5 Test Restore (WAJIB!)

```bash
# Decrypt + decompress
openssl enc -d -aes-256-cbc -pbkdf2 -pass file:/etc/hrms/backup-key \
  -in /var/backups/hrms/hrms-<TIMESTAMP>.dump.gz.enc | gunzip > /tmp/test.dump

# Coba pg_restore ke DB temporary
docker exec -i supabase-db createdb -U postgres test_restore
docker exec -i supabase-db pg_restore -U postgres -d test_restore < /tmp/test.dump
docker exec -i supabase-db psql -U postgres -d test_restore -c "\dt"
# Harus tampil semua table

# Cleanup
docker exec -i supabase-db dropdb -U postgres test_restore
rm /tmp/test.dump
```

> **Tanpa test restore, backup bukan backup.** Lakukan ini setiap bulan.

---

## 8. Day 3 — Migrasi Data dari Supabase Cloud

### 8.1 Export dari Supabase Cloud

Di laptop admin:

```powershell
# Install psql client
# (Windows: download dari postgresql.org)

# Connection string Supabase Cloud — ada di Project Settings > Database
$env:PGPASSWORD = "<password-cloud>"
pg_dump -h db.<PROJECT-REF>.supabase.co `
        -U postgres -d postgres `
        -F c -b -f hrms-cloud.dump
```

### 8.2 Transfer ke Server Lokal

```powershell
scp hrms-cloud.dump hrmsadmin@192.168.1.50:/tmp/
```

### 8.3 Restore ke Server Lokal

```bash
# Stop service yang akses DB
docker compose stop auth rest realtime storage

# Restore
docker exec -i supabase-db pg_restore \
  -U postgres -d postgres \
  --clean --if-exists \
  < /tmp/hrms-cloud.dump

# Restart
docker compose start auth rest realtime storage

# Verifikasi
docker exec supabase-db psql -U postgres -d postgres -c "\dt public.*"
docker exec supabase-db psql -U postgres -d postgres -c "SELECT COUNT(*) FROM employees;"
```

### 8.4 Apply Migration HRMS

Apply dalam urutan ini di Supabase Studio (`https://hrms.rsanda.id` → SQL Editor):

1. `database/database-setup-step1.sql` (skip jika sudah ada dari export)
2. `database/database-add-mobile-fields.sql`
3. `database/database-add-face-recognition.sql`
4. `database/fix-employees-rls-recursion.sql`

### 8.5 Buat Storage Buckets

Di Studio → Storage:
- `face-references` (private) — untuk foto wajah karyawan.
- `avatars` (public) — untuk foto profil.
- `documents` (private) — untuk dokumen pendukung izin.

Atau via SQL:
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('face-references', 'face-references', false),
  ('avatars', 'avatars', true),
  ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;
```

---

## 9. Day 3 — Update Aplikasi Mobile

### 9.1 Update `.env` di mobile-absensi

```bash
# d:\AI PROSES\HRMS Pro\mobile-absensi\.env
EXPO_PUBLIC_SUPABASE_URL=https://hrms.rsanda.id
EXPO_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY dari /etc/supabase/.env>
```

### 9.2 Update `.env` di Web App

```bash
# d:\AI PROSES\HRMS Pro\.env (atau di hosting web)
VITE_SUPABASE_URL=https://hrms.rsanda.id
VITE_SUPABASE_ANON_KEY=<ANON_KEY>
```

### 9.3 Rebuild APK Production

```powershell
cd "d:\AI PROSES\HRMS Pro\mobile-absensi"

# Aktifkan kembali plugin vision-camera di app.json (rename _pluginsForRebuild)
# Lalu:
npx expo prebuild --clean
cd android
.\gradlew assembleRelease

# APK production: app/build/outputs/apk/release/app-release.apk
```

### 9.4 Distribusikan APK ke Karyawan

- Upload APK ke folder share internal RS (mis. shared drive / Telegram group HRD).
- Buat installer guide PDF untuk karyawan.

---

## 10. Day 3 — Verifikasi End-to-End

Checklist sanity test:

- [ ] Login web admin via `https://hrms.rsanda.id` (atau `https://admin.rsanda.id` kalau pisah).
- [ ] Login mobile dengan akun karyawan dummy.
- [ ] Daftarkan wajah → foto referensi tersimpan di bucket `face-references`.
- [ ] Check-in dengan liveness → record masuk ke tabel `attendance`.
- [ ] Push notification dikirim ke admin saat ada izin baru.
- [ ] Backup script jalan jam 02:00 → cek `/var/log/hrms-backup.log`.
- [ ] Test restore backup ke DB temporary → data konsisten.

---

## 11. Day-2 Operations

### Harian (otomatis)

| Task | How |
|---|---|
| Backup | Cron 02:00 (sudah setup) |
| Security patch OS | unattended-upgrades (sudah setup) |
| Cek log | Tidak perlu, kecuali ada alert |

### Mingguan (manual ~10 menit)

```bash
# Cek disk usage
df -h
# Pastikan / dan /var/lib/docker < 80%

# Cek service health
docker compose ps
sudo systemctl status cloudflared

# Cek backup log
tail -20 /var/log/hrms-backup.log

# Cek failed login attempts
sudo fail2ban-client status sshd
```

### Bulanan

- [ ] Test restore backup ke DB temporary (lihat 7.5).
- [ ] Update Docker images:
  ```bash
  cd ~/apps/supabase/docker
  git pull
  docker compose pull
  docker compose up -d
  ```
- [ ] Review audit log untuk anomali (`audit_logs` table).

### Tahunan

- [ ] Renew domain.
- [ ] Audit user akses (revoke karyawan yang resign).
- [ ] Disaster recovery drill: restore full backup ke server kedua.

---

## 12. Troubleshooting

### Container tidak start

```bash
docker compose logs <service-name>
# Look for "Error", "FATAL"
```

Common: port conflict (sesuatu lain pakai 8000/3000) → ubah port di `docker-compose.yml`.

### Mobile app: "Network request failed"

1. Cek tunnel jalan: `sudo systemctl status cloudflared`.
2. Cek dari luar: `curl -I https://hrms.rsanda.id/auth/v1/health`.
3. Cek Cloudflare dashboard → Network → Tunnels → status "Healthy".

### Login gagal di mobile

1. Cek `ANON_KEY` di mobile `.env` cocok dengan `.env` server.
2. Restart Metro: `npx expo start --clear`.

### Database lambat

```bash
docker exec supabase-db psql -U postgres -c "SELECT pid, query, now()-query_start AS dur FROM pg_stat_activity WHERE state='active' ORDER BY dur DESC LIMIT 10;"
```

### Cloudflare Tunnel down

```bash
sudo journalctl -u cloudflared -n 50
sudo systemctl restart cloudflared
```

### Disk penuh

```bash
docker system prune -a --volumes
# Hapus image & container yang tidak dipakai
```

---

## Lampiran A — Diagram Arsitektur

```
                    Internet (karyawan via 4G)
                            │
                            ▼
              ┌──────────────────────────┐
              │   Cloudflare Edge        │
              │   - SSL termination      │
              │   - DDoS protect         │
              │   - Rate limit           │
              └──────────────┬───────────┘
                             │ outbound tunnel
                             ▼
          ┌─────────────────────────────────────┐
          │   Server Lokal RS (Ubuntu 22.04)    │
          │   192.168.1.50                      │
          │   ┌───────────────────────────────┐ │
          │   │  cloudflared agent            │ │
          │   └───────────┬───────────────────┘ │
          │               │ http://localhost   │
          │               ▼                     │
          │   ┌───────────────────────────────┐ │
          │   │  Kong API Gateway :8000       │ │
          │   ├───────────────────────────────┤ │
          │   │  GoTrue (auth) :9999          │ │
          │   │  PostgREST :3000              │ │
          │   │  Realtime :4000               │ │
          │   │  Storage :5000                │ │
          │   ├───────────────────────────────┤ │
          │   │  PostgreSQL :5432             │ │
          │   │  ↳ /var/lib/docker/volumes    │ │
          │   ├───────────────────────────────┤ │
          │   │  Studio (admin UI) :3001      │ │
          │   └───────────────────────────────┘ │
          │                                     │
          │   Cron 02:00 → backup → B2 cloud   │
          └─────────────────────────────────────┘
                             │
                             │ LAN (WiFi RS)
                             ▼
                  Karyawan dalam gedung RS
                  (akses langsung tanpa via Cloudflare)
                  → opsi: tambah DNS lokal hrms.local
```

---

## Lampiran B — Akses dari LAN tanpa Cloudflare (opsional, lebih cepat)

Untuk karyawan dalam WiFi RS, traffic via Cloudflare boros bandwidth & lebih lambat.
Setup DNS lokal:

1. Di router RS: tambah DNS entry `hrms.local` → `192.168.1.50`.
2. Di server, tambah ke Nginx (jalankan paralel dengan Cloudflare tunnel):

```bash
sudo apt install nginx
sudo nano /etc/nginx/sites-available/hrms-local
```

```nginx
server {
    listen 80;
    server_name hrms.local;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/hrms-local /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Mobile app pakai dual config: kalau di WiFi RS → `http://hrms.local`, kalau di luar → `https://hrms.rsanda.id`. (Implementasi: cek hostname saat startup, fallback otomatis).

---

## Lampiran C — Disaster Recovery Plan

### Skenario 1: Server mati (hardware failure)

1. Siapkan server cadangan (PC lama yang sama spec-nya).
2. Install ulang Ubuntu sesuai runbook ini Step 2-4.
3. Copy folder `/etc/cloudflared/`, `/etc/hrms/backup-key`, `~/.cloudflared/cert.pem` dari USB backup.
4. Restore Postgres dari backup B2 terbaru:
   ```bash
   rclone copy b2:hrms-rs-backup/db/<latest>.dump.gz.enc /tmp/
   openssl enc -d -aes-256-cbc -pbkdf2 -pass file:/etc/hrms/backup-key \
     -in /tmp/<latest>.dump.gz.enc | gunzip > /tmp/restore.dump
   docker exec -i supabase-db pg_restore -U postgres -d postgres --clean --if-exists < /tmp/restore.dump
   ```
5. Restart cloudflared service → tunnel resume otomatis.
6. **RTO target: 4 jam.**

### Skenario 2: File `.env` Supabase hilang

Tanpa file ini, semua user tidak bisa login (JWT_SECRET berbeda).
**Pencegahan**: backup `.env` ke 3 tempat (USB, password manager admin, vault HRD).

### Skenario 3: Backup encryption key hilang

Backup tidak bisa di-restore. **GAME OVER** untuk recovery.
**Pencegahan**: print `/etc/hrms/backup-key` di kertas, simpan di brankas RS.

---

## Status Setelah Selesai

✅ Aplikasi HRMS production-ready di server lokal RS
✅ Online via `https://hrms.rsanda.id` tanpa buka port firewall
✅ Backup otomatis harian terenkripsi ke cloud
✅ Total biaya operasional < Rp 65.000/bulan
✅ Data biometric tidak keluar dari LAN RS

---

**Versi runbook**: 1.0 (Mei 2026)
**Maintainer**: HRD/IT RS Anda
**Untuk update**: edit file ini di repo `HRMS Pro/docs/SELF_HOSTED_RUNBOOK.md`
