-- ===========================================
-- PAGINATION & QUERY OPTIMIZATION (SAFE)
-- Disesuaikan dengan skema HRMS saat ini
-- ===========================================

CREATE OR REPLACE FUNCTION public.get_paginated_employees(
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_role TEXT DEFAULT NULL,
    p_unit_id TEXT DEFAULT NULL,
    p_status TEXT DEFAULT NULL
)
RETURNS TABLE (
    employee JSONB,
    total_count BIGINT,
    has_next BOOLEAN,
    has_prev BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_total BIGINT;
BEGIN
    SELECT COUNT(*)
    INTO v_total
    FROM public.employees e
    WHERE (p_role IS NULL OR e.role = p_role)
      AND (p_unit_id IS NULL OR e."unitKerjaId" = p_unit_id)
      AND (p_status IS NULL OR e.status = p_status);

    RETURN QUERY
    SELECT
        jsonb_build_object(
            'id', e.id,
            'nik', e.nik,
            'nama', e.nama,
            'email', e.email,
            'role', e.role,
            'unitKerjaId', e."unitKerjaId",
            'status', e.status,
            'foto', e.foto,
            'created_at', e.created_at,
            'updated_at', e.updated_at
        ) AS employee,
        v_total,
        (p_offset + p_limit) < v_total,
        p_offset > 0
    FROM public.employees e
    WHERE (p_role IS NULL OR e.role = p_role)
      AND (p_unit_id IS NULL OR e."unitKerjaId" = p_unit_id)
      AND (p_status IS NULL OR e.status = p_status)
    ORDER BY e.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_paginated_attendance(
    p_employee_id TEXT DEFAULT NULL,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    attendance_item JSONB,
    total_count BIGINT,
    has_next BOOLEAN,
    has_prev BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_total BIGINT;
BEGIN
    SELECT COUNT(*)
    INTO v_total
    FROM public.attendance a
    WHERE (p_employee_id IS NULL OR a."employeeId" = p_employee_id)
      AND (p_start_date IS NULL OR a.tanggal >= p_start_date)
      AND (p_end_date IS NULL OR a.tanggal <= p_end_date)
      AND (p_status IS NULL OR a.status = p_status);

    RETURN QUERY
    SELECT
        jsonb_build_object(
            'id', a.id,
            'employeeId', a."employeeId",
            'tanggal', a.tanggal,
            'clockIn', a."clockIn",
            'clockOut', a."clockOut",
            'status', a.status,
            'notes', a.notes,
            'created_at', a.created_at
        ) AS attendance_item,
        v_total,
        (p_offset + p_limit) < v_total,
        p_offset > 0
    FROM public.attendance a
    WHERE (p_employee_id IS NULL OR a."employeeId" = p_employee_id)
      AND (p_start_date IS NULL OR a.tanggal >= p_start_date)
      AND (p_end_date IS NULL OR a.tanggal <= p_end_date)
      AND (p_status IS NULL OR a.status = p_status)
    ORDER BY a.tanggal DESC, a.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_dashboard_stats(
    p_unit_id TEXT DEFAULT NULL,
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_employees', (
            SELECT COUNT(*)
            FROM public.employees e
            WHERE e.status = 'Aktif'
              AND (p_unit_id IS NULL OR e."unitKerjaId" = p_unit_id)
        ),
        'present_today', (
            SELECT COUNT(DISTINCT a."employeeId")
            FROM public.attendance a
            WHERE a.tanggal = CURRENT_DATE
              AND a.status = 'Hadir'
              AND (p_unit_id IS NULL OR EXISTS (
                  SELECT 1 FROM public.employees e
                  WHERE e.id = a."employeeId"
                    AND e."unitKerjaId" = p_unit_id
              ))
        ),
        'pending_requests', (
            SELECT COUNT(*)
            FROM public.requests r
            WHERE r.status = 'Pending'
              AND (p_unit_id IS NULL OR EXISTS (
                  SELECT 1 FROM public.employees e
                  WHERE e.id = r."employeeId"
                    AND e."unitKerjaId" = p_unit_id
              ))
        ),
        'attendance_rate', (
            SELECT ROUND(
                (COUNT(*) FILTER (WHERE status = 'Hadir')::DECIMAL / NULLIF(COUNT(*), 0) * 100),
                2
            )
            FROM public.attendance a
            WHERE a.tanggal BETWEEN p_start_date AND p_end_date
              AND (p_unit_id IS NULL OR EXISTS (
                  SELECT 1 FROM public.employees e
                  WHERE e.id = a."employeeId"
                    AND e."unitKerjaId" = p_unit_id
              ))
        )
    ) INTO result;

    RETURN result;
END;
$$;

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_employee_stats AS
SELECT
    e."unitKerjaId" AS unit_kerja_id,
    e.role,
    COUNT(*) AS total_count,
    COUNT(*) FILTER (WHERE e.status = 'Aktif') AS active_count,
    COUNT(*) FILTER (WHERE e.created_at >= CURRENT_DATE - INTERVAL '30 days') AS new_last_30_days
FROM public.employees e
GROUP BY e."unitKerjaId", e.role;

CREATE INDEX IF NOT EXISTS idx_mv_employee_stats_unit ON public.mv_employee_stats(unit_kerja_id);
CREATE INDEX IF NOT EXISTS idx_mv_employee_stats_role ON public.mv_employee_stats(role);

CREATE OR REPLACE FUNCTION public.refresh_employee_stats()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW public.mv_employee_stats;
END;
$$;
