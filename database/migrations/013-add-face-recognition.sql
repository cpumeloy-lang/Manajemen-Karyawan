-- ============================================================
-- Migration: Face Recognition Enrollment
-- ============================================================
-- Menambahkan kolom untuk menyimpan embedding wajah karyawan
-- (vektor 128/192-dim float dari model FaceNet/MobileFaceNet) yang
-- digunakan sebagai referensi 1:1 matching saat check-in/out.
--
-- Kolom:
--   face_embedding       : Array float JSONB (mis. [0.123, -0.456, ...]).
--   face_embedding_dim   : panjang vektor (128 utk MobileFaceNet, 192/512 lainnya).
--   face_enrolled_at     : kapan enrollment terakhir dilakukan.
--   face_reference_url   : URL foto referensi di Supabase Storage (opsional, untuk audit).
--   face_match_threshold : nilai minimum cosine similarity (0–1) untuk dianggap cocok.
--                          Default 0.65 — bisa di-tune per karyawan oleh admin.
--
-- Aman dijalankan berulang kali.
-- ============================================================

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS face_embedding JSONB,
  ADD COLUMN IF NOT EXISTS face_embedding_dim INTEGER,
  ADD COLUMN IF NOT EXISTS face_enrolled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS face_reference_url TEXT,
  ADD COLUMN IF NOT EXISTS face_match_threshold NUMERIC(4, 3) DEFAULT 0.650;

-- Index untuk lookup karyawan yang sudah enrolled.
CREATE INDEX IF NOT EXISTS idx_employees_face_enrolled
  ON public.employees(face_enrolled_at)
  WHERE face_embedding IS NOT NULL;

-- Storage bucket untuk foto referensi (jalankan via dashboard atau uncomment):
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('face-references', 'face-references', false)
-- ON CONFLICT (id) DO NOTHING;

COMMENT ON COLUMN public.employees.face_embedding IS
  'Vektor embedding wajah (JSON array float) hasil model FaceNet/MobileFaceNet.';
COMMENT ON COLUMN public.employees.face_match_threshold IS
  'Minimum cosine similarity (0–1) untuk dianggap match. Default 0.65.';
COMMENT ON COLUMN public.employees.face_reference_url IS
  'URL foto referensi di Supabase Storage bucket private (untuk audit).';
