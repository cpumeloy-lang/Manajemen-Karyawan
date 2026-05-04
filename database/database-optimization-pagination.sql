-- ===========================================
-- PAGINATION & QUERY OPTIMIZATION
-- HRMS Production Readiness - Phase 1
-- ===========================================

-- Jalankan script ini SETELAH indexes berhasil dibuat
-- Script ini berisi query patterns yang optimized

-- ===========================================
-- 1. PAGINATION FUNCTIONS
-- ===========================================

-- Function untuk pagination dengan metadata
CREATE OR REPLACE FUNCTION get_paginated_employees(
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_role TEXT DEFAULT NULL,
    p_unit_id UUID DEFAULT NULL,
    p_status TEXT DEFAULT 'active'
)
RETURNS TABLE (
    employees JSONB,
    total_count BIGINT,
    has_next BOOLEAN,
    has_prev BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_total BIGINT;
    v_has_next BOOLEAN;
    v_has_prev BOOLEAN;
BEGIN
    -- Hitung total records
    SELECT COUNT(*)
    INTO v_total
    FROM employees e
    WHERE (p_role IS NULL OR e.role = p_role)
      AND (p_unit_id IS NULL OR e.unitKerjaId = p_unit_id)
      AND (p_status IS NULL OR e.status = p_status);

    -- Cek pagination flags
    v_has_next := (p_offset + p_limit) < v_total;
    v_has_prev := p_offset > 0;

    -- Return paginated data
    RETURN QUERY
    SELECT
        jsonb_build_object(
            'id', e.id,
            'nik', e.nik,
            'nama', e.nama,
            'email', e.email,
            'role', e.role,
            'unitKerjaId', e.unitKerjaId,
            'status', e.status,
            'created_at', e.created_at,
            'updated_at', e.updated_at,
            'foto', e.foto -- Tambahkan foto untuk UI tapi hindari JSONB berat seperti education/work_history
        ) as employees,
        v_total as total_count,
        v_has_next as has_next,
        v_has_prev as has_prev
    FROM employees e
    WHERE (p_role IS NULL OR e.role = p_role)
      AND (p_unit_id IS NULL OR e.unitKerjaId = p_unit_id)
      AND (p_status IS NULL OR e.status = p_status)
    ORDER BY e.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Function untuk attendance pagination
CREATE OR REPLACE FUNCTION get_paginated_attendance(
    p_employee_id UUID DEFAULT NULL,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    attendance JSONB,
    total_count BIGINT,
    has_next BOOLEAN,
    has_prev BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_total BIGINT;
    v_has_next BOOLEAN;
    v_has_prev BOOLEAN;
BEGIN
    -- Hitung total records
    SELECT COUNT(*)
    INTO v_total
    FROM attendance a
    WHERE (p_employee_id IS NULL OR a.employee_id = p_employee_id)
      AND (p_start_date IS NULL OR a.date >= p_start_date)
      AND (p_end_date IS NULL OR a.date <= p_end_date)
      AND (p_status IS NULL OR a.status = p_status);

    -- Cek pagination flags
    v_has_next := (p_offset + p_limit) < v_total;
    v_has_prev := p_offset > 0;

    -- Return paginated data
    RETURN QUERY
    SELECT
        jsonb_build_object(
            'id', a.id,
            'employee_id', a.employee_id,
            'date', a.date,
            'check_in', a.check_in,
            'check_out', a.check_out,
            'status', a.status,
            'notes', a.notes,
            'created_at', a.created_at
        ) as attendance,
        v_total as total_count,
        v_has_next as has_next,
        v_has_prev as has_prev
    FROM attendance a
    WHERE (p_employee_id IS NULL OR a.employee_id = p_employee_id)
      AND (p_start_date IS NULL OR a.date >= p_start_date)
      AND (p_end_date IS NULL OR a.date <= p_end_date)
      AND (p_status IS NULL OR a.status = p_status)
    ORDER BY a.date DESC, a.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- ===========================================
-- 2. OPTIMIZED QUERY PATTERNS
-- ===========================================

-- Query untuk dashboard dengan aggregations
CREATE OR REPLACE FUNCTION get_dashboard_stats(
    p_unit_id UUID DEFAULT NULL,
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
            FROM employees e
            WHERE e.status = 'active'
              AND (p_unit_id IS NULL OR e.unitKerjaId = p_unit_id)
        ),
        'present_today', (
            SELECT COUNT(DISTINCT a.employee_id)
            FROM attendance a
            WHERE a.date = CURRENT_DATE
              AND a.status = 'present'
              AND (p_unit_id IS NULL OR EXISTS (
                  SELECT 1 FROM employees e
                  WHERE e.id = a.employee_id
                    AND e.unitKerjaId = p_unit_id
              ))
        ),
        'pending_requests', (
            SELECT COUNT(*)
            FROM requests r
            WHERE r.status = 'pending'
              AND (p_unit_id IS NULL OR EXISTS (
                  SELECT 1 FROM employees e
                  WHERE e.id = r.employee_id
                    AND e.unitKerjaId = p_unit_id
              ))
        ),
        'attendance_rate', (
            SELECT ROUND(
                (COUNT(*) FILTER (WHERE status = 'present')::DECIMAL /
                 NULLIF(COUNT(*), 0) * 100), 2
            )
            FROM attendance a
            WHERE a.date BETWEEN p_start_date AND p_end_date
              AND (p_unit_id IS NULL OR EXISTS (
                  SELECT 1 FROM employees e
                  WHERE e.id = a.employee_id
                    AND e.unitKerjaId = p_unit_id
              ))
        )
    ) INTO result;

    RETURN result;
END;
$$;

-- ===========================================
-- 3. MATERIALIZED VIEWS FOR PERFORMANCE
-- ===========================================

-- Materialized view untuk employee stats (refresh periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_employee_stats AS
SELECT
    e.unitKerjaId,
    e.role,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE e.status = 'active') as active_count,
    COUNT(*) FILTER (WHERE e.created_at >= CURRENT_DATE - INTERVAL '30 days') as new_last_30_days
FROM employees e
GROUP BY e.unitKerjaId, e.role;

-- Index untuk materialized view
CREATE INDEX IF NOT EXISTS idx_mv_employee_stats_unit ON mv_employee_stats(unitKerjaId);
CREATE INDEX IF NOT EXISTS idx_mv_employee_stats_role ON mv_employee_stats(role);

-- Function untuk refresh materialized view
CREATE OR REPLACE FUNCTION refresh_employee_stats()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_employee_stats;
END;
$$;

-- ===========================================
-- 4. QUERY OPTIMIZATION EXAMPLES
-- ===========================================

-- Optimized: Gunakan CTE untuk complex queries
WITH employee_attendance AS (
    SELECT
        e.id,
        e.nama,
        e.role,
        COUNT(a.id) as total_days,
        COUNT(a.id) FILTER (WHERE a.status = 'present') as present_days,
        ROUND(
            COUNT(a.id) FILTER (WHERE a.status = 'present')::DECIMAL /
            NULLIF(COUNT(a.id), 0) * 100, 2
        ) as attendance_rate
    FROM employees e
    LEFT JOIN attendance a ON e.id = a.employee_id
        AND a.date BETWEEN CURRENT_DATE - INTERVAL '30 days' AND CURRENT_DATE
    WHERE e.status = 'active'
    GROUP BY e.id, e.nama, e.role
)
SELECT * FROM employee_attendance
ORDER BY attendance_rate DESC;

-- ===========================================
-- 5. MONITORING & MAINTENANCE
-- ===========================================

-- View untuk query performance
CREATE OR REPLACE VIEW query_performance AS
SELECT
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation,
    most_common_vals,
    most_common_freqs
FROM pg_stats
WHERE schemaname = 'public'
ORDER BY tablename, attname;

-- Function untuk analyze table statistics
CREATE OR REPLACE FUNCTION analyze_table_stats(table_name TEXT)
RETURNS TABLE (
    column_name TEXT,
    data_type TEXT,
    n_distinct BIGINT,
    null_frac REAL,
    avg_width INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    EXECUTE format('
        SELECT
            attname::TEXT as column_name,
            pg_typeof(%I)::TEXT as data_type,
            n_distinct::BIGINT,
            null_frac::REAL,
            avg_width::INTEGER
        FROM pg_stats
        WHERE schemaname = ''public''
          AND tablename = %L
        ORDER BY attname
    ', table_name, table_name);
END;
$$;

-- ===========================================
-- USAGE EXAMPLES:
-- ===========================================
--
-- 1. Get paginated employees:
-- SELECT * FROM get_paginated_employees(20, 0, 'karyawan');
--
-- 2. Get attendance with date range:
-- SELECT * FROM get_paginated_attendance(
--     NULL, '2024-01-01'::DATE, '2024-01-31'::DATE, NULL, 50, 0
-- );
--
-- 3. Get dashboard stats:
-- SELECT get_dashboard_stats();
--
-- 4. Refresh materialized views:
-- SELECT refresh_employee_stats();
--
-- 5. Analyze table statistics:
-- SELECT * FROM analyze_table_stats('employees');
-- ===========================================