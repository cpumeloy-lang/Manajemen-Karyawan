import { z } from 'zod';

const idSchema = z.string().optional().nullable().or(z.literal(''));

export const saveUnitSchema = z.object({
  unit: z.object({
    id: idSchema,
    nama: z.string().min(1, 'Nama unit wajib diisi').max(200),
    shifts: z.any().optional().nullable(),
    shift_assignments: z.any().optional().nullable(),
  }).passthrough(),
});

export const saveDepartmentSchema = z.object({
  department: z.object({
    id: idSchema,
    nama: z.string().min(1, 'Nama departemen wajib diisi').max(200),
  }).passthrough(),
});

export const savePositionSchema = z.object({
  position: z.object({
    id: idSchema,
    nama: z.string().min(1, 'Nama jabatan wajib diisi').max(200),
  }).passthrough(),
});
