export const formatClock = (date = new Date()) => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const formatDate = (date = new Date()) => {
  return date.toISOString().split('T')[0];
};

const DAYS_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const DAYS_ID_LONG = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTHS_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];
const MONTHS_ID_LONG = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const parseLocalDate = (input: string | Date): Date | null => {
  if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : input;
  if (!input) return null;
  // Accept "YYYY-MM-DD" sebagai date-only lokal (hindari geser zona waktu)
  const isoDateOnly = /^\d{4}-\d{2}-\d{2}$/;
  if (isoDateOnly.test(input)) {
    const [y, m, d] = input.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * Format tanggal versi Indonesia singkat: "Sen, 4 Mei 2026"
 */
export const formatDateID = (input: string | Date): string => {
  const date = parseLocalDate(input);
  if (!date) return String(input || '-');
  return `${DAYS_ID[date.getDay()]}, ${date.getDate()} ${MONTHS_ID[date.getMonth()]} ${date.getFullYear()}`;
};

/**
 * Format tanggal versi Indonesia panjang: "Senin, 4 Mei 2026"
 */
export const formatDateLongID = (input: string | Date): string => {
  const date = parseLocalDate(input);
  if (!date) return String(input || '-');
  return `${DAYS_ID_LONG[date.getDay()]}, ${date.getDate()} ${MONTHS_ID_LONG[date.getMonth()]} ${date.getFullYear()}`;
};
