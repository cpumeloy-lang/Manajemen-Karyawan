-- Script untuk memperbaiki constraint role di tabel employees
-- Jalankan ini di Supabase SQL Editor

-- Drop constraint lama dan buat yang baru
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_role_check;
ALTER TABLE employees ADD CONSTRAINT employees_role_check CHECK (role IN ('admin', 'hrd', 'kepala_ruangan', 'karyawan'));

-- Verifikasi constraint berhasil diupdate
SELECT
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conname = 'employees_role_check';