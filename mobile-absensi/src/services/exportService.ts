/**
 * src/services/exportService.ts
 *
 * Helper export data ke CSV dan share via React Native Share API.
 * Tidak bergantung pada native module tambahan — Share API built-in RN
 * mendukung text & subject di Android & iOS.
 */
import { Share } from 'react-native';
import type { AttendanceRecord } from '../types';

/** Escape satu nilai agar aman dimasukkan ke kolom CSV. */
function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  // RFC 4180: bila berisi koma, kutip ganda, atau newline → bungkus dengan kutip,
  // dan ubah kutip ganda di dalamnya menjadi dua kutip.
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

const HEADERS = [
  'Tanggal',
  'Check-in',
  'Check-out',
  'Status',
  'Terlambat',
  'Lokasi',
  'Latitude',
  'Longitude',
  'Lembur (jam)',
  'Sumber',
  'Catatan',
];

function toRow(r: AttendanceRecord): string {
  return [
    r.tanggal,
    r.clockIn || '',
    r.clockOut || '',
    r.status,
    r.isLate ? 'Ya' : 'Tidak',
    r.location || '',
    r.latitude ?? '',
    r.longitude ?? '',
    r.overtimeHours ?? 0,
    r.source || '',
    r.notes || '',
  ]
    .map(csvEscape)
    .join(',');
}

/** Bangun string CSV untuk daftar riwayat absensi. */
export function buildAttendanceCsv(records: AttendanceRecord[]): string {
  const lines = [HEADERS.join(','), ...records.map(toRow)];
  // Prefix BOM agar Excel mendeteksi UTF-8 dengan benar.
  return '\uFEFF' + lines.join('\n');
}

/**
 * Bagikan riwayat sebagai teks CSV via Share sheet. Pengguna bisa simpan
 * lewat Drive/email/WA. Sederhana, tanpa file system writes.
 */
export async function shareAttendanceCsv(
  records: AttendanceRecord[],
  meta?: { employeeName?: string; rangeLabel?: string }
): Promise<void> {
  if (!records.length) {
    throw new Error('Tidak ada data untuk diekspor.');
  }
  const csv = buildAttendanceCsv(records);
  const title = `Riwayat Absensi${meta?.employeeName ? ` - ${meta.employeeName}` : ''}${
    meta?.rangeLabel ? ` (${meta.rangeLabel})` : ''
  }`;
  await Share.share(
    {
      title,
      message: csv,
    },
    { subject: title, dialogTitle: 'Bagikan riwayat absensi' }
  );
}
