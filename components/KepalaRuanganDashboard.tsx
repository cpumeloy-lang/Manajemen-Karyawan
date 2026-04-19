import React, { useState, useEffect } from 'react';
import { Employee, WorkUnit } from '../types.ts';
import { supabase } from '../services/supabaseClient.ts';
import { UserGroupIcon, ClockIcon, CalendarDaysIcon } from './icons.tsx';
import LoadingSpinner from './LoadingSpinner.tsx';

const DASHBOARD_REFRESH_MS = 45000;

interface KepalaRuanganDashboardProps {
    kepalaRuangan: Employee;
    onNavigate?: (view: string) => void;
}

const KepalaRuanganDashboard: React.FC<KepalaRuanganDashboardProps> = ({ kepalaRuangan, onNavigate }) => {
    const managedUnitId = kepalaRuangan.unitKerjaId || kepalaRuangan.managedUnitId;
    const [unitData, setUnitData] = useState<{
        workUnit: WorkUnit | null;
        employees: Employee[];
        attendanceStats: {
            totalEmployees: number;
            presentToday: number;
            absentToday: number;
            onLeave: number;
        };
        shiftStats: {
            pagi: number;
            siang: number;
            malam: number;
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

        return () => {
            isActive = false;
            window.clearInterval(intervalId);
            window.removeEventListener('focus', handleWindowFocus);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [managedUnitId]);

    const normalizeAttendanceStatus = (status: unknown): string =>
        String(status || '').trim().toLowerCase();

    const loadEmployeesByUnit = async (unitId: string): Promise<any[]> => {
        const camelCaseQuery = await supabase
            .from('employees')
            .select('*')
            .eq('unitKerjaId', unitId);

        if (!camelCaseQuery.error) {
            return (camelCaseQuery.data as any[]) || [];
        }

        const snakeCaseQuery = await supabase
            .from('employees')
            .select('*')
            .eq('unit_kerja_id', unitId);

        if (snakeCaseQuery.error) {
            throw snakeCaseQuery.error;
        }

        return (snakeCaseQuery.data as any[]) || [];
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

            // Calculate shift stats
            const shiftStats = {
                pagi: activeEmployees.filter(emp => emp.shift === 'Pagi').length,
                siang: activeEmployees.filter(emp => emp.shift === 'Siang').length,
                malam: activeEmployees.filter(emp => emp.shift === 'Malam').length,
            };

            setUnitData({
                workUnit: workUnitData,
                employees: activeEmployees,
                attendanceStats: {
                    totalEmployees: activeEmployees.length,
                    presentToday,
                    absentToday,
                    onLeave,
                },
                shiftStats,
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

    const { workUnit, employees, attendanceStats, shiftStats } = unitData;

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
                    title="Shift Pagi"
                    value={shiftStats.pagi}
                    icon={<CalendarDaysIcon className="h-8 w-8" />}
                    color="text-yellow-600"
                    subtitle="Karyawan"
                />
            </div>

            {/* Shift Distribution */}
            <div className="bg-white p-6 rounded-xl shadow-md">
                <h2 className="text-xl font-bold text-[#06736a] mb-4">📊 Distribusi Shift Unit</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <div className="text-2xl font-bold text-yellow-700">{shiftStats.pagi}</div>
                        <div className="text-sm text-yellow-600">Shift Pagi</div>
                        <div className="text-xs text-gray-500 mt-1">06:00 - 14:00</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-2xl font-bold text-blue-700">{shiftStats.siang}</div>
                        <div className="text-sm text-blue-600">Shift Siang</div>
                        <div className="text-xs text-gray-500 mt-1">14:00 - 22:00</div>
                    </div>
                    <div className="text-center p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                        <div className="text-2xl font-bold text-indigo-700">{shiftStats.malam}</div>
                        <div className="text-sm text-indigo-600">Shift Malam</div>
                        <div className="text-xs text-gray-500 mt-1">22:00 - 06:00</div>
                    </div>
                </div>
            </div>

            {/* Quick Actions for Unit Management */}
            <div className="bg-[#e6f3f2] p-6 rounded-xl">
                <h2 className="text-xl font-bold text-[#06736a] mb-4">⚡ Aksi Manajemen Unit</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <QuickActionCard
                        title="Kelola Jadwal Shift"
                        description="Atur jadwal kerja karyawan di unit Anda"
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
                        onClick={() => onNavigate?.('dashboard')}
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