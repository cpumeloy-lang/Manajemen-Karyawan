import { z } from 'zod';

// ============================================================================
// EMPLOYEE VALIDATION SCHEMAS
// ============================================================================

export const employeeBaseSchema = z.object({
  nama: z.string().min(1, 'Nama wajib diisi').max(100, 'Nama maksimal 100 karakter'),
  email: z.string().email('Email tidak valid').max(255, 'Email maksimal 255 karakter'),
  nik: z.string().min(1, 'NIK wajib diisi').max(20, 'NIK maksimal 20 karakter'),
  role: z.enum(['admin', 'hrd', 'hr', 'kepala_ruangan', 'karyawan'], {
    message: 'Role tidak valid',
  }),
  unitKerjaId: z.string().uuid('Unit Kerja ID tidak valid').nullable().optional(),
  managedUnitId: z.string().uuid('Unit yang dikelola ID tidak valid').nullable().optional(),
  jabatan: z.string().max(100, 'Jabatan maksimal 100 karakter').nullable().optional(),
  departemen: z.string().max(100, 'Departemen maksimal 100 karakter').nullable().optional(),
  tanggalLahir: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal lahir harus YYYY-MM-DD').nullable().optional(),
  jenisKelamin: z.enum(['L', 'P']).nullable().optional(),
  alamat: z.string().max(500, 'Alamat maksimal 500 karakter').nullable().optional(),
  nomorTelepon: z.string().regex(/^\+?\d{10,15}$/, 'Nomor telepon tidak valid').nullable().optional(),
});

export const createEmployeeSchema = employeeBaseSchema.extend({
  password: z.string().min(6, 'Password minimal 6 karakter').max(100, 'Password maksimal 100 karakter'),
});

export const updateEmployeeSchema = employeeBaseSchema.partial();

// ============================================================================
// ORGANIZATION VALIDATION SCHEMAS
// ============================================================================

export const workUnitSchema = z.object({
  nama: z.string().min(1, 'Nama unit wajib diisi').max(100, 'Nama unit maksimal 100 karakter'),
  shifts: z.array(z.any()).optional(),
  shift_assignments: z.array(z.any()).optional(),
});

export const departmentSchema = z.object({
  nama: z.string().min(1, 'Nama departemen wajib diisi').max(100, 'Nama departemen maksimal 100 karakter'),
});

export const positionSchema = z.object({
  nama: z.string().min(1, 'Nama jabatan wajib diisi').max(100, 'Nama jabatan maksimal 100 karakter'),
});

// ============================================================================
// ATTENDANCE VALIDATION SCHEMAS
// ============================================================================

export const attendanceSchema = z.object({
  employeeId: z.string().uuid('Employee ID tidak valid'),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  clockIn: z.string().regex(/^\d{2}:\d{2}:\d{2}$/, 'Format clock-in harus HH:MM:SS').nullable().optional(),
  clockOut: z.string().regex(/^\d{2}:\d{2}:\d{2}$/, 'Format clock-out harus HH:MM:SS').nullable().optional(),
  status: z.enum(['hadir', 'terlambat', 'izin', 'sakit', 'cuti', 'alpha']).optional(),
  shift: z.string().nullable().optional(),
  notes: z.string().max(500, 'Catatan maksimal 500 karakter').nullable().optional(),
});

// ============================================================================
// REQUEST VALIDATION SCHEMAS
// ============================================================================

export const attendanceChangeRequestSchema = z.object({
  employee_id: z.string().uuid('Employee ID tidak valid'),
  attendance_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  request_type: z.enum(['clock_in', 'clock_out', 'status_change'], {
    message: 'Tipe request tidak valid',
  }),
  reason_code: z.string().min(1, 'Alasan wajib diisi'),
  reason_detail: z.string().max(500, 'Detail alasan maksimal 500 karakter').optional(),
  proposed_data: z.record(z.string(), z.any()).optional(),
  current_data: z.record(z.string(), z.any()).optional(),
});

// ============================================================================
// QUERY PARAMETER VALIDATION SCHEMAS
// ============================================================================

export const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/, 'Page harus berupa angka').transform(Number).default(1),
  limit: z.string().regex(/^\d+$/, 'Limit harus berupa angka').transform(Number).default(20),
  search: z.string().max(100, 'Search term maksimal 100 karakter').optional(),
  sort: z.string().max(50, 'Sort field maksimal 50 karakter').optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

export const dateRangeSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD').optional(),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.map(e => e.message).join(', ');
      return { success: false, error: errors };
    }
    return { success: false, error: 'Validasi gagal' };
  }
}

export function validateQueryParams<T>(schema: z.ZodSchema<T>, query: any): { success: true; data: T } | { success: false; error: string } {
  try {
    const result = schema.parse(query);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.map(e => e.message).join(', ');
      return { success: false, error: errors };
    }
    return { success: false, error: 'Validasi query parameter gagal' };
  }
}
