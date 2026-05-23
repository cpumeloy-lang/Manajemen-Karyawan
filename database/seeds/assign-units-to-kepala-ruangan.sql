-- Script untuk menetapkan unit pada kepala ruangan yang belum memiliki unit
-- Jalankan setelah tabel departments, positions, dan system_settings sudah dibuat

-- 0. Cek struktur tabel employees untuk memastikan nama kolom yang benar
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'employees'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 1. Cek kepala ruangan yang belum memiliki unit
-- Gunakan nama kolom yang benar berdasarkan hasil query di atas
SELECT e.id, e.nama, e.email, e.role, e."unitKerjaId", u.nama as unit_name
FROM employees e
LEFT JOIN units u ON e."unitKerjaId" = u.id
WHERE e.role = 'kepala_ruangan';

-- 2. Jika ada kepala ruangan tanpa unit, tetapkan unit default
-- Ganti 'Rawat Inap' dengan nama unit yang sesuai dari tabel units
UPDATE employees
SET "unitKerjaId" = (
    SELECT id FROM units
    WHERE nama = 'Rawat Inap'
    LIMIT 1
)
WHERE role = 'kepala_ruangan'
AND "unitKerjaId" IS NULL;

-- 3. Verifikasi bahwa semua kepala ruangan sudah memiliki unit
SELECT e.id, e.nama, e.email, e.role, e."unitKerjaId", u.nama as unit_name
FROM employees e
LEFT JOIN units u ON e."unitKerjaId" = u.id
WHERE e.role = 'kepala_ruangan';