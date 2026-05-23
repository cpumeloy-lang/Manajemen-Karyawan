-- Script untuk testing dashboard kepala ruangan
-- Update role user admin menjadi kepala_ruangan untuk testing

-- 1. Cek role saat ini
SELECT email, role, managed_unit_id FROM employees WHERE email = 'admin@hospital.com';

-- 2. Update role menjadi kepala_ruangan
UPDATE employees
SET role = 'kepala_ruangan'
WHERE email = 'admin@hospital.com';

-- 3. Assign unit (gunakan ID yang sudah ada)
-- Cari ID unit Rawat Inap dari tabel units
SELECT id, nama FROM units WHERE nama = 'Rawat Inap';

-- 4. Update managed_unit_id dengan ID yang ditemukan
-- Ganti 'UUID_HERE' dengan ID yang ditemukan di step 3
UPDATE employees
SET managed_unit_id = 'UUID_HERE'  -- Ganti dengan ID sebenarnya
WHERE email = 'admin@hospital.com';

-- 5. Verifikasi update berhasil
SELECT email, role, managed_unit_id, unitKerjaId FROM employees WHERE email = 'admin@hospital.com';