-- Script testing dashboard kepala ruangan (tanpa trigger issues)

-- 1. Cek role saat ini
SELECT email, role, managed_unit_id FROM employees WHERE email = 'admin@hospital.com';

-- 2. Update role menjadi kepala_ruangan
UPDATE employees SET role = 'kepala_ruangan' WHERE email = 'admin@hospital.com';

-- 3. Cari ID unit Rawat Inap dari tabel units
SELECT id, nama FROM units WHERE nama = 'Rawat Inap';

-- 4. Update managed_unit_id dengan ID dari step 3
-- Ganti 'UUID_HERE' dengan ID yang ditemukan di step 3
UPDATE employees SET managed_unit_id = 'UUID_HERE' WHERE email = 'admin@hospital.com';

-- 5. Verifikasi update berhasil
SELECT email, role, managed_unit_id, unitKerjaId FROM employees WHERE email = 'admin@hospital.com';

-- 6. Cek apakah ada trigger audit log
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE event_object_table = 'employees';