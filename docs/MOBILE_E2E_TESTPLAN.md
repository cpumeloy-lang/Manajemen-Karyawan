# HRMS Mobile — End-to-End Test Plan & Pilot Checklist

> Versi: 1.0 (Mei 2026)
> Target: pre-production sign-off oleh HRD + IT RS sebelum distribusi APK ke karyawan pilot.

---

## 0. Persiapan Sekali Pakai

### 0.1 Jalankan Migration Database

1. Buka Supabase SQL Editor.
2. Paste seluruh isi `database/MOBILE_PRODUCTION_MIGRATIONS.sql`.
3. Klik **Run** → harus selesai tanpa error.
4. Run verification queries (komentar bawah file) untuk memastikan:
   - 8 kolom mobile/face di `employees`
   - 3 RLS policy di `employees` (`select_authenticated`, `insert_self_only`, `update_self`)
   - 3 storage buckets (`avatars`, `face-references`, `documents`)
   - 9 storage policies `mobile_*`

### 0.2 Download Model TFLite

1. Download `mobilefacenet.tflite` dari sumber terpercaya:
   - <https://github.com/sirius-ai/MobileFaceNet_TF/releases> (Apache 2.0), atau
   - <https://github.com/iwatake2222/play_with_tflite/tree/master/pj_tflite_face_mobilefacenet/resource/model> (MIT).
2. Letakkan di: `mobile-absensi/assets/models/mobilefacenet.tflite`
3. Verifikasi ukuran wajar (~5-15 MB tergantung variant).

### 0.3 Siapkan Akun Karyawan Test

Di Supabase SQL Editor:

```sql
-- 1) Cek karyawan sudah ada
SELECT id, nama, role, user_id FROM public.employees LIMIT 5;

-- 2) Bila perlu test user baru, undang via Supabase Auth → Users → Invite User.
-- Kemudian link auth user_id ke employees row:
UPDATE public.employees
SET user_id = '<auth-user-uuid>'
WHERE id = '<employee-id>';
```

---

## 1. Smoke Test (5 menit, sebelum setiap rilis)

| # | Step | Expected | Pass? |
|---|---|---|---|
| 1 | Buka app | Splash screen biru → Login screen | ☐ |
| 2 | Login dengan kredensial valid | Masuk ke Dashboard tanpa error | ☐ |
| 3 | Tap tab Profil | Avatar + nama + sisa cuti tampil | ☐ |
| 4 | Logout | Kembali ke Login screen | ☐ |

**Bila ada step gagal → STOP, tidak boleh distribusi APK.**

---

## 2. Functional E2E Test (45 menit, sebelum pilot)

### 2.1 Authentication Flow

| # | Step | Expected | Pass? |
|---|---|---|---|
| A1 | Login dengan email salah | Alert "Login gagal" | ☐ |
| A2 | Login dengan password salah | Alert "Login gagal" | ☐ |
| A3 | Login valid → tutup app → buka lagi | Auto-login, langsung dashboard | ☐ |
| A4 | Logout → cek SecureStore via debug | Token terhapus | ☐ |

### 2.2 Onboarding & Consent (setelah Phase ini selesai)

| # | Step | Expected | Pass? |
|---|---|---|---|
| C1 | Login pertama kali (account baru) | Muncul screen Privacy Policy | ☐ |
| C2 | Tap "Saya Setuju" | Lanjut ke Dashboard, consent tersimpan | ☐ |
| C3 | Tap "Tidak Setuju" | Auto-logout, kembali ke Login | ☐ |
| C4 | Login kedua (account sama) | TIDAK muncul Privacy Policy lagi | ☐ |

### 2.3 Face Enrollment

| # | Step | Expected | Pass? |
|---|---|---|---|
| F1 | Profil → Daftar Wajah | Muncul FaceEnrollmentScreen | ☐ |
| F2 | Tap "Ambil Foto" → izin kamera | Camera modal terbuka | ☐ |
| F3 | Foto wajah terang & frontal → Daftarkan | Toast "Wajah terdaftar", `face_enrolled_at` di DB ter-update | ☐ |
| F4 | Daftar ulang dengan wajah orang lain | Embedding ter-overwrite (cek `face_embedding` di DB beda) | ☐ |

### 2.4 Check-in dengan Liveness

| # | Step | Expected | Pass? |
|---|---|---|---|
| CI1 | Tab Absensi → Check-In (sudah enrolled) | Modal liveness terbuka | ☐ |
| CI2 | Ikuti instruksi (lurus → kedip 2x → senyum) | Otomatis capture, similarity tampil | ☐ |
| CI3 | Verifikasi sukses → location captured | Record masuk `attendance` table | ☐ |
| CI4 | Coba spoof: pegang foto cetak di depan kamera | Alert "spoof_static_image" / liveness gagal | ☐ |
| CI5 | Coba dengan wajah orang lain | Alert "Skor kecocokan rendah" | ☐ |
| CI6 | Cancel modal di tengah challenge | Kembali ke Attendance screen, tidak ada record dibuat | ☐ |
| CI7 | Belum enrolled wajah, coba check-in | Alert "Wajah belum didaftarkan" | ☐ |

### 2.5 Check-out

| # | Step | Expected | Pass? |
|---|---|---|---|
| CO1 | Setelah check-in, tap Check-Out | Modal liveness lagi | ☐ |
| CO2 | Liveness sukses | Record `attendance` clockOut ter-update | ☐ |
| CO3 | Cek di Riwayat | Entry hari ini lengkap (jam in & out) | ☐ |

### 2.6 Anti-Fraud

| # | Step | Expected | Pass? |
|---|---|---|---|
| AF1 | Aktifkan mock GPS (Fake GPS app) → check-in | Alert "Mock GPS terdeteksi", record diblokir | ☐ |
| AF2 | Disable GPS → check-in | Alert "Lokasi tidak tersedia" | ☐ |
| AF3 | Berada di luar geofence (jika diaktifkan) | Alert "Di luar area kantor" | ☐ |

### 2.7 Permohonan Izin

| # | Step | Expected | Pass? |
|---|---|---|---|
| R1 | Tab Izin → Buat baru → cuti tahunan 2 hari | Submit sukses, badge counter +1 di tab | ☐ |
| R2 | Form draft tidak lengkap → tutup app → buka lagi | Form ter-restore otomatis dari AsyncStorage | ☐ |
| R3 | Cancel pengajuan yang belum approved | Status → 'cancelled' | ☐ |
| R4 | Setelah admin approve di web, tunggu 5 detik | Push notif masuk, tap → buka tab Izin | ☐ |

### 2.8 Riwayat & Export

| # | Step | Expected | Pass? |
|---|---|---|---|
| H1 | Tab Riwayat → tap tanggal di kalender | Modal detail attendance terbuka | ☐ |
| H2 | Filter "Bulan ini" → "Terlambat" | Hanya record terlambat tampil | ☐ |
| H3 | Tombol Export | Share sheet muncul, file CSV bisa di-share via WA/email | ☐ |
| H4 | Buka CSV di Excel | UTF-8 benar (huruf à á ditampilkan), kolom rapi | ☐ |

### 2.9 Profil

| # | Step | Expected | Pass? |
|---|---|---|---|
| P1 | Tap avatar → ambil foto baru | Upload sukses, avatar update | ☐ |
| P2 | Tap "Ubah" telepon → save | Update sukses di DB | ☐ |
| P3 | Toggle reminder check-in 07:30 | Set local notif, exit app, jam 07:30 muncul notif | ☐ |
| P4 | Kelola Perangkat → cek deviceId | Sesuai dengan yang ter-register | ☐ |

### 2.10 Offline Mode

| # | Step | Expected | Pass? |
|---|---|---|---|
| O1 | Matikan WiFi & data → check-in | Banner "Offline", record masuk queue | ☐ |
| O2 | Lihat di tab Riwayat → entry tampil dengan label "syncing" | OK | ☐ |
| O3 | Nyalakan internet | Banner offline hilang, queue auto-flush dalam 5-10s | ☐ |
| O4 | Verifikasi di Supabase → record persisted | OK | ☐ |

---

## 3. Performance Test (10 menit)

| # | Metric | Target | Aktual |
|---|---|---|---|
| PERF1 | Cold start (app launch sampai login) | < 4 detik | ___ s |
| PERF2 | Check-in flow (tap sampai modal terbuka) | < 1 detik | ___ s |
| PERF3 | Liveness verification (snapshot → result) | < 3 detik | ___ s |
| PERF4 | Embedding compute (TFLite inference) | < 800 ms | ___ ms |
| PERF5 | Riwayat scroll 100+ record | 60 fps, no jank | ___ |
| PERF6 | RAM usage idle (Profil tab) | < 250 MB | ___ MB |
| PERF7 | RAM usage saat liveness | < 400 MB | ___ MB |
| PERF8 | APK size (release) | < 80 MB | ___ MB |

Cara ukur RAM: Android Studio Profiler → Memory.

---

## 4. Device Compatibility Test

Test di minimal 3 device kombinasi:

| Device | Android Version | RAM | Pass? | Catatan |
|---|---|---|---|---|
| Samsung Galaxy A12 | Android 11 | 4 GB | ☐ | Low-end target |
| Xiaomi Redmi Note 10 | Android 12 | 6 GB | ☐ | Mid-range target |
| Oppo A78 | Android 13 | 8 GB | ☐ | High-end target |
| Pixel 6 (emulator) | Android 14 | 8 GB | ☐ | Latest |

Issues yang sering muncul:
- **MIUI (Xiaomi)**: izin background restricted → reminder notif tidak muncul. Solusi: kasih panduan ke karyawan untuk allow auto-start.
- **Samsung One UI**: battery saver agresif → push notif delayed. Solusi: pin app exclude from battery saver.
- **ColorOS (Oppo)**: kamera permission revert. Solusi: lock permission di setting OS.

---

## 5. Security Spot-Checks

| # | Check | Method | Pass? |
|---|---|---|---|
| S1 | Token tersimpan di SecureStore (encrypted) | adb shell + run-as | ☐ |
| S2 | Tidak ada API key di logcat | `adb logcat \| grep -i "key\|token"` | ☐ |
| S3 | HTTPS only (no plain HTTP) | Charles Proxy intercept | ☐ |
| S4 | Network security config block cleartext | Cek `network_security_config.xml` | ☐ |
| S5 | APK tidak debuggable di production | `aapt dump badging` → `application-debuggable: 0` | ☐ |
| S6 | ProGuard/R8 enabled | `--minifyEnabled true` di gradle | ☐ |
| S7 | Backup tidak ekspos data | `android:allowBackup="false"` di Manifest | ☐ |

---

## 6. Sign-Off

Pilot release boleh dilakukan setelah:

- [ ] **Smoke Test** (Section 1) — 100% pass
- [ ] **Functional E2E** (Section 2) — minimum 95% pass (boleh ada 1-2 minor issue dengan workaround)
- [ ] **Performance** (Section 3) — semua metric memenuhi target
- [ ] **Compatibility** (Section 4) — minimum 3 device pass
- [ ] **Security** (Section 5) — 100% pass
- [ ] Privacy policy & consent screen sudah live
- [ ] Sentry crash reporting aktif & ter-monitor
- [ ] Rollback plan terverifikasi (versi APK lama disimpan)

---

## 7. Pilot Distribution Plan

### 7.1 Wave 1 — IT + HRD (Hari 1-7)
- Audience: 5-10 staf IT/HRD.
- Tujuan: smoke test di lingkungan real, latih jadi support tier-1.
- Channel: APK manual via shared drive + WA grup.

### 7.2 Wave 2 — Tim leader / kepala unit (Hari 8-14)
- Audience: 20-30 kepala unit.
- Tujuan: validasi flow approval cuti, deteksi bug context-specific.
- Survey: feedback form via Google Forms tiap akhir minggu.

### 7.3 Wave 3 — Full rollout (Hari 15+)
- Audience: semua karyawan (~500-1000).
- Approach: bertahap per departemen, support team standby.
- Komunikasi: poster di koridor + announcement intranet RS.

---

## 8. Rollback / Hotfix Procedure

### 8.1 Bila bug critical ditemukan saat Wave 1-2
1. Notify semua user via WA grup → instruksi uninstall.
2. Distribusikan kembali APK versi sebelumnya (yang sudah disimpan).
3. Fix di code → bump versionCode → rebuild → distribusi ulang.
4. Force-update mechanism (Section 4 production tasks) akan membantu fase 3.

### 8.2 Bila bug ditemukan saat Wave 3
1. Deploy hotfix dengan force-update flag → user wajib update buka app.
2. Bila kritis (data corruption / security): set "maintenance mode" di Supabase via flag table → app tampilkan banner "sementara tidak tersedia".

---

## Lampiran A — Format Bug Report untuk Pilot User

Tempel di WA grup pilot:

```
🐛 LAPORAN BUG HRMS

Versi APK: <lihat di Profil → tentang app>
Device: <merek model, mis. Samsung A12>
Android: <versi, mis. 11>
Lokasi/menu: <mis. Tab Absensi → Check-In>
Yang terjadi: <deskripsi singkat>
Ekspektasi: <yang seharusnya>
Kapan terjadi: <tanggal+jam>
Screenshot/video: <attach>
```

---

**Versi**: 1.0 (Mei 2026) — Update saat ada fitur baru.
