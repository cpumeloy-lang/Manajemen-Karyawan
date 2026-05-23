-- Test Koneksi Database Supabase
-- Jalankan script ini di SQL Editor untuk verifikasi setup

-- 1. Test basic connection
SELECT 'Database connection OK' AS status, NOW() AS timestamp;

-- 2. Check if tables exist
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('units', 'employees', 'attendance', 'requests', 'documents') 
        THEN '✅ Required'
        ELSE '❓ Optional'
    END AS importance
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 3. Check units table and sample data
SELECT 'units table check' AS test, COUNT(*) AS record_count 
FROM public.units;

-- 4. List units data
SELECT id, nama, created_at 
FROM public.units 
ORDER BY nama;

-- 5. Check employees table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'employees' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 6. Check if RLS is enabled
SELECT 
    schemaname, 
    tablename, 
    rowsecurity AS rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 7. Check RLS policies
SELECT 
    schemaname,
    tablename, 
    policyname,
    cmd AS command_type
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 8. Check auth.users (if accessible)
SELECT 
    'auth.users check' AS test,
    COUNT(*) AS user_count
FROM auth.users;

-- 9. Test specific functions
SELECT 
    'UUID generation test' AS test,
    gen_random_uuid()::text AS sample_uuid;

-- 10. Final status
SELECT 
    'Setup Status' AS category,
    CASE 
        WHEN EXISTS (SELECT 1 FROM public.units) 
        THEN '✅ Database setup complete'
        ELSE '❌ Database setup incomplete'
    END AS status;