-- MENITIKBERATKAN PADA PENGGUNAAN LOKAL/OFFLINE 
-- HRD DAPAT MERESET PASSWORD TANPA EMAIL
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION admin_reset_employee_password(target_user_id UUID, new_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
BEGIN
  -- 1. Verifikasi peran pemanggil
  SELECT role INTO v_caller_role FROM public.employees WHERE user_id = auth.uid();
  
  IF v_caller_role NOT IN ('hrd', 'admin') THEN
    RAISE EXCEPTION 'Akses Ditolak: Hanya HRD atau Admin yang boleh mereset password.';
  END IF;

  -- 2. Update password dan bersihkan recovery token agar valid login langsung
  UPDATE auth.users
  SET 
    encrypted_password = crypt(new_password, gen_salt('bf')),
    updated_at = now()
  WHERE id = target_user_id;

  RETURN TRUE;
END;
$$; 
