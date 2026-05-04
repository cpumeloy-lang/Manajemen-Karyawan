-- ============================================================================
-- Migration: Payroll Configuration & Shift Position Group Support
-- Tanggal:   2026-05-04
-- Tujuan:    Menambahkan kolom konfigurasi tarif penggajian agar dapat
--            di-customize per institusi (sebelumnya hardcoded di service).
-- ============================================================================

-- 1. Konfigurasi penggajian di system_settings
ALTER TABLE public.system_settings
    ADD COLUMN IF NOT EXISTS overtime_rate_per_hour  NUMERIC(15, 2) DEFAULT 30000,
    ADD COLUMN IF NOT EXISTS bpjs_kesehatan_rate     NUMERIC(6, 4)  DEFAULT 0.01,
    ADD COLUMN IF NOT EXISTS bpjs_kesehatan_max_wage NUMERIC(15, 2) DEFAULT 12000000;

COMMENT ON COLUMN public.system_settings.overtime_rate_per_hour
    IS 'Tarif lembur per jam dalam Rupiah. Default Rp 30.000/jam';
COMMENT ON COLUMN public.system_settings.bpjs_kesehatan_rate
    IS 'Tarif iuran BPJS Kesehatan (decimal). Default 0.01 = 1%';
COMMENT ON COLUMN public.system_settings.bpjs_kesehatan_max_wage
    IS 'Batas atas upah perhitungan BPJS Kesehatan. Default Rp 12.000.000 sesuai regulasi BPJS';

-- 2. Backfill nilai default untuk row yang sudah ada (tanpa overwrite jika sudah ada nilai)
UPDATE public.system_settings
SET
    overtime_rate_per_hour  = COALESCE(overtime_rate_per_hour,  30000),
    bpjs_kesehatan_rate     = COALESCE(bpjs_kesehatan_rate,     0.01),
    bpjs_kesehatan_max_wage = COALESCE(bpjs_kesehatan_max_wage, 12000000)
WHERE
    overtime_rate_per_hour  IS NULL
    OR bpjs_kesehatan_rate     IS NULL
    OR bpjs_kesehatan_max_wage IS NULL;

-- 3. Catatan: Field positionGroup pada ShiftDefinition disimpan di dalam JSONB
--    pada kolom system_settings.default_shifts dan units.shifts. Tidak perlu
--    perubahan schema karena JSONB sudah fleksibel.
