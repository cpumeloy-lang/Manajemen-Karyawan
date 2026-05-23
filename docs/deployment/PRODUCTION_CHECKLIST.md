# 🚀 Production Deployment Checklist — HRMS Pro

Panduan langkah demi langkah untuk deploy aplikasi ke produksi dengan aman.

---

## 📋 Pre-Deployment

### 1. Database (Supabase)
- [ ] Jalankan migrasi pending:
  - [ ] `database/database-add-face-biometric.sql`
  - [ ] `database/database-setup-step7-shift-scheduling.sql`
- [ ] Verifikasi semua RLS policies aktif: `SELECT * FROM pg_policies;`
- [ ] Generate TypeScript types: `npx supabase gen types typescript --project-id <PROJECT_ID> > services/database.types.ts`
- [ ] Backup database sebelum migrasi besar
- [ ] Setup automated daily backup (via docker-compose `backup` service atau Supabase Pro plan)

### 2. Environment Variables

#### Web (`.env.production`)
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
GEMINI_API_KEY=your-gemini-key
```

#### Server (docker-compose)
```env
POSTGRES_PASSWORD=<strong-random-64-chars>
REDIS_PASSWORD=<strong-random-32-chars>
GRAFANA_PASSWORD=<strong-password>
CORS_ORIGINS=https://hrms.your-domain.com
```

- [ ] Semua secrets disimpan di password manager / Vault
- [ ] `.env*` files TIDAK ter-commit ke git (verify: `git ls-files | grep -E "\.env"`)
- [ ] `.dockerignore` mengexclude `.env*`

### 3. SSL & Domain
- [ ] Domain pointing ke server IP
- [ ] SSL certificate via Let's Encrypt:
  ```bash
  certbot certonly --nginx -d hrms.your-domain.com
  ```
- [ ] Update `nginx.conf`:
  - [ ] Ganti `server_name hrms.example.com` dengan domain asli
  - [ ] Path cert: `/etc/letsencrypt/live/hrms.your-domain.com/fullchain.pem`
  - [ ] Path key: `/etc/letsencrypt/live/hrms.your-domain.com/privkey.pem`
  - [ ] Update CORS origin di location `/api/`
- [ ] Setup cert auto-renewal (cron / systemd timer)

### 4. Security Audit
- [ ] Run: `npm audit --audit-level=high`
- [ ] Semua dependencies up-to-date (no known CVE)
- [ ] Tidak ada hardcoded API keys: `grep -rE "(sk_live|AKIA[0-9A-Z])" --include="*.ts" .`
- [ ] Review `services/rbacService.ts` permissions
- [ ] Review Supabase RLS policies untuk setiap tabel

### 5. Testing
- [ ] `npx vitest run` — semua unit test lulus
- [ ] Manual smoke test flow kritis:
  - [ ] Login (admin, HRD, kepala_ruangan, karyawan)
  - [ ] Absensi check-in / check-out
  - [ ] Pengajuan cuti + approval
  - [ ] Upload dokumen
  - [ ] Laporan payroll
- [ ] Test di browser target: Chrome, Edge, Safari, Firefox
- [ ] Test responsive: Desktop, tablet, mobile

---

## 🏗️ Build & Deploy

### Web Application

```bash
# Build production
npm run build

# Test locally
node server.js

# Docker build & push
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

# Verify
curl https://hrms.your-domain.com/api/health
```

**Expected bundle size (gzipped):**
- `index-*.js`: ~140 KB
- `vendor-react`: ~4 KB
- `vendor-supabase`: ~43 KB
- `vendor-charts`: ~101 KB
- `EmployeeSelfService`: ~173 KB

### Mobile Application

#### Generate Release Keystore (one-time)
```powershell
cd mobile-absensi/android/app
keytool -genkeypair -v `
  -keystore hrms-release.keystore `
  -alias hrms-key `
  -keyalg RSA -keysize 2048 -validity 10000
```

**Backup keystore file & passwords!** Hilang = tidak bisa update app di Play Store.

#### Configure signing (`~/.gradle/gradle.properties`)
```properties
HRMS_RELEASE_STORE_FILE=hrms-release.keystore
HRMS_RELEASE_STORE_PASSWORD=<keystore-password>
HRMS_RELEASE_KEY_ALIAS=hrms-key
HRMS_RELEASE_KEY_PASSWORD=<key-password>
```

#### Build APK / AAB
```powershell
cd mobile-absensi

# Install dependencies
npm ci
npx expo install expo-secure-store expo-crypto

# Update versionCode in app.json before each release
# Build release APK
npm run build:android:release

# Output: android/app/build/outputs/apk/release/app-release.apk
```

#### Play Store Submission Checklist
- [ ] Ganti `app.json` → `extra.privacyPolicyUrl` dengan URL asli
- [ ] Tambahkan icon 1024×1024 dan adaptive icon foreground
- [ ] Implementasi face recognition asli (biometric placeholder di-block di production)
- [ ] Screenshots untuk Play Store listing
- [ ] Privacy Policy page published
- [ ] Data safety form di Play Console

---

## 📊 Monitoring Post-Deploy

- [ ] Prometheus metrics accessible: `https://your-domain.com:9090` (internal only)
- [ ] Grafana dashboards configured
- [ ] Error tracking (Sentry/Bugsnag) aktif
- [ ] Log aggregation (ELK) berjalan
- [ ] Uptime monitoring setup (UptimeRobot / Better Uptime)
- [ ] Alert ke Slack/email untuk:
  - [ ] Server down
  - [ ] Error rate > 1%
  - [ ] Response time > 2s
  - [ ] Database connection pool exhausted

---

## 🔄 Rollback Plan

Jika deploy gagal:

```bash
# 1. Quick rollback (docker)
docker compose -f docker-compose.prod.yml down
docker tag hrms-app:previous hrms-app:latest
docker compose -f docker-compose.prod.yml up -d

# 2. Database rollback (jika migrasi gagal)
psql -U hrms_user hrms_prod < backups/backup-YYYYMMDD-HHMMSS.sql.gz

# 3. Mobile rollback
# Gunakan staged rollout di Play Console untuk pause release
```

---

## 📝 Post-Deploy Verification

- [ ] `/api/health` returns 200
- [ ] Login flow works end-to-end
- [ ] Lighthouse score ≥ 80 (Performance, Accessibility, Best Practices)
- [ ] No console errors in browser DevTools
- [ ] HTTPS/SSL grade A on [SSL Labs](https://www.ssllabs.com/ssltest/)
- [ ] Security headers on [securityheaders.com](https://securityheaders.com/) grade A
- [ ] Mobile app crash-free sessions > 99.5%
