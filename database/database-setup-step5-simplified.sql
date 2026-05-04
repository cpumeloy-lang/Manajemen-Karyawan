-- STEP 5 SIMPLIFIED: Audit Logging untuk Biometric Events
-- Versi simplified untuk testing

-- 1. Create audit log table
CREATE TABLE IF NOT EXISTS public.biometric_audit_log (
    id TEXT DEFAULT gen_random_uuid()::text PRIMARY KEY,
    employee_id TEXT REFERENCES public.employees(id) ON DELETE SET NULL,
    device_id TEXT REFERENCES public.employee_devices(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN (
        'device_registered',
        'device_blocked',
        'device_unblocked',
        'device_removed',
        'device_status_changed',
        'device_metadata_changed'
    )),
    status VARCHAR(50) CHECK (status IN ('success', 'failed', 'warning')),
    biometric_type VARCHAR(50),
    confidence_score DECIMAL(3,2),
    failure_reason TEXT,
    metadata JSONB,
    user_agent TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.biometric_audit_log ENABLE ROW LEVEL SECURITY;

-- 3. Simple RLS policy (admin & self read)
DROP POLICY IF EXISTS "biometric_audit_log_read" ON public.biometric_audit_log;
CREATE POLICY "biometric_audit_log_read"
    ON public.biometric_audit_log FOR SELECT
    USING (
        public.is_admin_user() OR
        employee_id = public.current_employee_id()
    );

-- 4. Basic indexes
CREATE INDEX IF NOT EXISTS idx_biometric_audit_employee_id
    ON public.biometric_audit_log(employee_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_biometric_audit_device_id
    ON public.biometric_audit_log(device_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_biometric_audit_action
    ON public.biometric_audit_log(action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_biometric_audit_status
    ON public.biometric_audit_log(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_biometric_audit_created_at_brin
    ON public.biometric_audit_log USING BRIN (created_at);

CREATE INDEX IF NOT EXISTS idx_biometric_audit_created_at_desc
    ON public.biometric_audit_log(created_at DESC);

-- 5. Simple trigger for device changes
CREATE OR REPLACE FUNCTION log_device_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.biometric_audit_log
        (employee_id, device_id, action, status, metadata, created_at)
        VALUES (
            NEW.employee_id,
            NEW.id,
            'device_registered',
            'success',
            jsonb_build_object(
                'platform', NEW.platform,
                'device_name', NEW.device_name,
                'is_primary', NEW.is_primary
            ),
            NOW()
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' AND (
        OLD.status IS DISTINCT FROM NEW.status OR
        OLD.platform IS DISTINCT FROM NEW.platform OR
        OLD.device_name IS DISTINCT FROM NEW.device_name OR
        OLD.is_primary IS DISTINCT FROM NEW.is_primary
    ) THEN
        INSERT INTO public.biometric_audit_log
        (employee_id, device_id, action, status, metadata, created_at)
        VALUES (
            NEW.employee_id,
            NEW.id,
            CASE
                WHEN OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'Blocked' THEN 'device_blocked'
                WHEN OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('Active', 'Inactive') AND OLD.status = 'Blocked' THEN 'device_unblocked'
                WHEN OLD.status IS DISTINCT FROM NEW.status THEN 'device_status_changed'
                ELSE 'device_metadata_changed'
            END,
            'success',
            jsonb_build_object(
                'old_status', OLD.status,
                'new_status', NEW.status,
                'old_platform', OLD.platform,
                'new_platform', NEW.platform,
                'old_device_name', OLD.device_name,
                'new_device_name', NEW.device_name,
                'old_is_primary', OLD.is_primary,
                'new_is_primary', NEW.is_primary
            ),
            NOW()
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.biometric_audit_log
        (employee_id, device_id, action, status, metadata, created_at)
        VALUES (
            OLD.employee_id,
            OLD.id,
            'device_removed',
            'success',
            jsonb_build_object(
                'platform', OLD.platform,
                'device_name', OLD.device_name
            ),
            NOW()
        );
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 6. Attach trigger
DROP TRIGGER IF EXISTS trigger_log_device_change ON public.employee_devices;
CREATE TRIGGER trigger_log_device_change
    AFTER INSERT OR UPDATE OR DELETE ON public.employee_devices
    FOR EACH ROW
    EXECUTE FUNCTION log_device_change();

-- 7. Verify
-- Expect: 1 row with the table name and a non-zero column count
SELECT 
    'biometric_audit_log created' AS status,
    'public.biometric_audit_log' AS table_name,
    COUNT(*) AS columns_count
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'biometric_audit_log';