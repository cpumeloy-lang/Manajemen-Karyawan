import { AttendanceRecord } from '../types';

type AttendanceInput = Omit<AttendanceRecord, 'id'> & Record<string, any>;

export const normalizeAttendanceRecord = (record: AttendanceInput): AttendanceInput => {
  const resolvedClockOut = record.clockOut || record.check_out;

  return {
    ...record,
    employeeId: record.employeeId || record.employee_id,
    tanggal: record.tanggal || record.date,
    clockIn: record.clockIn || record.check_in,
    clockOut: resolvedClockOut,
    location: record.location || record.lokasi || '',
    latitude: record.latitude ?? record.lat,
    longitude: record.longitude ?? record.lng,
    status:
      record.status ||
      (resolvedClockOut ? (record.isLate ? 'Terlambat' : 'Hadir') : 'Pending'),
    source: record.source || 'web-ess',
    notes: record.notes || record.note || '',
    photoUrl: record.photoUrl || record.photo_url || undefined,
    deviceId: record.deviceId || record.device_id || undefined,
    biometricType: record.biometricType || record.biometric_type || undefined,
    biometricVerified: record.biometricVerified ?? record.biometric_verified ?? undefined,
    faceMatchScoreCheckIn: record.faceMatchScoreCheckIn ?? record.face_match_score_check_in ?? undefined,
    faceMatchScoreCheckOut: record.faceMatchScoreCheckOut ?? record.face_match_score_check_out ?? undefined,
  };
};

export const mapAttendanceForDb = (
  normalizedRecord: AttendanceInput,
  isSnakeCase: boolean
): AttendanceInput => {
  if (!isSnakeCase) return normalizedRecord;

  return {
    ...normalizedRecord,
    employee_id: normalizedRecord.employeeId,
    date: normalizedRecord.tanggal,
    check_in: normalizedRecord.clockIn,
    check_out: normalizedRecord.clockOut,
    lokasi: normalizedRecord.location,
    latitude: normalizedRecord.latitude,
    longitude: normalizedRecord.longitude,
    status: normalizedRecord.status,
    source: normalizedRecord.source,
    notes: normalizedRecord.notes,
    photo_url: normalizedRecord.photoUrl,
    device_id: normalizedRecord.deviceId,
    biometric_type: normalizedRecord.biometricType,
    biometric_verified: normalizedRecord.biometricVerified,
    face_match_score_check_in: normalizedRecord.faceMatchScoreCheckIn,
    face_match_score_check_out: normalizedRecord.faceMatchScoreCheckOut,
  };
};

export const isSchemaErrorMessage = (message: string): boolean => {
  const normalized = String(message || '').toLowerCase();
  return normalized.includes('column') || normalized.includes('does not exist') || normalized.includes('relation');
};
