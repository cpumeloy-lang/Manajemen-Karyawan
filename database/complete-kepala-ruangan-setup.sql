-- ============================================
-- COMPLETE SETUP SCRIPT FOR KEPALA RUANGAN UNITS
-- ============================================

-- STEP 1: Tambahkan kolom unitKerjaId jika belum ada
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS "unitKerjaId" TEXT REFERENCES public.units(id);

-- STEP 2: Verifikasi kolom sudah ditambahkan
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'employees'
AND column_name = 'unitKerjaId';

-- STEP 3: Cek kepala ruangan yang ada
SELECT id, nama, email, role, "unitKerjaId"
FROM employees
WHERE role = 'kepala_ruangan';

-- STEP 4: Lihat unit yang tersedia
SELECT id, nama
FROM units
LIMIT 5;

-- STEP 5: Tetapkan unit default ke kepala ruangan yang belum memiliki unit
UPDATE employees
SET "unitKerjaId" = (
    SELECT id FROM units
    WHERE nama = 'Rawat Inap'
    LIMIT 1
)
WHERE role = 'kepala_ruangan'
AND ("unitKerjaId" IS NULL OR "unitKerjaId" = '');

-- STEP 6: Verifikasi hasil akhir
SELECT e.id, e.nama, e.email, e.role, e."unitKerjaId", u.nama as unit_name
FROM employees e
LEFT JOIN units u ON e."unitKerjaId" = u.id
WHERE e.role = 'kepala_ruangan';