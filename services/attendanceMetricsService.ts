/**
 * attendanceMetricsService.ts
 * Post-processing service untuk menghitung ulang is_late dan overtime_hours
 * pada rekaman absensi yang belum dikalkulasi (misal: data dari Hikvision).
 */

import { supabase } from './supabaseClient.ts';
import { ShiftDefinition, WEEK_DAYS, getScheduleForDay } from '../types.ts';

export interface RecalcResult {
    updated: number;
    skipped: number;
    errors: number;
}

/**
 * Hitung ulang is_late & overtime_hours untuk rekaman absensi dalam rentang tanggal.
 * Cocok untuk data Hikvision yang direkam dengan is_late=false & overtime=0.
 *
 * @param dateFrom  YYYY-MM-DD
 * @param dateTo    YYYY-MM-DD
 * @param allShiftDefs  Gabungan shift dari systemSettings + semua unit
 * @param source    Optional filter sumber data (misal 'hikvision')
 */
export async function recalculateAttendanceMetrics(
    dateFrom: string,
    dateTo: string,
    allShiftDefs: ShiftDefinition[],
    source?: string
): Promise<RecalcResult> {
    const result: RecalcResult = { updated: 0, skipped: 0, errors: 0 };

    // Load rekaman yang ada clock_in dan clock_out dalam rentang tanggal
    let query = (supabase as any)
        .from('attendance')
        .select('id, employee_id, tanggal, clock_in, clock_out, is_late, overtime_hours')
        .gte('tanggal', dateFrom)
        .lte('tanggal', dateTo)
        .not('clock_in', 'is', null)
        .not('clock_out', 'is', null);

    if (source) query = query.eq('source', source);

    const { data: records, error } = await query;
    if (error) throw error;
    if (!records || records.length === 0) return result;

    // Load semua karyawan dalam batch untuk shift lookup
    const empIds = [...new Set((records as any[]).map((r: any) => r.employee_id))];
    const { data: employees } = await (supabase as any)
        .from('employees')
        .select('id, shift, unitKerjaId')
        .in('id', empIds);

    const empMap = new Map<string, { shift: string; unitKerjaId?: string }>();
    (employees || []).forEach((e: any) => empMap.set(e.id, { shift: e.shift, unitKerjaId: e.unitKerjaId }));

    // Load employee_schedules untuk lookup per-date shift (lebih akurat)
    const { data: schedules } = await (supabase as any)
        .from('employee_schedules')
        .select('employee_id, date, shift_name, shift_start_time, shift_end_time, is_off_day')
        .in('employee_id', empIds)
        .gte('date', dateFrom)
        .lte('date', dateTo);

    // Map: "employeeId_date" → schedule
    const schedMap = new Map<string, any>();
    (schedules || []).forEach((s: any) => schedMap.set(`${s.employee_id}_${s.date}`, s));

    const updates: { id: string; is_late: boolean; overtime_hours: number }[] = [];

    for (const rec of records as any[]) {
        try {
            const emp = empMap.get(rec.employee_id);
            if (!emp || !rec.clock_in || !rec.clock_out) { result.skipped++; continue; }

            // Determine shift times: prefer employee_schedules, then shift definition
            const sched = schedMap.get(`${rec.employee_id}_${rec.tanggal}`);

            let shiftStartStr = '08:00';
            let shiftEndStr   = '16:00';
            let tolerance     = 15;

            if (sched && !sched.is_off_day && sched.shift_start_time && sched.shift_end_time) {
                shiftStartStr = sched.shift_start_time;
                shiftEndStr   = sched.shift_end_time;
            } else {
                const shiftName = sched?.shift_name || emp.shift || '';
                const shiftDef  = allShiftDefs.find(s => s.name === shiftName);
                if (shiftDef) {
                    const dow     = new Date(rec.tanggal).getDay();
                    const dayKey  = WEEK_DAYS[dow === 0 ? 6 : dow - 1];
                    const daySchedule = getScheduleForDay(shiftDef, dayKey);
                    if (daySchedule) {
                        shiftStartStr = daySchedule.startTime;
                        shiftEndStr   = daySchedule.endTime;
                    }
                    tolerance = shiftDef.lateToleranceMinutes ?? 15;
                }
            }

            const [startH, startM] = shiftStartStr.split(':').map(Number);
            const [endH,   endM]   = shiftEndStr.split(':').map(Number);
            let shiftDuration = (endH + endM / 60) - (startH + startM / 60);
            if (shiftDuration <= 0) shiftDuration += 24;

            const [inH, inM] = rec.clock_in.split(':').map(Number);
            const isLate = (inH * 60 + inM) > (startH * 60 + startM + tolerance);

            const inVal  = inH + inM / 60;
            const [outH, outM] = rec.clock_out.split(':').map(Number);
            let outVal = outH + outM / 60;
            if (outVal < inVal) outVal += 24;
            const overtimeHours = Math.max(0, parseFloat((outVal - inVal - shiftDuration).toFixed(2)));

            updates.push({ id: rec.id, is_late: isLate, overtime_hours: overtimeHours });
        } catch {
            result.errors++;
        }
    }

    // Batch update in chunks of 50
    const chunkSize = 50;
    for (let i = 0; i < updates.length; i += chunkSize) {
        const chunk = updates.slice(i, i + chunkSize);
        for (const upd of chunk) {
            const { error: updErr } = await (supabase as any)
                .from('attendance')
                .update({ is_late: upd.is_late, overtime_hours: upd.overtime_hours })
                .eq('id', upd.id);
            if (updErr) result.errors++;
            else result.updated++;
        }
    }

    return result;
}
