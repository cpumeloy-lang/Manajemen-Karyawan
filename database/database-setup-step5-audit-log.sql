-- STEP 5: Audit Logging untuk Biometric & Device Events
-- Jalankan SETELAH database-setup-step4-indexes-biometric.sql
-- Track semua aktivitas biometric untuk security & compliance

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Create audit log table untuk biometric events
CREATE TABLE IF NOT EXISTS public.biometric_audit_log (
    id TEXT DEFAULT gen_random_uuid()::text PRIMARY KEY,
    employee_id TEXT REFERENCES public.employees(id) ON DELETE SET NULL,
    device_id TEXT REFERENCES public.employee_devices(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN (
        'device_registered',
        'device_blocked',
        'device_unblocked',
        'device_removed',
        'check_in_success',
        'check_in_failed',
        'check_out_success',
        'check_out_failed',
        'face_verified',
        'face_rejected',
        'totp_verified',
        'totp_rejected',
        'anomaly_detected',
        'manual_override',
        'device_status_changed',
        'device_metadata_changed'
    )),
    status VARCHAR(50) CHECK (status IN ('success', 'failed', 'warning')),
    biometric_type VARCHAR(50),
    confidence_score DECIMAL(3,2),
    failure_reason TEXT,
    metadata JSONB, -- {attempt_number, retry_count, error_code, face_score, location, device_fingerprint}
    user_agent TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.biometric_audit_log
    DROP CONSTRAINT IF EXISTS biometric_audit_log_confidence_score_check;

ALTER TABLE public.biometric_audit_log
    ADD CONSTRAINT biometric_audit_log_confidence_score_check
    CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1));

ALTER TABLE public.biometric_audit_log
    ALTER COLUMN status SET DEFAULT 'success';

UPDATE public.biometric_audit_log
SET status = 'success'
WHERE status IS NULL;

ALTER TABLE public.biometric_audit_log
    ALTER COLUMN status SET NOT NULL,
    ALTER COLUMN created_at SET NOT NULL,
    ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE public.biometric_audit_log ENABLE ROW LEVEL SECURITY;

-- 2. RLS untuk audit log (admin & self read only)
DROP POLICY IF EXISTS "biometric_audit_log_read" ON public.biometric_audit_log;
CREATE POLICY "biometric_audit_log_read"
    ON public.biometric_audit_log FOR SELECT
    USING (
        public.is_admin_user() OR 
        employee_id = public.current_employee_id()
    );

DROP POLICY IF EXISTS "biometric_audit_log_insert" ON public.biometric_audit_log;
CREATE POLICY "biometric_audit_log_insert"
    ON public.biometric_audit_log FOR INSERT
    WITH CHECK (
        public.is_admin_user() OR
        employee_id = public.current_employee_id()
    );

-- 3. Create indexes untuk audit log queries
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

CREATE INDEX IF NOT EXISTS idx_biometric_audit_failed_recent
    ON public.biometric_audit_log(employee_id, created_at DESC)
    WHERE action LIKE '%failed%';

-- 4. Trigger function untuk log device changes
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
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.log_device_change() FROM PUBLIC;

-- 5. Attach trigger ke employee_devices
DROP TRIGGER IF EXISTS trigger_log_device_change ON public.employee_devices;
CREATE TRIGGER trigger_log_device_change
    AFTER INSERT OR UPDATE OR DELETE ON public.employee_devices
    FOR EACH ROW
    EXECUTE FUNCTION log_device_change();

-- 6. Create materialized view untuk anomaly detection
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_matviews
        WHERE schemaname = 'public'
          AND matviewname = 'device_anomalies'
    ) THEN
        EXECUTE 'DROP MATERIALIZED VIEW public.device_anomalies';
    ELSIF EXISTS (
        SELECT 1
        FROM pg_views
        WHERE schemaname = 'public'
          AND viewname = 'device_anomalies'
    ) THEN
        EXECUTE 'DROP VIEW public.device_anomalies';
    END IF;
END
$$;

CREATE MATERIALIZED VIEW public.device_anomalies AS
SELECT 
    e.id as employee_id,
    e.nama as employee_name,
    COUNT(DISTINCT CASE WHEN a.action LIKE '%failed%' THEN a.created_at::DATE END) as failed_days,
    COUNT(CASE WHEN a.action LIKE '%failed%' THEN 1 END) as total_failures,
    COUNT(DISTINCT a.device_id) as unique_devices,
    COUNT(DISTINCT a.created_at::DATE) as active_days,
    MAX(a.created_at) as last_activity,
    AVG(CASE WHEN a.confidence_score IS NOT NULL THEN a.confidence_score ELSE 1 END) as avg_confidence
FROM public.employees e
LEFT JOIN public.biometric_audit_log a ON e.id = a.employee_id
    AND a.created_at > NOW() - INTERVAL '30 days'
GROUP BY e.id, e.nama
HAVING 
    COUNT(CASE WHEN a.action LIKE '%failed%' THEN 1 END) > 5 
    OR COUNT(DISTINCT a.device_id) > 3
    OR AVG(CASE WHEN a.confidence_score IS NOT NULL THEN a.confidence_score ELSE 1 END) < 0.85
ORDER BY total_failures DESC, avg_confidence ASC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_device_anomalies_employee_id
    ON public.device_anomalies(employee_id);

CREATE TABLE IF NOT EXISTS public.audit_maintenance_log (
    id BIGSERIAL PRIMARY KEY,
    object_name TEXT NOT NULL,
    operation TEXT NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed')),
    details TEXT,
    executed_by UUID,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_maintenance_log_object_time
    ON public.audit_maintenance_log(object_name, executed_at DESC);

ALTER TABLE public.audit_maintenance_log
    ALTER COLUMN object_name SET NOT NULL,
    ALTER COLUMN operation SET NOT NULL,
    ALTER COLUMN status SET NOT NULL,
    ALTER COLUMN executed_at SET NOT NULL;

CREATE OR REPLACE FUNCTION public.refresh_device_anomalies()
RETURNS void AS $$
BEGIN
    IF NOT public.is_admin_user() THEN
        RAISE EXCEPTION 'Hanya admin yang boleh refresh device_anomalies';
    END IF;

    BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY public.device_anomalies;

        INSERT INTO public.audit_maintenance_log (
            object_name,
            operation,
            status,
            details,
            executed_by
        ) VALUES (
            'device_anomalies',
            'refresh_materialized_view_concurrently',
            'success',
            'Concurrent refresh completed.',
            auth.uid()
        );
    EXCEPTION
        WHEN feature_not_supported OR object_not_in_prerequisite_state OR insufficient_privilege THEN
            REFRESH MATERIALIZED VIEW public.device_anomalies;

            INSERT INTO public.audit_maintenance_log (
                object_name,
                operation,
                status,
                details,
                executed_by
            ) VALUES (
                'device_anomalies',
                'refresh_materialized_view',
                'success',
                'Fallback non-concurrent refresh completed.',
                auth.uid()
            );
        WHEN OTHERS THEN
            INSERT INTO public.audit_maintenance_log (
                object_name,
                operation,
                status,
                details,
                executed_by
            ) VALUES (
                'device_anomalies',
                'refresh_materialized_view',
                'failed',
                SQLERRM,
                auth.uid()
            );
            RAISE;
    END;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.refresh_device_anomalies() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_device_anomalies() TO authenticated;

CREATE OR REPLACE FUNCTION public.cleanup_old_biometric_audit_logs(retention_days INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
    deleted_rows INTEGER;
BEGIN
    IF NOT public.is_admin_user() THEN
        RAISE EXCEPTION 'Hanya admin yang boleh menjalankan cleanup audit log';
    END IF;

    IF retention_days < 30 THEN
        RAISE EXCEPTION 'retention_days minimal 30 hari';
    END IF;

    DELETE FROM public.biometric_audit_log
    WHERE created_at < NOW() - make_interval(days => retention_days);

    GET DIAGNOSTICS deleted_rows = ROW_COUNT;

    INSERT INTO public.audit_maintenance_log (
        object_name,
        operation,
        status,
        details,
        executed_by
    ) VALUES (
        'biometric_audit_log',
        'cleanup_old_records',
        'success',
        'Deleted rows: ' || deleted_rows || ', retention_days=' || retention_days,
        auth.uid()
    );

    RETURN deleted_rows;
EXCEPTION
    WHEN OTHERS THEN
        INSERT INTO public.audit_maintenance_log (
            object_name,
            operation,
            status,
            details,
            executed_by
        ) VALUES (
            'biometric_audit_log',
            'cleanup_old_records',
            'failed',
            SQLERRM,
            auth.uid()
        );
        RAISE;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.cleanup_old_biometric_audit_logs(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_old_biometric_audit_logs(INTEGER) TO authenticated;

ALTER TABLE public.audit_maintenance_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_maintenance_log_select" ON public.audit_maintenance_log;
CREATE POLICY "audit_maintenance_log_select"
    ON public.audit_maintenance_log FOR SELECT
    USING (public.is_admin_user());

DROP POLICY IF EXISTS "audit_maintenance_log_insert" ON public.audit_maintenance_log;
CREATE POLICY "audit_maintenance_log_insert"
    ON public.audit_maintenance_log FOR INSERT
    WITH CHECK (public.is_admin_user());

GRANT SELECT ON public.audit_maintenance_log TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.audit_maintenance_log FROM authenticated;

-- 7. Compatibility table untuk modul audit log aplikasi web
-- Dipakai oleh AuditLogViewer dan auditLogService yang membaca tabel `audit_logs`
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT DEFAULT gen_random_uuid()::text PRIMARY KEY,
    user_id UUID,
    user_email TEXT,
    user_name TEXT,
    action VARCHAR(20) CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
    portal_type VARCHAR(20) CHECK (portal_type IN ('personal', 'operational', 'unknown')),
    entity_type TEXT,
    entity_id TEXT,
    entity_name TEXT,
    old_data JSONB,
    new_data JSONB,
    changes JSONB,
    description TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.audit_logs
    ALTER COLUMN action SET NOT NULL,
    ALTER COLUMN created_at SET NOT NULL;

ALTER TABLE public.audit_logs
    ADD COLUMN IF NOT EXISTS portal_type VARCHAR(20);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'audit_logs_portal_type_check'
          AND conrelid = 'public.audit_logs'::regclass
    ) THEN
        ALTER TABLE public.audit_logs
            ADD CONSTRAINT audit_logs_portal_type_check
            CHECK (portal_type IN ('personal', 'operational', 'unknown'));
    END IF;
END
$$;

ALTER TABLE public.audit_logs
    ALTER COLUMN portal_type SET DEFAULT 'operational';

UPDATE public.audit_logs
SET portal_type = COALESCE(
    NULLIF(changes->'metadata'->>'portal_type', ''),
    portal_type,
    'operational'
)
WHERE portal_type IS NULL;

ALTER TABLE public.audit_logs
    ALTER COLUMN portal_type SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_email
    ON public.audit_logs(user_email);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type
    ON public.audit_logs(entity_type);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id
    ON public.audit_logs(entity_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action
    ON public.audit_logs(action);

CREATE INDEX IF NOT EXISTS idx_audit_logs_portal_type
    ON public.audit_logs(portal_type);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
    ON public.audit_logs(created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_select_policy" ON public.audit_logs;
CREATE POLICY "audit_logs_select_policy"
    ON public.audit_logs FOR SELECT
    USING (public.is_admin_user() OR user_id = auth.uid());

DROP POLICY IF EXISTS "audit_logs_insert_policy" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_policy"
    ON public.audit_logs FOR INSERT
    WITH CHECK (public.is_admin_user() OR user_id = auth.uid());

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
REVOKE UPDATE, DELETE ON public.audit_logs FROM authenticated;
REVOKE UPDATE, DELETE ON public.biometric_audit_log FROM authenticated;
GRANT SELECT, INSERT ON public.biometric_audit_log TO authenticated;

-- 7a. Realtime sync dari biometric_audit_log ke audit_logs (untuk kompatibilitas UI web)
CREATE OR REPLACE FUNCTION public.sync_biometric_audit_to_audit_logs()
RETURNS TRIGGER AS $$
BEGIN
    BEGIN
        INSERT INTO public.audit_logs (
            id,
            user_id,
            user_email,
            user_name,
            action,
            portal_type,
            entity_type,
            entity_id,
            entity_name,
            old_data,
            new_data,
            changes,
            description,
            ip_address,
            user_agent,
            created_at
        ) VALUES (
            NEW.id,
            NULL::uuid,
            'system@local',
            'System',
            CASE
                WHEN NEW.action IN ('device_registered') THEN 'CREATE'
                WHEN NEW.action IN ('device_removed') THEN 'DELETE'
                ELSE 'UPDATE'
            END,
            'operational',
            'biometric_device',
            COALESCE(NEW.device_id, NEW.employee_id),
            'Biometric Device Event',
            NULL::jsonb,
            NEW.metadata,
            CASE
                WHEN NEW.action IN ('device_status_changed', 'device_metadata_changed', 'device_blocked', 'device_unblocked') THEN
                    jsonb_build_object('source_action', NEW.action, 'metadata', NEW.metadata)
                ELSE NULL::jsonb
            END,
            'Biometric event: ' || NEW.action,
            NEW.ip_address,
            NEW.user_agent,
            NEW.created_at
        )
        ON CONFLICT (id) DO NOTHING;
    EXCEPTION
        WHEN OTHERS THEN
            INSERT INTO public.audit_maintenance_log (
                object_name,
                operation,
                status,
                details,
                executed_by
            ) VALUES (
                'audit_logs',
                'sync_biometric_insert',
                'failed',
                SQLERRM,
                auth.uid()
            );
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.sync_biometric_audit_to_audit_logs() FROM PUBLIC;

DROP TRIGGER IF EXISTS trigger_sync_biometric_to_audit_logs ON public.biometric_audit_log;
CREATE TRIGGER trigger_sync_biometric_to_audit_logs
    AFTER INSERT ON public.biometric_audit_log
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_biometric_audit_to_audit_logs();

-- 7c. Health check ringkas untuk observability operasional
CREATE OR REPLACE FUNCTION public.audit_health_summary()
RETURNS TABLE (
    metric_name TEXT,
    metric_value TEXT
) AS $$
BEGIN
    IF NOT public.is_admin_user() THEN
        RAISE EXCEPTION 'Hanya admin yang boleh melihat audit health summary';
    END IF;

    RETURN QUERY
    SELECT 'biometric_audit_log_total_rows'::TEXT, COUNT(*)::TEXT
    FROM public.biometric_audit_log
    UNION ALL
    SELECT 'audit_logs_total_rows'::TEXT, COUNT(*)::TEXT
    FROM public.audit_logs
    UNION ALL
    SELECT 'audit_maintenance_log_total_rows'::TEXT, COUNT(*)::TEXT
    FROM public.audit_maintenance_log
    UNION ALL
    SELECT 'latest_biometric_event_at'::TEXT, COALESCE(MAX(created_at)::TEXT, 'NULL')
    FROM public.biometric_audit_log
    UNION ALL
    SELECT 'latest_audit_logs_event_at'::TEXT, COALESCE(MAX(created_at)::TEXT, 'NULL')
    FROM public.audit_logs
    UNION ALL
    SELECT 'sync_row_gap_biometric_minus_audit_logs'::TEXT,
           (SELECT COUNT(*) FROM public.biometric_audit_log)::TEXT || ' - ' ||
           (SELECT COUNT(*) FROM public.audit_logs)::TEXT;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.audit_health_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.audit_health_summary() TO authenticated;

-- 7b. Backfill data dari biometric_audit_log ke audit_logs (idempotent)
INSERT INTO public.audit_logs (
    id,
    user_id,
    user_email,
    user_name,
    action,
    portal_type,
    entity_type,
    entity_id,
    entity_name,
    old_data,
    new_data,
    changes,
    description,
    ip_address,
    user_agent,
    created_at
)
SELECT
    b.id,
    NULL::uuid,
    'system@local',
    'System',
    CASE
        WHEN b.action IN ('device_registered') THEN 'CREATE'
        WHEN b.action IN ('device_removed') THEN 'DELETE'
        ELSE 'UPDATE'
    END,
    'operational',
    'biometric_device',
    COALESCE(b.device_id, b.employee_id),
    'Biometric Device Event',
    NULL::jsonb,
    b.metadata,
    CASE
        WHEN b.action IN ('device_status_changed', 'device_metadata_changed', 'device_blocked', 'device_unblocked') THEN
            jsonb_build_object('source_action', b.action, 'metadata', b.metadata)
        ELSE NULL::jsonb
    END,
    'Biometric event: ' || b.action,
    b.ip_address,
    b.user_agent,
    b.created_at
FROM public.biometric_audit_log b
ON CONFLICT (id) DO NOTHING;

-- 8. Verify tables & indexes created
SELECT 
    'biometric_audit_log' as table_name,
    COUNT(*) as record_count
FROM public.biometric_audit_log;

SELECT 
    to_regclass('public.audit_logs') as audit_logs_table;

SELECT
    to_regclass('public.biometric_audit_log') as biometric_audit_log_table,
    to_regclass('public.device_anomalies') as device_anomalies_matview,
    to_regclass('public.audit_maintenance_log') as audit_maintenance_log_table;

SELECT
    routine_name,
    security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name IN (
        'log_device_change',
        'refresh_device_anomalies',
        'cleanup_old_biometric_audit_logs',
        'sync_biometric_audit_to_audit_logs',
        'audit_health_summary'
    )
ORDER BY routine_name;

SELECT
        tgname AS trigger_name,
        tgrelid::regclass AS table_name,
        tgenabled AS enabled
FROM pg_trigger
WHERE tgname IN ('trigger_log_device_change', 'trigger_sync_biometric_to_audit_logs')
ORDER BY tgname;

SELECT
        tablename,
        policyname,
        cmd
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('biometric_audit_log', 'audit_logs', 'audit_maintenance_log')
ORDER BY tablename, policyname;

SELECT 
    indexrelname AS indexname,
    idx_scan as scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE relname = 'biometric_audit_log'
ORDER BY idx_scan DESC;

SELECT
    portal_type,
    COUNT(*) AS total
FROM public.audit_logs
GROUP BY portal_type
ORDER BY portal_type;

DO $$
BEGIN
    BEGIN
        PERFORM 1 FROM public.audit_health_summary();
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Skip audit_health_summary verification: %', SQLERRM;
    END;
END
$$;
