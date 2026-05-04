-- =====================================================
-- FIX: Generate UUID untuk employee yang ID-nya kosong
-- =====================================================
-- Script ini akan mengisi kolom id dengan UUID baru
-- untuk semua employee yang id-nya NULL atau empty string
-- =====================================================

-- Step 1: Lihat dulu employee mana yang bermasalah
SELECT 
    user_id,
    nama,
    email,
    CASE 
        WHEN id IS NULL THEN 'NULL'
        WHEN id = '' THEN 'EMPTY STRING'
        ELSE 'HAS ID'
    END as id_status
FROM employees
WHERE id IS NULL OR id = '';

-- Step 2: Update semua employee yang id-nya NULL atau empty
-- dengan generate UUID baru
UPDATE employees
SET id = gen_random_uuid()
WHERE id IS NULL OR id = '';

-- Step 3: Verifikasi hasilnya
SELECT 
    id,
    user_id,
    nama,
    email
FROM employees
ORDER BY nama;

-- Step 4: Pastikan semua employee punya ID yang valid
SELECT 
    COUNT(*) as total_employees,
    COUNT(id) as employees_with_id,
    COUNT(*) - COUNT(id) as employees_without_id
FROM employees;
