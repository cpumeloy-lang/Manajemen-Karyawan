import { describe, it, expect } from 'vitest';
import { getScheduleForDay, getShiftStartHour, DEFAULT_SHIFT_DEFINITIONS } from '../types';

describe('Shift utilities', () => {
  it('returns rotating schedule for default rotating shift', () => {
    const shift = DEFAULT_SHIFT_DEFINITIONS.find(s => s.id === 'pagi');
    expect(shift).toBeDefined();
    const sched = getScheduleForDay(shift!, 'senin');
    expect(sched).not.toBeNull();
    expect(sched?.startTime).toBe('08:00');
    expect(sched?.endTime).toBe('16:00');
  });

  it('returns null for fixed shift without weeklySchedule', () => {
    const fixedShift = { id: 'fixed1', name: 'Fixed', type: 'fixed' as const, color: 'gray' as const, lateToleranceMinutes: 10 };
    const sched = getScheduleForDay(fixedShift as any, 'senin');
    expect(sched).toBeNull();
  });

  it('parses shift start hour correctly', () => {
    const shift = DEFAULT_SHIFT_DEFINITIONS[0];
    const hour = getShiftStartHour(shift, 'senin');
    expect(hour).toBe(8);
  });
});
