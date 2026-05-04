-- =============================================
-- HRMS ONLINE DATABASE VERIFICATION
-- Jalankan di Supabase SQL Editor setelah migrasi online
-- =============================================

-- Helper: hitung jumlah baris dengan aman (NULL jika tabel belum ada)
-- Gunakan schema public (bukan pg_temp) agar konsisten di SQL Editor Supabase.
CREATE OR REPLACE FUNCTION public.safe_count(p_table text)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
  v_schema text;
  v_table text;
  v_sql text;
  v_count BIGINT;
BEGIN
  v_schema := split_part(p_table, '.', 1);
  v_table := split_part(p_table, '.', 2);

  IF v_schema = '' OR v_table = '' THEN
    RETURN NULL;
  END IF;

  IF to_regclass(format('%I.%I', v_schema, v_table)) IS NULL THEN
    RETURN NULL;
  END IF;

  v_sql := format('SELECT COUNT(*) FROM %I.%I', v_schema, v_table);
  EXECUTE v_sql INTO v_count;
  RETURN v_count;
EXCEPTION
  WHEN undefined_table THEN
    RETURN NULL;
END;
$$;

-- 1) Cek keberadaan tabel inti
SELECT to_regclass('public.units') AS units;
SELECT to_regclass('public.employees') AS employees;
SELECT to_regclass('public.attendance') AS attendance;
SELECT to_regclass('public.requests') AS requests;
SELECT to_regclass('public.documents') AS documents;
SELECT to_regclass('public.audit_logs') AS audit_logs;

-- 2) Cek jumlah data inti
-- Jika hasil NULL berarti tabel belum dibuat
SELECT public.safe_count('public.units') AS units_count;
SELECT public.safe_count('public.employees') AS employees_count;
SELECT public.safe_count('public.attendance') AS attendance_count;
SELECT public.safe_count('public.requests') AS requests_count;
SELECT public.safe_count('public.documents') AS documents_count;

-- 3) Cek function penting
SELECT proname
FROM pg_proc
WHERE proname IN (
  'current_employee_id',
  'is_admin_user',
  'update_updated_at_column',
  'create_audit_log',
  'handle_new_user',
  'handle_user_update'
)
ORDER BY proname;

-- 4) Cek trigger penting
SELECT event_object_table AS table_name, trigger_name
FROM information_schema.triggers
WHERE trigger_name IN (
  'update_units_updated_at',
  'update_employees_updated_at',
  'update_attendance_updated_at',
  'update_requests_updated_at',
  'audit_employees_trigger',
  'audit_attendance_trigger',
  'audit_requests_trigger',
  'audit_units_trigger',
  'audit_departments_trigger',
  'audit_positions_trigger',
  'on_auth_user_created',
  'on_auth_user_updated'
)
ORDER BY event_object_table, trigger_name;

-- 5) Cek policy RLS
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 6) Smoke test auth-context dependent function (harus dijalankan sebagai authenticated user saat test lewat app)
-- SELECT public.current_employee_id();
-- SELECT public.is_admin_user();
