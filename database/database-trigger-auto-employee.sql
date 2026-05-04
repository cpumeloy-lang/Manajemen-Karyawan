-- ========================================
-- AUTO CREATE EMPLOYEE PROFILE ON SIGNUP
-- ========================================
-- Trigger ini akan otomatis membuat profil employee
-- saat user baru mendaftar via Supabase Auth

-- 1. Buat function untuk auto-create employee profile
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  -- Insert employee profile dengan role default 'karyawan'
  -- Admin harus di-set manual via SQL atau dashboard
  INSERT INTO public.employees (
    user_id,
    nama,
    email,
    role,
    jabatan,
    departemen,
    status,
    shift,
    "hireDate",
    "birthDate",
    "sisaCuti"
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nama', 'User Baru'),  -- Ambil dari metadata atau default
    NEW.email,
    'karyawan',  -- Default role adalah karyawan
    'Staff',     -- Default jabatan
    'Umum',      -- Default departemen
    'Aktif',
    'Pagi',
    CURRENT_DATE,
    '1990-01-01',
    12
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Buat trigger yang menjalankan function di atas
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ========================================
-- UPDATE: Sync email jika berubah di auth
-- ========================================
CREATE OR REPLACE FUNCTION public.handle_user_update() 
RETURNS TRIGGER AS $$
BEGIN
  -- Update email di employees jika berubah di auth.users
  IF NEW.email <> OLD.email THEN
    UPDATE public.employees 
    SET email = NEW.email 
    WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_update();

-- ========================================
-- MANUAL: Set user sebagai admin
-- ========================================
-- Jalankan query ini untuk membuat user menjadi admin
-- Ganti 'user@email.com' dengan email user yang ingin dijadikan admin

-- UPDATE public.employees 
-- SET 
--   role = 'admin',
--   jabatan = 'Manager HR',
--   departemen = 'Administrasi'
-- WHERE email = 'admin@hospital.com';

-- ========================================
-- CLEANUP: Fix existing users
-- ========================================
-- Jika ada user di auth.users yang belum punya profil employee, jalankan:

INSERT INTO public.employees (
  user_id, nama, email, role, jabatan, departemen, status, shift, "hireDate", "birthDate", "sisaCuti"
)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'nama', 'User Existing'),
  u.email,
  'karyawan',
  'Staff',
  'Umum',
  'Aktif',
  'Pagi',
  CURRENT_DATE,
  '1990-01-01',
  12
FROM auth.users u
LEFT JOIN public.employees e ON e.user_id = u.id
WHERE e.id IS NULL
ON CONFLICT (email) DO NOTHING;

-- ========================================
-- Set admin untuk user yang sudah ada
-- ========================================
UPDATE public.employees 
SET 
  role = 'admin',
  jabatan = 'Manager HR',
  departemen = 'Administrasi',
  user_id = '0feb4b44-df17-4d16-9af9-33048097638f'
WHERE email = 'admin@hospital.com';
