-- ============================================================
-- Migration: tambahkan kolom mobile (push token + foto profil)
-- ============================================================
-- Foto profil sudah tersedia sebagai kolom `foto` (TEXT) di
-- `database-setup-step1.sql`. Migration ini menambahkan:
--   1. expo_push_token  - token Expo push notification per karyawan
--   2. push_token_updated_at - timestamp update token
--   3. (idempotent) memastikan kolom `foto` ada untuk environment
--      lama yang belum sempat menjalankannya.
-- Aman dijalankan berulang kali (IF NOT EXISTS).
-- ============================================================

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS expo_push_token TEXT,
  ADD COLUMN IF NOT EXISTS push_token_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS foto TEXT;

-- Index untuk lookup token (opsional, untuk batch push)
CREATE INDEX IF NOT EXISTS idx_employees_push_token
  ON public.employees(expo_push_token)
  WHERE expo_push_token IS NOT NULL;

-- Storage bucket untuk avatar (jalankan via Supabase dashboard
-- bila belum ada): nama bucket = 'avatars', public = true.
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('avatars', 'avatars', true)
-- ON CONFLICT (id) DO NOTHING;

COMMENT ON COLUMN public.employees.expo_push_token IS
  'Expo push notification token dari mobile app (registered saat login)';
COMMENT ON COLUMN public.employees.foto IS
  'URL foto profil (Supabase Storage public URL atau path)';
