-- Fix is_admin_user() to also recognize 'hr' and 'hrd' roles
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.employees e
        WHERE e.user_id = auth.uid()
          AND e.role IN ('admin', 'hr', 'hrd')
    );
$$;

-- Verify the function was updated
SELECT prosrc FROM pg_proc WHERE proname = 'is_admin_user' LIMIT 1;
