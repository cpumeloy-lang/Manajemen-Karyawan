# Dokumentasi HRMS Pro — Ringkasan Terpusat

File ini adalah pintu masuk dokumentasi untuk pengembang dan tim operasi. Tujuannya: satu tempat untuk menemukan panduan utama, checklist produksi, dan tautan ke dokumen detail.

## Panduan Cepat
- **Panduan setup & deploy:** `docs/SETUP_GUIDE.md`
- **Checklist production:** `docs/PRODUCTION_CHECKLIST.md`
- **Database setup & migrasi:** `docs/DATABASE_SETUP.md`, `docs/PHASE_1_4_DATABASE_MIGRATION_GUIDE.md`
- **RBAC & keamanan:** `docs/RBAC_IMPLEMENTATION_GUIDE.md`, `docs/RBAC_DEPLOYMENT_CHECKLIST.md`
- **Face verification & biometric:** `docs/FACE_RECOGNITION_IMPLEMENTATION_GUIDE.md`, `docs/BIOMETRIC_DEVICE_BINDING_STRATEGY.md`
- **Redis & cache:** `docs/REDIS_CACHE_README.md`
- **Monitoring & scaling:** `docs/LOAD_BALANCING_README.md`, `docs/SCALABILITY_ANALYSIS.md`

## Struktur Dokumentasi yang Disarankan
1. `docs/README.md` — (this file) ringkasan pusat.
2. `docs/ARCHIVE/` — dokumen lama dan catatan historis.
3. `docs/OPERATIONAL.md` — panduan singkat untuk DevOps (tbd).
4. `docs/DEVELOPER_GUIDE.md` — panduan pengembangan dan coding standard (tbd).

## Cara Menggunakan
- Untuk perbaikan cepat, baca `docs/QUICK_START_DATA_LENGKAP.md` dan `docs/PRODUCTION_CHECKLIST.md`.
- Untuk migrasi database, ikuti `docs/CARA_JALANKAN_MIGRATION.md` kemudian `docs/SETUP_DATABASE_STEP_BY_STEP.md`.

## Catatan Konsolidasi
- Saya merekomendasikan memindahkan dokumen yang bersifat historis ke folder `docs/ARCHIVE/` dan menjaga hanya panduan aktif di root `docs/`.
- Untuk dokumentasi API, pertimbangkan menambahkan `docs/API_REFERENCE.md` (Swagger/OpenAPI) dan menautkannya di sini.

## Kontak
- Jika ada pertanyaan tentang dokumentasi, hubungi tim pengembang atau buka issue di repo internal.

---
_Dokumen ini dihasilkan otomatis oleh proses refactor & konsolidasi. Untuk tindakan lanjutan, pilih 'move to archive' atau buat `docs/DEVELOPER_GUIDE.md`._
