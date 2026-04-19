import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import {
  sanitizeDateFields,
  excelDateToIso,
  toSafeString,
  normalizeStatus,
} from './dateUtils';

describe('dateUtils', () => {
  it('sanitizes nullable date fields', () => {
    const input = {
      nama: 'Budi',
      birthDate: '',
      hireDate: '2025-01-10',
      tanggalKadaluarsaSTR: undefined,
    };

    const result = sanitizeDateFields(input);

    expect(result.birthDate).toBeNull();
    expect(result.hireDate).toBe('2025-01-10');
    expect(result.tanggalKadaluarsaSTR).toBeNull();
    expect(result.nama).toBe('Budi');
  });

  it('converts excel numeric date to ISO string', () => {
    const serial = 45292;
    const parsed = XLSX.SSF.parse_date_code(serial);
    const expected = `${String(parsed?.y).padStart(4, '0')}-${String(parsed?.m).padStart(2, '0')}-${String(parsed?.d).padStart(2, '0')}`;

    expect(excelDateToIso(serial)).toBe(expected);
  });

  it('converts DD/MM/YYYY format and keeps ISO date', () => {
    expect(excelDateToIso('18/04/2026')).toBe('2026-04-18');
    expect(excelDateToIso('2026-04-18')).toBe('2026-04-18');
  });

  it('returns empty string for invalid values', () => {
    expect(excelDateToIso(null)).toBe('');
    expect(excelDateToIso('')).toBe('');
    expect(excelDateToIso('bukan tanggal')).toBe('');
  });

  it('normalizes strings and status safely', () => {
    expect(toSafeString('  test  ')).toBe('test');
    expect(toSafeString(null)).toBe('');
    expect(normalizeStatus('aktif')).toBe('Aktif');
    expect(normalizeStatus('Cuti')).toBe('Cuti');
    expect(normalizeStatus('non aktif')).toBe('Non-Aktif');
    expect(normalizeStatus('unknown')).toBe('Aktif');
  });
});
