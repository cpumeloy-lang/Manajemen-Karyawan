-- ============================================================
-- CLOUD MIGRATION PATCH
-- Jalankan script ini di Supabase Cloud SQL Editor
-- URL: https://supabase.com/dashboard/project/gwfymzfrxsvtmtdhryft/sql
-- ============================================================

-- 1. Tambah kolom-kolom yang ada di lokal tapi belum ada di cloud
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS nik TEXT,
  ADD COLUMN IF NOT EXISTS ktp_number VARCHAR(20),
  ADD COLUMN IF NOT EXISTS npwp VARCHAR(20),
  ADD COLUMN IF NOT EXISTS bpjs_kesehatan VARCHAR(20),
  ADD COLUMN IF NOT EXISTS bpjs_ketenagakerjaan VARCHAR(20),
  ADD COLUMN IF NOT EXISTS marital_status VARCHAR(20),
  ADD COLUMN IF NOT EXISTS dependents INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS address JSONB,
  ADD COLUMN IF NOT EXISTS emergency_contacts JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS education JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS work_history JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS bank_account JSONB,
  ADD COLUMN IF NOT EXISTS is_profile_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verified_by TEXT,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS managed_unit_id TEXT;

-- 2. Tambah constraint marital_status jika belum ada
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'employees_marital_status_check'
    AND conrelid = 'public.employees'::regclass
  ) THEN
    ALTER TABLE public.employees
      ADD CONSTRAINT employees_marital_status_check
      CHECK (marital_status IS NULL OR marital_status IN ('Single', 'Married', 'Divorced', 'Widowed'));
  END IF;
END $$;

-- 3. Unique index untuk NIK (jika belum ada)
CREATE UNIQUE INDEX IF NOT EXISTS employees_nik_key ON public.employees(nik) WHERE nik IS NOT NULL AND nik <> '';

-- 4. GIN indexes untuk kolom JSONB (performa query)
CREATE INDEX IF NOT EXISTS idx_employees_address ON public.employees USING GIN (address);
CREATE INDEX IF NOT EXISTS idx_employees_emergency_contacts ON public.employees USING GIN (emergency_contacts);
CREATE INDEX IF NOT EXISTS idx_employees_work_history ON public.employees USING GIN (work_history);
CREATE INDEX IF NOT EXISTS idx_employees_bank_account ON public.employees USING GIN (bank_account);
CREATE INDEX IF NOT EXISTS idx_employees_education ON public.employees USING GIN (education);
CREATE INDEX IF NOT EXISTS idx_employees_ktp_number ON public.employees(ktp_number);
CREATE INDEX IF NOT EXISTS idx_employees_bpjs_kesehatan ON public.employees(bpjs_kesehatan);
CREATE INDEX IF NOT EXISTS idx_employees_bpjs_ketenagakerjaan ON public.employees(bpjs_ketenagakerjaan);

-- 5. Perbaiki fungsi is_admin_user() agar mengenali role 'hr' dan 'hrd'
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

-- 6. Pastikan tabel audit_logs ada (untuk auditLogService.ts)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT DEFAULT gen_random_uuid()::text PRIMARY KEY,
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  action VARCHAR(20) NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
  portal_type VARCHAR(20) DEFAULT 'operational' NOT NULL
    CHECK (portal_type IN ('personal', 'operational', 'unknown')),
  entity_type TEXT,
  entity_id TEXT,
  entity_name TEXT,
  old_data JSONB,
  new_data JSONB,
  changes JSONB,
  description TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Index audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_email ON public.audit_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON public.audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- RLS audit_logs
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

-- 7. Verifikasi hasil migrasi
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'employees'
  AND column_name IN (
    'nik', 'ktp_number', 'is_verified', 'is_locked',
    'is_profile_completed', 'marital_status', 'bank_account',
    'emergency_contacts', 'managed_unit_id'
  )
ORDER BY column_name;
