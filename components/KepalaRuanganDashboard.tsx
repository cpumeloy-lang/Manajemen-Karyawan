import React from 'react';
import { Employee } from '../types.ts';
import { UserGroupIcon, ClockIcon, CalendarDaysIcon } from './icons.tsx';
import LoadingSpinner from './LoadingSpinner.tsx';
import { useKepalaRuanganDashboard } from '../hooks/useKepalaRuanganDashboard.ts';
import ShiftDistributionCard from './kepala-ruangan/ShiftDistributionCard.tsx';
import ScheduleSummaryCard from './kepala-ruangan/ScheduleSummaryCard.tsx';
import TodayScheduleCard from './kepala-ruangan/TodayScheduleCard.tsx';
import UnitStatusAlerts from './kepala-ruangan/UnitStatusAlerts.tsx';

interface KepalaRuanganDashboardProps {
    kepalaRuangan: Employee;
    onNavigate?: (view: string) => void;
}

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

const KepalaRuanganDashboard: React.FC<KepalaRuanganDashboardProps> = ({ kepalaRuangan, onNavigate }) => {
    const kepalaAny = kepalaRuangan as any;
    const managedUnitId = kepalaRuangan.unitKerjaId
        || kepalaAny.unit_kerja_id
        || kepalaRuangan.managedUnitId
        || kepalaAny.managed_unit_id;

    const { unitData, loading, isRefreshing, lastUpdated, refresh } = useKepalaRuanganDashboard(managedUnitId);

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
                        onClick={() => void refresh({ silent: true })}
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

            <ShiftDistributionCard shiftStats={shiftStats} unitShifts={unitShifts} />
            <ScheduleSummaryCard scheduleInfo={scheduleInfo} onNavigate={onNavigate} />
            <TodayScheduleCard employees={employees} unitShifts={unitShifts} todayScheduleMap={todayScheduleMap} />

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

            <UnitStatusAlerts attendanceStats={attendanceStats} />
        </div>
    );
};

export default KepalaRuanganDashboard;