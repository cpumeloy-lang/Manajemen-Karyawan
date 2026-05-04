import React, { useState, useEffect } from 'react';
import { Employee, WorkUnit, ShiftDefinition, DEFAULT_SHIFT_DEFINITIONS } from '../types.ts';
import { supabase } from '../services/supabaseClient.ts';
import { UserGroupIcon, ClockIcon, CalendarDaysIcon } from './icons.tsx';
import LoadingSpinner from './LoadingSpinner.tsx';

const DASHBOARD_REFRESH_MS = 45000;

interface KepalaRuanganDashboardProps {
    kepalaRuangan: Employee;
    onNavigate?: (view: string) => void;
}

const KepalaRuanganDashboard: React.FC<KepalaRuanganDashboardProps> = ({ kepalaRuangan, onNavigate }) => {
    const kepalaAny = kepalaRuangan as any;
    const managedUnitId = kepalaRuangan.unitKerjaId
        || kepalaAny.unit_kerja_id
        || kepalaRuangan.managedUnitId
        || kepalaAny.managed_unit_id;

    const [unitData, setUnitData] = useState<{
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
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    useEffect(() => {
        let isActive = true;

        const refreshDashboard = (silent: boolean) => {
            if (!isActive) return;
            void loadDashboardData({ silent });
        };

        refreshDashboard(false);

        const intervalId = window.setInterval(() => {
            refreshDashboard(true);
        }, DASHBOARD_REFRESH_MS);

        const handleWindowFocus = () => refreshDashboard(true);
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                refreshDashboard(true);
            }
        };

        window.addEventListener('focus', handleWindowFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Realtime subscription — deteksi langsung saat karyawan ditambah/diedit/dihapus di unit ini
        const realtimeChannel = supabase
            .channel(`unit-employees-${managedUnitId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'employees' },
                (payload) => {
                    if (!isActive) return;
                    const record = (payload.new || payload.old) as any;
                    const recordUnitId = record?.unitKerjaId || record?.unit_kerja_id;
                    if (!recordUnitId || recordUnitId === managedUnitId) {
                        refreshDashboard(true);
                    }
                }
            )
            .subscribe();

        return () => {
            isActive = false;
            window.clearInterval(intervalId);
            window.removeEventListener('focus', handleWindowFocus);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            void supabase.removeChannel(realtimeChannel);
        };
    }, [managedUnitId]);

    const normalizeAttendanceStatus = (status: unknown): string =>
        String(status || '').trim().toLowerCase();

    const loadEmployeesByUnit = async (unitId: string): Promise<any[]> => {
        console.log('[Dashboard] loadEmployeesByUnit unitId:', unitId);

        const camelCaseQuery = await supabase
            .from('employees')
            .select('*')
            .eq('unitKerjaId', unitId);

        console.log('[Dashboard] camelCase query error:', camelCaseQuery.error, 'count:', camelCaseQuery.data?.length);

        if (!camelCaseQuery.error && camelCaseQuery.data && camelCaseQuery.data.length > 0) {
            return camelCaseQuery.data as any[];
        }

        const snakeCaseQuery = await (supabase as any)
            .from('employees')
            .select('*')
            .eq('unit_kerja_id', unitId);

        console.log('[Dashboard] snake_case query error:', snakeCaseQuery.error, 'count:', snakeCaseQuery.data?.length);

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

        if (snakeCaseQuery.error) {
            throw snakeCaseQuery.error;
        }

        return (snakeCaseQuery.data || []).map((att: any) => ({
            employeeId: att.employee_id,
            status: att.status,
        }));
    };

    const loadDashboardData = async (options?: { silent?: boolean }) => {
        const isSilent = options?.silent ?? false;

        if (!managedUnitId) {
            console.warn('⚠️ Kepala ruangan tidak memiliki unit yang dikelola');
            setLoading(false);
            return;
        }

        try {
            if (isSilent) {
                setIsRefreshing(true);
            } else {
                setLoading(true);
            }

            // Load unit info from single source table
            const { data: workUnitData, error: unitError } = await supabase
                .from('units')
                .select('*')
                .eq('id', managedUnitId)
                .single();

            if (unitError) {
                console.error('❌ Error loading unit:', unitError);
                throw new Error('Unit kerja tidak ditemukan. Pastikan database sudah diupdate.');
            }

            // Load employees in this unit
            const employeesData = await loadEmployeesByUnit(managedUnitId);

            // Map database fields to camelCase
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

            const activeEmployees = mappedEmployees.filter(emp => emp.status !== 'Non-Aktif');

            // Get today's attendance
            const today = new Date().toISOString().split('T')[0];
            const attendanceData = await loadTodayAttendance(activeEmployees.map(emp => emp.id), today);

            // Calculate attendance stats
            const attendanceMap = new Map((attendanceData || []).map(att => [att.employeeId, att.status]));
            const presentStatuses = new Set(['hadir', 'terlambat']);
            const leaveStatuses = new Set(['cuti', 'sakit', 'izin']);

            const presentToday = activeEmployees.filter(emp =>
                presentStatuses.has(normalizeAttendanceStatus(attendanceMap.get(emp.id)))
            ).length;

            const onLeave = activeEmployees.filter(emp =>
                leaveStatuses.has(normalizeAttendanceStatus(attendanceMap.get(emp.id)))
            ).length;

            const absentToday = activeEmployees.filter(emp => {
                const normalized = normalizeAttendanceStatus(attendanceMap.get(emp.id));
                if (!normalized) return true;
                if (presentStatuses.has(normalized)) return false;
                if (leaveStatuses.has(normalized)) return false;
                return normalized === 'absen';
            }).length;

            // Load unit shift definitions (dynamic)
            const unitDataAny = workUnitData as any;
            const unitShifts: ShiftDefinition[] = (unitDataAny?.shifts && unitDataAny.shifts.length > 0)
                ? unitDataAny.shifts as ShiftDefinition[]
                : DEFAULT_SHIFT_DEFINITIONS;

            // Try to load today's per-date schedules for more accurate stats
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
            } catch { /* table may not exist yet, fallback gracefully */ }

            // Calculate shift stats dynamically (prefer per-date schedule, fallback to employee.shift)
            const shiftStats: Record<string, number> = {};
            unitShifts.forEach(s => { shiftStats[s.name] = 0; });
            shiftStats['Libur'] = 0;
            activeEmployees.forEach(emp => {
                const name = todayScheduleMap[emp.id] || emp.shift || 'Tidak Diatur';
                shiftStats[name] = (shiftStats[name] || 0) + 1;
            });
            // Clean up zero-count entries
            Object.keys(shiftStats).forEach(k => { if (shiftStats[k] === 0) delete shiftStats[k]; });

            // Load current month schedule summary
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
                employees: activeEmployees,
                attendanceStats: {
                    totalEmployees: activeEmployees.length,
                    presentToday,
                    absentToday,
                    onLeave,
                },
                shiftStats,
                unitShifts,
                todayScheduleMap,
                scheduleInfo,
            });
            setLastUpdated(new Date());

        } catch (error: any) {
            console.error('❌ Error loading dashboard data:', error);
        } finally {
            if (isSilent) {
                setIsRefreshing(false);
            } else {
                setLoading(false);
            }
        }
    };

    const InfoCard: React.FC<{
        title: string;
        value: string | number;
        icon: React.ReactNode;
        color?: string;
        subtitle?: string;
    }> = ({ title, value, icon, color = 'text-[#06736a]', subtitle }) => (
        <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex items-center justify-between mb-2">
                <div className="text-3xl">{icon}</div>
                {subtitle && <span className="text-xs text-gray-500">{subtitle}</span>}
            </div>
            <div>
                <h3 className="text-sm font-medium text-gray-500">{title}</h3>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </div>
        </div>
    );

    const QuickActionCard: React.FC<{
        title: string;
        description: string;
        icon: React.ReactNode;
        onClick?: () => void;
        color?: string;
    }> = ({ title, description, icon, onClick, color = 'text-[#06736a]' }) => (
        <button
            onClick={onClick}
            className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow text-left w-full border-l-4 border-[#06736a]"
        >
            <div className="flex items-start gap-4">
                <div className={`text-3xl ${color}`}>{icon}</div>
                <div>
                    <h3 className="text-lg font-semibold text-[#06736a] mb-1">{title}</h3>
                    <p className="text-sm text-gray-600">{description}</p>
                </div>
            </div>
        </button>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <LoadingSpinner size="large" />
            </div>
        );
    }

    if (!managedUnitId || !unitData) {
        return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                <p className="text-yellow-800 font-medium">⚠️ Anda belum ditugaskan sebagai kepala ruangan untuk unit tertentu.</p>
                <p className="text-yellow-600 text-sm mt-2">Silakan hubungi HRD untuk pengaturan lebih lanjut.</p>
            </div>
        );
    }

    const { workUnit, employees, attendanceStats, shiftStats, unitShifts, todayScheduleMap, scheduleInfo } = unitData;

    return (
        <div className="space-y-6">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-[#06736a] to-[#089c8e] p-6 sm:p-8 rounded-xl shadow-md text-white">
                <div className="flex items-center gap-6">
                    {kepalaRuangan.foto && (
                        <img
                            src={kepalaRuangan.foto}
                            alt={kepalaRuangan.nama}
                            className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
                        />
                    )}
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Dashboard Kepala Ruangan 👨‍💼</h1>
                        <p className="text-white/90">Unit: {workUnit?.nama || '-'}</p>
                        <p className="text-white/80 text-sm">{kepalaRuangan.nama} - {kepalaRuangan.jabatan}</p>
                        <p className="text-white/80 text-xs mt-1">
                            {isRefreshing ? 'Memperbarui data...' : `Update terakhir: ${lastUpdated ? lastUpdated.toLocaleTimeString('id-ID') : '-'}`}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => void loadDashboardData({ silent: true })}
                        disabled={loading || isRefreshing}
                        className="ml-auto rounded-lg border border-white/40 bg-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isRefreshing ? 'Menyinkronkan...' : 'Refresh'}
                    </button>
                </div>
            </div>

            {/* Unit Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <InfoCard
                    title="Total Karyawan"
                    value={attendanceStats.totalEmployees}
                    icon={<UserGroupIcon className="h-8 w-8" />}
                    subtitle="Di unit ini"
                />
                <InfoCard
                    title="Hadir Hari Ini"
                    value={attendanceStats.presentToday}
                    icon={<ClockIcon className="h-8 w-8" />}
                    color="text-green-600"
                    subtitle={`${Math.round((attendanceStats.presentToday / attendanceStats.totalEmployees) * 100) || 0}%`}
                />
                <InfoCard
                    title="Tidak Hadir"
                    value={attendanceStats.absentToday + attendanceStats.onLeave}
                    icon={<ClockIcon className="h-8 w-8" />}
                    color="text-red-600"
                    subtitle="Absen + Cuti/Sakit"
                />
                <InfoCard
                    title="Jenis Shift"
                    value={Object.keys(shiftStats).length}
                    icon={<CalendarDaysIcon className="h-8 w-8" />}
                    color="text-yellow-600"
                    subtitle="Terkonfigurasi"
                />
            </div>

            {/* Shift Distribution */}
            <div className="bg-white p-6 rounded-xl shadow-md">
                <h2 className="text-xl font-bold text-[#06736a] mb-4">📊 Distribusi Shift Unit</h2>
                <div className={`grid grid-cols-1 gap-4 ${Object.keys(shiftStats).length <= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-4'}`}>
                    {Object.entries(shiftStats).map(([name, count]) => {
                        const def = unitShifts.find(s => s.name === name);
                        const colorMap: Record<string, { bg: string; text: string; border: string }> = {
                            yellow:  { bg: 'bg-yellow-50',  text: 'text-yellow-700',  border: 'border-yellow-200' },
                            blue:    { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200' },
                            indigo:  { bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200' },
                            green:   { bg: 'bg-green-50',   text: 'text-green-700',   border: 'border-green-200' },
                            red:     { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200' },
                            purple:  { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200' },
                            orange:  { bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200' },
                            pink:    { bg: 'bg-pink-50',    text: 'text-pink-700',    border: 'border-pink-200' },
                            teal:    { bg: 'bg-teal-50',    text: 'text-teal-700',    border: 'border-teal-200' },
                            gray:    { bg: 'bg-gray-50',    text: 'text-gray-700',    border: 'border-gray-200' },
                        };
                        const c = colorMap[def?.color || 'gray'] || colorMap['gray'];
                        const timeLabel = def?.type === 'rotating'
                            ? `${def.startTime || '?'} - ${def.endTime || '?'}`
                            : def?.type === 'fixed' ? 'Jadwal per hari' : '';
                        return (
                            <div key={name} className={`text-center p-4 rounded-lg border ${c.bg} ${c.border}`}>
                                <div className={`text-2xl font-bold ${c.text}`}>{count}</div>
                                <div className={`text-sm font-medium ${c.text}`}>{name}</div>
                                {timeLabel && <div className="text-xs text-gray-500 mt-1">{timeLabel}</div>}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Ringkasan Jadwal Shift Bulan Ini */}
            <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-[#06736a]">📋 Jadwal Shift — {scheduleInfo.monthLabel}</h2>
                    <button
                        onClick={() => onNavigate?.('unit-schedule')}
                        className="text-sm text-primary font-medium hover:underline"
                    >
                        Buka Manajemen Jadwal →
                    </button>
                </div>

                {scheduleInfo.totalSchedules === 0 ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
                        <p className="text-amber-800 font-semibold mb-2">⚠️ Jadwal bulan ini belum di-generate</p>
                        <p className="text-sm text-amber-700 mb-3">
                            Belum ada jadwal harian yang dibuat untuk karyawan di unit ini.
                            Gunakan fitur <strong>Manajemen Jadwal Shift</strong> untuk membuat jadwal otomatis.
                        </p>
                        <div className="bg-white rounded-lg p-4 border border-amber-100">
                            <p className="text-xs font-semibold text-gray-700 mb-2">📌 Langkah Membuat Jadwal:</p>
                            <ol className="text-xs text-gray-600 space-y-1.5 list-decimal list-inside">
                                <li><strong>Konfigurasi Shift</strong> — Definisikan jenis shift (Pagi, Siang, Malam, dll) beserta jam kerja</li>
                                <li><strong>Buat Pola Rotasi</strong> — Buat template siklus seperti P-P-S-S-M-M-L-L</li>
                                <li><strong>Generate Jadwal</strong> — Pilih pola rotasi dan klik "Generate Jadwal" untuk mengisi otomatis</li>
                                <li><strong>Sesuaikan</strong> — Edit jadwal per karyawan per tanggal jika perlu</li>
                                <li><strong>Publish</strong> — Publikasi jadwal agar aktif untuk validasi absensi</li>
                            </ol>
                        </div>
                        <button
                            onClick={() => onNavigate?.('unit-schedule')}
                            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
                        >
                            📅 Buka Manajemen Jadwal
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-center">
                                <div className="text-2xl font-bold text-blue-700">{scheduleInfo.totalSchedules}</div>
                                <div className="text-xs text-blue-600 font-medium">Total Jadwal</div>
                            </div>
                            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-center">
                                <div className="text-2xl font-bold text-amber-700">{scheduleInfo.draftCount}</div>
                                <div className="text-xs text-amber-600 font-medium">Draft</div>
                            </div>
                            <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-center">
                                <div className="text-2xl font-bold text-green-700">{scheduleInfo.publishedCount}</div>
                                <div className="text-xs text-green-600 font-medium">Published</div>
                            </div>
                            <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-center">
                                <div className="text-2xl font-bold text-gray-600">{scheduleInfo.offDayCount}</div>
                                <div className="text-xs text-gray-500 font-medium">Hari Libur</div>
                            </div>
                        </div>

                        {/* Coverage bar */}
                        <div className="mb-3">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>Coverage Jadwal</span>
                                <span className="font-semibold">{scheduleInfo.coveragePercent}%</span>
                            </div>
                            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${
                                        scheduleInfo.coveragePercent >= 90 ? 'bg-green-500' :
                                        scheduleInfo.coveragePercent >= 50 ? 'bg-amber-400' : 'bg-red-400'
                                    }`}
                                    style={{ width: `${Math.min(scheduleInfo.coveragePercent, 100)}%` }}
                                />
                            </div>
                        </div>

                        {/* Alerts */}
                        {scheduleInfo.draftCount > 0 && (
                            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs">
                                <span className="text-amber-500 text-base">⏳</span>
                                <div>
                                    <p className="text-amber-800 font-semibold">{scheduleInfo.draftCount} jadwal masih berstatus Draft</p>
                                    <p className="text-amber-700 mt-0.5">Publish jadwal agar aktif untuk validasi absensi karyawan.</p>
                                </div>
                            </div>
                        )}
                        {scheduleInfo.coveragePercent < 100 && scheduleInfo.coveragePercent > 0 && (
                            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs mt-2">
                                <span className="text-blue-500 text-base">💡</span>
                                <div>
                                    <p className="text-blue-800 font-semibold">Jadwal belum lengkap ({scheduleInfo.coveragePercent}%)</p>
                                    <p className="text-blue-700 mt-0.5">Beberapa karyawan belum memiliki jadwal di seluruh hari kerja bulan ini.</p>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Jadwal Hari Ini — Siapa Bertugas */}
            <div className="bg-white p-6 rounded-xl shadow-md">
                <h2 className="text-xl font-bold text-[#06736a] mb-4">🕐 Jadwal Hari Ini</h2>
                {Object.keys(todayScheduleMap).length > 0 && (
                    <p className="text-[10px] text-green-600 mb-3 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                        Berdasarkan jadwal per-tanggal (employee_schedules)
                    </p>
                )}
                {(() => {
                    // Group employees by their today's shift (per-date schedule > fallback static)
                    const shiftGroups: Record<string, { nama: string; foto: string }[]> = {};
                    employees.forEach(emp => {
                        const empShift = todayScheduleMap[emp.id] || emp.shift || 'Tidak Diatur';
                        if (!shiftGroups[empShift]) shiftGroups[empShift] = [];
                        shiftGroups[empShift].push({ nama: emp.nama, foto: emp.foto });
                    });

                    // Sort: Libur last, rest alphabetical
                    const sortedGroups = Object.entries(shiftGroups).sort(([a], [b]) => {
                        if (a === 'Libur') return 1;
                        if (b === 'Libur') return -1;
                        return a.localeCompare(b);
                    });

                    if (sortedGroups.length === 0) {
                        return <p className="text-sm text-gray-500">Tidak ada data karyawan.</p>;
                    }

                    return (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {sortedGroups.map(([shiftName, empList]) => {
                                const def = unitShifts.find(s => s.name === shiftName);
                                const isOff = shiftName === 'Libur';
                                const colorMap: Record<string, string> = {
                                    yellow: 'border-yellow-300 bg-yellow-50', blue: 'border-blue-300 bg-blue-50',
                                    indigo: 'border-indigo-300 bg-indigo-50', green: 'border-green-300 bg-green-50',
                                    red: 'border-red-300 bg-red-50', purple: 'border-purple-300 bg-purple-50',
                                    orange: 'border-orange-300 bg-orange-50', pink: 'border-pink-300 bg-pink-50',
                                    teal: 'border-teal-300 bg-teal-50', gray: 'border-gray-300 bg-gray-50',
                                };
                                const borderBg = isOff
                                    ? 'border-gray-200 bg-gray-50/50'
                                    : (colorMap[def?.color || 'gray'] || colorMap['gray']);
                                return (
                                    <div key={shiftName} className={`rounded-lg border-l-4 p-3 ${borderBg}`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className={`font-semibold text-sm ${isOff ? 'text-gray-400' : 'text-gray-800'}`}>
                                                {isOff ? '💤 Libur' : shiftName}
                                            </span>
                                            <span className="text-xs bg-white/80 rounded-full px-2 py-0.5 text-gray-600 font-medium">
                                                {empList.length} orang
                                            </span>
                                        </div>
                                        {!isOff && def && (
                                            <p className="text-[10px] text-gray-500 mb-2">
                                                {def.type === 'rotating'
                                                    ? `⏰ ${def.startTime} – ${def.endTime}`
                                                    : '📅 Jadwal per hari'}
                                            </p>
                                        )}
                                        <div className="space-y-1">
                                            {empList.slice(0, 8).map((e, i) => (
                                                <div key={i} className="flex items-center gap-1.5">
                                                    <img
                                                        src={e.foto || 'https://via.placeholder.com/16'}
                                                        alt=""
                                                        className="w-4 h-4 rounded-full object-cover"
                                                    />
                                                    <span className={`text-xs truncate ${isOff ? 'text-gray-400' : 'text-gray-700'}`}>{e.nama}</span>
                                                </div>
                                            ))}
                                            {empList.length > 8 && (
                                                <p className="text-[10px] text-gray-400 pl-5">+{empList.length - 8} lainnya</p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })()}
            </div>

            {/* Quick Actions for Unit Management */}
            <div className="bg-[#e6f3f2] p-6 rounded-xl">
                <h2 className="text-xl font-bold text-[#06736a] mb-4">⚡ Aksi Manajemen Unit</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <QuickActionCard
                        title="Kelola Jadwal Shift"
                        description="Buat pola rotasi, generate jadwal bulanan, dan atur shift per karyawan"
                        icon={<CalendarDaysIcon className="h-6 w-6" />}
                        onClick={() => onNavigate?.('unit-schedule')}
                        color="text-blue-600"
                    />
                    <QuickActionCard
                        title="Pantau Kehadiran"
                        description="Lihat dan kelola presensi karyawan"
                        icon={<ClockIcon className="h-6 w-6" />}
                        onClick={() => onNavigate?.('attendance')}
                        color="text-green-600"
                    />
                    <QuickActionCard
                        title="Lihat Daftar Karyawan"
                        description="Kelola data karyawan di unit Anda"
                        icon={<UserGroupIcon className="h-6 w-6" />}
                        onClick={() => onNavigate?.('employees')}
                        color="text-purple-600"
                    />
                </div>
            </div>

            {/* Recent Activity / Alerts */}
            <div className="bg-white p-6 rounded-xl shadow-md">
                <h2 className="text-xl font-bold text-[#06736a] mb-4">🚨 Status Unit Hari Ini</h2>
                <div className="space-y-3">
                    {attendanceStats.presentToday < attendanceStats.totalEmployees * 0.8 && (
                        <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded">
                            <p className="text-sm text-red-700 font-medium">⚠️ Tingkat kehadiran rendah hari ini</p>
                            <p className="text-xs text-red-600 mt-1">
                                {attendanceStats.presentToday} dari {attendanceStats.totalEmployees} karyawan hadir
                            </p>
                        </div>
                    )}
                    {attendanceStats.absentToday > 0 && (
                        <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                            <p className="text-sm text-yellow-700 font-medium">📝 {attendanceStats.absentToday} karyawan tidak hadir</p>
                            <p className="text-xs text-yellow-600 mt-1">Periksa alasan ketidakhadiran</p>
                        </div>
                    )}
                    {attendanceStats.presentToday === attendanceStats.totalEmployees && (
                        <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded">
                            <p className="text-sm text-green-700 font-medium">✅ Semua karyawan hadir hari ini</p>
                            <p className="text-xs text-green-600 mt-1">Unit beroperasi dengan kapasitas penuh</p>
                        </div>
                    )}
                    {attendanceStats.presentToday === 0 && (
                        <div className="p-4 bg-gray-50 border-l-4 border-gray-500 rounded">
                            <p className="text-sm text-gray-700 font-medium">📊 Belum ada data kehadiran hari ini</p>
                            <p className="text-xs text-gray-600 mt-1">Data akan muncul setelah karyawan melakukan absensi</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default KepalaRuanganDashboard;