-- Attendance vs Audit Consistency Check
-- Jalankan setelah melakukan input absensi dari portal operasional dan personal.

-- 1) Cek kolom audit portal_type tersedia
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'audit_logs'
  AND column_name = 'portal_type';

-- 2) Ringkasan absensi terbaru (fallback dukung schema campuran)
CREATE OR REPLACE FUNCTION public.attendance_consistency_summary(limit_rows INTEGER DEFAULT 20)
RETURNS TABLE (
    attendance_id TEXT,
    employee_id TEXT,
    attendance_date TEXT,
    source TEXT,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    has_camel BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.table_name = 'attendance'
          AND c.column_name = 'employeeId'
    ) INTO has_camel;

    IF has_camel THEN
        RETURN QUERY EXECUTE format(
            'SELECT a.id::text, a."employeeId"::text, a.tanggal::text, COALESCE(a.source, ''unknown'')::text, COALESCE(a.status, ''unknown'')::text, a.created_at
             FROM public.attendance a
             ORDER BY a.created_at DESC NULLS LAST
             LIMIT %s',
            limit_rows
        );
    ELSE
        RETURN QUERY EXECUTE format(
            'SELECT a.id::text, a.employee_id::text, a.date::text, COALESCE(a.source, ''unknown'')::text, COALESCE(a.status, ''unknown'')::text, a.created_at
             FROM public.attendance a
             ORDER BY a.created_at DESC NULLS LAST
             LIMIT %s',
            limit_rows
        );
    END IF;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp;

SELECT * FROM public.attendance_consistency_summary(20);

-- 3) Ringkasan audit absensi terbaru
SELECT
    id,
    action,
    entity_type,
    portal_type,
    user_email,
    entity_id,
    description,
    created_at
FROM public.audit_logs
WHERE entity_type = 'attendance'
ORDER BY created_at DESC
LIMIT 20;

-- 4) Distribusi audit absensi per portal_type
SELECT
    portal_type,
    COUNT(*) AS total
FROM public.audit_logs
WHERE entity_type = 'attendance'
GROUP BY portal_type
ORDER BY portal_type;

-- 5) Kandidat absensi terbaru yang belum punya event audit CREATE attendance
-- Catatan: entity_id di audit memakai id dari row attendance.
WITH attendance_recent AS (
    SELECT
        id,
        created_at
    FROM public.attendance
    WHERE created_at >= NOW() - INTERVAL '7 days'
),
audit_recent AS (
    SELECT
        entity_id
    FROM public.audit_logs
    WHERE entity_type = 'attendance'
      AND action = 'CREATE'
      AND created_at >= NOW() - INTERVAL '7 days'
)
SELECT
    ar.id AS attendance_id,
    ar.created_at AS attendance_created_at
FROM attendance_recent ar
LEFT JOIN audit_recent au ON au.entity_id = ar.id
WHERE au.entity_id IS NULL
ORDER BY ar.created_at DESC
LIMIT 50;

-- 6) Validasi portal_type tidak null/invalid
SELECT
    COUNT(*) FILTER (WHERE portal_type IS NULL) AS null_portal_type,
    COUNT(*) FILTER (WHERE portal_type NOT IN ('personal', 'operational', 'unknown')) AS invalid_portal_type
FROM public.audit_logs
WHERE entity_type = 'attendance';

-- 7) Ringkasan request maker-checker terbaru
SELECT
    id,
    employee_id,
    attendance_date,
    request_type,
    reason_code,
    location_verified,
    status,
    maker_user_id,
    checker_user_id,
    created_at,
    reviewed_at
FROM public.attendance_change_requests
ORDER BY created_at DESC
LIMIT 30;

-- 8) Cek request pending yang belum diproses
SELECT
    reason_code,
    COUNT(*) AS total_pending
FROM public.attendance_change_requests
WHERE status = 'pending'
GROUP BY reason_code
ORDER BY total_pending DESC, reason_code;

-- 9) Cek potensi pelanggaran maker-checker (maker == checker)
SELECT
    id,
    employee_id,
    attendance_date,
    maker_user_id,
    checker_user_id,
    status,
    reviewed_at
FROM public.attendance_change_requests
WHERE status IN ('approved', 'rejected')
  AND maker_user_id IS NOT NULL
  AND checker_user_id IS NOT NULL
  AND maker_user_id = checker_user_id
ORDER BY reviewed_at DESC;

-- 10) Ringkasan revision history absensi
SELECT
    action,
    reason_code,
    COUNT(*) AS total
FROM public.attendance_revision_history
GROUP BY action, reason_code
ORDER BY action, reason_code;
