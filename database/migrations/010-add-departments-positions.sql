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
