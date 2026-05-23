import { supabase } from './supabaseClient.ts';
import { EmployeeSchedule, RotationPattern, SchedulePublishLog, WeeklyHoursValidation, ShiftDefinition, DEFAULT_SHIFT_DEFINITIONS } from '../types.ts';

// ============================================================
// ROTATION PATTERNS
// ============================================================

export async function getRotationPatterns(unitId: string): Promise<RotationPattern[]> {
    const { data, error } = await supabase
        .from('rotation_patterns')
        .select('*')
        .eq('unit_id', unitId)
        .eq('is_active', true)
        .order('name');

    if (error) throw error;
    return (data || []) as unknown as RotationPattern[];
}

export async function createRotationPattern(
    pattern: Omit<RotationPattern, 'id' | 'created_at' | 'updated_at'>
): Promise<RotationPattern> {
    const { data, error } = await supabase
        .from('rotation_patterns')
        .insert(pattern as any)
        .select()
        .single();

    if (error) throw error;
    return data as unknown as RotationPattern;
}

export async function updateRotationPattern(
    id: string,
    updates: Partial<Pick<RotationPattern, 'name' | 'description' | 'pattern' | 'cycle_days' | 'is_active'>>
): Promise<RotationPattern> {
    const { data, error } = await supabase
        .from('rotation_patterns')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data as unknown as RotationPattern;
}

export async function deleteRotationPattern(id: string): Promise<void> {
    const { error } = await supabase
        .from('rotation_patterns')
        .update({ is_active: false } as any)
        .eq('id', id);

    if (error) throw error;
}

// ============================================================
// EMPLOYEE SCHEDULES
// ============================================================

export async function getSchedulesByUnit(
    unitId: string,
    startDate: string,
    endDate: string
): Promise<EmployeeSchedule[]> {
    const { data, error } = await supabase
        .from('employee_schedules')
        .select('*')
        .eq('unit_id', unitId)
        .gte('schedule_date', startDate)
        .lte('schedule_date', endDate)
        .neq('status', 'cancelled')
        .order('schedule_date')
        .order('employee_id');

    if (error) throw error;
    return (data || []) as unknown as EmployeeSchedule[];
}

export async function getSchedulesByEmployee(
    employeeId: string,
    startDate: string,
    endDate: string
): Promise<EmployeeSchedule[]> {
    const { data, error } = await supabase
        .from('employee_schedules')
        .select('*')
        .eq('employee_id', employeeId)
        .gte('schedule_date', startDate)
        .lte('schedule_date', endDate)
        .neq('status', 'cancelled')
        .order('schedule_date');

    if (error) throw error;
    return (data || []) as unknown as EmployeeSchedule[];
}

export async function getTodaySchedule(employeeId: string): Promise<EmployeeSchedule | null> {
    // [SV-M5] Use WITA (Asia/Makassar) to ensure correct date boundary
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' });
    const { data, error } = await supabase
        .from('employee_schedules')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('schedule_date', today)
        .neq('status', 'cancelled')
        .single();

    // Handle missing table (406) or no rows (PGRST116) gracefully
    if (error) {
        if (error.code === 'PGRST116' || (error as any).status === 406) {
            return null; // Table doesn't exist or no schedule found
        }
        throw error;
    }
    return (data as unknown as EmployeeSchedule) || null;
}

// ============================================================
// SCHEDULE GENERATION (Client-side, calls DB function)
// ============================================================

export interface GenerateScheduleParams {
    employeeId: string;
    unitId: string;
    patternId: string;
    startDate: string;
    endDate: string;
    rotationOffset: number;
    createdBy: string;
}

export async function generateScheduleFromPattern(params: GenerateScheduleParams): Promise<number> {
    const { data, error } = await supabase.rpc('generate_schedule_from_pattern', {
        p_employee_id: params.employeeId,
        p_unit_id: params.unitId,
        p_pattern_id: params.patternId,
        p_start_date: params.startDate,
        p_end_date: params.endDate,
        p_rotation_offset: params.rotationOffset,
        p_created_by: params.createdBy,
    });

    if (error) throw error;
    return data as number;
}

/**
 * Generate jadwal untuk banyak karyawan sekaligus (batch).
 * Setiap karyawan mendapat offset berbeda untuk staggered rotation.
 */
export async function generateBulkSchedules(
    employeeIds: string[],
    unitId: string,
    patternId: string,
    startDate: string,
    endDate: string,
    createdBy: string,
    staggerOffset: number = 0 // Offset between each employee (0 = all same, >0 = staggered)
): Promise<{ total: number; perEmployee: Record<string, number> }> {
    const results: Record<string, number> = {};
    let total = 0;

    const promises = employeeIds.map(async (employeeId, i) => {
        const offset = staggerOffset > 0 ? (i * staggerOffset) : 0;
        const count = await generateScheduleFromPattern({
            employeeId,
            unitId,
            patternId,
            startDate,
            endDate,
            rotationOffset: offset,
            createdBy,
        });
        return { employeeId, count };
    });

    const promiseResults = await Promise.all(promises);
    
    for (const res of promiseResults) {
        results[res.employeeId] = res.count;
        total += res.count;
    }

    return { total, perEmployee: results };
}

// ============================================================
// SCHEDULE OVERRIDE (Manual edit per tanggal)
// ============================================================

export async function overrideSchedule(
    scheduleId: string,
    newShiftName: string,
    isOffDay: boolean,
    reason: string,
    overrideBy: string,
    unitShifts?: ShiftDefinition[]
): Promise<EmployeeSchedule> {
    const shifts = unitShifts || DEFAULT_SHIFT_DEFINITIONS;
    const shiftDef = shifts.find(s => s.name === newShiftName);

    const { data, error } = await supabase
        .from('employee_schedules')
        .update({
            shift_name: newShiftName,
            shift_start_time: isOffDay ? null : (shiftDef?.startTime || null),
            shift_end_time: isOffDay ? null : (shiftDef?.endTime || null),
            is_off_day: isOffDay,
            status: 'override',
            override_reason: reason,
            override_by: overrideBy,
        } as any)
        .eq('id', scheduleId)
        .select()
        .single();

    if (error) throw error;
    return data as unknown as EmployeeSchedule;
}

// ============================================================
// SWAP SHIFT
// ============================================================

export async function requestSwapShift(
    scheduleId1: string,
    scheduleId2: string,
    reason: string,
    approvedBy: string
): Promise<void> {
    // Load both schedules
    const { data: schedules, error: loadErr } = await supabase
        .from('employee_schedules')
        .select('*')
        .in('id', [scheduleId1, scheduleId2]);

    if (loadErr) throw loadErr;
    if (!schedules || schedules.length !== 2) throw new Error('Jadwal tidak ditemukan');

    const s1 = schedules.find((s: any) => s.id === scheduleId1) as any;
    const s2 = schedules.find((s: any) => s.id === scheduleId2) as any;

    const now = new Date().toISOString();

    // [SV-K7] Atomic swap: execute first update, then second.
    // If second fails, attempt compensating reversal of the first to preserve consistency.
    const update1Payload = {
        shift_name: s2.shift_name,
        shift_start_time: s2.shift_start_time,
        shift_end_time: s2.shift_end_time,
        is_off_day: s2.is_off_day,
        status: 'swapped',
        swapped_with_employee_id: s2.employee_id,
        swapped_with_schedule_id: scheduleId2,
        swap_reason: reason,
        swap_approved_by: approvedBy,
        swap_approved_at: now,
    };

    const update2Payload = {
        shift_name: s1.shift_name,
        shift_start_time: s1.shift_start_time,
        shift_end_time: s1.shift_end_time,
        is_off_day: s1.is_off_day,
        status: 'swapped',
        swapped_with_employee_id: s1.employee_id,
        swapped_with_schedule_id: scheduleId1,
        swap_reason: reason,
        swap_approved_by: approvedBy,
        swap_approved_at: now,
    };

    const { error: err1 } = await (supabase as any)
        .from('employee_schedules')
        .update(update1Payload)
        .eq('id', scheduleId1);

    if (err1) throw new Error(`Gagal swap jadwal pertama: ${err1.message}`);

    const { error: err2 } = await (supabase as any)
        .from('employee_schedules')
        .update(update2Payload)
        .eq('id', scheduleId2);

    if (err2) {
        // Compensating rollback: revert the first update back to original values
        await (supabase as any)
            .from('employee_schedules')
            .update({
                shift_name: s1.shift_name,
                shift_start_time: s1.shift_start_time,
                shift_end_time: s1.shift_end_time,
                is_off_day: s1.is_off_day,
                status: s1.status,
                swapped_with_employee_id: null,
                swapped_with_schedule_id: null,
                swap_reason: null,
                swap_approved_by: null,
                swap_approved_at: null,
            } as any)
            .eq('id', scheduleId1);
        throw new Error(`Gagal swap jadwal kedua (perubahan pertama telah dibatalkan): ${err2.message}`);
    }
}

// ============================================================
// PUBLISH
// ============================================================

export async function publishSchedules(
    unitId: string,
    startDate: string,
    endDate: string,
    publishedBy: string
): Promise<number> {
    const { data, error } = await supabase.rpc('publish_unit_schedules', {
        p_unit_id: unitId,
        p_start_date: startDate,
        p_end_date: endDate,
        p_published_by: publishedBy,
    });

    if (error) throw error;
    return data as number;
}

export async function getPublishLogs(unitId: string): Promise<SchedulePublishLog[]> {
    const { data, error } = await supabase
        .from('schedule_publish_logs')
        .select('*')
        .eq('unit_id', unitId)
        .order('published_at', { ascending: false })
        .limit(20);

    if (error) throw error;
    return (data || []) as unknown as SchedulePublishLog[];
}

// ============================================================
// VALIDATION
// ============================================================

export async function validateWeeklyHours(
    employeeId: string,
    weekStart: string // Must be a Monday (YYYY-MM-DD)
): Promise<WeeklyHoursValidation> {
    const { data, error } = await supabase.rpc('validate_weekly_hours', {
        p_employee_id: employeeId,
        p_week_start: weekStart,
    });

    if (error) throw error;
    if (!data) return { total_scheduled_days: 0, total_work_days: 0, total_off_days: 0, estimated_hours: 0, exceeds_limit: false };
    // RPC returns array for table-returning functions
    const result = Array.isArray(data) ? data[0] : data;
    return result as WeeklyHoursValidation;
}

/**
 * Validate all employees in a unit for a given week.
 * Returns employees exceeding 40 hours.
 */
export async function validateUnitWeeklyHours(
    employeeIds: string[],
    weekStart: string
): Promise<{ employeeId: string; validation: WeeklyHoursValidation }[]> {
    const results: { employeeId: string; validation: WeeklyHoursValidation }[] = [];

    for (const empId of employeeIds) {
        const validation = await validateWeeklyHours(empId, weekStart);
        if (validation.exceeds_limit) {
            results.push({ employeeId: empId, validation });
        }
    }

    return results;
}

// ============================================================
// UTILITY: Get schedule summary stats for a period
// ============================================================

export interface ScheduleSummary {
    totalDays: number;
    filledDays: number;
    draftDays: number;
    publishedDays: number;
    offDays: number;
    shiftDistribution: Record<string, number>;
}

export async function getScheduleSummary(
    unitId: string,
    startDate: string,
    endDate: string
): Promise<ScheduleSummary> {
    const schedules = await getSchedulesByUnit(unitId, startDate, endDate);

    const summary: ScheduleSummary = {
        totalDays: schedules.length,
        filledDays: schedules.filter(s => !s.is_off_day).length,
        draftDays: schedules.filter(s => s.status === 'draft').length,
        publishedDays: schedules.filter(s => s.status === 'published').length,
        offDays: schedules.filter(s => s.is_off_day).length,
        shiftDistribution: {},
    };

    schedules.forEach(s => {
        if (!s.is_off_day) {
            summary.shiftDistribution[s.shift_name] = (summary.shiftDistribution[s.shift_name] || 0) + 1;
        }
    });

    return summary;
}
