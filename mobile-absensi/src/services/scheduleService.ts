/**
 * src/services/scheduleService.ts
 *
 * Akses jadwal shift karyawan dari tabel `employee_schedules`.
 * Hanya read-only di mobile — pengaturan jadwal dilakukan dari portal web HR.
 */
import { supabase } from '../config/supabase';

export interface EmployeeSchedule {
  id: string;
  scheduleDate: string;       // YYYY-MM-DD
  shiftName: string;
  shiftStartTime?: string;    // HH:MM:SS
  shiftEndTime?: string;
  isOffDay: boolean;
  status: 'draft' | 'published' | 'swapped' | 'override' | 'cancelled';
  swappedWithEmployeeId?: string;
}

const mapRow = (row: any): EmployeeSchedule => ({
  id: String(row.id || ''),
  scheduleDate: String(row.schedule_date || row.scheduleDate || ''),
  shiftName: String(row.shift_name || row.shiftName || '-'),
  shiftStartTime: row.shift_start_time || row.shiftStartTime || undefined,
  shiftEndTime: row.shift_end_time || row.shiftEndTime || undefined,
  isOffDay: Boolean(row.is_off_day ?? row.isOffDay ?? false),
  status: (row.status || 'draft') as EmployeeSchedule['status'],
  swappedWithEmployeeId: row.swapped_with_employee_id || row.swappedWithEmployeeId || undefined,
});

export const scheduleService = {
  /**
   * Ambil jadwal karyawan dalam rentang tanggal (inclusive).
   * Defaultnya 14 hari ke depan dari hari ini.
   */
  async listForEmployee(
    employeeId: string,
    range?: { from?: string; to?: string }
  ): Promise<EmployeeSchedule[]> {
    const today = new Date();
    const fromDate = range?.from || today.toISOString().slice(0, 10);
    const toDate = range?.to || (() => {
      const end = new Date(today);
      end.setDate(end.getDate() + 14);
      return end.toISOString().slice(0, 10);
    })();

    const { data, error } = await supabase
      .from('employee_schedules')
      .select('id, schedule_date, shift_name, shift_start_time, shift_end_time, is_off_day, status, swapped_with_employee_id')
      .eq('employee_id', employeeId)
      .gte('schedule_date', fromDate)
      .lte('schedule_date', toDate)
      .neq('status', 'cancelled')
      .order('schedule_date', { ascending: true });

    if (error) {
      // Tabel mungkin belum ada di lingkungan tertentu — tampilkan kosong agar UI graceful.
      const msg = String(error.message || '').toLowerCase();
      if (msg.includes('does not exist') || msg.includes('relation')) {
        console.warn('[scheduleService] employee_schedules table missing:', error.message);
        return [];
      }
      throw new Error(error.message);
    }

    return (data || []).map(mapRow);
  },

  /** Jadwal hari ini (atau null jika tidak ada). */
  async getToday(employeeId: string): Promise<EmployeeSchedule | null> {
    const today = new Date().toISOString().slice(0, 10);
    const list = await this.listForEmployee(employeeId, { from: today, to: today });
    return list[0] || null;
  },
};
