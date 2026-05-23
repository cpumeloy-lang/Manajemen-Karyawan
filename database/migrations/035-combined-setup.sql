-- ============================================
-- COMBINED DATABASE SETUP SCRIPT
-- Run this in Supabase SQL Editor
-- ============================================

-- Membuat tabel departments (Departemen)
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nama TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Membuat tabel positions (Jabatan)
CREATE TABLE IF NOT EXISTS public.positions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nama TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

-- Policy untuk departments - admin dapat melakukan semua operasi
DROP POLICY IF EXISTS "Admin dapat melakukan semua operasi pada departments" ON public.departments;
CREATE POLICY "Admin dapat melakukan semua operasi pada departments"
ON public.departments
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.employees
        WHERE employees.user_id = auth.uid()
        AND employees.role = 'admin'
    )
);

-- Policy untuk positions - admin dapat melakukan semua operasi
DROP POLICY IF EXISTS "Admin dapat melakukan semua operasi pada positions" ON public.positions;
CREATE POLICY "Admin dapat melakukan semua operasi pada positions"
ON public.positions
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.employees
        WHERE employees.user_id = auth.uid()
        AND employees.role = 'admin'
    )
);

-- Policy untuk departments - semua pengguna dapat membaca
DROP POLICY IF EXISTS "Semua pengguna dapat membaca departments" ON public.departments;
CREATE POLICY "Semua pengguna dapat membaca departments"
ON public.departments
FOR SELECT
USING (true);

-- Policy untuk positions - semua pengguna dapat membaca
DROP POLICY IF EXISTS "Semua pengguna dapat membaca positions" ON public.positions;
CREATE POLICY "Semua pengguna dapat membaca positions"
ON public.positions
FOR SELECT
USING (true);

-- Insert data default untuk departments
INSERT INTO public.departments (nama) VALUES
    ('Departemen Medis'),
    ('Departemen Keperawatan'),
    ('Departemen Penunjang Medis'),
    ('Departemen Administrasi'),
    ('Departemen Keuangan'),
    ('Departemen SDM')
ON CONFLICT (nama) DO NOTHING;

-- Insert data default untuk positions
INSERT INTO public.positions (nama) VALUES
    ('Dokter Umum'),
    ('Dokter Spesialis'),
    ('Perawat'),
    ('Bidan'),
    ('Apoteker'),
    ('Analis Laboratorium'),
    ('Radiografer'),
    ('Tenaga Administrasi'),
    ('Staf Keuangan'),
    ('Manajer'),
    ('Direktur')
ON CONFLICT (nama) DO NOTHING;

-- Menambahkan comment untuk dokumentasi
COMMENT ON TABLE public.departments IS 'Tabel untuk menyimpan data departemen di rumah sakit';
COMMENT ON TABLE public.positions IS 'Tabel untuk menyimpan data jabatan di rumah sakit';

-- ============================================
-- SYSTEM SETTINGS TABLE
-- ============================================

-- Membuat tabel system_settings untuk pengaturan sistem
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_name TEXT NOT NULL DEFAULT 'HRMS Pro',
    institution_type TEXT NOT NULL DEFAULT 'Rumah Sakit' CHECK (institution_type IN ('Rumah Sakit', 'Klinik', 'Puskesmas')),
    logo_url TEXT,
    address TEXT,
    phone TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Policy untuk system_settings - admin dapat melakukan semua operasi
DROP POLICY IF EXISTS "Admin dapat melakukan semua operasi pada system_settings" ON public.system_settings;
CREATE POLICY "Admin dapat melakukan semua operasi pada system_settings"
ON public.system_settings
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.employees
        WHERE employees.user_id = auth.uid()
        AND employees.role = 'admin'
    )
);

-- Policy untuk system_settings - semua pengguna dapat membaca
DROP POLICY IF EXISTS "Semua pengguna dapat membaca system_settings" ON public.system_settings;
CREATE POLICY "Semua pengguna dapat membaca system_settings"
ON public.system_settings
FOR SELECT
USING (true);

-- Insert data default untuk system_settings (hanya satu baris)
INSERT INTO public.system_settings (institution_name, institution_type, address, phone)
VALUES ('HRMS Pro', 'Rumah Sakit', '', '')
ON CONFLICT DO NOTHING;

-- Membuat fungsi untuk update timestamp otomatis
CREATE OR REPLACE FUNCTION update_system_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Membuat trigger untuk update timestamp
DROP TRIGGER IF EXISTS set_system_settings_timestamp ON public.system_settings;
CREATE TRIGGER set_system_settings_timestamp
BEFORE UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION update_system_settings_timestamp();

-- Menambahkan comment untuk dokumentasi
COMMENT ON TABLE public.system_settings IS 'Tabel untuk menyimpan pengaturan sistem seperti nama institusi, jenis, alamat, dan telepon';
COMMENT ON COLUMN public.system_settings.institution_name IS 'Nama institusi (rumah sakit/klinik)';
COMMENT ON COLUMN public.system_settings.institution_type IS 'Jenis institusi: Rumah Sakit, Klinik, atau Puskesmas';
COMMENT ON COLUMN public.system_settings.logo_url IS 'URL logo institusi (opsional)';
COMMENT ON COLUMN public.system_settings.address IS 'Alamat lengkap institusi';
COMMENT ON COLUMN public.system_settings.phone IS 'Nomor telepon institusi';

-- ============================================
-- END OF SCRIPT
-- ============================================