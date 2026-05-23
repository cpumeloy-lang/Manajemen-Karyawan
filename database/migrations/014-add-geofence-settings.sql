-- ============================================================================
-- Migration: Tambah kolom geofence ke system_settings
-- Tujuan   : Dukung validasi lokasi absensi (client-side & server-side) agar
--            karyawan hanya bisa check-in/check-out dari sekitar area RS.
-- Safety   : Idempotent. Aman dijalankan berkali-kali.
-- ============================================================================

ALTER TABLE public.system_settings
    ADD COLUMN IF NOT EXISTS latitude         DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS longitude        DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS geofence_radius_meters INTEGER DEFAULT 500
        CHECK (geofence_radius_meters IS NULL OR geofence_radius_meters >= 50),
    ADD COLUMN IF NOT EXISTS geofence_enabled BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.system_settings.latitude  IS 'Titik pusat geofence RS (WGS84).';
COMMENT ON COLUMN public.system_settings.longitude IS 'Titik pusat geofence RS (WGS84).';
COMMENT ON COLUMN public.system_settings.geofence_radius_meters IS 'Radius toleransi dari titik pusat dalam meter. Minimum 50m agar tidak mengganggu GPS noise normal.';
COMMENT ON COLUMN public.system_settings.geofence_enabled IS 'Jika TRUE, aplikasi mobile akan memperingatkan/menolak check-in di luar radius.';
