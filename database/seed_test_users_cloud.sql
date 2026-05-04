-- ============================================================
-- HRMS CLOUD: MIGRASI SKEMA + SEED DATA TEST
-- Jalankan SATU KALI di SQL Editor Supabase Cloud
-- Password semua akun: Test@12345
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- BAGIAN 1: TAMBAH KOLOM YANG BELUM ADA DI CLOUD
-- ============================================================
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS nik TEXT,
  ADD COLUMN IF NOT EXISTS ktp_number VARCHAR(20),
  ADD COLUMN IF NOT EXISTS npwp VARCHAR(20),
  ADD COLUMN IF NOT EXISTS bpjs_kesehatan VARCHAR(20),
  ADD COLUMN IF NOT EXISTS bpjs_ketenagakerjaan VARCHAR(20),
  ADD COLUMN IF NOT EXISTS marital_status VARCHAR(20),
  ADD COLUMN IF NOT EXISTS dependents INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS address JSONB,
  ADD COLUMN IF NOT EXISTS emergency_contacts JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS education JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS work_history JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS bank_account JSONB,
  ADD COLUMN IF NOT EXISTS is_profile_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verified_by TEXT,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS managed_unit_id TEXT;

-- Tambah constraint marital_status (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'employees_marital_status_check'
    AND conrelid = 'public.employees'::regclass
  ) THEN
    ALTER TABLE public.employees
      ADD CONSTRAINT employees_marital_status_check
      CHECK (marital_status IS NULL OR marital_status IN ('Single','Married','Divorced','Widowed'));
  END IF;
END $$;

-- Perbaiki role_check constraint agar mendukung semua role aplikasi
-- (Cloud mungkin hanya punya 'admin','karyawan' — kita tambah 'hrd','kepala_ruangan')
ALTER TABLE public.employees
  DROP CONSTRAINT IF EXISTS employees_role_check;

ALTER TABLE public.employees
  ADD CONSTRAINT employees_role_check
  CHECK (role IN ('admin', 'hrd', 'kepala_ruangan', 'karyawan'));

-- Perbaiki is_admin_user() agar mengenali role hrd
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.user_id = auth.uid()
      AND e.role IN ('admin', 'hr', 'hrd')
  );
$$;

-- Pastikan tabel audit_logs ada
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT DEFAULT gen_random_uuid()::text PRIMARY KEY,
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  action VARCHAR(20) NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
  portal_type VARCHAR(20) DEFAULT 'operational' NOT NULL
    CHECK (portal_type IN ('personal', 'operational', 'unknown')),
  entity_type TEXT,
  entity_id TEXT,
  entity_name TEXT,
  old_data JSONB,
  new_data JSONB,
  changes JSONB,
  description TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_select_policy" ON public.audit_logs;
CREATE POLICY "audit_logs_select_policy" ON public.audit_logs FOR SELECT
  USING (public.is_admin_user() OR user_id = auth.uid());

DROP POLICY IF EXISTS "audit_logs_insert_policy" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_policy" ON public.audit_logs FOR INSERT
  WITH CHECK (public.is_admin_user() OR user_id = auth.uid());

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;

-- ============================================================
-- BAGIAN 2: SEED DATA TEST (5 AKUN, SEMUA ROLE)
-- ============================================================

-- Hapus data lama jika ada
DELETE FROM public.employees WHERE email IN (
  'admin@hrms.test','hrd@hrms.test','kepala.igd@hrms.test',
  'karyawan1@hrms.test','karyawan2@hrms.test'
);
DELETE FROM auth.users WHERE email IN (
  'admin@hrms.test','hrd@hrms.test','kepala.igd@hrms.test',
  'karyawan1@hrms.test','karyawan2@hrms.test'
);

-- Buat akun login (auth.users)
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  role, aud, confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES
  ('11111111-1111-1111-1111-111111111101','00000000-0000-0000-0000-000000000000',
   'admin@hrms.test', crypt('Test@12345', gen_salt('bf')), NOW(),
   '{"provider":"email","providers":["email"]}','{"name":"Admin HRMS"}',
   NOW(), NOW(), 'authenticated', 'authenticated', '', '', '', ''),
  ('11111111-1111-1111-1111-111111111102','00000000-0000-0000-0000-000000000000',
   'hrd@hrms.test', crypt('Test@12345', gen_salt('bf')), NOW(),
   '{"provider":"email","providers":["email"]}','{"name":"HRD Manager"}',
   NOW(), NOW(), 'authenticated', 'authenticated', '', '', '', ''),
  ('11111111-1111-1111-1111-111111111103','00000000-0000-0000-0000-000000000000',
   'kepala.igd@hrms.test', crypt('Test@12345', gen_salt('bf')), NOW(),
   '{"provider":"email","providers":["email"]}','{"name":"Kepala IGD"}',
   NOW(), NOW(), 'authenticated', 'authenticated', '', '', '', ''),
  ('11111111-1111-1111-1111-111111111104','00000000-0000-0000-0000-000000000000',
   'karyawan1@hrms.test', crypt('Test@12345', gen_salt('bf')), NOW(),
   '{"provider":"email","providers":["email"]}','{"name":"Dr. Budi Santoso"}',
   NOW(), NOW(), 'authenticated', 'authenticated', '', '', '', ''),
  ('11111111-1111-1111-1111-111111111105','00000000-0000-0000-0000-000000000000',
   'karyawan2@hrms.test', crypt('Test@12345', gen_salt('bf')), NOW(),
   '{"provider":"email","providers":["email"]}','{"name":"Siti Perawati"}',
   NOW(), NOW(), 'authenticated', 'authenticated', '', '', '', '');

-- Buat profil karyawan (employees)
INSERT INTO public.employees (
  id, user_id, nama, email, telepon, jabatan, departemen,
  role, status, shift, nik, "hireDate", "birthDate",
  "gajiPokok", "tunjanganProfesi",
  ktp_number, marital_status, dependents,
  address, emergency_contacts, education, work_history, bank_account,
  is_profile_completed, is_verified, is_locked, spesialisasi, "sisaCuti"
) VALUES
-- 1. Admin (akses penuh)
(
  'aaaaaaaa-0000-0000-0000-000000000001',
  '11111111-1111-1111-1111-111111111101',
  'Admin HRMS', 'admin@hrms.test', '081200000001',
  'System Administrator', 'IT & Administrasi',
  'admin', 'Aktif', 'Pagi', 'NIK-ADM-2024-001',
  '2020-01-01', '1985-06-15', 15000000, 3000000,
  '3201010101850001', 'Married', 2,
  '{"ktp":"Jl. Admin No.1, Jakarta","domisili":"Jl. Admin No.1","province":"DKI Jakarta","city":"Jakarta Pusat","postalCode":"10110"}'::jsonb,
  '[{"name":"Dewi Admin","relation":"Istri","phone":"081200000099"}]'::jsonb,
  '[{"level":"S1","major":"Teknik Informatika","institution":"UI","year":"2007"}]'::jsonb,
  '[{"company":"RSUD Jakarta","position":"IT Staff","duration":"2007-2020"}]'::jsonb,
  '{"bankName":"BCA","accountNumber":"1234567890","accountHolder":"Admin HRMS"}'::jsonb,
  true, true, false, 'System Administration', 12
),
-- 2. HRD (kelola karyawan & payroll)
(
  'aaaaaaaa-0000-0000-0000-000000000002',
  '11111111-1111-1111-1111-111111111102',
  'HRD Manager', 'hrd@hrms.test', '081200000002',
  'HRD Manager', 'Sumber Daya Manusia',
  'hrd', 'Aktif', 'Pagi', 'NIK-HRD-2024-002',
  '2019-03-15', '1988-09-20', 12000000, 2500000,
  '3201010101880002', 'Single', 0,
  '{"ktp":"Jl. HRD No.2, Bandung","domisili":"Jl. HRD No.2","province":"Jawa Barat","city":"Bandung","postalCode":"40111"}'::jsonb,
  '[{"name":"Bapak HRD","relation":"Ayah","phone":"081200000088"}]'::jsonb,
  '[{"level":"S1","major":"Manajemen SDM","institution":"UNPAD","year":"2010"}]'::jsonb,
  '[{"company":"PT Maju","position":"HR Staff","duration":"2010-2019"}]'::jsonb,
  '{"bankName":"Mandiri","accountNumber":"9876543210","accountHolder":"HRD Manager"}'::jsonb,
  true, true, false, 'Rekrutmen, Penggajian', 12
),
-- 3. Kepala Ruangan (approval request, lihat data unit)
(
  'aaaaaaaa-0000-0000-0000-000000000003',
  '11111111-1111-1111-1111-111111111103',
  'Dr. Rini Kepala IGD', 'kepala.igd@hrms.test', '081200000003',
  'Dokter Spesialis / Kepala IGD', 'IGD',
  'kepala_ruangan', 'Aktif', 'Pagi', 'NIK-KR-2024-003',
  '2018-07-01', '1982-04-10', 18000000, 5000000,
  '3201010101820003', 'Married', 1,
  '{"ktp":"Jl. Dokter No.3, Surabaya","domisili":"Jl. Dokter No.3","province":"Jawa Timur","city":"Surabaya","postalCode":"60111"}'::jsonb,
  '[{"name":"Hendi","relation":"Suami","phone":"081200000077"}]'::jsonb,
  '[{"level":"S2","major":"Kedokteran Darurat","institution":"Unair","year":"2008"}]'::jsonb,
  '[{"company":"RSUD Surabaya","position":"Dokter IGD","duration":"2008-2018"}]'::jsonb,
  '{"bankName":"BNI","accountNumber":"1122334455","accountHolder":"Rini Kepala IGD"}'::jsonb,
  true, true, true, 'Kedokteran Darurat', 14
),
-- 4. Karyawan Dokter (profil belum verified - untuk test workflow verifikasi)
(
  'aaaaaaaa-0000-0000-0000-000000000004',
  '11111111-1111-1111-1111-111111111104',
  'Dr. Budi Santoso', 'karyawan1@hrms.test', '081200000004',
  'Dokter Umum', 'Rawat Jalan',
  'karyawan', 'Aktif', 'Pagi', 'NIK-KRY-2024-004',
  '2021-02-01', '1990-12-25', 8000000, 1500000,
  '3201010101900004', 'Single', 0,
  '{"ktp":"Jl. Karyawan No.4, Yogyakarta","domisili":"Jl. Karyawan No.4","province":"DI Yogyakarta","city":"Yogyakarta","postalCode":"55111"}'::jsonb,
  '[{"name":"Ani Santoso","relation":"Ibu","phone":"081200000066"}]'::jsonb,
  '[{"level":"Profesi","major":"Kedokteran","institution":"UGM","year":"2015"}]'::jsonb,
  '[]'::jsonb,
  '{"bankName":"BRI","accountNumber":"5566778899","accountHolder":"Budi Santoso"}'::jsonb,
  true, false, false, 'Pemeriksaan Umum', 12
),
-- 5. Karyawan Perawat (profil sudah verified & terkunci)
(
  'aaaaaaaa-0000-0000-0000-000000000005',
  '11111111-1111-1111-1111-111111111105',
  'Siti Perawati', 'karyawan2@hrms.test', '081200000005',
  'Perawat', 'Rawat Inap',
  'karyawan', 'Aktif', 'Siang', 'NIK-KRY-2024-005',
  '2022-05-10', '1995-08-17', 5500000, 800000,
  '3201010101950005', 'Married', 2,
  '{"ktp":"Jl. Perawat No.5, Semarang","domisili":"Jl. Perawat No.5","province":"Jawa Tengah","city":"Semarang","postalCode":"50111"}'::jsonb,
  '[{"name":"Agus","relation":"Suami","phone":"081200000055"}]'::jsonb,
  '[{"level":"D3","major":"Keperawatan","institution":"Poltekkes","year":"2017"}]'::jsonb,
  '[{"company":"Klinik Sehat","position":"Perawat","duration":"2017-2022"}]'::jsonb,
  '{"bankName":"BCA","accountNumber":"9988776655","accountHolder":"Siti Perawati"}'::jsonb,
  true, true, true, 'Keperawatan Umum', 12
);

-- ============================================================
-- BAGIAN 3: VERIFIKASI HASIL
-- ============================================================
SELECT
  e.nama,
  e.email,
  e.role,
  e.status,
  e.is_verified        AS verified,
  e.is_locked          AS locked,
  e.is_profile_completed AS profil_lengkap,
  u.email_confirmed_at IS NOT NULL AS auth_aktif
FROM public.employees e
LEFT JOIN auth.users u ON e.user_id = u.id
WHERE e.email IN (
  'admin@hrms.test','hrd@hrms.test','kepala.igd@hrms.test',
  'karyawan1@hrms.test','karyawan2@hrms.test'
)
ORDER BY e.role;
