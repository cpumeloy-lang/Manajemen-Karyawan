-- Hardening RLS non-recursive for HRMS local/prod
-- Safe to run multiple times

CREATE OR REPLACE FUNCTION public.current_employee_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT e.id
    FROM public.employees e
    WHERE e."user_id" = auth.uid()
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.employees e
        WHERE e."user_id" = auth.uid() AND e.role = 'admin'
    );
$$;

GRANT EXECUTE ON FUNCTION public.current_employee_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;

DROP POLICY IF EXISTS "Units dapat dibaca oleh user yang login" ON public.units;
CREATE POLICY "Units dapat dibaca oleh user yang login"
    ON public.units FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Units dapat diubah oleh admin" ON public.units;
CREATE POLICY "Units dapat diubah oleh admin"
    ON public.units FOR ALL
    USING (public.is_admin_user())
    WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "Employees dapat dibaca oleh user yang login" ON public.employees;
CREATE POLICY "Employees dapat dibaca oleh user yang login"
    ON public.employees FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Employees dapat diubah oleh admin atau diri sendiri" ON public.employees;
CREATE POLICY "Employees dapat diubah oleh admin atau diri sendiri"
    ON public.employees FOR UPDATE
    USING (public.is_admin_user() OR "user_id" = auth.uid())
    WITH CHECK (public.is_admin_user() OR "user_id" = auth.uid());

DROP POLICY IF EXISTS "Employees dapat dibuat oleh admin" ON public.employees;
CREATE POLICY "Employees dapat dibuat oleh admin"
    ON public.employees FOR INSERT
    WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "Employees dapat dihapus oleh admin" ON public.employees;
CREATE POLICY "Employees dapat dihapus oleh admin"
    ON public.employees FOR DELETE
    USING (public.is_admin_user());

DROP POLICY IF EXISTS "Attendance dapat dibaca oleh admin atau karyawan sendiri" ON public.attendance;
CREATE POLICY "Attendance dapat dibaca oleh admin atau karyawan sendiri"
    ON public.attendance FOR SELECT
    USING (public.is_admin_user() OR "employeeId" = public.current_employee_id());

DROP POLICY IF EXISTS "Attendance dapat diinput oleh admin atau karyawan sendiri" ON public.attendance;
CREATE POLICY "Attendance dapat diinput oleh admin atau karyawan sendiri"
    ON public.attendance FOR INSERT
    WITH CHECK (public.is_admin_user() OR "employeeId" = public.current_employee_id());

DROP POLICY IF EXISTS "Attendance dapat diubah oleh admin atau karyawan sendiri" ON public.attendance;
CREATE POLICY "Attendance dapat diubah oleh admin atau karyawan sendiri"
    ON public.attendance FOR UPDATE
    USING (public.is_admin_user() OR "employeeId" = public.current_employee_id())
    WITH CHECK (public.is_admin_user() OR "employeeId" = public.current_employee_id());

DROP POLICY IF EXISTS "Requests dapat dibaca oleh admin atau karyawan sendiri" ON public.requests;
CREATE POLICY "Requests dapat dibaca oleh admin atau karyawan sendiri"
    ON public.requests FOR SELECT
    USING (public.is_admin_user() OR "employeeId" = public.current_employee_id());

DROP POLICY IF EXISTS "Requests dapat dibuat oleh karyawan sendiri" ON public.requests;
CREATE POLICY "Requests dapat dibuat oleh karyawan sendiri"
    ON public.requests FOR INSERT
    WITH CHECK ("employeeId" = public.current_employee_id());

DROP POLICY IF EXISTS "Requests dapat diupdate oleh admin" ON public.requests;
CREATE POLICY "Requests dapat diupdate oleh admin"
    ON public.requests FOR UPDATE
    USING (public.is_admin_user())
    WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "Documents dapat dibaca oleh admin atau karyawan sendiri" ON public.documents;
CREATE POLICY "Documents dapat dibaca oleh admin atau karyawan sendiri"
    ON public.documents FOR SELECT
    USING (public.is_admin_user() OR "employeeId" = public.current_employee_id());

DROP POLICY IF EXISTS "Documents dapat diupload oleh admin atau karyawan sendiri" ON public.documents;
CREATE POLICY "Documents dapat diupload oleh admin atau karyawan sendiri"
    ON public.documents FOR INSERT
    WITH CHECK (public.is_admin_user() OR "employeeId" = public.current_employee_id());
