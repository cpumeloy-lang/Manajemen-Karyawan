-- STEP 3: Row Level Security (RLS) untuk Biometric Tables
-- Jalankan SETELAH database-setup-step2-migrate-existing.sql
-- Setup security policies untuk employee_devices & attendance biometric fields

-- 1. Enable RLS untuk employee_devices
ALTER TABLE public.employee_devices ENABLE ROW LEVEL SECURITY;

-- 2. RLS Policy: Employees dapat melihat device mereka sendiri
DROP POLICY IF EXISTS "employee_devices_read_self" ON public.employee_devices;
CREATE POLICY "employee_devices_read_self"
    ON public.employee_devices FOR SELECT
    USING (
        public.is_admin_user() OR 
        employee_id = public.current_employee_id()
    );

-- 3. RLS Policy: Employees dapat register device mereka sendiri
DROP POLICY IF EXISTS "employee_devices_insert_self" ON public.employee_devices;
CREATE POLICY "employee_devices_insert_self"
    ON public.employee_devices FOR INSERT
    WITH CHECK (
        public.is_admin_user() OR 
        employee_id = public.current_employee_id()
    );

-- 4. RLS Policy: Hanya admin yang dapat update/delete device
DROP POLICY IF EXISTS "employee_devices_update_admin" ON public.employee_devices;
CREATE POLICY "employee_devices_update_admin"
    ON public.employee_devices FOR UPDATE
    USING (public.is_admin_user())
    WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "employee_devices_delete_admin" ON public.employee_devices;
CREATE POLICY "employee_devices_delete_admin"
    ON public.employee_devices FOR DELETE
    USING (public.is_admin_user());

-- 5. Verify RLS policies active
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'employee_devices'
ORDER BY tablename, policyname;
