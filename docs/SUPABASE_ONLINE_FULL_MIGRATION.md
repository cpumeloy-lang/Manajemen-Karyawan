# Supabase Online Full Migration (HRMS Pro)

Dokumen ini untuk migrasi penuh seluruh database HRMS Pro dari local Supabase/Docker ke Supabase hosted.

## 1. Target Arsitektur

- Web app dan mobile app memakai Supabase hosted yang sama.
- Auth, data operasional, dan audit log berada di project Supabase online.
- Local mode tetap opsional hanya untuk development sementara (`auto`).

## 2. Prasyarat

- Sudah membuat project Supabase online.
- Memiliki:
  - `Project URL` (format: `https://<project-ref>.supabase.co`)
  - `anon key`
  - `service_role key` (hanya untuk server/admin ops)
  - `DB password` project online
- Bisa akses SQL Editor Supabase online.

## 3. Backup Sebelum Migrasi

Jalankan backup lokal terlebih dulu (wajib):

```bash
# contoh backup schema+data dari local Supabase Postgres
pg_dump \
  --clean --if-exists \
  --no-owner --no-privileges \
  -h 127.0.0.1 -p 54322 -U postgres \
  -d postgres \
  -f hrms-local-full-backup.sql
```

Jika memakai backup folder internal repo, tetap buat backup baru sebelum cutover.

## 4. Migrasi Schema ke Supabase Online

Jalankan script SQL berikut di Supabase SQL Editor secara berurutan:

1. `database-setup.sql`
2. `database-add-system-settings.sql`
3. `database-add-nik.sql`
4. `database-add-departments-positions.sql`
5. `database-employee-complete-data.sql`
6. `database-trigger-auto-employee.sql`
7. `database-audit-log.sql`
8. `database-optimization-indexes.sql`
9. `database-optimization-pagination.sql`
10. `database-rls-hardening.sql`
11. `rename_managed_unit_column.sql`
12. `fix-role-constraint.sql`
13. `fix-employee-empty-id.sql`
14. `fix-audit-log-entity-id.sql`
15. `create_rpc_reset_password.sql`

Catatan:
- Script `test-*.sql`, `query.sql`, `reset_*.sql` tidak masuk urutan migrasi production.
- Jika ada error konflik object existing, lakukan review per object dan lanjutkan script berikutnya setelah fixed.

## 5. Migrasi Data ke Supabase Online

### Opsi A (Direkomendasikan): restore via direct Postgres connection

1. Dapatkan connection string Postgres dari Supabase online (Connection string > psql).
8. `database-optimization-indexes-safe.sql`
9. `database-optimization-pagination-safe.sql`
```bash
psql "postgresql://postgres:<db-password>@db.<project-ref>.supabase.co:5432/postgres" \
  -f hrms-local-full-backup.sql
```

Jika restore penuh terlalu besar atau banyak konflik, gunakan Opsi B.

### Opsi B: migrasi tabel inti bertahap

- Export/import tabel inti dulu: `units`, `employees`, `attendance`, `requests`, `documents`, `audit_logs`.

### Catatan Audit SQL

- `database-setup.sql`, `database-add-system-settings.sql`, `database-add-departments-positions.sql`, dan `rename_managed_unit_column.sql` sudah dihardening agar aman untuk re-run.
- Gunakan script `*-safe.sql` untuk optimisasi karena script optimisasi lama memakai nama kolom/tabel yang tidak konsisten dengan skema saat ini.
## 6. Konfigurasi Aplikasi (Cutover)

Sudah disiapkan online-first pada codebase ini. Isi nilai aktual berikut:

- Root web env:
  - `.env`
  - `.env.production`
- Mobile env:
  - `mobile-absensi/.env`
  - `mobile-absensi/.env.example`

Variabel wajib:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_AUTH_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_AUTH_SUPABASE_ANON_KEY=<anon-key>
VITE_DATA_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_DATA_SUPABASE_ANON_KEY=<anon-key>

EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

## 7. Verifikasi Pasca-Migrasi

Jalankan query berikut di Supabase SQL Editor:

```sql
-- tabel inti
SELECT to_regclass('public.units') AS units,
       to_regclass('public.employees') AS employees,
       to_regclass('public.attendance') AS attendance,
       to_regclass('public.requests') AS requests,
       to_regclass('public.documents') AS documents,
       to_regclass('public.audit_logs') AS audit_logs;

-- data minimal
SELECT COUNT(*) AS units_count FROM public.units;
SELECT COUNT(*) AS employees_count FROM public.employees;

-- policy check
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname='public'
ORDER BY tablename, policyname;
```

Aplikasi harus lolos uji berikut:
- Login/logout
- Read dashboard
- CRUD employee
- Attendance check-in/check-out
- Request cuti/izin
- Audit log muncul setelah perubahan data

## 8. Rollback Plan

Jika ada blocker kritis setelah cutover:

1. Kembalikan env app ke local sementara (`auto` atau URL local).
2. Disable deployment release.
3. Pulihkan data dari backup lokal terakhir.
4. Perbaiki issue di staging, baru cutover ulang.

## 9. Definisi Selesai

Migrasi dianggap selesai jika:
- Semua tabel inti + policy + trigger aktif di Supabase online.
- Data utama terbaca lengkap di app web/mobile.
- Fitur auth, attendance, request, audit log berjalan normal.
- Tidak ada dependency ke IP lokal/laptop untuk operasional harian.
