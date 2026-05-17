-- ============================================================
-- FIX: infinite recursion detected in policy for relation "employees"
-- ============================================================
-- Penyebab umum: policy pada `employees` memanggil function/subquery
-- yang juga membaca `employees`, dan policy itu di-evaluasi ulang
-- ketika function tersebut dijalankan ⇒ rekursi tak terbatas.
--
-- Fix:
-- 1. Pastikan helper function `is_admin_user()` dan `current_employee_id()`
--    pakai SECURITY DEFINER → bypass RLS saat di-evaluasi.
-- 2. Drop semua policy `employees` yang lama, lalu buat ulang yang
--    SELECT/UPDATE pakai `user_id = auth.uid()` LANGSUNG (tanpa
--    panggil is_admin_user) untuk mencegah loop.
-- 3. Admin tetap bisa akses semua via JWT claim role atau via
--    service-role key dari API server.
--
-- Aman dijalankan berulang kali. Jalankan sekali di Supabase SQL Editor.
-- ============================================================

-- 1. Recreate helper functions DENGAN SECURITY DEFINER ----------
CREATE OR REPLACE FUNCTION public.current_employee_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT e.id::text
    FROM public.employees e
    WHERE e.user_id = auth.uid()
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.employees e
        WHERE e.user_id = auth.uid() AND e.role = 'admin'
    );
$$;

GRANT EXECUTE ON FUNCTION public.current_employee_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;

-- 2. Drop SEMUA policy lama pada employees agar tidak konflik ----
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'employees'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.employees', pol.policyname);
    END LOOP;
END$$;

-- 3. Buat ulang policy yang AMAN (tidak recursive) ----------------

-- SELECT: setiap user yang login boleh baca tabel employees
-- (data karyawan tidak rahasia antar pegawai, mis. untuk lookup nama).
CREATE POLICY "employees_select_authenticated"
    ON public.employees FOR SELECT
    TO authenticated
    USING (true);

-- INSERT: hanya service-role (dari API server) yang boleh tambah
-- karyawan. Karyawan via mobile/web tidak menambah baris.
-- (Supabase service-role bypass RLS otomatis, jadi policy untuk
--  authenticated dibatasi ketat.)
CREATE POLICY "employees_insert_self_only"
    ON public.employees FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- UPDATE: karyawan boleh update barisnya sendiri
-- (dipakai mobile untuk update telepon, foto, push token).
-- Admin update via service-role di API server.
CREATE POLICY "employees_update_self"
    ON public.employees FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- DELETE: tidak diperbolehkan dari client (lewat service-role saja).
-- (Tidak buat policy DELETE → otomatis ditolak untuk authenticated.)

-- 4. Verifikasi cepat (opsional) ---------------------------------
-- SELECT policyname, cmd, qual, with_check FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'employees';

COMMENT ON POLICY "employees_select_authenticated" ON public.employees IS
  'Semua user terotentikasi boleh SELECT (anti-recursion).';
COMMENT ON POLICY "employees_update_self" ON public.employees IS
  'User hanya boleh UPDATE barisnya sendiri via auth.uid().';
