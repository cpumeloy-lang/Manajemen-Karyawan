-- ============================================================
-- HRMS Mobile — PRODUCTION MIGRATIONS BUNDLE
-- ============================================================
-- File ini menggabungkan SEMUA migration yang dibutuhkan agar
-- aplikasi mobile-absensi dapat berjalan penuh di production.
--
-- CARA PAKAI:
--   1. Buka Supabase SQL Editor.
--   2. New query → paste seluruh isi file ini.
--   3. Run.
--   4. Verifikasi via section "VERIFICATION" di akhir file.
--
-- AMAN dijalankan berulang kali (semua statement idempotent).
-- ============================================================
-- Komponen yang di-apply:
--   1. Mobile fields    → expo_push_token, foto, push_token_updated_at
--   2. Face recognition → face_embedding, face_match_threshold, dll
--   3. RLS recursion fix → security definer functions + safe policies
--   4. Storage buckets   → avatars (public), face-references (private),
--                          documents (private) + storage RLS policies
--   5. App config table  → force-update, maintenance mode, feature flags
-- ============================================================


-- ============================================================
-- [1/4] MOBILE FIELDS
-- ============================================================
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS expo_push_token       TEXT,
  ADD COLUMN IF NOT EXISTS push_token_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS foto                  TEXT;

CREATE INDEX IF NOT EXISTS idx_employees_push_token
  ON public.employees(expo_push_token)
  WHERE expo_push_token IS NOT NULL;

COMMENT ON COLUMN public.employees.expo_push_token IS
  'Expo push notification token dari mobile app (registered saat login).';
COMMENT ON COLUMN public.employees.foto IS
  'URL foto profil (Supabase Storage public URL atau path).';


-- ============================================================
-- [2/4] FACE RECOGNITION
-- ============================================================
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS face_embedding       JSONB,
  ADD COLUMN IF NOT EXISTS face_embedding_dim   INTEGER,
  ADD COLUMN IF NOT EXISTS face_enrolled_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS face_reference_url   TEXT,
  ADD COLUMN IF NOT EXISTS face_match_threshold NUMERIC(4, 3) DEFAULT 0.650;

CREATE INDEX IF NOT EXISTS idx_employees_face_enrolled
  ON public.employees(face_enrolled_at)
  WHERE face_embedding IS NOT NULL;

COMMENT ON COLUMN public.employees.face_embedding IS
  'Vektor embedding wajah (JSON array float) hasil MobileFaceNet.';
COMMENT ON COLUMN public.employees.face_match_threshold IS
  'Minimum cosine similarity (0-1) untuk dianggap match. Default 0.65.';
COMMENT ON COLUMN public.employees.face_reference_url IS
  'URL foto referensi di Supabase Storage bucket private (untuk audit).';


-- ============================================================
-- [3/4] RLS RECURSION FIX (employees policies)
-- ============================================================
-- 3.1 Helper functions DENGAN SECURITY DEFINER (bypass RLS internal).
CREATE OR REPLACE FUNCTION public.current_employee_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT e.id::text
    FROM public.employees e
    WHERE e.user_id = auth.uid()
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.employees e
        WHERE e.user_id = auth.uid() AND e.role = 'admin'
    );
$$;

GRANT EXECUTE ON FUNCTION public.current_employee_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_user()        TO authenticated;

-- 3.2 Drop SEMUA policy lama agar tidak konflik recursion.
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'employees'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.employees', pol.policyname);
    END LOOP;
END$$;

-- 3.3 Policy aman (tanpa rekursi).
CREATE POLICY "employees_select_authenticated"
    ON public.employees FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "employees_insert_self_only"
    ON public.employees FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "employees_update_self"
    ON public.employees FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- DELETE tidak diperbolehkan dari client (handled via service-role).

COMMENT ON POLICY "employees_select_authenticated" ON public.employees IS
  'Semua user terotentikasi boleh SELECT (anti-recursion).';
COMMENT ON POLICY "employees_update_self" ON public.employees IS
  'User hanya boleh UPDATE barisnya sendiri via auth.uid().';


-- ============================================================
-- [4/4] STORAGE BUCKETS
-- ============================================================
-- avatars (public) — untuk foto profil
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- face-references (PRIVATE) — foto referensi wajah karyawan
INSERT INTO storage.buckets (id, name, public)
VALUES ('face-references', 'face-references', false)
ON CONFLICT (id) DO NOTHING;

-- documents (PRIVATE) — dokumen pendukung izin (mis. surat dokter)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies — drop yang lama, recreate yang aman.
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN
        SELECT policyname, tablename FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND policyname LIKE 'mobile_%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
    END LOOP;
END$$;

-- avatars: authenticated boleh upload/update/delete file di folder
-- berisi user_id mereka sendiri; semua orang boleh read (public).
CREATE POLICY "mobile_avatars_select"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

CREATE POLICY "mobile_avatars_insert"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "mobile_avatars_update"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "mobile_avatars_delete"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- face-references: hanya owner & admin (admin akses via service-role).
CREATE POLICY "mobile_face_select_own"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'face-references'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "mobile_face_insert_own"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'face-references'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "mobile_face_update_own"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'face-references'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "mobile_face_delete_own"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'face-references'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- documents: owner only (read & write).
CREATE POLICY "mobile_documents_select_own"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'documents'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "mobile_documents_insert_own"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'documents'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );


-- ============================================================
-- [5/5] APP CONFIG (force-update & maintenance mode)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.app_config (
    key        TEXT PRIMARY KEY,
    value      JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Read-only untuk semua authenticated user (mobile app membaca config).
DROP POLICY IF EXISTS "app_config_read_all" ON public.app_config;
CREATE POLICY "app_config_read_all"
    ON public.app_config FOR SELECT
    TO authenticated
    USING (true);

-- Write hanya via service-role (admin web panel / SQL editor).

-- Seed default values (aman di-rerun).
INSERT INTO public.app_config (key, value) VALUES
    ('min_version_code',     '1'::jsonb),
    ('latest_version_code',  '1'::jsonb),
    ('update_url',           '""'::jsonb),
    ('update_message',       '""'::jsonb),
    ('maintenance_mode',     'false'::jsonb),
    ('maintenance_message',  '""'::jsonb),
    ('features',             '{}'::jsonb)
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE public.app_config IS
  'Konfigurasi runtime mobile app: force-update versi minimum, maintenance mode, feature flags.';


-- ============================================================
-- VERIFICATION (jalankan SELECT-SELECT ini setelah migration)
-- ============================================================
-- 1. Cek semua kolom mobile sudah ada
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'employees'
--   AND column_name IN (
--     'expo_push_token','push_token_updated_at','foto',
--     'face_embedding','face_embedding_dim','face_enrolled_at',
--     'face_reference_url','face_match_threshold')
-- ORDER BY column_name;

-- 2. Cek RLS policy employees (harus ada 3: select_authenticated,
--    insert_self_only, update_self)
-- SELECT policyname, cmd FROM pg_policies
-- WHERE schemaname='public' AND tablename='employees';

-- 3. Cek storage bucket
-- SELECT id, name, public FROM storage.buckets
-- WHERE id IN ('avatars','face-references','documents');

-- 4. Cek storage policies (harus ada 9 mobile_*)
-- SELECT policyname, cmd FROM pg_policies
-- WHERE schemaname='storage' AND tablename='objects' AND policyname LIKE 'mobile_%';


-- ============================================================
-- DONE — versi 1.0 (Mei 2026)
-- ============================================================
