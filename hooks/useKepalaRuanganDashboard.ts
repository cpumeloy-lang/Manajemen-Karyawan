import { useState, useEffect, useCallback } from 'react';
import logger from '../services/logger.ts';
import { Employee, WorkUnit, ShiftDefinition, DEFAULT_SHIFT_DEFINITIONS } from '../types.ts';
import { supabase } from '../services/supabaseClient.ts';

const DASHBOARD_REFRESH_MS = 45000;

export interface DashboardUnitData {
    workUnit: WorkUnit | null;
    employees: Employee[];
    attendanceStats: {
        totalEmployees: number;
        presentToday: number;
        absentToday: number;
        onLeave: number;
    };
    shiftStats: Record<string, number>;
    unitShifts: ShiftDefinition[];
    todayScheduleMap: Record<string, string>;
    scheduleInfo: {
        totalSchedules: number;
        draftCount: number;
        publishedCount: number;
        offDayCount: number;
        coveragePercent: number;
        monthLabel: string;
    };
}

export function useKepalaRuanganDashboard(managedUnitId: string | undefined) {
    const [unitData, setUnitData] = useState<DashboardUnitData | null>(null);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    
    // [HK-M4] Lock to prevent multiple parallel refresh triggers
    const fetchLock = React.useRef(false);

    const normalizeAttendanceStatus = (status: unknown): string =>
        String(status || '').trim().toLowerCase();

    const loadEmployeesByUnit = async (unitId: string): Promise<any[]> => {
        const camelCaseQuery = await supabase
            .from('employees')
            .select('*')
            .eq('unitKerjaId', unitId)
            .limit(500);

        if (!camelCaseQuery.error && camelCaseQuery.data && camelCaseQuery.data.length > 0) {
            return camelCaseQuery.data as any[];
        }

        const snakeCaseQuery = await (supabase as any)
            .from('employees')
            .select('*')
            .eq('unit_kerja_id', unitId)
            .limit(500);

        if (!snakeCaseQuery.error && snakeCaseQuery.data && snakeCaseQuery.data.length > 0) {
            return snakeCaseQuery.data as any[];
        }

        if (camelCaseQuery.error && snakeCaseQuery.error) {
            throw snakeCaseQuery.error;
        }
        return [];
    };

    const loadTodayAttendance = async (employeeIds: string[], today: string) => {
        if (employeeIds.length === 0) return [];

        const camelCaseQuery = await supabase
            .from('attendance')
            .select('employeeId,status')
            .eq('tanggal', today)
            .in('employeeId', employeeIds);

        if (!camelCaseQuery.error) {
            return (camelCaseQuery.data || []).map((att: any) => ({
                employeeId: att.employeeId,
                status: att.status,
            }));
        }

        const snakeCaseQuery = await supabase
            .from('attendance')
            .select('employee_id,status')
            .eq('date', today)
            .in('employee_id', employeeIds);

        if (snakeCaseQuery.error) throw snakeCaseQuery.error;

        return (snakeCaseQuery.data || []).map((att: any) => ({
            employeeId: att.employee_id,
            status: att.status,
        }));
    };

    const loadDashboardData = useCallback(async (options?: { silent?: boolean }) => {
        const isSilent = options?.silent ?? false;

        if (!managedUnitId) {
            setLoading(false);
            return;
        }

        if (fetchLock.current) return;
        fetchLock.current = true;

        try {
            if (isSilent) setIsRefreshing(true);
            else setLoading(true);
            setError(null);

            const { data: workUnitData, error: unitError } = await supabase
                .from('units')
                .select('*')
                .eq('id', managedUnitId)
                .single();

            if (unitError) throw new Error('Unit kerja tidak ditemukan.');

            const employeesData = await loadEmployeesByUnit(managedUnitId);
            const mappedEmployees = (employeesData || []).map((emp: any) => ({
                ...emp,
                ktpNumber: emp.ktp_number,
                bpjsKesehatan: emp.bpjs_kesehatan,
                bpjsKetenagakerjaan: emp.bpjs_ketenagakerjaan,
                maritalStatus: emp.marital_status,
                emergencyContacts: emp.emergency_contacts,
                workHistory: emp.work_history,
                bankAccount: emp.bank_account,
                isProfileCompleted: emp.is_profile_completed,
                isVerified: emp.is_verified,
                verifiedBy: emp.verified_by,
                verifiedAt: emp.verified_at,
                isLocked: emp.is_locked,
                managedUnitId: emp.managed_unit_id,
            }));

            const activeEmployees = mappedEmployees.filter((emp: any) => emp.status !== 'Non-Aktif');
            const today = new Date().toISOString().split('T')[0];
            const attendanceData = await loadTodayAttendance(activeEmployees.map((emp: any) => emp.id), today);

            const attendanceMap = new Map((attendanceData || []).map(att => [att.employeeId, att.status]));
            const presentStatuses = new Set(['hadir', 'terlambat']);
            const leaveStatuses = new Set(['cuti', 'sakit', 'izin']);

            const presentToday = activeEmployees.filter((emp: any) =>
                presentStatuses.has(normalizeAttendanceStatus(attendanceMap.get(emp.id)))
            ).length;
            const onLeave = activeEmployees.filter((emp: any) =>
                leaveStatuses.has(normalizeAttendanceStatus(attendanceMap.get(emp.id)))
            ).length;
            const absentToday = activeEmployees.filter((emp: any) => {
                const normalized = normalizeAttendanceStatus(attendanceMap.get(emp.id));
                if (!normalized) return true;
                if (presentStatuses.has(normalized)) return false;
                if (leaveStatuses.has(normalized)) return false;
                return normalized === 'absen';
            }).length;

            const unitDataAny = workUnitData as any;
            const unitShifts: ShiftDefinition[] = (unitDataAny?.shifts && unitDataAny.shifts.length > 0)
                ? unitDataAny.shifts as ShiftDefinition[]
                : DEFAULT_SHIFT_DEFINITIONS;

            let todayScheduleMap: Record<string, string> = {};
            try {
                const { data: todayScheds } = await supabase
                    .from('employee_schedules')
                    .select('employee_id, shift_name, is_off_day')
                    .eq('unit_id', managedUnitId)
                    .eq('schedule_date', today)
                    .neq('status', 'cancelled') as any;
                if (todayScheds && todayScheds.length > 0) {
                    (todayScheds as any[]).forEach((s: any) => {
                        todayScheduleMap[s.employee_id] = s.is_off_day ? 'Libur' : s.shift_name;
                    });
                }
            } catch { /* table may not exist yet */ }

            const shiftStats: Record<string, number> = {};
            unitShifts.forEach(s => { shiftStats[s.name] = 0; });
            shiftStats['Libur'] = 0;
            activeEmployees.forEach((emp: any) => {
                const name = todayScheduleMap[emp.id] || emp.shift || 'Tidak Diatur';
                shiftStats[name] = (shiftStats[name] || 0) + 1;
            });
            Object.keys(shiftStats).forEach(k => { if (shiftStats[k] === 0) delete shiftStats[k]; });

            const now = new Date();
            const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
            const monthNames = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
            const monthLabel = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

            let scheduleInfo = { totalSchedules: 0, draftCount: 0, publishedCount: 0, offDayCount: 0, coveragePercent: 0, monthLabel };
            try {
                const { data: monthScheds } = await supabase
                    .from('employee_schedules')
                    .select('id, status, is_off_day')
                    .eq('unit_id', managedUnitId)
                    .gte('schedule_date', monthStart)
                    .lte('schedule_date', monthEnd)
                    .neq('status', 'cancelled') as any;
                if (monthScheds && monthScheds.length > 0) {
                    const arr = monthScheds as any[];
                    const totalSlots = activeEmployees.length * lastDay;
                    scheduleInfo = {
                        totalSchedules: arr.length,
                        draftCount: arr.filter((s: any) => s.status === 'draft').length,
                        publishedCount: arr.filter((s: any) => s.status === 'published').length,
                        offDayCount: arr.filter((s: any) => s.is_off_day).length,
                        coveragePercent: totalSlots > 0 ? Math.round((arr.length / totalSlots) * 100) : 0,
                        monthLabel,
                    };
                }
            } catch { /* table may not exist yet */ }

            setUnitData({
                workUnit: workUnitData as unknown as WorkUnit,
                employees: activeEmployees as unknown as Employee[],
                attendanceStats: { totalEmployees: activeEmployees.length, presentToday, absentToday, onLeave },
                shiftStats,
                unitShifts,
                todayScheduleMap,
                scheduleInfo,
            });
            setLastUpdated(new Date());
        } catch (err: any) {
            logger.error('Error loading dashboard data', err);
            // [HK-M3] Expose error to UI
            setError(err.message || 'Gagal memuat data dashboard');
        } finally {
            if (isSilent) setIsRefreshing(false);
            else setLoading(false);
            
            // Release lock after a short delay to debounce subsequent synchronous triggers
            setTimeout(() => { fetchLock.current = false; }, 300);
        }
    }, [managedUnitId]);

    useEffect(() => {
        let isActive = true;

        const refreshDashboard = (silent: boolean) => {
            if (!isActive) return;
            void loadDashboardData({ silent });
        };

        refreshDashboard(false);

        const intervalId = window.setInterval(() => refreshDashboard(true), DASHBOARD_REFRESH_MS);
        const handleWindowFocus = () => refreshDashboard(true);
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') refreshDashboard(true);
        };

        window.addEventListener('focus', handleWindowFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        const realtimeChannel = supabase
            .channel(`unit-employees-${managedUnitId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, (payload) => {
                if (!isActive) return;
                const record = (payload.new || payload.old) as any;
                const recordUnitId = record?.unitKerjaId || record?.unit_kerja_id;
                if (!recordUnitId || recordUnitId === managedUnitId) refreshDashboard(true);
            })
            .subscribe();

        return () => {
            isActive = false;
            window.clearInterval(intervalId);
            window.removeEventListener('focus', handleWindowFocus);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            void supabase.removeChannel(realtimeChannel);
        };
    }, [managedUnitId, loadDashboardData]);

    return { unitData, loading, isRefreshing, error, lastUpdated, refresh: loadDashboardData };
}
