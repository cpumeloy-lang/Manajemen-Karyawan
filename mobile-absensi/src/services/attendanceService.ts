import type { AttendanceRecord, CheckInDraft, MobileUser } from '../types';
import { supabase } from '../config/supabase';

const safeNumber = (value: any): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const mapAttendanceRow = (row: any): AttendanceRecord => ({
  id: String(row.id || ''),
  employeeId: String(row.employeeId || row.employee_id || ''),
  tanggal: String(row.tanggal || row.date || ''),
  clockIn: String(row.clockIn || row.check_in || ''),
  clockOut: String(row.clockOut || row.check_out || ''),
  location: String(row.location || ''),
  latitude: row.latitude ?? row.lat ?? undefined,
  longitude: row.longitude ?? row.lng ?? undefined,
  isLate: Boolean(row.isLate ?? row.is_late ?? false),
  overtimeHours: Number(row.overtimeHours ?? row.overtime_hours ?? 0),
  status: (row.status || 'Pending') as AttendanceRecord['status'],
  source: row.source ?? undefined,
  notes: row.notes ?? undefined,
  deviceId: String(row.deviceId || row.device_id || ''),
  biometricType: (row.biometricType || row.biometric_type) as AttendanceRecord['biometricType'],
  biometricVerified: Boolean(row.biometricVerified ?? row.biometric_verified ?? false),
  faceMatchScoreCheckIn: safeNumber(row.faceMatchScoreCheckIn ?? row.face_match_score_check_in),
  faceMatchScoreCheckOut: safeNumber(row.faceMatchScoreCheckOut ?? row.face_match_score_check_out),
  faceVerificationCheckIn: row.faceVerificationCheckIn || row.face_verification_check_in || undefined,
  faceVerificationCheckOut: row.faceVerificationCheckOut || row.face_verification_check_out || undefined,
});

/**
 * Ekstrak nama kolom yang missing dari pesan PostgREST.
 * Format umum: "Could not find the 'colname' column of 'attendance' in the schema cache".
 * Mengembalikan null jika tidak match.
 */
const extractMissingColumn = (message: string): string | null => {
  const m = String(message || '').match(
    /Could not find the ['"]([^'"]+)['"] column/i
  );
  return m ? m[1] : null;
};

/**
 * Eksekusi operasi DB dengan auto-strip kolom missing.
 * `op(payload)` dipanggil ulang setelah membuang key yang DB tidak punya, max 8 kali.
 * Aman untuk skema lama yang belum punya kolom biometric/device/face.
 */
async function executeWithColumnFallback<T>(
  payload: Record<string, any>,
  op: (p: Record<string, any>) => Promise<{ data: T | null; error: any }>,
  maxRetries = 8
): Promise<{ data: T | null; error: any }> {
  let p = { ...payload };
  for (let i = 0; i < maxRetries; i++) {
    const result = await op(p);
    if (!result.error) return result;
    const missing = extractMissingColumn(result.error.message);
    if (!missing || !(missing in p)) return result;
    delete p[missing];
  }
  return await op(p);
}

const isSchemaError = (message: string) => {
  const normalized = String(message || '').toLowerCase();
  return normalized.includes('column') || normalized.includes('does not exist') || normalized.includes('relation');
};

type AttendancePayload = Partial<
  Pick<
    AttendanceRecord,
    | 'status'
    | 'source'
    | 'notes'
    | 'deviceId'
    | 'biometricType'
    | 'biometricVerified'
    | 'faceMatchScoreCheckIn'
    | 'faceMatchScoreCheckOut'
  >
>;

const flattenExtra = (isSnakeCase: boolean, extra?: AttendancePayload) => {
  if (!extra) return {};

  return isSnakeCase
    ? {
        device_id: extra.deviceId,
        biometric_type: extra.biometricType,
        biometric_verified: extra.biometricVerified,
        face_match_score_check_in: extra.faceMatchScoreCheckIn,
        face_match_score_check_out: extra.faceMatchScoreCheckOut,
        source: extra.source,
        notes: extra.notes,
      }
    : {
        deviceId: extra.deviceId,
        biometricType: extra.biometricType,
        biometricVerified: extra.biometricVerified,
        faceMatchScoreCheckIn: extra.faceMatchScoreCheckIn,
        faceMatchScoreCheckOut: extra.faceMatchScoreCheckOut,
        source: extra.source,
        notes: extra.notes,
      };
};

const buildPayload = (
  user: MobileUser,
  draft: CheckInDraft,
  isSnakeCase: boolean,
  extra?: AttendancePayload
) => {
  const base = {
    location: draft.location,
    latitude: draft.latitude,
    longitude: draft.longitude,
    isLate: false,
    overtimeHours: 0,
    status: 'Pending' as const,
    source: 'mobile' as const,
    notes: 'Check-in awal dari aplikasi mobile',
    ...flattenExtra(isSnakeCase, extra),
  };

  // Postgres TIME column tidak menerima '' (empty string) → pakai null.
  const clockOutValue = draft.clockOut && draft.clockOut.trim() !== '' ? draft.clockOut : null;

  return isSnakeCase
    ? {
        employee_id: user.id,
        date: draft.tanggal,
        check_in: draft.clockIn,
        check_out: clockOutValue,
        ...base,
      }
    : {
        employeeId: user.id,
        tanggal: draft.tanggal,
        clockIn: draft.clockIn,
        clockOut: clockOutValue,
        ...base,
      };
};

/**
 * Compute isLate & overtimeHours based on actual shift times.
 * @param shiftStart  "HH:MM" shift start (default '08:00')
 * @param shiftEnd    "HH:MM" shift end   (default '16:00')
 * @param tolerance   minutes tolerance for late (default 15)
 */
const computeAttendanceSummary = (
  clockIn: string,
  clockOut: string,
  shiftStart = '08:00',
  shiftEnd   = '16:00',
  tolerance  = 15
) => {
  const [inHour, inMinute]   = clockIn.split(':').map(Number);
  const [outHour, outMinute] = clockOut.split(':').map(Number);
  const [startH, startM]     = shiftStart.split(':').map(Number);
  const [endH,   endM]       = shiftEnd.split(':').map(Number);

  // Shift duration (handles overnight)
  let shiftDuration = (endH + endM / 60) - (startH + startM / 60);
  if (shiftDuration <= 0) shiftDuration += 24;

  const isLate = (inHour * 60 + inMinute) > (startH * 60 + startM + tolerance);

  const inValue = inHour + inMinute / 60;
  let outValue = outHour + outMinute / 60;
  if (outValue < inValue) outValue += 24;

  const overtimeHours = Math.max(0, Number((outValue - inValue - shiftDuration).toFixed(2)));
  return { isLate, overtimeHours, status: isLate ? 'Terlambat' : 'Hadir' as const };
};

export const attendanceService = {
  async list(userId: string): Promise<AttendanceRecord[]> {
    const query = async (isSnakeCase: boolean) => {
      let builder = supabase.from('attendance').select('*');
      builder = builder.eq(isSnakeCase ? 'employee_id' : 'employeeId', userId);
      builder = builder.order(isSnakeCase ? 'date' : 'tanggal', { ascending: false });
      return builder;
    };

    let { data, error } = await query(false);
    if (error && isSchemaError(error.message)) {
      const fallback = await query(true);
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      throw new Error(error.message);
    }

    return (data || []).map(mapAttendanceRow);
  },

  async checkIn(
    user: MobileUser,
    draft: CheckInDraft,
    extra?: AttendancePayload
  ): Promise<AttendanceRecord> {
    const insert = (isSnakeCase: boolean) => async (p: Record<string, any>) => {
      const { data, error } = await supabase
        .from('attendance')
        .upsert(p, {
          onConflict: isSnakeCase ? 'employee_id,date' : 'employeeId,tanggal',
        })
        .select('*')
        .single();
      return { data, error };
    };

    let result = await executeWithColumnFallback<any>(
      buildPayload(user, draft, false, extra),
      insert(false)
    );
    if (result.error && isSchemaError(result.error.message)) {
      result = await executeWithColumnFallback<any>(
        buildPayload(user, draft, true, extra),
        insert(true)
      );
    }

    if (result.error || !result.data) {
      throw new Error(result.error?.message || 'Check-in gagal');
    }

    return mapAttendanceRow(result.data);
  },

  async checkOut(
    user: MobileUser,
    draft: CheckInDraft,
    extra?: AttendancePayload
  ): Promise<AttendanceRecord> {
    const clockOut = new Date().toTimeString().slice(0, 5);

    // Try to load the employee's per-date schedule for accurate shift times
    let shiftStart = '08:00';
    let shiftEnd   = '16:00';
    let tolerance  = 15;
    try {
      const { data: sched } = await supabase
        .from('employee_schedules')
        .select('shift_start_time, shift_end_time, is_off_day')
        .eq('employee_id', user.id)
        .eq('date', draft.tanggal)
        .maybeSingle();
      if (sched && !sched.is_off_day && sched.shift_start_time && sched.shift_end_time) {
        shiftStart = sched.shift_start_time as string;
        shiftEnd   = sched.shift_end_time   as string;
      } else {
        // Fallback: try system_settings default_shifts
        const { data: settings } = await supabase
          .from('system_settings')
          .select('default_shifts')
          .limit(1)
          .maybeSingle();
        if (settings?.default_shifts) {
          const shifts = settings.default_shifts as any[];
          const found = shifts.find((s: any) => s.name === user.shift);
          if (found) {
            shiftStart = found.startTime || shiftStart;
            shiftEnd   = found.endTime   || shiftEnd;
            tolerance  = found.lateToleranceMinutes ?? tolerance;
          }
        }
      }
    } catch { /* ignore — use defaults */ }

    const summary = computeAttendanceSummary(draft.clockIn, clockOut, shiftStart, shiftEnd, tolerance);
    const payload = {
      clockOut,
      status: summary.status,
      isLate: summary.isLate,
      overtimeHours: summary.overtimeHours,
      ...extra,
    };

    const buildUpdateFields = (isSnakeCase: boolean): Record<string, any> => {
      const fields: Record<string, any> = isSnakeCase
        ? {
            check_out: payload.clockOut,
            status: payload.status,
            is_late: payload.isLate,
            overtime_hours: payload.overtimeHours,
          }
        : {
            clockOut: payload.clockOut,
            status: payload.status,
            isLate: payload.isLate,
            overtimeHours: payload.overtimeHours,
          };

      if (payload.deviceId !== undefined) {
        fields[isSnakeCase ? 'device_id' : 'deviceId'] = payload.deviceId;
      }
      if (payload.biometricType !== undefined) {
        fields[isSnakeCase ? 'biometric_type' : 'biometricType'] = payload.biometricType;
      }
      if (payload.biometricVerified !== undefined) {
        fields[isSnakeCase ? 'biometric_verified' : 'biometricVerified'] = payload.biometricVerified;
      }
      if (payload.faceMatchScoreCheckOut !== undefined) {
        fields[isSnakeCase ? 'face_match_score_check_out' : 'faceMatchScoreCheckOut'] = payload.faceMatchScoreCheckOut;
      }
      if (payload.source !== undefined) {
        fields.source = payload.source;
      }
      if (payload.notes !== undefined) {
        fields.notes = payload.notes;
      }
      return fields;
    };

    const runUpdate = (isSnakeCase: boolean) => async (p: Record<string, any>) => {
      return supabase
        .from('attendance')
        .update(p)
        .eq(isSnakeCase ? 'employee_id' : 'employeeId', user.id)
        .eq(isSnakeCase ? 'date' : 'tanggal', draft.tanggal)
        .select('*')
        .single();
    };

    let result = await executeWithColumnFallback<any>(
      buildUpdateFields(false),
      runUpdate(false)
    );
    if (result.error && isSchemaError(result.error.message)) {
      result = await executeWithColumnFallback<any>(
        buildUpdateFields(true),
        runUpdate(true)
      );
    }

    if (result.error || !result.data) {
      throw new Error(result.error?.message || 'Check-out gagal');
    }

    return mapAttendanceRow(result.data);
  },
};
