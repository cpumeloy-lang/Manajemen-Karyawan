-- DEBUG LOGIN ERROR
-- Jalankan query ini di Supabase SQL Editor untuk diagnose masalah

-- 0. FIRST: Cek column apa yang ada di employees table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'employees'
ORDER BY ordinal_position;

-- 1. Cek berapa banyak user yang sudah login
SELECT COUNT(*) as total_auth_users FROM auth.users;

-- 2. Cek employee data (gunakan column yang ada)
SELECT * FROM public.employees LIMIT 10;

-- 3. Cek user_id mana yang tidak ada di employees
SELECT u.id, u.email FROM auth.users u
LEFT JOIN public.employees e ON u.id = e."user_id"
WHERE e.id IS NULL;

-- 4. Cek jika ada employee tanpa user_id
SELECT * FROM public.employees WHERE "user_id" IS NULL;

-- 5. Cek roles_permissions sudah ada?
SELECT COUNT(*) as total_permissions FROM public.roles_permissions;

-- 6. Cek RLS policies status
SELECT tablename, policyname, cmd, QUAL
FROM pg_policies 
WHERE tablename IN ('employees', 'attendance', 'requests')
ORDER BY tablename, policyname;

-- 7. Debug: Cek user yang sekarang login (uncomment jika di auth context)
-- SELECT auth.uid() as current_user_id;

-- 8. Cek constraint employees role
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'employees' AND constraint_type = 'CHECK';

-- ============================================
-- PERBAIKAN CEPAT: Jika migration belum dijalankan
-- ============================================
-- Uncomment HANYA jika migration SQL belum dijalankan

/*
-- Fix 1: Update employees table role constraint
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_role_check;
ALTER TABLE public.employees ADD CONSTRAINT employees_role_check 
    CHECK (role IN ('admin', 'hrd', 'kepala_ruangan', 'karyawan'));

-- Fix 2: Pastikan semua employee punya user_id
UPDATE public.employees 
SET role = 'karyawan' 
WHERE role IS NULL OR role = '';

-- Fix 3: Pastikan first employee adalah admin
UPDATE public.employees 
SET role = 'admin'
WHERE id = (SELECT id FROM public.employees ORDER BY created_at ASC LIMIT 1)
AND role IS NULL;
*/
