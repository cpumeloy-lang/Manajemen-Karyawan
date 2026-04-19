import { toSafeString } from './dateUtils';

export interface ImportValidationError {
  baris: number;
  nama: string;
  email: string;
  nik: string;
  kategori?: 'SKIP' | 'ERROR';
  error: string;
}

export const getImportField = (row: any, ...keys: string[]) => {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value;
    }
  }
  return '';
};

export const normalizeImportMaritalStatus = (value: unknown) => {
  const raw = toSafeString(value).toLowerCase().replace(/[-_\s]/g, '');
  if (!raw) return 'Single';
  if (raw === 'single' || raw === 'belummenikah' || raw === 'lajang') return 'Single';
  if (raw === 'married' || raw === 'menikah' || raw === 'kawin') return 'Married';
  if (raw === 'divorced' || raw === 'cerai' || raw === 'ceraihidup') return 'Divorced';
  if (raw === 'widowed' || raw === 'janda' || raw === 'duda' || raw === 'ceraimati') return 'Widowed';
  return 'Single';
};

export const validateImportInternalDuplicates = (importedData: any[]) => {
  const errors: string[] = [];
  const errorRows: ImportValidationError[] = [];
  const seenEmails = new Map<string, number>();
  const seenNik = new Map<string, number>();

  for (let i = 0; i < importedData.length; i++) {
    const row = importedData[i];
    const rowNumber = i + 2;
    const email = toSafeString(getImportField(row, 'Email', 'email')).toLowerCase();
    const nik = toSafeString(getImportField(row, 'NIK', 'nik'));

    if (email) {
      const firstSeen = seenEmails.get(email);
      if (firstSeen !== undefined) {
        const errorMsg = `Email ${email} duplikat dengan baris ${firstSeen}`;
        errors.push(`Baris ${rowNumber}: ${errorMsg}`);
        errorRows.push({
          baris: rowNumber,
          nama: toSafeString(getImportField(row, 'Nama', 'nama')),
          email,
          nik,
          error: errorMsg,
        });
      } else {
        seenEmails.set(email, rowNumber);
      }
    }

    if (nik) {
      const firstSeenNik = seenNik.get(nik);
      if (firstSeenNik !== undefined) {
        const errorMsg = `NIK ${nik} duplikat dengan baris ${firstSeenNik}`;
        errors.push(`Baris ${rowNumber}: ${errorMsg}`);
        errorRows.push({
          baris: rowNumber,
          nama: toSafeString(getImportField(row, 'Nama', 'nama')),
          email,
          nik,
          error: errorMsg,
        });
      } else {
        seenNik.set(nik, rowNumber);
      }
    }
  }

  return { errors, errorRows };
};

export const validateRequiredImportFields = (row: any) => {
  const nama = toSafeString(getImportField(row, 'Nama', 'nama'));
  const email = toSafeString(getImportField(row, 'Email', 'email')).toLowerCase();

  if (!nama || !email) {
    return {
      valid: false,
      nama,
      email,
      error: 'Nama dan Email wajib diisi',
    };
  }

  return {
    valid: true,
    nama,
    email,
    error: '',
  };
};

export const shouldSkipExistingEmail = (existingEmails: Set<string>, email: string) => {
  return Boolean(email) && existingEmails.has(email.toLowerCase());
};
