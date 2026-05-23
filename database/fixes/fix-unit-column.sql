-- Script alternatif jika kolom unitKerjaId tidak ada
-- Jalankan ini jika script utama gagal

-- 1. Cek apakah ada kolom unitKerjaId (dengan berbagai variasi)
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'employees'
AND table_schema = 'public'
AND column_name ILIKE '%unit%'
ORDER BY column_name;

-- 2. Jika kolom ada dengan nama berbeda, gunakan query ini
-- Ganti 'nama_kolom_unit_yang_benar' dengan nama kolom yang ditemukan
/*
SELECT e.id, e.nama, e.email, e.role, e.nama_kolom_unit_yang_benar, u.nama as unit_name
FROM employees e
LEFT JOIN units u ON e.nama_kolom_unit_yang_benar = u.id
WHERE e.role = 'kepala_ruangan';
*/

-- 3. Jika kolom unitKerjaId tidak ada sama sekali, tambahkan kolom tersebut
-- ALTER TABLE employees ADD COLUMN IF NOT EXISTS "unitKerjaId" TEXT REFERENCES public.units(id);

-- 4. Setelah kolom ditambahkan, jalankan update
-- UPDATE employees SET "unitKerjaId" = (SELECT id FROM units LIMIT 1) WHERE role = 'kepala_ruangan' AND "unitKerjaId" IS NULL;