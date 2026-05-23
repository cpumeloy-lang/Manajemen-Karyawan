-- ============================================
-- QUICK FIX: Tambah Kolom Baru ke Table Employees
-- ============================================
-- Jalankan script ini di Supabase SQL Editor
-- ============================================

-- 1. Personal & Contact Information
ALTER TABLE employees ADD COLUMN IF NOT EXISTS ktp_number VARCHAR(20);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS npwp VARCHAR(20);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bpjs_kesehatan VARCHAR(20);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bpjs_ketenagakerjaan VARCHAR(20);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS marital_status VARCHAR(20) CHECK (marital_status IN ('Single', 'Married', 'Divorced', 'Widowed'));
ALTER TABLE employees ADD COLUMN IF NOT EXISTS dependents INTEGER DEFAULT 0;

-- 1B. Role & Unit Management
ALTER TABLE employees ADD COLUMN IF NOT EXISTS role VARCHAR(20) CHECK (role IN ('admin', 'hrd', 'kepala_ruangan', 'karyawan')) DEFAULT 'karyawan';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS managed_unit_id TEXT REFERENCES units(id);

-- 2. Complex Data (JSONB)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS address JSONB;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_contacts JSONB DEFAULT '[]';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS education JSONB DEFAULT '[]';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS work_history JSONB DEFAULT '[]';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_account JSONB;

-- 2B. Validation & Locking Columns
ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_profile_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS verified_by TEXT REFERENCES employees(id);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;

-- 3. Comment untuk dokumentasi
COMMENT ON COLUMN employees.ktp_number IS 'Nomor KTP 16 digit';
COMMENT ON COLUMN employees.npwp IS 'Nomor Pokok Wajib Pajak';
COMMENT ON COLUMN employees.bpjs_kesehatan IS 'Nomor BPJS Kesehatan';
COMMENT ON COLUMN employees.bpjs_ketenagakerjaan IS 'Nomor BPJS Ketenagakerjaan';
COMMENT ON COLUMN employees.marital_status IS 'Status pernikahan: Single, Married, Divorced, Widowed';
COMMENT ON COLUMN employees.dependents IS 'Jumlah tanggungan untuk perhitungan PTKP';
COMMENT ON COLUMN employees.address IS 'Alamat lengkap (KTP, domisili, province, city, postalCode) dalam format JSON';
COMMENT ON COLUMN employees.emergency_contacts IS 'Array kontak darurat dalam format JSON';
COMMENT ON COLUMN employees.education IS 'Riwayat pendidikan dalam format JSON array';
COMMENT ON COLUMN employees.work_history IS 'Riwayat pekerjaan sebelumnya dalam format JSON array';
COMMENT ON COLUMN employees.bank_account IS 'Info rekening bank (bankName, accountNumber, accountHolder) dalam format JSON';
COMMENT ON COLUMN employees.is_profile_completed IS 'Status kelengkapan profil karyawan (otomatis berdasarkan field wajib)';
COMMENT ON COLUMN employees.is_verified IS 'Status verifikasi data oleh HRD';
COMMENT ON COLUMN employees.verified_by IS 'ID HRD yang melakukan verifikasi';
COMMENT ON COLUMN employees.verified_at IS 'Waktu verifikasi data';
COMMENT ON COLUMN employees.is_locked IS 'Status penguncian data - karyawan tidak bisa edit jika TRUE';
COMMENT ON COLUMN employees.role IS 'Peran user: admin, hrd, kepala_ruangan, karyawan';
COMMENT ON COLUMN employees.managed_unit_id IS 'Kolom kompatibilitas lama; sumber utama unit kepala ruangan adalah unitKerjaId yang mengacu ke units.id';

-- 4. Verifikasi (opsional - untuk cek apakah berhasil)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'employees'
AND column_name IN (
    'ktp_number', 'npwp', 'bpjs_kesehatan', 'bpjs_ketenagakerjaan',
    'marital_status', 'dependents', 'address', 'emergency_contacts',
    'education', 'work_history', 'bank_account',
    'is_profile_completed', 'is_verified', 'verified_by', 'verified_at', 'is_locked',
    'role', 'managed_unit_id'
)
ORDER BY column_name;
