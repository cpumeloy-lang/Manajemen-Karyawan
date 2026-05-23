-- ============================================================================
-- RLS POLICY AUDIT SCRIPT
-- Run this in Supabase SQL Editor to verify all RLS policies.
-- ============================================================================

-- 1. List all tables with RLS enabled/disabled
SELECT
  schemaname AS schema,
  tablename AS table_name,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. List all existing RLS policies
SELECT
  schemaname AS schema,
  tablename AS table_name,
  policyname AS policy_name,
  permissive,
  roles,
  cmd AS operation,
  qual AS using_expression,
  with_check AS check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. Verify critical tables have RLS enabled
-- Expected: ALL tables should have rowsecurity = true
SELECT
  tablename,
  rowsecurity,
  CASE WHEN rowsecurity = true THEN '✅ OK' ELSE '❌ MISSING RLS' END AS status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'employees', 'units', 'departments', 'positions',
    'attendance', 'documents', 'audit_logs',
    'attendance_change_requests', 'attendance_revision_history',
    'employee_schedules', 'rotation_patterns', 'schedule_publish_logs',
    'system_settings'
  )
ORDER BY tablename;

-- 4. Recommended RLS policies (run if missing)
-- ============================================================================

-- Employees: users can read their own profile; admin/HRD can manage all
-- Policy: employees_select_own
--   USING: auth.uid() = user_id OR role IN ('admin', 'hrd')
-- Policy: employees_insert_admin_hrd
--   WITH CHECK: role IN ('admin', 'hrd')
-- Policy: employees_update_admin_hrd
--   USING: role IN ('admin', 'hrd')
-- Policy: employees_delete_admin
--   USING: role = 'admin'

-- Units/Departments/Positions: all authenticated can read; admin only can modify
-- Policy: units_select_all
--   USING: true
-- Policy: units_modify_admin
--   USING: role = 'admin'

-- Attendance: users can read their own; admin/HRD/kepala_ruangan can read unit
-- Policy: attendance_select_own
--   USING: employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
--          OR role IN ('admin', 'hrd', 'kepala_ruangan')

-- Documents: users can read own documents; admin/HRD can read all
-- Policy: documents_select_own
--   USING: employeeId IN (SELECT id FROM employees WHERE user_id = auth.uid())
--          OR role IN ('admin', 'hrd')

-- Audit Logs: admin only
-- Policy: audit_logs_admin_only
--   USING: role = 'admin'

-- System Settings: admin only
-- Policy: system_settings_admin_only
--   USING: role = 'admin'

-- ============================================================================
-- 5. Quick check: test RLS as anonymous (should return 0 rows for most tables)
-- ============================================================================
-- Run these as anon user to verify RLS is working:
-- SELECT count(*) FROM employees;  -- should be 0 or limited
-- SELECT count(*) FROM audit_logs; -- should be 0
-- SELECT count(*) FROM system_settings; -- should be 0
