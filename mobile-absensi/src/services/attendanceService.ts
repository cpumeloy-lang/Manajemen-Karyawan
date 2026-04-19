import type { AttendanceRecord, CheckInDraft, MobileUser } from '../types';
import { supabase } from '../config/supabase';

const mapAttendanceRow = (row: any): AttendanceRecord => ({
  id: String(row.id || ''),
  employeeId: String(row.employeeId || row.employee_id || ''),
  tanggal: String(row.tanggal || row.date || ''),
  clockIn: String(row.clockIn || row.check_in || ''),
  clockOut: String(row.clockOut || row.check_out || ''),
  location: String(row.location || ''),
  isLate: Boolean(row.isLate ?? row.is_late ?? false),
  overtimeHours: Number(row.overtimeHours ?? row.overtime_hours ?? 0),
  status: (row.status || 'Pending') as AttendanceRecord['status'],
});

const isSchemaError = (message: string) => {
  const normalized = message.toLowerCase();
  return normalized.includes('column') || normalized.includes('does not exist') || normalized.includes('relation');
};

const buildPayload = (user: MobileUser, draft: CheckInDraft, isSnakeCase: boolean) => {
  const base = {
    location: draft.location,
    isLate: false,
    overtimeHours: 0,
    status: 'Pending' as const,
  };

  return isSnakeCase
    ? {
        employee_id: user.id,
        date: draft.tanggal,
        check_in: draft.clockIn,
        check_out: '',
        ...base,
      }
    : {
        employeeId: user.id,
        tanggal: draft.tanggal,
        clockIn: draft.clockIn,
        clockOut: '',
        ...base,
      };
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

  async checkIn(user: MobileUser, draft: CheckInDraft): Promise<AttendanceRecord> {
    const insert = async (isSnakeCase: boolean) => {
      const { data, error } = await supabase.from('attendance').insert(buildPayload(user, draft, isSnakeCase)).select('*').single();
      return { data, error };
    };

    let result = await insert(false);
    if (result.error && isSchemaError(result.error.message)) {
      result = await insert(true);
    }

    if (result.error || !result.data) {
      throw new Error(result.error?.message || 'Check-in gagal');
    }

    return mapAttendanceRow(result.data);
  },

  async checkOut(user: MobileUser, draft: CheckInDraft): Promise<AttendanceRecord> {
    const clockOut = new Date().toTimeString().slice(0, 5);
    const update = async (isSnakeCase: boolean) => {
      const builder = supabase
        .from('attendance')
        .update(
          isSnakeCase
            ? {
                check_out: clockOut,
                status: 'Recorded',
              }
            : {
                clockOut,
                status: 'Recorded',
              }
        )
        .eq(isSnakeCase ? 'employee_id' : 'employeeId', user.id)
        .eq(isSnakeCase ? 'date' : 'tanggal', draft.tanggal)
        .select('*')
        .single();

      return builder;
    };

    let result = await update(false);
    if (result.error && isSchemaError(result.error.message)) {
      result = await update(true);
    }

    if (result.error || !result.data) {
      throw new Error(result.error?.message || 'Check-out gagal');
    }

    return mapAttendanceRow(result.data);
  },
};
