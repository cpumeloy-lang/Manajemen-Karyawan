-- RBAC DATABASE SCHEMA UPDATES
-- Run this in Supabase SQL Editor to enforce role-based access control

-- 1. Update employees table role constraint to include all roles
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_role_check;
ALTER TABLE public.employees ADD CONSTRAINT employees_role_check 
    CHECK (role IN ('admin', 'hrd', 'kepala_ruangan', 'karyawan'));

-- 2. Create roles_permissions table to store permission matrix
CREATE TABLE IF NOT EXISTS public.roles_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    role VARCHAR(50) NOT NULL,
    permission VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(role, permission)
);

-- 3. Insert permission matrix
DELETE FROM public.roles_permissions;

-- Admin permissions
INSERT INTO public.roles_permissions (role, permission, description) VALUES
    ('admin', 'read:all_employees', 'Baca data semua karyawan'),
    ('admin', 'create:employee', 'Buat karyawan baru'),
    ('admin', 'update:employee', 'Edit data karyawan'),
    ('admin', 'delete:employee', 'Hapus karyawan'),
    ('admin', 'read:all_attendance', 'Baca presensi semua karyawan'),
    ('admin', 'create:attendance', 'Buat record presensi'),
    ('admin', 'update:attendance', 'Edit presensi'),
    ('admin', 'delete:attendance', 'Hapus presensi'),
    ('admin', 'approve:requests', 'Approve semua request'),
    ('admin', 'reject:requests', 'Reject semua request'),
    ('admin', 'read:all_requests', 'Baca semua request'),
    ('admin', 'manage:organization', 'Kelola organisasi'),
    ('admin', 'manage:system_settings', 'Kelola pengaturan sistem'),
    ('admin', 'manage:roles', 'Kelola role & permission'),
    ('admin', 'view:audit_logs', 'Lihat audit log'),
    ('admin', 'export:data', 'Export data'),
    ('admin', 'import:data', 'Import data');

-- HRD permissions
INSERT INTO public.roles_permissions (role, permission, description) VALUES
    ('hrd', 'read:all_employees', 'Baca data semua karyawan'),
    ('hrd', 'create:employee', 'Buat karyawan baru'),
    ('hrd', 'update:employee', 'Edit data karyawan'),
    ('hrd', 'read:all_attendance', 'Baca presensi semua karyawan'),
    ('hrd', 'update:attendance', 'Edit presensi'),
    ('hrd', 'approve:requests', 'Approve request'),
    ('hrd', 'reject:requests', 'Reject request'),
    ('hrd', 'read:all_requests', 'Baca semua request'),
    ('hrd', 'read:payroll', 'Baca data gaji'),
    ('hrd', 'create:payroll', 'Buat payroll'),
    ('hrd', 'update:payroll', 'Edit payroll'),
    ('hrd', 'view:audit_logs', 'Lihat audit log'),
    ('hrd', 'export:data', 'Export data'),
    ('hrd', 'import:data', 'Import data');

-- Kepala Ruangan permissions
INSERT INTO public.roles_permissions (role, permission, description) VALUES
    ('kepala_ruangan', 'read:unit_employees', 'Baca karyawan di unit'),
    ('kepala_ruangan', 'read:unit_attendance', 'Baca presensi unit'),
    ('kepala_ruangan', 'update:unit_attendance', 'Edit presensi unit'),
    ('kepala_ruangan', 'approve:unit_requests', 'Approve request unit'),
    ('kepala_ruangan', 'reject:unit_requests', 'Reject request unit'),
    ('kepala_ruangan', 'read:unit_requests', 'Baca request unit');

-- Karyawan permissions
INSERT INTO public.roles_permissions (role, permission, description) VALUES
    ('karyawan', 'read:own_profile', 'Baca profil sendiri'),
    ('karyawan', 'update:own_profile', 'Edit profil sendiri'),
    ('karyawan', 'read:own_attendance', 'Baca presensi sendiri'),
    ('karyawan', 'create:own_request', 'Buat request sendiri'),
    ('karyawan', 'read:own_requests', 'Baca request sendiri');

-- 4. Update RLS Policies - Enhanced version

-- Remove old policies
DROP POLICY IF EXISTS "Employees dapat dibaca oleh user yang login" ON public.employees;
DROP POLICY IF EXISTS "Employees dapat diubah oleh admin atau diri sendiri" ON public.employees;
DROP POLICY IF EXISTS "Employees dapat dibuat oleh admin" ON public.employees;
DROP POLICY IF EXISTS "Employees dapat dihapus oleh admin" ON public.employees;

-- New comprehensive RLS policies for employees
CREATE POLICY "employees_read_policy" ON public.employees FOR SELECT USING (
  -- Admin & HRD dapat baca semua
  (SELECT role FROM public.employees WHERE "user_id" = auth.uid()) IN ('admin', 'hrd')
  -- Kepala ruangan dapat baca karyawan di unit mereka
  OR (
    (SELECT role FROM public.employees WHERE "user_id" = auth.uid()) = 'kepala_ruangan'
    AND "unitKerjaId" = (SELECT "unitKerjaId" FROM public.employees WHERE "user_id" = auth.uid())
  )
  -- Karyawan dapat baca profil sendiri saja
  OR "user_id" = auth.uid()
);

CREATE POLICY "employees_insert_policy" ON public.employees FOR INSERT WITH CHECK (
  (SELECT role FROM public.employees WHERE "user_id" = auth.uid()) IN ('admin', 'hrd')
);

CREATE POLICY "employees_update_policy" ON public.employees FOR UPDATE USING (
  -- Admin dapat update siapa saja
  (SELECT role FROM public.employees WHERE "user_id" = auth.uid()) = 'admin'
  -- HRD dapat update semua karyawan
  OR (SELECT role FROM public.employees WHERE "user_id" = auth.uid()) = 'hrd'
  -- Karyawan dapat update profil sendiri
  OR "user_id" = auth.uid()
) WITH CHECK (
  -- Admin dapat update siapa saja
  (SELECT role FROM public.employees WHERE "user_id" = auth.uid()) = 'admin'
  -- HRD dapat update semua karyawan
  OR (SELECT role FROM public.employees WHERE "user_id" = auth.uid()) = 'hrd'
  -- Karyawan dapat update profil sendiri
  OR "user_id" = auth.uid()
);

CREATE POLICY "employees_delete_policy" ON public.employees FOR DELETE USING (
  (SELECT role FROM public.employees WHERE "user_id" = auth.uid()) = 'admin'
);

-- 5. Enhanced Attendance RLS Policies

DROP POLICY IF EXISTS "Attendance dapat dibaca oleh admin atau karyawan sendiri" ON public.attendance;
DROP POLICY IF EXISTS "Attendance dapat diinput oleh admin atau karyawan sendiri" ON public.attendance;
DROP POLICY IF EXISTS "Attendance dapat diubah oleh admin atau karyawan sendiri" ON public.attendance;

CREATE POLICY "attendance_read_policy" ON public.attendance FOR SELECT USING (
  -- Admin dapat baca semua
  (SELECT role FROM public.employees WHERE "user_id" = auth.uid()) = 'admin'
  -- HRD dapat baca semua
  OR (SELECT role FROM public.employees WHERE "user_id" = auth.uid()) = 'hrd'
  -- Kepala ruangan dapat baca presensi di unitnya
  OR (
    (SELECT role FROM public.employees WHERE "user_id" = auth.uid()) = 'kepala_ruangan'
    AND "employeeId" IN (
      SELECT id FROM public.employees 
      WHERE "unitKerjaId" = (SELECT "unitKerjaId" FROM public.employees WHERE "user_id" = auth.uid())
    )
  )
  -- Karyawan dapat baca presensi sendiri
  OR "employeeId" = (SELECT id FROM public.employees WHERE "user_id" = auth.uid())
);

CREATE POLICY "attendance_insert_policy" ON public.attendance FOR INSERT WITH CHECK (
  (SELECT role FROM public.employees WHERE "user_id" = auth.uid()) IN ('admin', 'hrd')
  OR "employeeId" = (SELECT id FROM public.employees WHERE "user_id" = auth.uid())
);

CREATE POLICY "attendance_update_policy" ON public.attendance FOR UPDATE USING (
  -- Admin dapat update siapa saja
  (SELECT role FROM public.employees WHERE "user_id" = auth.uid()) = 'admin'
  -- HRD dapat update
  OR (SELECT role FROM public.employees WHERE "user_id" = auth.uid()) = 'hrd'
) WITH CHECK (
  (SELECT role FROM public.employees WHERE "user_id" = auth.uid()) = 'admin'
  OR (SELECT role FROM public.employees WHERE "user_id" = auth.uid()) = 'hrd'
);

-- 6. Enhanced Request RLS Policies

DROP POLICY IF EXISTS "Requests dapat dibaca oleh admin atau karyawan sendiri" ON public.requests;

CREATE POLICY "requests_read_policy" ON public.requests FOR SELECT USING (
  -- Admin dapat baca semua
  (SELECT role FROM public.employees WHERE "user_id" = auth.uid()) = 'admin'
  -- HRD dapat baca semua
  OR (SELECT role FROM public.employees WHERE "user_id" = auth.uid()) = 'hrd'
  -- Kepala ruangan dapat baca request dari unitnya
  OR (
    (SELECT role FROM public.employees WHERE "user_id" = auth.uid()) = 'kepala_ruangan'
    AND "employeeId" IN (
      SELECT id FROM public.employees 
      WHERE "unitKerjaId" = (SELECT "unitKerjaId" FROM public.employees WHERE "user_id" = auth.uid())
    )
  )
  -- Karyawan dapat baca request sendiri
  OR "employeeId" = (SELECT id FROM public.employees WHERE "user_id" = auth.uid())
);

CREATE POLICY "requests_insert_policy" ON public.requests FOR INSERT WITH CHECK (
  "employeeId" = (SELECT id FROM public.employees WHERE "user_id" = auth.uid())
  OR (SELECT role FROM public.employees WHERE "user_id" = auth.uid()) IN ('admin', 'hrd')
);

CREATE POLICY "requests_update_policy" ON public.requests FOR UPDATE USING (
  (SELECT role FROM public.employees WHERE "user_id" = auth.uid()) IN ('admin', 'hrd')
  OR (
    (SELECT role FROM public.employees WHERE "user_id" = auth.uid()) = 'kepala_ruangan'
    AND "employeeId" IN (
      SELECT id FROM public.employees 
      WHERE "unitKerjaId" = (SELECT "unitKerjaId" FROM public.employees WHERE "user_id" = auth.uid())
    )
  )
) WITH CHECK (
  (SELECT role FROM public.employees WHERE "user_id" = auth.uid()) IN ('admin', 'hrd')
  OR (
    (SELECT role FROM public.employees WHERE "user_id" = auth.uid()) = 'kepala_ruangan'
    AND "employeeId" IN (
      SELECT id FROM public.employees 
      WHERE "unitKerjaId" = (SELECT "unitKerjaId" FROM public.employees WHERE "user_id" = auth.uid())
    )
  )
);

-- 7. Enable RLS on roles_permissions table
ALTER TABLE public.roles_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roles_permissions_read_policy" ON public.roles_permissions FOR SELECT USING (
  (SELECT role FROM public.employees WHERE "user_id" = auth.uid()) IN ('admin', 'hrd')
);

-- 8. Create audit table for RBAC changes
CREATE TABLE IF NOT EXISTS public.rbac_audit (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    action VARCHAR(50), -- 'role_changed', 'permission_granted', 'permission_revoked'
    target_employee_id TEXT REFERENCES public.employees(id),
    old_role VARCHAR(50),
    new_role VARCHAR(50),
    reason TEXT,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on rbac_audit
ALTER TABLE public.rbac_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rbac_audit_read_policy" ON public.rbac_audit FOR SELECT USING (
  (SELECT role FROM public.employees WHERE "user_id" = auth.uid()) = 'admin'
);

-- Grant appropriate permissions
GRANT EXECUTE ON FUNCTION public.current_employee_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON public.employees("user_id");
CREATE INDEX IF NOT EXISTS idx_employees_role ON public.employees(role);
CREATE INDEX IF NOT EXISTS idx_employees_unit ON public.employees("unitKerjaId");
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON public.attendance("employeeId");
CREATE INDEX IF NOT EXISTS idx_requests_employee ON public.requests("employeeId");

COMMIT;

-- Verification queries
SELECT '✅ RBAC Schema Update Complete' as status;
SELECT COUNT(*) as role_count FROM public.roles_permissions;
SELECT DISTINCT role FROM public.employees ORDER BY role;
