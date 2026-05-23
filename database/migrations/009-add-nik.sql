-- Menambahkan kolom NIK (Nomor Induk Karyawan) ke tabel employees
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS nik TEXT UNIQUE;

-- Membuat index untuk performa pencarian by NIK
CREATE INDEX IF NOT EXISTS idx_employees_nik ON public.employees(nik);

-- Menambahkan comment untuk dokumentasi
COMMENT ON COLUMN public.employees.nik IS 'Nomor Induk Karyawan (untuk ID card dan keperluan HR). Format: TAHUN-DEPT-URUTAN (contoh: 2024-MED-001)';

-- Update RLS policies untuk NIK (sudah tercover di policy existing, tidak perlu policy baru)
