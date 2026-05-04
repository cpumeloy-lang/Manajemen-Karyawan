-- STEP 4: Perkuat integritas data absensi dengan audit tambahan dan status check
-- Jalankan script ini setelah tabel attendance sudah dibuat.

ALTER TABLE public.attendance
    ADD COLUMN IF NOT EXISTS latitude DECIMAL(9,6),
    ADD COLUMN IF NOT EXISTS longitude DECIMAL(9,6),
    ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'web-admin',
    ADD COLUMN IF NOT EXISTS notes TEXT;

-- Update daftar status yang diizinkan untuk mendukung status sementara / rekaman.
ALTER TABLE public.attendance
    DROP CONSTRAINT IF EXISTS attendance_status_check;

ALTER TABLE public.attendance
    ADD CONSTRAINT attendance_status_check CHECK (
        status IN ('Hadir', 'Terlambat', 'Absen', 'Cuti', 'Sakit', 'Pending', 'Recorded')
    );

-- Tambahkan pembatasan sumber catatan absensi untuk audit.
ALTER TABLE public.attendance
    DROP CONSTRAINT IF EXISTS attendance_source_check;

ALTER TABLE public.attendance
    ADD CONSTRAINT attendance_source_check CHECK (
        source IN ('mobile', 'web-ess', 'web-admin')
    );

-- Gunakan nilai default untuk sumber jika tidak ditentukan.
UPDATE public.attendance
SET source = COALESCE(source, 'web-admin')
WHERE source IS NULL;
