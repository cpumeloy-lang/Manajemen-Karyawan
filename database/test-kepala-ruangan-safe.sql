-- Script untuk testing dashboard kepala ruangan
-- Dengan menonaktifkan trigger audit log sementara

-- 1. Disable trigger audit log sementara
ALTER TABLE employees DISABLE TRIGGER create_audit_log_trigger;

-- 2. Cek role saat ini
SELECT email, role, managed_unit_id FROM employees WHERE email = 'admin@hospital.com';

-- 3. Update role menjadi kepala_ruangan
UPDATE employees SET role = 'kepala_ruangan' WHERE email = 'admin@hospital.com';

-- 4. Cari ID unit Rawat Inap
SELECT id, nama FROM units WHERE nama = 'Rawat Inap';

-- 5. Update managed_unit_id (ganti UUID_HERE dengan ID dari step 4)
-- Contoh: UPDATE employees SET managed_unit_id = 'bf28ab7e-3454-4aa5-a731-dd92ccc1bd71' WHERE email = 'admin@hospital.com';
UPDATE employees SET managed_unit_id = 'UUID_HERE' WHERE email = 'admin@hospital.com';

-- 6. Enable trigger kembali
ALTER TABLE employees ENABLE TRIGGER create_audit_log_trigger;

-- 7. Verifikasi update berhasil
SELECT email, role, managed_unit_id, unitKerjaId FROM employees WHERE email = 'admin@hospital.com';