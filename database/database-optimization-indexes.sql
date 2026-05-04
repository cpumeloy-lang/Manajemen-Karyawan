-- ===========================================
-- DATABASE OPTIMIZATION SCRIPT
-- HRMS Production Readiness - Phase 1
-- ===========================================

-- Jalankan script ini di Supabase SQL Editor
-- Urutan eksekusi: 1 → 2 → 3 → 4 → 5

-- ===========================================
-- 1. CRITICAL INDEXES - HIGH PRIORITY
-- ===========================================

-- Index untuk lookups saat login (user_id menghubungkan auth.users dengan data employee)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employees_user_id ON employees(user_id);

-- Index untuk role-based queries (sangat sering digunakan)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employees_role ON employees(role);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employees_unitKerjaId ON employees(unitKerjaId);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employees_status ON employees(status);

-- Index untuk attendance queries (tabel terbesar)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_employee_date ON attendance(employee_id, date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_status ON attendance(status);

-- Index untuk payroll queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payroll_employee_period ON payroll(employee_id, period_start, period_end);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payroll_status ON payroll(status);

-- Index untuk requests/approvals
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_requests_employee_status ON requests(employee_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_requests_approver_status ON requests(approver_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_requests_type_status ON requests(type, status);

-- Index untuk master units
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_units_nama ON units(nama);

-- ===========================================
-- 2. COMPOSITE INDEXES - MEDIUM PRIORITY
-- ===========================================

-- Composite indexes untuk queries kompleks
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employees_role_unit ON employees(role, unitKerjaId);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_employee_status ON attendance(employee_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_requests_employee_date ON requests(employee_id, created_at);

-- ===========================================
-- 3. PARTIAL INDEXES - OPTIMIZATION
-- ===========================================

-- Partial indexes untuk data aktif saja
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employees_active ON employees(id) WHERE status = 'active';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_present ON attendance(id) WHERE status = 'present';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_requests_pending ON requests(id) WHERE status = 'pending';

-- ===========================================
-- 4. UNIQUE INDEXES - DATA INTEGRITY
-- ===========================================

-- Unique constraint untuk NIK (jika belum ada)
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_employees_nik_unique ON employees(nik) WHERE nik IS NOT NULL;

-- Unique constraint untuk email (jika belum ada)
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_employees_email_unique ON employees(email) WHERE email IS NOT NULL;

-- ===========================================
-- 5. VERIFICATION QUERIES
-- ===========================================

-- Cek indexes yang berhasil dibuat
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename IN ('employees', 'attendance', 'payroll', 'requests', 'units')
ORDER BY tablename, indexname;

-- Cek ukuran tabel untuk memahami impact
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('employees', 'attendance', 'payroll', 'requests', 'units')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ===========================================
-- 6. PERFORMANCE MONITORING SETUP
-- ===========================================

-- Enable query statistics
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Create view untuk monitoring slow queries
CREATE OR REPLACE VIEW slow_queries AS
SELECT
    query,
    calls,
    total_time,
    mean_time,
    rows,
    shared_blks_hit,
    shared_blks_read,
    temp_blks_read
FROM pg_stat_statements
WHERE mean_time > 100  -- queries > 100ms
ORDER BY mean_time DESC
LIMIT 20;

-- Grant access untuk monitoring
GRANT SELECT ON slow_queries TO authenticated;

-- ===========================================
-- 7. MAINTENANCE QUERIES (RUN PERIODICALLY)
-- ===========================================

-- Vacuum analyze untuk update statistics
-- VACUUM ANALYZE employees, attendance, payroll, requests, units;

-- Reindex jika diperlukan (hati-hati, locking)
-- REINDEX INDEX CONCURRENTLY idx_employees_role;
-- REINDEX INDEX CONCURRENTLY idx_attendance_employee_date;

-- ===========================================
-- NOTES:
-- 1. Gunakan CONCURRENTLY untuk menghindari table locking
-- 2. Monitor impact dengan pg_stat_user_indexes
-- 3. Jika tabel sangat besar, jalankan di low-traffic hours
-- 4. Backup database sebelum menjalankan script ini
-- ===========================================