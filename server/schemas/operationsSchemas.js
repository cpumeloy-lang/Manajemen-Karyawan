import { z } from 'zod';

export const cacheInvalidateSchema = z.object({
  pattern: z.string().optional(),
  userId: z.string().optional(),
}).refine(
  (data) => Boolean(data.pattern || data.userId),
  { message: 'pattern atau userId wajib diisi' }
);

export const bulkAttendanceChangeSchema = z.object({
  payloads: z.array(z.object({
    employee_id: z.string().uuid('employee_id harus berupa UUID'),
    tanggal: z.string().min(1, 'tanggal wajib diisi'),
    field: z.string().min(1, 'field wajib diisi'),
    reason: z.string().min(1, 'reason wajib diisi'),
    new_value: z.any().optional(),
  }).passthrough()).min(1, 'Payloads is required and cannot be empty'),
});

export const deleteAuditLogsSchema = z.object({
  mode: z.enum(['all', 'old']).optional(),
  days: z.number().int().positive().optional(),
});
