# Supabase SQL Audit (Online Migration)

Status audit terhadap script SQL utama untuk migrasi ke Supabase hosted.

## Ringkasan

- Aman untuk dijalankan berulang (idempotent): sebagian besar script inti.
- Diperbaiki pada sesi ini: beberapa script policy/trigger/rename agar tidak gagal saat re-run.
- Perlu pakai versi aman: script optimisasi lama tidak konsisten dengan skema kolom saat ini.

## Hasil Per Script

1. `database-setup.sql`
- Status: Aman setelah patch.
- Perubahan: trigger `update_*_updated_at` sekarang `DROP TRIGGER IF EXISTS` sebelum create.

2. `database-add-system-settings.sql`
- Status: Aman setelah patch.
- Perubahan: policy sekarang didrop dulu sebelum create.

3. `database-add-departments-positions.sql`
- Status: Aman setelah patch.
- Perubahan: policy sekarang didrop dulu sebelum create.

4. `database-employee-complete-data.sql`
- Status: Aman.
- Catatan: mayoritas `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` dan `CREATE INDEX IF NOT EXISTS`.

5. `database-trigger-auto-employee.sql`
- Status: Cukup aman.
- Catatan: ada `UPDATE public.employees ... WHERE email = 'admin@hospital.com'` yang bisa mengubah role admin; pastikan email target benar sebelum run.

6. `database-audit-log.sql`
- Status: Cukup aman.
- Catatan: trigger sudah pakai `DROP TRIGGER IF EXISTS`; policy belum drop-if-exists, jadi jalankan sekali saat setup awal.

7. `database-rls-hardening.sql`
- Status: Aman.
- Catatan: policy sudah drop/create dan function `OR REPLACE`.

8. `rename_managed_unit_column.sql`
- Status: Aman setelah patch.
- Perubahan: diperbaiki dari SQL string literal menjadi blok `DO $$ ... IF EXISTS ...`.

9. `fix-role-constraint.sql`
- Status: Aman.
- Catatan: `DROP CONSTRAINT IF EXISTS` sudah benar.

10. `fix-employee-empty-id.sql`
- Status: Berisiko pada data.
- Catatan: query update mengubah `id` employee kosong/null; jalankan hanya bila verifikasi menunjukkan ada data bermasalah.

11. `fix-audit-log-entity-id.sql`
- Status: Aman.
- Catatan: mengubah tipe `entity_id` ke TEXT dan recreate index.

12. `create_rpc_reset_password.sql`
- Status: Aman secara teknis, sensitif keamanan.
- Catatan: fungsi `SECURITY DEFINER` dapat reset password auth user; batasi eksekusi hanya ke role yang diperlukan.

13. `database-optimization-indexes.sql`
- Status: Tidak direkomendasikan untuk skema saat ini.
- Alasan: referensi kolom/table tidak konsisten (`employee_id`, `date`, `approver_id`, `payroll`).
- Pengganti: `database-optimization-indexes-safe.sql`.

14. `database-optimization-pagination.sql`
- Status: Tidak direkomendasikan untuk skema saat ini.
- Alasan: referensi kolom attendance/request tidak cocok dengan skema (`employee_id`, `date`, `check_in`, `check_out`).
- Pengganti: `database-optimization-pagination-safe.sql`.

## Rekomendasi Eksekusi

- Ikuti urutan di `SUPABASE_ONLINE_FULL_MIGRATION.md` (yang sudah diperbarui ke script safe).
- Jalankan `database-online-verification.sql` setelah migrasi.
- Simpan backup sebelum run script yang memodifikasi data (`fix-employee-empty-id.sql`, admin update di trigger script).
