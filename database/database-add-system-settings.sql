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
