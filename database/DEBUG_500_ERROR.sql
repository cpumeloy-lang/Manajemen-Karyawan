-- FIX ERROR 500 pada Login
-- Jalankan URUT dari atas ke bawah di Supabase SQL Editor

-- STEP 1: Cek RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename IN ('employees', 'attendance', 'requests');

-- STEP 2: Cek employee data exists
SELECT COUNT(*) as total_employees FROM public.employees;

-- STEP 3: Cek ada employee dengan user_id yang login?
SELECT id, email, role, "user_id" 
FROM public.employees 
WHERE "user_id" = '11111111-1111-1111-1111-111111111101'::uuid;

-- STEP 4: Cek RLS policies yang aktif
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename = 'employees';

-- ============================================
-- JIKA ERROR 500 MASIH TERJADI, JALANKAN INI
-- ============================================

-- TEMPORARY FIX: Disable RLS untuk testing
ALTER TABLE public.employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests DISABLE ROW LEVEL SECURITY;

-- Setelah disable RLS, test di frontend:
-- 1. Refresh browser (F5)
-- 2. Coba login lagi
-- 3. Lihat apakah masih error

-- JIKA BERHASIL SETELAH DISABLE RLS:
-- Berarti RLS policy ada bug, akan saya fix

-- JIKA MASIH ERROR SETELAH DISABLE RLS:
-- Berarti masalah lain (data issue atau migration)

-- ============================================
-- SETELAH TEST, ENABLE KEMBALI
-- ============================================
-- ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
