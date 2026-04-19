import * as XLSX from 'xlsx';

/**
 * Date Utilities for field sanitization and conversion
 */

export const sanitizeDateFields = (data: any) => {
  return {
    ...data,
    birthDate: data.birthDate || null,
    hireDate: data.hireDate || null,
    tanggalKadaluarsaSTR: data.tanggalKadaluarsaSTR || null,
  };
};

export const excelDateToIso = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '';

  // Handle Excel numeric date format
  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      const year = String(parsed.y).padStart(4, '0');
      const month = String(parsed.m).padStart(2, '0');
      const day = String(parsed.d).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  const asString = String(value).trim();
  if (!asString) return '';

  // Handle DD/MM/YYYY format
  const ddmmyyyy = asString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const [, dd, mm, yyyy] = ddmmyyyy;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }

  // Try to parse as ISO string or other formats
  const parsedDate = new Date(asString);
  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate.toISOString().split('T')[0];
  }

  return '';
};

export const toSafeString = (value: unknown): string =>
  value === null || value === undefined ? '' : String(value).trim();

export const normalizeStatus = (value: unknown): string => {
  const raw = toSafeString(value);
  if (!raw) return 'Aktif';

  const lower = raw.toLowerCase().replace(/\s+/g, '');
  if (lower === 'aktif') return 'Aktif';
  if (lower === 'cuti') return 'Cuti';
  if (lower === 'non-aktif' || lower === 'nonaktif') return 'Non-Aktif';
  return 'Aktif';
};
