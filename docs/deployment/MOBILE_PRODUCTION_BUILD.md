# HRMS Mobile — Production Build & Release Runbook

> Panduan lengkap dari source code → APK terdistribusi ke karyawan pilot.

---

## 1. Ringkasan Strategi Distribusi

Karena ini app internal RS (bukan publik), **tidak wajib Play Store**. Pilihan:

| Metode | Biaya | Kontrol Update | Cocok Untuk |
|---|---|---|---|
| **APK sideload + force-update gate** | Rp 0 | Manual (user klik link) | Pilot 10-100 user |
| **Google Play Internal Testing** | $25 sekali | Auto via Play Store | Pilot 100-500 user |
| **Private Play Store (Managed Google Play)** | Gratis (via Workspace) | Auto, fully managed | RS dengan Google Workspace |

Dokumen ini fokus ke **APK sideload** (paling cepat deploy). Force-update gate sudah terpasang (`ForceUpdateGate` + tabel `app_config`) — bila user pakai APK lama, app akan auto-lock dan arahkan download yang baru.

---

## 2. Pre-Build Checklist

### 2.1 Install Dependencies (sekali)

```powershell
# Di root mobile-absensi
cd "d:\AI PROSES\HRMS Pro\mobile-absensi"

# EAS CLI (pilih salah satu):
npm install -g eas-cli
# atau pakai npx (tidak global install): npx eas-cli@latest build

# Expo Constants (untuk baca versi dinamis di runtime)
npx expo install expo-constants

# Sentry SDK (untuk crash reporting)
npm install @sentry/react-native --save
npx @sentry/wizard@latest -i reactNative -p android
# Saat diminta, isi DSN dari dashboard Sentry (https://sentry.io).
```

### 2.2 Environment Variables

Buat file `.env.production` (JANGAN commit ke git — cek `.gitignore`):

```env
EXPO_PUBLIC_APP_ENV=production
EXPO_PUBLIC_SENTRY_DSN=https://<your-key>@o0.ingest.sentry.io/<project>
EXPO_PUBLIC_SUPABASE_URL=https://your-supabase.your-domain.com
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key-production>
```

> **Catatan**: `EXPO_PUBLIC_*` prefix di-bundle ke JS (read-only). Jangan taruh
> service-role key di sini — gunakan server-side API untuk operasi privileged.

### 2.3 Sinkronkan Versi

Setiap rilis WAJIB bump `versionCode` di `app.json`:

```jsonc
{
  "expo": {
    "version": "1.0.0",          // semver untuk user-facing
    "android": {
      "versionCode": 2            // integer monoton naik TIAP rilis
    }
  }
}
```

Sinkronkan juga fallback di `src/config/version.ts`:

```ts
const FALLBACK_VERSION = '1.0.0';
const FALLBACK_VERSION_CODE = 2;
```

### 2.4 Database Siap

Pastikan SQL migration `database/MOBILE_PRODUCTION_MIGRATIONS.sql` sudah di-run
di environment production. Verifikasi:

```sql
SELECT * FROM public.app_config;
-- Harus return 7 baris: min_version_code, latest_version_code,
-- update_url, update_message, maintenance_mode, maintenance_message, features.
```

---

## 3. Generate Keystore (Sekali Seumur Hidup App)

⚠️ **KEYSTORE HILANG = TIDAK BISA UPDATE APP LAGI.** Backup di 2 tempat berbeda!

### 3.1 Generate di mesin build

```powershell
cd "d:\AI PROSES\HRMS Pro\mobile-absensi\android\app"

keytool -genkeypair -v `
  -keystore hrms-release.keystore `
  -alias hrms-release-key `
  -keyalg RSA -keysize 2048 -validity 10000 `
  -storepass "GANTI_PASSWORD_STRONG_64_CHARS" `
  -keypass  "GANTI_PASSWORD_STRONG_64_CHARS"

# Nama lengkap: HRMS RS <Nama RS>
# Unit organisasi: IT
# Organisasi: RS <Nama RS>
# Kota: <kota>
# Provinsi: <provinsi>
# Kode negara: ID
```

### 3.2 Backup

- Copy `hrms-release.keystore` ke:
  - Password manager (Bitwarden/1Password — attach file).
  - Encrypted USB disimpan manajer IT.
- Simpan password di password manager (JANGAN di Google Doc / email).

### 3.3 Konfigurasi Gradle Signing

Buat `android/gradle.properties` (JANGAN commit) atau tambah ke
`~/.gradle/gradle.properties` di mesin build:

```properties
HRMS_RELEASE_STORE_FILE=hrms-release.keystore
HRMS_RELEASE_STORE_PASSWORD=<dari-step-3.1>
HRMS_RELEASE_KEY_ALIAS=hrms-release-key
HRMS_RELEASE_KEY_PASSWORD=<dari-step-3.1>
```

Lalu edit `android/app/build.gradle` (cek apakah sudah dikonfigurasi oleh prebuild):

```gradle
android {
    signingConfigs {
        release {
            if (project.hasProperty('HRMS_RELEASE_STORE_FILE')) {
                storeFile file(HRMS_RELEASE_STORE_FILE)
                storePassword HRMS_RELEASE_STORE_PASSWORD
                keyAlias HRMS_RELEASE_KEY_ALIAS
                keyPassword HRMS_RELEASE_KEY_PASSWORD
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

---

## 4. Build APK — 3 Pilihan Workflow

### Opsi A: EAS Build Cloud (Termudah, Recommended untuk tim)

```powershell
cd "d:\AI PROSES\HRMS Pro\mobile-absensi"

# 1. Login sekali
eas login

# 2. Konfigurasi (hanya sekali):
eas build:configure
# → pilih Android saja

# 3. Upload keystore ke EAS (sekali, aman):
eas credentials
# Ikuti prompt: Production → Android → Keystore: Upload existing.

# 4. Build production APK di cloud (~10-15 menit):
eas build --platform android --profile production

# 5. Setelah selesai, dapatkan URL download .apk dari terminal output
#    atau dashboard https://expo.dev.
```

**Kelebihan**: tidak perlu setup Android SDK di mesin dev, auto-increment
versionCode, log build terarsip.

**Keterbatasan free tier**: 30 builds/bulan (cukup untuk pilot).

### Opsi B: Build Lokal dengan Gradle (Gratis, butuh Android SDK)

```powershell
cd "d:\AI PROSES\HRMS Pro\mobile-absensi"

# 1. Pastikan prebuild sudah dijalankan dengan plugin lengkap:
# Edit app.json: aktifkan kembali plugin vision-camera (hapus underscore di "_pluginsForRebuild").
# Atau run:
npx expo prebuild --clean --platform android

# 2. Build release:
cd android
.\gradlew.bat assembleRelease

# 3. Output:
# android/app/build/outputs/apk/release/app-release.apk
```

Verifikasi tanda tangan APK:

```powershell
# Harus return keystore info dengan alias hrms-release-key.
apksigner verify --print-certs android\app\build\outputs\apk\release\app-release.apk
```

### Opsi C: Build AAB untuk Play Store (Opsional)

```powershell
eas build --platform android --profile production-aab
# Output .aab → upload ke Play Console → Internal Testing.
```

---

## 5. Post-Build Verification

Sebelum distribusi, di device test:

```powershell
# Install
adb install -r app-release.apk

# Pastikan bukan debuggable:
adb shell dumpsys package com.hrmsabsensi.mobile | grep -i flags
# TIDAK boleh ada "DEBUGGABLE"

# Cek ukuran
(Get-Item .\app-release.apk).Length / 1MB
# Target: < 80 MB

# Jalankan test Section 1 dari docs/MOBILE_E2E_TESTPLAN.md (smoke test).
```

---

## 6. Distribusi ke Pilot User

### 6.1 Host APK

Pilihan tempat host (APK = file publik, tidak sensitif):

1. **Supabase Storage bucket `apk-releases` (public)** — terintegrasi, gratis.
2. **Cloudflare R2 / GitHub Releases** — gratis, CDN.
3. **Google Drive / OneDrive RS** — paling mudah tapi rawan link expired.

Contoh upload ke Supabase:

```sql
-- Buat bucket sekali
INSERT INTO storage.buckets (id, name, public)
VALUES ('apk-releases', 'apk-releases', true)
ON CONFLICT (id) DO NOTHING;
```

Lalu upload via Supabase dashboard: `apk-releases/v1.0.0/hrms-absensi-v1.0.0.apk`.

URL publik: `https://<project>.supabase.co/storage/v1/object/public/apk-releases/v1.0.0/hrms-absensi-v1.0.0.apk`

### 6.2 Update `app_config` (activate force-update)

Setelah APK baru dipublish, update config agar user lama wajib update:

```sql
UPDATE public.app_config
SET value = '2'::jsonb, updated_at = now()
WHERE key = 'min_version_code';

UPDATE public.app_config
SET value = '2'::jsonb, updated_at = now()
WHERE key = 'latest_version_code';

UPDATE public.app_config
SET value = '"https://<project>.supabase.co/storage/v1/object/public/apk-releases/v1.0.0/hrms-absensi-v1.0.0.apk"'::jsonb,
    updated_at = now()
WHERE key = 'update_url';

UPDATE public.app_config
SET value = '"Versi baru dengan perbaikan check-in offline. Wajib update."'::jsonb,
    updated_at = now()
WHERE key = 'update_message';
```

User dengan APK lama: saat buka app → `ForceUpdateGate` mendeteksi versionCode
< 2 → tampilkan layar blocking dengan tombol "Unduh Update".

### 6.3 Komunikasi ke Pilot User

Template pengumuman WA:

```
📱 HRMS Absensi v1.0.0

Mohon install ulang aplikasi:

1. Hapus aplikasi HRMS Absensi lama di HP Anda.
2. Buka link ini dari HP:
   https://<link-apk>
3. Izinkan "Install dari sumber tak dikenal" bila muncul prompt.
4. Login dengan email kantor seperti biasa.

Fitur baru:
• Verifikasi wajah (liveness detection)
• Absensi offline
• Push notification saat cuti disetujui

Kalau ada error, laporkan di grup ini dengan format yang sudah dibagikan.
```

---

## 7. Rollback / Emergency

### 7.1 Bug Critical — Matikan App Sementara

```sql
UPDATE public.app_config
SET value = 'true'::jsonb, updated_at = now()
WHERE key = 'maintenance_mode';

UPDATE public.app_config
SET value = '"Kami sedang memperbaiki bug pada fitur absensi. Gunakan absensi manual di HRD sementara waktu. Estimasi selesai: 2 jam."'::jsonb,
    updated_at = now()
WHERE key = 'maintenance_message';
```

Semua user yang buka app akan lihat layar maintenance.

### 7.2 Revert ke Versi Sebelumnya

1. Upload APK versi lama ke path yang sama (atau path baru).
2. Turunkan `min_version_code` di `app_config`.
3. Update `update_url` ke APK yang stable.
4. User dengan APK baru tidak diturunkan otomatis — mereka perlu manual install yang lama. Tapi force-update tidak akan trigger selama versionCode mereka >= min.

### 7.3 Off Maintenance Mode

```sql
UPDATE public.app_config
SET value = 'false'::jsonb, updated_at = now()
WHERE key = 'maintenance_mode';
```

---

## 8. Post-Release Monitoring

### Checklist setelah rilis (7 hari pertama)

- [ ] Sentry dashboard — crash-free sessions > 99%.
- [ ] Supabase logs — no unusual error rate di `/rest/v1/`.
- [ ] WA grup pilot — respon dalam 2 jam kerja untuk setiap bug report.
- [ ] `audit_logs` table — cek `PRIVACY_CONSENT_ACCEPTED` = jumlah user terdaftar (audit UU PDP).
- [ ] Face enrollment — query `SELECT count(*) FROM employees WHERE face_enrolled_at IS NOT NULL;`
- [ ] `attendance` table — entry per hari sesuai jumlah user aktif (no drop-off mendadak).

### Alert Rules (Sentry)

Setup alert email/Slack saat:

- Crash rate > 1% dalam 1 jam.
- Any event dengan tag `platform=android` dan level `fatal`.
- Issue baru pertama kali terjadi (deteksi bug regression cepat).

---

## Lampiran A — File yang Wajib di-commit / gitignore

`.gitignore` harus exclude:

```
# Keystore
*.keystore
*.jks

# Env & secrets
.env
.env.*
!.env.example

# EAS credentials cache
.easignore
credentials.json

# Build artifacts
android/app/build/
android/.gradle/
```

---

## Lampiran B — Versi & Changelog Template

Simpan di `CHANGELOG.md` root mobile-absensi, update tiap rilis:

```markdown
## v1.0.0 (YYYY-MM-DD) - versionCode 2

### Added
- Privacy consent screen sesuai UU PDP.
- Force-update mechanism via app_config.
- Sentry crash reporting.

### Fixed
- Null clockOut error saat check-in offline.

### Breaking
- Min Android: 10 (API 29) — device < API 29 tidak bisa install.
```

---

**Versi runbook**: 1.0 (Mei 2026)
