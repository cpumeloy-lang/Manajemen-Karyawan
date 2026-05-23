/**
 * Database Constraints & Indexes Migration
 * Phase 1.4: Add data integrity constraints and performance indexes
 * 
 * SCHEMA NOTE: This script uses camelCase column names ("employeeId", "deviceId", "clockIn", etc.)
 * which match your actual database structure after the consolidation schema update.
 * Column names are quoted with double quotes to handle camelCase in PostgreSQL.
 * 
 * This script:
 * 1. Adds foreign key constraints for referential integrity
 * 2. Adds unique constraints to prevent duplicates
 * 3. Adds check constraints for data validation
 * 4. Creates indexes for query performance
 * 5. Ensures data integrity is enforced at database level
 * 
 * Status: Ready for Supabase SQL Editor
 * Expected Duration: 2-5 minutes
 * 
 * IMPORTANT: 
 * 1. Backup database before running!
 * 2. Do NOT modify column names - they are camelCase (JavaScript convention)
 * 3. Column names are wrapped in double quotes for PostgreSQL compatibility
 * 4. If you get an error, run DIAGNOSTIC_CHECK_SCHEMA.sql first to verify column names
 */

-- ============================================================================
-- PART 1: FOREIGN KEY CONSTRAINTS
-- ============================================================================
-- Ensure referential integrity between tables

-- Foreign keys for attendance table
ALTER TABLE IF EXISTS public.attendance
  ADD CONSTRAINT fk_attendance_employee_id
  FOREIGN KEY ("employeeId") REFERENCES public.employees(id)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE IF EXISTS public.attendance
  ADD CONSTRAINT fk_attendance_device_id
  FOREIGN KEY ("deviceId") REFERENCES public.employee_devices(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign keys for requests table (cuti, izin, reimbursement)
ALTER TABLE IF EXISTS public.requests
  ADD CONSTRAINT fk_requests_employee_id
  FOREIGN KEY ("employeeId") REFERENCES public.employees(id)
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Foreign keys for documents table
ALTER TABLE IF EXISTS public.documents
  ADD CONSTRAINT fk_documents_employee_id
  FOREIGN KEY ("employeeId") REFERENCES public.employees(id)
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Foreign keys for employee_devices table
ALTER TABLE IF EXISTS public.employee_devices
  ADD CONSTRAINT fk_employee_devices_employee_id
  FOREIGN KEY ("employeeId") REFERENCES public.employees(id)
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- PART 2: UNIQUE CONSTRAINTS
-- ============================================================================
-- Prevent duplicate entries for critical data

-- Employees: email must be unique
ALTER TABLE IF EXISTS public.employees
  ADD CONSTRAINT uq_employees_email UNIQUE (email);

-- Employees: user_id must be unique (one user per employee)
ALTER TABLE IF EXISTS public.employees
  ADD CONSTRAINT uq_employees_user_id UNIQUE (user_id);

-- Employee devices: one device registration per employee+device combo
ALTER TABLE IF EXISTS public.employee_devices
  ADD CONSTRAINT uq_employee_devices_combo UNIQUE ("employeeId", "deviceId");

-- Attendance: one record per employee per day
ALTER TABLE IF EXISTS public.attendance
  ADD CONSTRAINT uq_attendance_employee_date UNIQUE ("employeeId", tanggal);

-- ============================================================================
-- PART 3: CHECK CONSTRAINTS
-- ============================================================================
-- Validate data at database level

-- Employees: status must be valid
ALTER TABLE IF EXISTS public.employees
  ADD CONSTRAINT ck_employees_status
  CHECK (status IN ('Aktif', 'Non-Aktif', 'Cuti'));

-- Employees: salary must be non-negative
ALTER TABLE IF EXISTS public.employees
  ADD CONSTRAINT ck_employees_salary
  CHECK ("gajiPokok" >= 0 AND "tunjanganProfesi" >= 0);

-- Attendance: valid status values
ALTER TABLE IF EXISTS public.attendance
  ADD CONSTRAINT ck_attendance_status
  CHECK (status IN ('Hadir', 'Terlambat', 'Absen', 'Cuti', 'Sakit', 'Pending', 'Recorded'));

-- Attendance: check out must be after or equal to check in
ALTER TABLE IF EXISTS public.attendance
  ADD CONSTRAINT ck_attendance_times
  CHECK ("clockOut" IS NULL OR "clockOut" >= "clockIn");

-- Requests: valid types
ALTER TABLE IF EXISTS public.requests
  ADD CONSTRAINT ck_requests_type
  CHECK (type IN ('Cuti', 'Izin', 'Overtime', 'Reimburse'));

-- Requests: valid status
ALTER TABLE IF EXISTS public.requests
  ADD CONSTRAINT ck_requests_status
  CHECK (status IN ('Pending', 'Approved', 'Rejected'));

-- ============================================================================
-- PART 4: INDEXES FOR QUERY PERFORMANCE
-- ============================================================================

-- INDEXES: EMPLOYEES TABLE
-- Search by email
CREATE INDEX IF NOT EXISTS idx_employees_email 
  ON public.employees(email);

-- Search by name (for typeahead/search)
CREATE INDEX IF NOT EXISTS idx_employees_nama 
  ON public.employees USING gin(nama gin_trgm_ops);

-- Filter by status
CREATE INDEX IF NOT EXISTS idx_employees_status 
  ON public.employees(status);

-- Filter by department
CREATE INDEX IF NOT EXISTS idx_employees_departemen 
  ON public.employees(departemen);

-- Filter by role
CREATE INDEX IF NOT EXISTS idx_employees_role 
  ON public.employees(role);

-- Most recent created/updated
CREATE INDEX IF NOT EXISTS idx_employees_created_at 
  ON public.employees(created_at DESC);

-- INDEXES: ATTENDANCE TABLE
-- Query by employee (most common)
CREATE INDEX IF NOT EXISTS idx_attendance_employee_id 
  ON public.attendance("employeeId");

-- Query by date range
CREATE INDEX IF NOT EXISTS idx_attendance_tanggal 
  ON public.attendance(tanggal DESC);

-- Query by employee + date (common composite)
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date 
  ON public.attendance("employeeId", tanggal DESC);

-- Filter by status
CREATE INDEX IF NOT EXISTS idx_attendance_status 
  ON public.attendance(status);

-- Biometric verification tracking
CREATE INDEX IF NOT EXISTS idx_attendance_biometric_verified 
  ON public.attendance("biometricVerified") WHERE "biometricVerified" = true;

-- INDEXES: REQUESTS TABLE
-- Filter by status (pending requests are important)
CREATE INDEX IF NOT EXISTS idx_requests_status 
  ON public.requests(status);

-- Query by employee
CREATE INDEX IF NOT EXISTS idx_requests_employee_id 
  ON public.requests("employeeId");

-- Filter by type
CREATE INDEX IF NOT EXISTS idx_requests_type 
  ON public.requests(type);

-- Date range queries
CREATE INDEX IF NOT EXISTS idx_requests_created_at 
  ON public.requests("createdAt" DESC);

-- Composite: find pending requests for employee
CREATE INDEX IF NOT EXISTS idx_requests_employee_status_type 
  ON public.requests("employeeId", status, type);

-- Date range for start/end dates
CREATE INDEX IF NOT EXISTS idx_requests_start_date 
  ON public.requests("startDate");

CREATE INDEX IF NOT EXISTS idx_requests_end_date 
  ON public.requests("endDate");

-- INDEXES: DOCUMENTS TABLE
-- Query by employee
CREATE INDEX IF NOT EXISTS idx_documents_employee_id 
  ON public.documents("employeeId");

-- Filter by type
CREATE INDEX IF NOT EXISTS idx_documents_type 
  ON public.documents(type);

-- INDEXES: EMPLOYEE_DEVICES TABLE
-- Query by employee
CREATE INDEX IF NOT EXISTS idx_employee_devices_employee_id 
  ON public.employee_devices("employeeId");

-- Query by device ID
CREATE INDEX IF NOT EXISTS idx_employee_devices_device_id 
  ON public.employee_devices("deviceId");

-- Filter by status
CREATE INDEX IF NOT EXISTS idx_employee_devices_status 
  ON public.employee_devices(status);

-- ============================================================================
-- PART 5: VERIFY CONSTRAINTS
-- ============================================================================

-- Query to check all constraints
SELECT 
  constraint_name,
  table_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public'
ORDER BY table_name, constraint_type;

-- Query to check all indexes
SELECT 
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ============================================================================
-- PART 6: CLEANUP DUPLICATES (if needed)
-- ============================================================================
-- Run these if there are constraint violations

-- Find duplicate emails
-- SELECT email, COUNT(*) 
-- FROM public.employees 
-- GROUP BY email HAVING COUNT(*) > 1;

-- Delete duplicate attendance records (keep latest)
-- DELETE FROM public.attendance 
-- WHERE id NOT IN (
--   SELECT DISTINCT ON ("employeeId", tanggal) id
--   FROM public.attendance
--   ORDER BY "employeeId", tanggal, "createdAt" DESC
-- );

-- ============================================================================
-- NOTES FOR ADMIN
-- ============================================================================

/*
After running this script:

1. VERIFY:
   - Check for any errors in SQL Editor output
   - Verify constraints created: SELECT * FROM information_schema.table_constraints WHERE table_schema = 'public';
   - Verify indexes created: SELECT * FROM pg_indexes WHERE schemaname = 'public';

2. TEST CONSTRAINTS:
   - Try inserting duplicate email → should fail ✓
   - Try inserting clockOut < clockIn → should fail ✓
   - Try inserting negative salary → should fail ✓
   - Try referencing non-existent employee → should fail ✓

3. PERFORMANCE:
   - Queries should be faster now
   - Watch for slow queries in Supabase dashboard
   - Run ANALYZE if needed: ANALYZE;

4. IF ISSUES:
   - Check application logs for constraint violations
   - Review data quality in each table
   - Contact admin to fix data if needed

5. ROLLBACK (if problems):
   ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS fk_attendance_employee_id;
   ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS fk_attendance_device_id;
   ALTER TABLE public.requests DROP CONSTRAINT IF EXISTS fk_requests_employee_id;
   ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS fk_documents_employee_id;
   ALTER TABLE public.employee_devices DROP CONSTRAINT IF EXISTS fk_employee_devices_employee_id;
   -- ... repeat for other constraints and indexes

STATUS: Ready for production
TESTED: Yes, on sample data
REVERSIBLE: Yes, drop statements provided
*/
