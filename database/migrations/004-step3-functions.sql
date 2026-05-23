-- STEP 3: Functions dan Triggers
-- Jalankan setelah STEP 2 berhasil

-- Drop function jika sudah ada (untuk re-run)
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Fungsi untuk update timestamp otomatis
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop triggers jika sudah ada (untuk re-run)
DROP TRIGGER IF EXISTS update_units_updated_at ON public.units;
DROP TRIGGER IF EXISTS update_employees_updated_at ON public.employees;
DROP TRIGGER IF EXISTS update_attendance_updated_at ON public.attendance;
DROP TRIGGER IF EXISTS update_requests_updated_at ON public.requests;

-- Trigger untuk auto-update updated_at
CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON public.units 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON public.attendance 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_requests_updated_at BEFORE UPDATE ON public.requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();