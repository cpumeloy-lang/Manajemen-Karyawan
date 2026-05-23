-- Script untuk menambahkan kolom managedUnitId pada tabel employees
-- Jalankan di Supabase SQL Editor jika kolom belum ada

-- 1. Tambahkan kolom managedUnitId jika belum ada
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS "managedUnitId" TEXT REFERENCES public.units(id);

-- 2. Verifikasi kolom sudah ditambahkan
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'employees'
AND (column_name = 'managedUnitId' OR column_name LIKE '%managed%')
ORDER BY column_name;

-- 3. Sync managedUnitId dengan unitKerjaId untuk kepala_ruangan yang sudah punya unitKerjaId
UPDATE employees
SET "managedUnitId" = "unitKerjaId"
WHERE role = 'kepala_ruangan'
AND "unitKerjaId" IS NOT NULL
AND ("managedUnitId" IS NULL OR "managedUnitId" = '');

-- 4. Verifikasi hasil
SELECT id, nama, email, role, "unitKerjaId", "managedUnitId"
FROM employees
WHERE role = 'kepala_ruangan';

-- 5. Tambahkan comment untuk dokumentasi
COMMENT ON COLUMN public.employees."managedUnitId" IS 'Unit kerja yang dikelola oleh kepala ruangan (untuk role kepala_ruangan)';