-- Script untuk membuat tabel-tabel yang diperlukan di Supabase
-- Jalankan script ini di SQL Editor Supabase

-- 1. Tabel untuk unit kerja/departemen
CREATE TABLE IF NOT EXISTS public.units (
    id TEXT DEFAULT gen_random_uuid()::text PRIMARY KEY,
    nama VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabel untuk karyawan
CREATE TABLE IF NOT EXISTS public.employees (
    id TEXT DEFAULT gen_random_uuid()::text PRIMARY KEY,
    "user_id" UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nama VARCHAR(255) NOT NULL,
    foto TEXT,
    jabatan VARCHAR(255),
    departemen VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    telepon VARCHAR(50),
    "hireDate" DATE,
    "birthDate" DATE,
    status VARCHAR(50) DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Cuti', 'Non-Aktif')),
    shift VARCHAR(50) CHECK (shift IN ('Pagi', 'Siang', 'Malam')),
    "sisaCuti" INTEGER DEFAULT 12,
    role VARCHAR(50) DEFAULT 'karyawan' CHECK (role IN ('admin', 'karyawan')),
    spesialisasi TEXT,
    kredensial TEXT,
    "nomorSTR" VARCHAR(100),
    "tanggalKadaluarsaSTR" DATE,
    "gajiPokok" DECIMAL(15,2),
    "tunjanganProfesi" DECIMAL(15,2),
    "unitKerjaId" TEXT REFERENCES public.units(id),
    sertifikasi TEXT[], -- array untuk multiple sertifikasi
    kompetensi TEXT[], -- array untuk multiple kompetensi
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabel untuk presensi
CREATE TABLE IF NOT EXISTS public.attendance (
    id TEXT DEFAULT gen_random_uuid()::text PRIMARY KEY,
    "employeeId" TEXT REFERENCES public.employees(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL, -- menggunakan nama field yang sama dengan types.ts
    "clockIn" TIME, -- menggunakan nama field yang sama dengan types.ts
    "clockOut" TIME, -- menggunakan nama field yang sama dengan types.ts
    location VARCHAR(255),
    latitude DECIMAL(9,6),
    longitude DECIMAL(9,6),
    "isLate" BOOLEAN DEFAULT FALSE,
    "overtimeHours" DECIMAL(4,2) DEFAULT 0,
    status VARCHAR(50) CHECK (status IN ('Hadir', 'Terlambat', 'Absen', 'Cuti', 'Sakit', 'Pending', 'Recorded')),
    source VARCHAR(50) CHECK (source IN ('mobile', 'web-ess', 'web-admin')) DEFAULT 'web-admin',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE("employeeId", tanggal)
);

-- 4. Tabel untuk permintaan/request
CREATE TABLE IF NOT EXISTS public.requests (
    id TEXT DEFAULT gen_random_uuid()::text PRIMARY KEY,
    "employeeId" TEXT REFERENCES public.employees(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('Cuti', 'Izin', 'Overtime', 'Reimburse')),
    "startDate" DATE,
    "endDate" DATE,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    "approvedBy" TEXT REFERENCES public.employees(id),
    "approvedAt" TIMESTAMP WITH TIME ZONE,
    amount DECIMAL(15,2), -- untuk reimburse
    "requestedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabel untuk dokumen
CREATE TABLE IF NOT EXISTS public.documents (
    id TEXT DEFAULT gen_random_uuid()::text PRIMARY KEY,
    "employeeId" TEXT REFERENCES public.employees(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) CHECK (type IN ('Ijazah', 'STR/SIP', 'Sertifikat', 'Lainnya')),
    "fileUrl" TEXT,
    "uploadedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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

-- 7. Insert data sample admin user (sesuaikan dengan user_id dari auth.users)
-- Catatan: Ganti user_id dengan ID user yang sudah terdaftar di auth.users
-- INSERT INTO public.employees ("user_id", nama, email, role, jabatan, departemen) VALUES 
--     ('your-user-id-here', 'Admin HRMS', 'admin@hospital.com', 'admin', 'Manager HR', 'HR');

-- 8. Enable Row Level Security (RLS)
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Helper functions agar pengecekan role tidak memicu recursion di RLS
CREATE OR REPLACE FUNCTION public.current_employee_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT e.id
    FROM public.employees e
    WHERE e."user_id" = auth.uid()
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.employees e
        WHERE e."user_id" = auth.uid() AND e.role = 'admin'
    );
$$;

GRANT EXECUTE ON FUNCTION public.current_employee_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;

-- 9. RLS Policies untuk units (dapat diakses semua user yang sudah login)
DROP POLICY IF EXISTS "Units dapat dibaca oleh user yang login" ON public.units;
CREATE POLICY "Units dapat dibaca oleh user yang login" 
    ON public.units FOR SELECT 
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Units dapat diubah oleh admin" ON public.units;
CREATE POLICY "Units dapat diubah oleh admin" 
    ON public.units FOR ALL
    USING (public.is_admin_user())
    WITH CHECK (public.is_admin_user());

-- 10. RLS Policies untuk employees
DROP POLICY IF EXISTS "Employees dapat dibaca oleh user yang login" ON public.employees;
CREATE POLICY "Employees dapat dibaca oleh user yang login" 
    ON public.employees FOR SELECT 
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Employees dapat diubah oleh admin atau diri sendiri" ON public.employees;
CREATE POLICY "Employees dapat diubah oleh admin atau diri sendiri"
    ON public.employees FOR UPDATE
    USING (public.is_admin_user() OR "user_id" = auth.uid())
    WITH CHECK (public.is_admin_user() OR "user_id" = auth.uid());

DROP POLICY IF EXISTS "Employees dapat dibuat oleh admin" ON public.employees;
CREATE POLICY "Employees dapat dibuat oleh admin"
    ON public.employees FOR INSERT
    WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "Employees dapat dihapus oleh admin" ON public.employees;
CREATE POLICY "Employees dapat dihapus oleh admin"
    ON public.employees FOR DELETE
    USING (public.is_admin_user());

-- 11. RLS Policies untuk attendance
DROP POLICY IF EXISTS "Attendance dapat dibaca oleh admin atau karyawan sendiri" ON public.attendance;
CREATE POLICY "Attendance dapat dibaca oleh admin atau karyawan sendiri" 
    ON public.attendance FOR SELECT 
    USING (public.is_admin_user() OR "employeeId" = public.current_employee_id());

DROP POLICY IF EXISTS "Attendance dapat diinput oleh admin atau karyawan sendiri" ON public.attendance;
CREATE POLICY "Attendance dapat diinput oleh admin atau karyawan sendiri" 
    ON public.attendance FOR INSERT 
    WITH CHECK (public.is_admin_user() OR "employeeId" = public.current_employee_id());

DROP POLICY IF EXISTS "Attendance dapat diubah oleh admin atau karyawan sendiri" ON public.attendance;
CREATE POLICY "Attendance dapat diubah oleh admin atau karyawan sendiri"
    ON public.attendance FOR UPDATE
    USING (public.is_admin_user() OR "employeeId" = public.current_employee_id())
    WITH CHECK (public.is_admin_user() OR "employeeId" = public.current_employee_id());

-- 12. RLS Policies untuk requests
DROP POLICY IF EXISTS "Requests dapat dibaca oleh admin atau karyawan sendiri" ON public.requests;
CREATE POLICY "Requests dapat dibaca oleh admin atau karyawan sendiri" 
    ON public.requests FOR SELECT 
    USING (public.is_admin_user() OR "employeeId" = public.current_employee_id());

DROP POLICY IF EXISTS "Requests dapat dibuat oleh karyawan sendiri" ON public.requests;
CREATE POLICY "Requests dapat dibuat oleh karyawan sendiri" 
    ON public.requests FOR INSERT 
    WITH CHECK ("employeeId" = public.current_employee_id());

DROP POLICY IF EXISTS "Requests dapat diupdate oleh admin" ON public.requests;
CREATE POLICY "Requests dapat diupdate oleh admin" 
    ON public.requests FOR UPDATE 
    USING (public.is_admin_user())
    WITH CHECK (public.is_admin_user());

-- 13. RLS Policies untuk documents
DROP POLICY IF EXISTS "Documents dapat dibaca oleh admin atau karyawan sendiri" ON public.documents;
CREATE POLICY "Documents dapat dibaca oleh admin atau karyawan sendiri" 
    ON public.documents FOR SELECT 
    USING (public.is_admin_user() OR "employeeId" = public.current_employee_id());

DROP POLICY IF EXISTS "Documents dapat diupload oleh admin atau karyawan sendiri" ON public.documents;
CREATE POLICY "Documents dapat diupload oleh admin atau karyawan sendiri" 
    ON public.documents FOR INSERT 
    WITH CHECK (public.is_admin_user() OR "employeeId" = public.current_employee_id());

-- 14. Fungsi untuk update timestamp otomatis
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 15. Trigger untuk auto-update updated_at
DROP TRIGGER IF EXISTS update_units_updated_at ON public.units;
CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON public.units 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_employees_updated_at ON public.employees;
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_attendance_updated_at ON public.attendance;
CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON public.attendance 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_requests_updated_at ON public.requests;
CREATE TRIGGER update_requests_updated_at BEFORE UPDATE ON public.requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();