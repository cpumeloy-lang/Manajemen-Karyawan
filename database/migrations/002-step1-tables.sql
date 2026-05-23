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

-- 3. Tabel untuk device registration (biometric device binding)
CREATE TABLE IF NOT EXISTS public.employee_devices (
    id TEXT DEFAULT gen_random_uuid()::text PRIMARY KEY,
    employee_id TEXT REFERENCES public.employees(id) ON DELETE CASCADE,
    device_id VARCHAR(255) NOT NULL, -- unique device identifier (IMEI, Android ID, atau UUID)
    device_name VARCHAR(255), -- contoh: "Samsung Galaxy A12", "iPhone 13"
    platform VARCHAR(50) CHECK (platform IN ('Android', 'iOS')),
    device_fingerprint VARCHAR(255), -- hash dari hardware identifiers
    face_data JSONB, -- menyimpan face embedding/encoding (dari library seperti face_recognition.js)
    biometric_enabled BOOLEAN DEFAULT TRUE,
    is_primary BOOLEAN DEFAULT FALSE, -- device utama untuk karyawan ini
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) CHECK (status IN ('Active', 'Inactive', 'Blocked')) DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, device_id)
);

-- 4. Tabel untuk presensi
CREATE TABLE IF NOT EXISTS public.attendance (
    id TEXT DEFAULT gen_random_uuid()::text PRIMARY KEY,
    employee_id TEXT REFERENCES public.employees(id) ON DELETE CASCADE,
    device_id TEXT REFERENCES public.employee_devices(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    check_in TIME,
    check_out TIME,
    location VARCHAR(255),
    latitude DECIMAL(9,6),
    longitude DECIMAL(9,6),
    -- Face verification fields
    face_verification_check_in JSONB, -- {confidence: 0.95, verified_at: "2026-04-19T10:30:00Z", image_hash: "..."}
    face_verification_check_out JSONB,
    face_match_score_check_in DECIMAL(3,2), -- 0.00 - 1.00
    face_match_score_check_out DECIMAL(3,2),
    -- Biometric fields
    biometric_type VARCHAR(50) CHECK (biometric_type IN ('face', 'fingerprint', 'iris', 'code', 'totp', 'manual')),
    biometric_verified BOOLEAN DEFAULT FALSE,
    -- General fields
    status VARCHAR(50) CHECK (status IN ('Hadir', 'Terlambat', 'Absen', 'Cuti', 'Sakit', 'Pending', 'Recorded')),
    source VARCHAR(50) CHECK (source IN ('mobile', 'web-ess', 'web-admin')) DEFAULT 'web-admin',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, date)
);

-- 5. Tabel untuk permintaan/request
CREATE TABLE IF NOT EXISTS public.requests (
    id TEXT DEFAULT gen_random_uuid()::text PRIMARY KEY,
    employee_id TEXT REFERENCES public.employees(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('Cuti', 'Izin', 'Overtime', 'Reimburse')),
    start_date DATE,
    end_date DATE,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    approved_by TEXT REFERENCES public.employees(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    amount DECIMAL(15,2), -- untuk reimburse
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Tabel untuk dokumen
CREATE TABLE IF NOT EXISTS public.documents (
    id TEXT DEFAULT gen_random_uuid()::text PRIMARY KEY,
    employee_id TEXT REFERENCES public.employees(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) CHECK (type IN ('Ijazah', 'STR/SIP', 'Sertifikat', 'Lainnya')),
    file_url TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Insert data sample untuk units
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