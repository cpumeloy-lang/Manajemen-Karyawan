/**
 * src/services/requestService.ts
 *
 * CRUD pengajuan Cuti / Izin / Overtime / Reimburse dari karyawan.
 *
 * Skema DB bervariasi antar environment (camelCase vs snake_case). Service
 * mencoba camelCase dulu; jika Supabase mengeluh kolom tidak ada, otomatis
 * re-attempt dengan snake_case — pola yang sama seperti `attendanceService`.
 */
import { supabase } from '../config/supabase';

export type RequestType = 'Cuti' | 'Izin' | 'Overtime' | 'Reimburse';
export type RequestStatus = 'Pending' | 'Approved' | 'Rejected';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  type: RequestType;
  startDate: string;  // YYYY-MM-DD
  endDate: string;
  reason: string;
  status: RequestStatus;
  amount?: number;
  approvedBy?: string;
  approvedAt?: string;
  createdAt?: string;
}

export interface LeaveRequestDraft {
  type: RequestType;
  startDate: string;
  endDate: string;
  reason: string;
  amount?: number;
}

const isSchemaError = (msg: string): boolean => {
  const m = String(msg || '').toLowerCase();
  return (
    m.includes('does not exist') ||
    m.includes('column') ||
    m.includes('schema cache')
  );
};

const mapRow = (row: any): LeaveRequest => ({
  id: String(row.id || ''),
  employeeId: String(row.employeeId || row.employee_id || ''),
  type: (row.type || 'Izin') as RequestType,
  startDate: String(row.startDate || row.start_date || ''),
  endDate: String(row.endDate || row.end_date || ''),
  reason: row.reason || '',
  status: (row.status || 'Pending') as RequestStatus,
  amount: typeof row.amount === 'number' ? row.amount : undefined,
  approvedBy: row.approvedBy || row.approved_by || undefined,
  approvedAt: row.approvedAt || row.approved_at || undefined,
  createdAt: row.createdAt || row.created_at || undefined,
});

const buildPayload = (employeeId: string, draft: LeaveRequestDraft, snake: boolean) => {
  if (snake) {
    return {
      employee_id: employeeId,
      type: draft.type,
      start_date: draft.startDate,
      end_date: draft.endDate,
      reason: draft.reason,
      status: 'Pending' as RequestStatus,
      amount: draft.amount ?? null,
    };
  }
  return {
    employeeId,
    type: draft.type,
    startDate: draft.startDate,
    endDate: draft.endDate,
    reason: draft.reason,
    status: 'Pending' as RequestStatus,
    amount: draft.amount ?? null,
  };
};

const validateDraft = (draft: LeaveRequestDraft): void => {
  if (!draft.type) throw new Error('Jenis pengajuan wajib dipilih.');
  if (!draft.startDate || !draft.endDate) throw new Error('Tanggal mulai/selesai wajib diisi.');
  if (draft.startDate > draft.endDate) {
    throw new Error('Tanggal mulai tidak boleh setelah tanggal selesai.');
  }
  if (!draft.reason || draft.reason.trim().length < 5) {
    throw new Error('Alasan minimal 5 karakter.');
  }
  if (draft.type === 'Reimburse' && (draft.amount === undefined || draft.amount <= 0)) {
    throw new Error('Jumlah reimburse wajib diisi untuk tipe Reimburse.');
  }
};

export const requestService = {
  async create(employeeId: string, draft: LeaveRequestDraft): Promise<LeaveRequest> {
    validateDraft(draft);

    const insert = async (snake: boolean) => {
      const { data, error } = await supabase
        .from('requests')
        .insert(buildPayload(employeeId, draft, snake))
        .select('*')
        .single();
      return { data, error };
    };

    let result = await insert(false);
    if (result.error && isSchemaError(result.error.message)) {
      result = await insert(true);
    }
    if (result.error) throw new Error(result.error.message);
    if (!result.data) throw new Error('Pengajuan tidak terbaca ulang setelah disimpan.');

    return mapRow(result.data);
  },

  async listForEmployee(employeeId: string, limit = 50): Promise<LeaveRequest[]> {
    const query = async (snake: boolean) => {
      const column = snake ? 'employee_id' : 'employeeId';
      const orderCol = snake ? 'created_at' : 'createdAt';
      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .eq(column, employeeId)
        .order(orderCol, { ascending: false })
        .limit(limit);
      return { data, error };
    };

    let result = await query(false);
    if (result.error && isSchemaError(result.error.message)) {
      result = await query(true);
    }
    if (result.error) throw new Error(result.error.message);
    return (result.data || []).map(mapRow);
  },

  /**
   * Batalkan pengajuan yang masih `Pending`. Hanya pemilik request yang
   * boleh memanggil — RLS di server adalah safeguard utama, di client kita
   * cek `status === 'Pending'` agar tidak perlu round-trip.
   *
   * Karena schema tidak punya status `Cancelled`, kita pakai DELETE.
   */
  async cancel(requestId: string): Promise<void> {
    const { error } = await supabase
      .from('requests')
      .delete()
      .eq('id', requestId)
      .eq('status', 'Pending'); // safety: jangan delete yang sudah disetujui
    if (error) throw new Error(error.message);
  },

  /**
   * Hitung total hari Cuti yang sudah disetujui untuk tahun berjalan.
   * Berguna untuk derive sisa cuti realtime: `sisaCuti - usedThisYear`.
   */
  async getApprovedLeaveDaysThisYear(employeeId: string): Promise<number> {
    const year = new Date().getFullYear();
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;

    const query = async (snake: boolean) => {
      const empCol = snake ? 'employee_id' : 'employeeId';
      const startCol = snake ? 'start_date' : 'startDate';
      const endCol = snake ? 'end_date' : 'endDate';
      const { data, error } = await supabase
        .from('requests')
        .select(`${startCol}, ${endCol}`)
        .eq(empCol, employeeId)
        .eq('type', 'Cuti')
        .eq('status', 'Approved')
        .gte(startCol, yearStart)
        .lte(endCol, yearEnd);
      return { data, error };
    };

    let result = await query(false);
    if (result.error && isSchemaError(result.error.message)) {
      result = await query(true);
    }
    if (result.error) return 0;

    let total = 0;
    for (const row of (result.data || []) as any[]) {
      const start = String(row.startDate || row.start_date || '');
      const end = String(row.endDate || row.end_date || '');
      if (!start || !end) continue;
      const s = new Date(start);
      const e = new Date(end);
      if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) continue;
      const days = Math.floor((e.getTime() - s.getTime()) / 86400000) + 1;
      if (days > 0) total += days;
    }
    return total;
  },

  /** Jumlah pengajuan yang masih pending — dipakai badge di nav/dashboard. */
  async countPending(employeeId: string): Promise<number> {
    const query = async (snake: boolean) => {
      const column = snake ? 'employee_id' : 'employeeId';
      const { count, error } = await supabase
        .from('requests')
        .select('id', { count: 'exact', head: true })
        .eq(column, employeeId)
        .eq('status', 'Pending');
      return { count, error };
    };

    let result = await query(false);
    if (result.error && isSchemaError(result.error.message)) {
      result = await query(true);
    }
    if (result.error) return 0;
    return result.count || 0;
  },
};
