-- ===========================================
-- DATABASE OPTIMIZATION (SAFE - CURRENT SCHEMA)
-- Disesuaikan dengan skema HRMS saat ini
-- ===========================================

-- Employees
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employees_user_id ON public.employees("user_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employees_role ON public.employees(role);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employees_unit_kerja ON public.employees("unitKerjaId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employees_status ON public.employees(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employees_email ON public.employees(email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employees_nik ON public.employees(nik);

-- Attendance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_employee_tanggal ON public.attendance("employeeId", tanggal);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_tanggal ON public.attendance(tanggal);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_status ON public.attendance(status);

-- Requests
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_requests_employee_status ON public.requests("employeeId", status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_requests_approver_status ON public.requests("approvedBy", status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_requests_type_status ON public.requests(type, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_requests_requested_at ON public.requests("requestedAt");

-- Documents
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_employee ON public.documents("employeeId");

-- Units / master
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_units_nama ON public.units(nama);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_departments_nama ON public.departments(nama);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_positions_nama ON public.positions(nama);

-- Partial indexes mengikuti nilai status aktual
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employees_active_partial
  ON public.employees(id)
  WHERE status = 'Aktif';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_hadir_partial
  ON public.attendance(id)
  WHERE status = 'Hadir';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_requests_pending_partial
  ON public.requests(id)
  WHERE status = 'Pending';

-- Verifikasi
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('employees', 'attendance', 'requests', 'documents', 'units', 'departments', 'positions')
ORDER BY tablename, indexname;
