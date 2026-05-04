import { describe, expect, it } from 'vitest';
import {
  isSchemaErrorMessage,
  mapAttendanceForDb,
  normalizeAttendanceRecord,
} from './attendanceSaveMapping';

describe('attendanceSaveMapping', () => {
  it('normalizes snake_case payload to app format with defaults', () => {
    const input: any = {
      employee_id: 'emp-01',
      date: '2026-04-19',
      check_in: '08:00',
      check_out: '17:30',
      lokasi: 'RS Unit A',
      lat: -6.2,
      lng: 106.8,
      isLate: false,
    };

    const result = normalizeAttendanceRecord(input);

    expect(result.employeeId).toBe('emp-01');
    expect(result.tanggal).toBe('2026-04-19');
    expect(result.clockIn).toBe('08:00');
    expect(result.clockOut).toBe('17:30');
    expect(result.location).toBe('RS Unit A');
    expect(result.latitude).toBe(-6.2);
    expect(result.longitude).toBe(106.8);
    expect(result.status).toBe('Hadir');
    expect(result.source).toBe('web-ess');
    expect(result.notes).toBe('');
  });

  it('maps normalized data for snake_case persistence', () => {
    const normalized: any = {
      employeeId: 'emp-02',
      tanggal: '2026-04-20',
      clockIn: '08:15',
      clockOut: '16:45',
      location: 'RS Unit B',
      latitude: -6.21,
      longitude: 106.81,
      isLate: true,
      overtimeHours: 1.5,
      status: 'Terlambat',
      source: 'web-admin',
      notes: 'Manual correction',
    };

    const result = mapAttendanceForDb(normalized, true);

    expect(result.employee_id).toBe('emp-02');
    expect(result.date).toBe('2026-04-20');
    expect(result.check_in).toBe('08:15');
    expect(result.check_out).toBe('16:45');
    expect(result.lokasi).toBe('RS Unit B');
    expect(result.source).toBe('web-admin');
    expect(result.notes).toBe('Manual correction');
  });

  it('keeps normalized data unchanged for camelCase persistence', () => {
    const normalized: any = {
      employeeId: 'emp-03',
      tanggal: '2026-04-21',
      clockIn: '07:55',
      clockOut: '16:05',
    };

    const result = mapAttendanceForDb(normalized, false);

    expect(result).toEqual(normalized);
  });

  it('detects schema-related errors for fallback flow', () => {
    expect(isSchemaErrorMessage('column "employeeId" does not exist')).toBe(true);
    expect(isSchemaErrorMessage('relation attendance does not exist')).toBe(true);
    expect(isSchemaErrorMessage('new row violates unique constraint')).toBe(false);
  });
});
