-- ============================================
-- UPDATE RLS FOR HRD ACCESS TO EMPLOYEES
-- ============================================
-- Memberikan akses HRD untuk mengelola data karyawan
-- Version: 1.0
-- Date: 2026-04-22
-- ============================================

-- 1. Buat fungsi helper untuk cek admin atau HRD
-- ============================================

CREATE OR REPLACE FUNCTION public.is_admin_or_hr_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.employees e
        WHERE e."user_id" = auth.uid() AND e.role IN ('admin', 'hrd', 'hr')
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_or_hr_user() TO authenticated;

-- 2. Update RLS Policies
-- ============================================

-- Update INSERT policy
DROP POLICY IF EXISTS "Employees dapat dibuat oleh admin" ON public.employees;
DROP POLICY IF EXISTS "Employees dapat dibuat oleh admin atau HRD" ON public.employees;
CREATE POLICY "Employees dapat dibuat oleh admin atau HRD"
    ON public.employees FOR INSERT
    WITH CHECK (public.is_admin_or_hr_user());

-- Update UPDATE policy
DROP POLICY IF EXISTS "Employees dapat diubah oleh admin atau diri sendiri" ON public.employees;
CREATE POLICY "Employees dapat diubah oleh admin/HRD atau diri sendiri"
    ON public.employees FOR UPDATE
    USING (public.is_admin_or_hr_user() OR "user_id" = auth.uid())
    WITH CHECK (public.is_admin_or_hr_user() OR "user_id" = auth.uid());

-- Update DELETE policy
DROP POLICY IF EXISTS "Employees dapat dihapus oleh admin" ON public.employees;
CREATE POLICY "Employees dapat dihapus oleh admin atau HRD"
    ON public.employees FOR DELETE
    USING (public.is_admin_or_hr_user());

-- 3. Verifikasi
-- ============================================

-- Cek policies yang aktif
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'employees'
ORDER BY policyname;

-- ============================================
-- MIGRATION NOTES
-- ============================================
-- 1. HRD sekarang bisa CREATE, READ, UPDATE, DELETE data karyawan
-- 2. Karyawan tetap hanya bisa UPDATE data diri sendiri
-- 3. Admin tetap punya akses penuh
-- 4. Fungsi is_admin_or_hr_user() mencakup role: 'admin', 'hrd', 'hr'
-- ============================================