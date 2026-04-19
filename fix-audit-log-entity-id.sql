-- =============================================
-- FIX AUDIT LOG ENTITY_ID TYPE MISMATCH
-- Mengubah entity_id dari UUID ke TEXT
-- agar kompatibel dengan tabel yang menggunakan TEXT sebagai ID
-- =============================================

-- 1. Ubah tipe kolom entity_id dari UUID ke TEXT
ALTER TABLE public.audit_logs 
    ALTER COLUMN entity_id TYPE TEXT USING entity_id::TEXT;

-- 2. Recreate index (otomatis terhapus saat alter column)
DROP INDEX IF EXISTS public.idx_audit_logs_entity_id;
CREATE INDEX idx_audit_logs_entity_id ON public.audit_logs(entity_id);

-- 3. Update comment untuk dokumentasi
COMMENT ON COLUMN public.audit_logs.entity_id IS 'ID dari entitas yang diubah (TEXT untuk kompatibilitas dengan semua tabel)';

-- Selesai!
-- Sekarang audit log bisa menerima ID dari tabel employees, requests, dll yang menggunakan TEXT sebagai ID
