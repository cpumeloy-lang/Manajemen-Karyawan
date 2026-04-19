-- ============================================
-- EMPLOYEE COMPLETE DATA - DATABASE MIGRATION
-- ============================================
-- Menambahkan kolom untuk data lengkap karyawan
-- Version: 1.0
-- Date: 2025-10-27
-- ============================================

-- 1. PERSONAL & CONTACT INFORMATION
-- ============================================

-- Add KTP Number
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS ktp_number VARCHAR(20);

-- Add NPWP
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS npwp VARCHAR(20);

-- Add BPJS Numbers
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS bpjs_kesehatan VARCHAR(20);

ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS bpjs_ketenagakerjaan VARCHAR(20);

-- Add Marital Status & Dependents
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS marital_status VARCHAR(20) CHECK (marital_status IN ('Single', 'Married', 'Divorced', 'Widowed'));

ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS dependents INTEGER DEFAULT 0;

-- Add Address Information (stored as JSONB for flexibility)
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS address JSONB;

-- Example address structure:
-- {
--   "ktp": "Jl. Merdeka No. 123",
--   "domisili": "Jl. Sudirman No. 456",
--   "province": "DKI Jakarta",
--   "city": "Jakarta Selatan",
--   "postalCode": "12345"
-- }

-- Add Emergency Contacts (array of contacts)
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS emergency_contacts JSONB DEFAULT '[]';

-- Example emergency_contacts structure:
-- [
--   {
--     "name": "Jane Doe",
--     "relationship": "Istri",
--     "phone": "081234567890",
--     "address": "Jl. Merdeka No. 123"
--   }
-- ]

-- 2. PROFESSIONAL INFORMATION
-- ============================================

-- Add Education History
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS education JSONB DEFAULT '[]';

-- Example education structure:
-- [
--   {
--     "id": "edu-1",
--     "level": "S1",
--     "institution": "Universitas Indonesia",
--     "major": "Kedokteran",
--     "graduationYear": 2015,
--     "gpa": 3.75
--   }
-- ]

-- Add Work History
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS work_history JSONB DEFAULT '[]';

-- Example work_history structure:
-- [
--   {
--     "id": "work-1",
--     "company": "RS Husada",
--     "position": "Dokter Umum",
--     "startDate": "2015-01-01",
--     "endDate": "2020-12-31",
--     "reasonLeaving": "Career advancement"
--   }
-- ]

-- Add Bank Account Information
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS bank_account JSONB;

-- Example bank_account structure:
-- {
--   "bankName": "Bank Mandiri",
--   "accountNumber": "1234567890",
--   "accountHolder": "John Doe"
-- }

-- 3. INDEXES FOR PERFORMANCE
-- ============================================

-- Index for KTP Number (unique identification)
CREATE INDEX IF NOT EXISTS idx_employees_ktp_number ON employees(ktp_number);

-- Index for NPWP (tax purposes)
CREATE INDEX IF NOT EXISTS idx_employees_npwp ON employees(npwp);

-- Index for BPJS numbers
CREATE INDEX IF NOT EXISTS idx_employees_bpjs_kesehatan ON employees(bpjs_kesehatan);
CREATE INDEX IF NOT EXISTS idx_employees_bpjs_ketenagakerjaan ON employees(bpjs_ketenagakerjaan);

-- GIN indexes for JSONB columns (faster querying)
CREATE INDEX IF NOT EXISTS idx_employees_address ON employees USING GIN (address);
CREATE INDEX IF NOT EXISTS idx_employees_emergency_contacts ON employees USING GIN (emergency_contacts);
CREATE INDEX IF NOT EXISTS idx_employees_education ON employees USING GIN (education);
CREATE INDEX IF NOT EXISTS idx_employees_work_history ON employees USING GIN (work_history);
CREATE INDEX IF NOT EXISTS idx_employees_bank_account ON employees USING GIN (bank_account);

-- 4. COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON COLUMN employees.ktp_number IS 'Nomor KTP (Kartu Tanda Penduduk)';
COMMENT ON COLUMN employees.npwp IS 'Nomor Pokok Wajib Pajak untuk keperluan perpajakan';
COMMENT ON COLUMN employees.bpjs_kesehatan IS 'Nomor BPJS Kesehatan';
COMMENT ON COLUMN employees.bpjs_ketenagakerjaan IS 'Nomor BPJS Ketenagakerjaan';
COMMENT ON COLUMN employees.marital_status IS 'Status pernikahan: Single, Married, Divorced, Widowed';
COMMENT ON COLUMN employees.dependents IS 'Jumlah tanggungan (untuk perhitungan PTKP)';
COMMENT ON COLUMN employees.address IS 'Alamat lengkap (KTP & domisili) dalam format JSONB';
COMMENT ON COLUMN employees.emergency_contacts IS 'Kontak darurat (array) dalam format JSONB';
COMMENT ON COLUMN employees.education IS 'Riwayat pendidikan (array) dalam format JSONB';
COMMENT ON COLUMN employees.work_history IS 'Riwayat pekerjaan (array) dalam format JSONB';
COMMENT ON COLUMN employees.bank_account IS 'Informasi rekening bank untuk transfer gaji dalam format JSONB';

-- 5. UPDATE AUDIT LOG TRIGGER (if exists)
-- ============================================

-- The existing audit log trigger should automatically track changes to these new columns
-- No additional trigger modification needed if using a generic column-change trigger

-- 6. VERIFY MIGRATION
-- ============================================

-- Check if all columns were added successfully
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'employees'
AND column_name IN (
    'ktp_number', 
    'npwp', 
    'bpjs_kesehatan', 
    'bpjs_ketenagakerjaan',
    'marital_status',
    'dependents',
    'address',
    'emergency_contacts',
    'education',
    'work_history',
    'bank_account'
)
ORDER BY ordinal_position;

-- Count employees with complete vs incomplete data
SELECT 
    COUNT(*) as total_employees,
    COUNT(ktp_number) as with_ktp,
    COUNT(npwp) as with_npwp,
    COUNT(bpjs_kesehatan) as with_bpjs_kesehatan,
    COUNT(bank_account) as with_bank_account,
    COUNT(CASE WHEN address IS NOT NULL AND address != '{}' THEN 1 END) as with_address,
    COUNT(CASE WHEN emergency_contacts IS NOT NULL AND jsonb_array_length(emergency_contacts) > 0 THEN 1 END) as with_emergency_contacts
FROM employees;

-- ============================================
-- MIGRATION NOTES
-- ============================================
-- 1. All new columns are NULLABLE to allow gradual data entry
-- 2. JSONB format chosen for flexibility and PostgreSQL native support
-- 3. Indexes added for performance on frequently queried fields
-- 4. Existing data is NOT affected - only schema is extended
-- 5. Application code must handle NULL values gracefully
-- 6. Consider data entry campaign to fill missing information
-- ============================================

-- ROLLBACK SCRIPT (if needed)
-- ============================================
-- Run this only if you need to revert the migration
-- 
-- ALTER TABLE employees DROP COLUMN IF EXISTS ktp_number;
-- ALTER TABLE employees DROP COLUMN IF EXISTS npwp;
-- ALTER TABLE employees DROP COLUMN IF EXISTS bpjs_kesehatan;
-- ALTER TABLE employees DROP COLUMN IF EXISTS bpjs_ketenagakerjaan;
-- ALTER TABLE employees DROP COLUMN IF EXISTS marital_status;
-- ALTER TABLE employees DROP COLUMN IF EXISTS dependents;
-- ALTER TABLE employees DROP COLUMN IF EXISTS address;
-- ALTER TABLE employees DROP COLUMN IF EXISTS emergency_contacts;
-- ALTER TABLE employees DROP COLUMN IF EXISTS education;
-- ALTER TABLE employees DROP COLUMN IF EXISTS work_history;
-- ALTER TABLE employees DROP COLUMN IF EXISTS bank_account;
-- 
-- DROP INDEX IF EXISTS idx_employees_ktp_number;
-- DROP INDEX IF EXISTS idx_employees_npwp;
-- DROP INDEX IF EXISTS idx_employees_bpjs_kesehatan;
-- DROP INDEX IF EXISTS idx_employees_bpjs_ketenagakerjaan;
-- DROP INDEX IF EXISTS idx_employees_address;
-- DROP INDEX IF EXISTS idx_employees_emergency_contacts;
-- DROP INDEX IF EXISTS idx_employees_education;
-- DROP INDEX IF EXISTS idx_employees_work_history;
-- DROP INDEX IF EXISTS idx_employees_bank_account;
-- ============================================
