import { z } from 'zod';

export const createEmployeeSchema = z.object({
  employeeData: z.object({
    nama: z.string().min(1, 'Nama wajib diisi').max(200),
    email: z.string().email('Format email tidak valid'),
    role: z.string().optional(),
    jabatan: z.string().optional(),
    departemen: z.string().optional(),
    unitKerjaId: z.string().uuid().optional().nullable(),
    telepon: z.string().max(20).optional().nullable(),
    status: z.string().optional(),
    shift: z.string().optional().nullable(),
    user_id: z.string().uuid().optional().nullable(),
    userId: z.string().uuid().optional().nullable(),
    birthDate: z.string().optional().nullable(),
    ktpNumber: z.string().max(20).optional().nullable(),
    agama: z.string().optional().nullable(),
    maritalStatus: z.string().optional().nullable(),
    hireDate: z.string().optional().nullable(),
    sisaCuti: z.number().int().min(0).optional().nullable(),
    spesialisasi: z.string().optional().nullable(),
    kredensial: z.string().optional().nullable(),
    nomorSTR: z.string().optional().nullable(),
    tanggalKadaluarsaSTR: z.string().optional().nullable(),
    npwp: z.string().optional().nullable(),
    bpjsKesehatan: z.string().optional().nullable(),
    bpjsKetenagakerjaan: z.string().optional().nullable(),
    address: z.record(z.any()).optional().nullable(),
    bankAccount: z.record(z.any()).optional().nullable(),
    compensation: z.record(z.any()).optional().nullable(),
    education: z.array(z.record(z.any())).optional().nullable(),
    emergencyContacts: z.array(z.record(z.any())).optional().nullable(),
    sertifikasi: z.array(z.string()).optional().nullable(),
    kompetensi: z.array(z.string()).optional().nullable(),
    workHistory: z.array(z.record(z.any())).optional().nullable(),
    foto: z.string().url().optional().nullable(),
  }).passthrough(),
  password: z.string().min(6, 'Password minimal 6 karakter').optional().or(z.literal('')),
  documents: z.array(z.object({
    name: z.string().min(1),
    type: z.string().min(1),
    fileUrl: z.string().url(),
    uploadedAt: z.string().optional(),
  })).optional().default([]),
});

export const updateEmployeeSchema = z.object({
  updateData: z.object({}).passthrough().refine(
    (data) => Object.keys(data).length > 0,
    { message: 'updateData tidak boleh kosong' }
  ),
  documents: z.array(z.object({
    name: z.string().min(1),
    type: z.string().min(1),
    fileUrl: z.string().url(),
    uploadedAt: z.string().optional(),
  })).optional().default([]),
  newPassword: z.string().min(6, 'Password minimal 6 karakter').optional().or(z.literal('')),
});
