import { describe, expect, it } from 'vitest';
import {
  getImportField,
  normalizeImportMaritalStatus,
  shouldSkipExistingEmail,
  validateRequiredImportFields,
  validateImportInternalDuplicates,
} from '../utils/employeeImportUtils.ts';

describe('useEmployeeImport helpers', () => {
  it('reads alias field correctly', () => {
    const row = { nama: 'Budi', Email: 'budi@example.com', nik: 'NIK-001' };

    expect(getImportField(row, 'Nama', 'nama')).toBe('Budi');
    expect(getImportField(row, 'NIK', 'nik')).toBe('NIK-001');
    expect(getImportField(row, 'Unknown', 'none')).toBe('');
  });

  it('normalizes marital status variants', () => {
    expect(normalizeImportMaritalStatus('MENIKAH')).toBe('Married');
    expect(normalizeImportMaritalStatus('belum menikah')).toBe('Single');
    expect(normalizeImportMaritalStatus('cerai mati')).toBe('Widowed');
    expect(normalizeImportMaritalStatus('cerai hidup')).toBe('Divorced');
  });

  it('detects duplicate email and nik in import payload', () => {
    const rows = [
      { Nama: 'A', Email: 'a@test.com', NIK: '001' },
      { Nama: 'B', Email: 'a@test.com', NIK: '002' },
      { Nama: 'C', Email: 'c@test.com', NIK: '001' },
    ];

    const result = validateImportInternalDuplicates(rows);

    expect(result.errors.length).toBe(2);
    expect(result.errors[0]).toContain('Email a@test.com duplikat');
    expect(result.errors[1]).toContain('NIK 001 duplikat');
    expect(result.errorRows[0].baris).toBe(3);
    expect(result.errorRows[1].baris).toBe(4);
  });

  it('validates only nama is required, email is optional', () => {
    const missingName = validateRequiredImportFields({ Nama: '', Email: 'andi@test.com' });
    const emptyEmail = validateRequiredImportFields({ Nama: 'Andi', Email: '' });
    const validRow = validateRequiredImportFields({ Nama: 'Andi', Email: 'andi@test.com' });

    expect(missingName.valid).toBe(false);
    expect(missingName.error).toContain('Nama wajib diisi');
    expect(emptyEmail.valid).toBe(true); // Email kosong diperbolehkan
    expect(validRow.valid).toBe(true);
  });

  it('marks existing email rows to be skipped', () => {
    const existing = new Set(['admin@hospital.com', 'hr@hospital.com']);

    expect(shouldSkipExistingEmail(existing, 'admin@hospital.com')).toBe(true);
    expect(shouldSkipExistingEmail(existing, 'ADMIN@HOSPITAL.COM')).toBe(true);
    expect(shouldSkipExistingEmail(existing, 'new@hospital.com')).toBe(false);
  });

  it('reads jabatan field from Excel (header: Jabatan or jabatan)', () => {
    const row1 = { Nama: 'Budi', Email: 'budi@example.com', Jabatan: 'Dokter Umum' };
    const row2 = { Nama: 'Andi', Email: 'andi@example.com', jabatan: 'Perawat' };

    expect(getImportField(row1, 'Jabatan', 'jabatan')).toBe('Dokter Umum');
    expect(getImportField(row2, 'Jabatan', 'jabatan')).toBe('Perawat');
    expect(getImportField({ Nama: 'C' }, 'Jabatan', 'jabatan')).toBe('');
  });

  it('reads departemen field from Excel (header: Departemen or departemen)', () => {
    const row1 = { Nama: 'Budi', Email: 'budi@example.com', Departemen: 'Medis' };
    const row2 = { Nama: 'Andi', Email: 'andi@example.com', departemen: 'Keperawatan' };

    expect(getImportField(row1, 'Departemen', 'departemen')).toBe('Medis');
    expect(getImportField(row2, 'Departemen', 'departemen')).toBe('Keperawatan');
    expect(getImportField({ Nama: 'C' }, 'Departemen', 'departemen')).toBe('');
  });
});
