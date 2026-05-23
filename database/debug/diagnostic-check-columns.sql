-- ============================================
-- DIAGNOSTIC SCRIPT - Cek struktur tabel employees
-- ============================================

-- Lihat semua kolom di tabel employees
\d public.employees

-- Atau dengan query untuk list semua kolom:
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'employees'
ORDER BY ordinal_position;