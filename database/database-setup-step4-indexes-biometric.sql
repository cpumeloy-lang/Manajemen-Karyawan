-- STEP 4: Performance Indexes untuk Biometric Tables
-- Jalankan SETELAH database-setup-step3-rls-biometric.sql
-- Optimize query performance untuk biometric operations

-- 1. Index untuk employee_devices lookups
CREATE INDEX IF NOT EXISTS idx_employee_devices_employee_id 
    ON public.employee_devices(employee_id);

CREATE INDEX IF NOT EXISTS idx_employee_devices_device_id 
    ON public.employee_devices(device_id);

CREATE INDEX IF NOT EXISTS idx_employee_devices_platform 
    ON public.employee_devices(platform);

CREATE INDEX IF NOT EXISTS idx_employee_devices_status 
    ON public.employee_devices(status);

CREATE INDEX IF NOT EXISTS idx_employee_devices_is_primary 
    ON public.employee_devices(is_primary) WHERE is_primary = TRUE;

-- 2. Index untuk attendance biometric queries
CREATE INDEX IF NOT EXISTS idx_attendance_device_id 
    ON public.attendance(device_id);

CREATE INDEX IF NOT EXISTS idx_attendance_biometric_verified 
    ON public.attendance(biometric_verified);

CREATE INDEX IF NOT EXISTS idx_attendance_biometric_type 
    ON public.attendance(biometric_type);

CREATE INDEX IF NOT EXISTS idx_attendance_employee_biometric 
    ON public.attendance(employee_id, biometric_verified, date);

CREATE INDEX IF NOT EXISTS idx_attendance_date_biometric 
    ON public.attendance(date, biometric_type, biometric_verified);

-- 3. Partial index untuk failed biometric attempts
CREATE INDEX IF NOT EXISTS idx_attendance_failed_verification 
    ON public.attendance(employee_id, created_at) 
    WHERE biometric_verified = FALSE AND biometric_type IN ('face', 'totp');

-- 4. Composite index untuk audit queries
CREATE INDEX IF NOT EXISTS idx_attendance_audit 
    ON public.attendance(employee_id, date, biometric_type, source);

-- 5. Index untuk anomaly detection queries
CREATE INDEX IF NOT EXISTS idx_attendance_location 
    ON public.attendance(latitude, longitude, created_at);

-- 6. BRIN index untuk time-series data (efficient for large tables)
CREATE INDEX IF NOT EXISTS idx_attendance_created_at_brin 
    ON public.attendance USING BRIN (created_at);

-- 7. Verify indexes created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('employee_devices', 'attendance')
    AND schemaname = 'public'
ORDER BY tablename, indexname;
