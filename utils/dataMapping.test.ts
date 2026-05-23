import { describe, expect, it } from 'vitest';
import {
  mapEmployeeToDatabase,
  mapEmployeeFromDatabase,
  mapAttendanceRecordToUI,
  sortAttendanceByDateDesc,
} from './dataMapping';

describe('dataMapping', () => {
  it('maps employee fields from UI to database naming', () => {
    const input = {
      nama: 'Siti',
      ktpNumber: '321',
      bpjsKesehatan: 'BPJS-KES',
      bpjsKetenagakerjaan: 'BPJS-TK',
      maritalStatus: 'Married',
      emergencyContacts: [{ name: 'Suami' }],
      workHistory: [{ company: 'RS A' }],
      bankAccount: { bankName: 'BCA' },
      isProfileCompleted: true,
      isVerified: true,
      verifiedBy: 'admin-id',
      verifiedAt: '2026-04-01T10:00:00Z',
      isLocked: false,
      managedUnitId: 'unit-1',
      email: 'siti@example.com',
    };

    const result = mapEmployeeToDatabase(input);

    expect(result.ktp_number).toBe('321');
    expect(result.bpjs_kesehatan).toBe('BPJS-KES');
    expect(result.bpjs_ketenagakerjaan).toBe('BPJS-TK');
    expect(result.marital_status).toBe('Married');
    expect(result.emergency_contacts).toEqual([{ name: 'Suami' }]);
    expect(result.work_history).toEqual([{ company: 'RS A' }]);
    expect(result.bank_account).toEqual({ bankName: 'BCA' });
    expect(result.is_profile_completed).toBe(true);
    expect(result.is_verified).toBe(true);
    expect(result.verified_by).toBe('admin-id');
    expect(result.verified_at).toBe('2026-04-01T10:00:00Z');
    expect(result.is_locked).toBe(false);
    expect(result.managed_unit_id).toBe('unit-1');
    expect(result.email).toBe('siti@example.com');
  });

  it('normalizes empty reference fields to null', () => {
    const result = mapEmployeeToDatabase({
      nama: 'Siti',
      email: 'siti@example.com',
      unitKerjaId: '',
      managedUnitId: '',
    });

    expect(result.unitKerjaId).toBeNull();
    expect(result.managed_unit_id).toBeNull();
  });

  it('maps employee fields from database to UI naming', () => {
    const input = {
      nama: 'Siti',
      ktp_number: '321',
      bpjs_kesehatan: 'BPJS-KES',
      bpjs_ketenagakerjaan: 'BPJS-TK',
      marital_status: 'Married',
      emergency_contacts: [{ name: 'Suami' }],
      work_history: [{ company: 'RS A' }],
      bank_account: { bankName: 'BCA' },
      is_profile_completed: true,
      is_verified: false,
      verified_by: null,
      verified_at: null,
      is_locked: true,
      managed_unit_id: 'unit-1',
    };

    const result = mapEmployeeFromDatabase(input);

    expect(result.ktpNumber).toBe('321');
    expect(result.bpjsKesehatan).toBe('BPJS-KES');
    expect(result.bpjsKetenagakerjaan).toBe('BPJS-TK');
    expect(result.maritalStatus).toBe('Married');
    expect(result.emergencyContacts).toEqual([{ name: 'Suami' }]);
    expect(result.workHistory).toEqual([{ company: 'RS A' }]);
    expect(result.bankAccount).toEqual({ bankName: 'BCA' });
    expect(result.isProfileCompleted).toBe(true);
    expect(result.isVerified).toBe(false);
    expect(result.isLocked).toBe(true);
    expect(result.managedUnitId).toBe('unit-1');
  });

  it('normalizes attendance row from snake_case and derives late status', () => {
    const row = {
      employee_id: 'emp-1',
      date: '2026-04-17',
      check_in: '08:20',
      check_out: '16:10',
      status: 'terlambat',
      overtime_hours: '2.5',
    };

    const mapped = mapAttendanceRecordToUI(row);

    expect(mapped.employeeId).toBe('emp-1');
    expect(mapped.tanggal).toBe('2026-04-17');
    expect(mapped.clockIn).toBe('08:20');
    expect(mapped.clockOut).toBe('16:10');
    expect(mapped.isLate).toBe(true);
    expect(mapped.overtimeHours).toBe(2.5);
  });

  it('sorts attendance records by latest date first', () => {
    const records = [
      { id: '1', tanggal: '2026-04-10' },
      { id: '2', tanggal: '2026-04-12' },
      { id: '3', tanggal: '2026-04-11' },
    ];

    const result = sortAttendanceByDateDesc(records);

    expect(result.map((item) => item.id)).toEqual(['2', '3', '1']);
  });
});
