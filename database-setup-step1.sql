-- STEP 1: Buat Tabel-tabel Utama
-- Jalankan script ini terlebih dahulu

-- 1. Tabel untuk unit kerja/departemen
CREATE TABLE IF NOT EXISTS public.units (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nama VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabel untuk karyawan
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nama VARCHAR(255) NOT NULL,
    foto TEXT,
    jabatan VARCHAR(255),
    departemen VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    telepon VARCHAR(50),
    hire_date DATE,
    birth_date DATE,
    status VARCHAR(50) DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Cuti', 'Non-Aktif')),
    shift VARCHAR(50) CHECK (shift IN ('Pagi', 'Siang', 'Malam')),
    sisa_cuti INTEGER DEFAULT 12,
    role VARCHAR(50) DEFAULT 'karyawan' CHECK (role IN ('admin', 'karyawan')),
    spesialisasi TEXT,
    kredensial TEXT,
    nomor_str VARCHAR(100),
    tanggal_kadaluarsa_str DATE,
    gaji_pokok DECIMAL(15,2),
    tunjangan_profesi DECIMAL(15,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabel untuk presensi
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in TIME,
    check_out TIME,
    status VARCHAR(50) CHECK (status IN ('Hadir', 'Terlambat', 'Absen', 'Cuti', 'Sakit')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, date)
);

-- 4. Tabel untuk permintaan/request
CREATE TABLE IF NOT EXISTS public.requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('Cuti', 'Izin', 'Overtime', 'Reimburse')),
    start_date DATE,
    end_date DATE,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    approved_by UUID REFERENCES public.employees(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    amount DECIMAL(15,2), -- untuk reimburse
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabel untuk dokumen
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) CHECK (type IN ('Ijazah', 'STR/SIP', 'Sertifikat', 'Lainnya')),
    file_url TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Insert data sample untuk units
INSERT INTO public.units (nama) VALUES 
    ('Rawat Inap'),
    ('Rawat Jalan'),
    ('IGD'),
    ('ICU'),
    ('Radiologi'),
    ('Laboratorium'),
    ('Farmasi'),
    ('Administrasi'),
    ('Keuangan'),
    ('HR')
ON CONFLICT DO NOTHING;