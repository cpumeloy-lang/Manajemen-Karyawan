-- =============================================
-- AUDIT LOG CLEANUP
-- Allow admin to delete audit logs manually
-- and auto-clean logs older than X days
-- =============================================

-- 1. Add DELETE policy for admin
DROP POLICY IF EXISTS "Admin can delete audit logs" ON public.audit_logs;
CREATE POLICY "Admin can delete audit logs"
    ON public.audit_logs
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.employees
            WHERE employees.user_id = auth.uid()
            AND employees.role = 'admin'
        )
    );

-- 2. Function to clean old audit logs (older than N days)
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs(older_than_days INTEGER DEFAULT 30)
RETURNS TABLE(deleted_count BIGINT) AS $$
DECLARE
    v_count BIGINT;
BEGIN
    -- Only admin can execute this
    IF NOT EXISTS (
        SELECT 1 FROM public.employees
        WHERE user_id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Only admin can clean audit logs';
    END IF;

    DELETE FROM public.audit_logs
    WHERE created_at < (NOW() - (older_than_days || ' days')::INTERVAL);
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Function to delete all audit logs (admin only)
CREATE OR REPLACE FUNCTION public.delete_all_audit_logs()
RETURNS TABLE(deleted_count BIGINT) AS $$
DECLARE
    v_count BIGINT;
BEGIN
    -- Only admin can execute this
    IF NOT EXISTS (
        SELECT 1 FROM public.employees
        WHERE user_id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Only admin can clean audit logs';
    END IF;

    DELETE FROM public.audit_logs;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.cleanup_old_audit_logs(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_all_audit_logs() TO authenticated;
GRANT DELETE ON public.audit_logs TO authenticated;
