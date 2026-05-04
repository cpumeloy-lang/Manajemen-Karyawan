-- Migration: Tambah kolom photo_url ke tabel attendance
-- Jalankan di Supabase SQL Editor sebelum menggunakan fitur upload foto absensi.

ALTER TABLE IF EXISTS public.attendance
    ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- (Opsional) Buat storage bucket untuk foto absensi
-- Jalankan di Supabase Dashboard → Storage → New Bucket
-- Nama bucket : attendance-photos
-- Public      : Yes (agar bisa diakses via URL publik)
-- File size   : 5MB max
-- Allowed MIME: image/jpeg, image/png

-- Atau via SQL:
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'attendance-photos',
  'attendance-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policy: karyawan hanya bisa upload ke folder sendiri
CREATE POLICY "Employees can upload own attendance photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'attendance-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS policy: semua authenticated user bisa lihat foto (untuk admin/HRD review)
CREATE POLICY "Authenticated users can view attendance photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'attendance-photos');
