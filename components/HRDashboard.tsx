/**
 * HRDashboard.tsx - REFACTORED
 * 
 * HR Manager Dashboard - now a thin composition layer.
 * 
 * Previous: ~478 lines, all data logic + chart + tables inline
 * Current:  ~120 lines, focused on layout composition
 * 
 * Architecture:
 * HRDashboard.tsx → Layout & composition
 * ├─ useHRDashboard.ts            → All data computation
 * ├─ AttendanceChart.tsx           → Recharts trend chart
 * └─ DashboardTables.tsx           → Late employees + recent requests
 */
import React from 'react';
import { AttendanceRecord, Employee, AllRequest } from '../types.ts';
import { useHRDashboard } from '../hooks/useHRDashboard';
import AttendanceChart from './hr-dashboard/AttendanceChart';
import { LateEmployeesTable, RecentRequestsList } from './hr-dashboard/DashboardTables';

interface HRDashboardProps {
    currentUser: Employee;
    employees: Employee[];
    attendanceRecords: AttendanceRecord[];
    allRequests: AllRequest[];
    onNavigate?: (view: 'employees' | 'attendance' | 'requests' | 'payroll') => void;
}

const InfoCard: React.FC<{ title: string; value: string | number; subtitle?: string; color?: string }> = ({ title, value, subtitle, color = 'text-[#06736a]' }) => (
    <div className="bg-white p-6 rounded-xl shadow-md">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
);

const ActionCard: React.FC<{ title: string; description: string; onClick?: () => void }> = ({ title, description, onClick }) => (
    <button type="button" onClick={onClick} className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow text-left w-full">
        <h3 className="text-lg font-semibold text-[#06736a] mb-1">{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>
    </button>
);

const HRDashboard: React.FC<HRDashboardProps> = ({ currentUser, employees, attendanceRecords, allRequests, onNavigate }) => {
    const { selectedRange, setSelectedRange, isManualRefreshing, handleManualRefresh, getLastRefreshedLabel, metrics, trendData, recentRequests, frequentLateEmployees } = useHRDashboard({ employees, attendanceRecords, allRequests });

    return (
        <div className="space-y-6">
            {/* Welcome Header */}
            <div className="bg-gradient-to-r from-[#06736a] to-[#089c8e] p-6 sm:p-8 rounded-xl shadow-md text-white">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Dashboard HR Manager</h1>
                        <p className="text-white/90">Monitoring kehadiran harian dan analitik SDM berbasis data aktual</p>
                        <p className="text-white/80 text-sm mt-1">{currentUser.nama} - {currentUser.jabatan}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <button onClick={handleManualRefresh} disabled={isManualRefreshing}
                            className="flex items-center gap-2 rounded-lg bg-white/20 hover:bg-white/30 disabled:opacity-60 px-3 py-2 text-sm font-medium text-white transition-colors">
                            <svg className={`h-4 w-4 ${isManualRefreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            {isManualRefreshing ? 'Memperbarui...' : 'Refresh'}
                        </button>
                        <span className="text-xs text-white/70">Diperbarui: {getLastRefreshedLabel()} · Auto 60 dtk</span>
                    </div>
                </div>
            </div>

            {/* Metrics Cards - Row 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <InfoCard title="Karyawan Aktif" value={metrics.activeEmployees} subtitle={`Non-Aktif: ${metrics.inactiveEmployees}`} />
                <InfoCard title="Hadir Hari Ini" value={metrics.presentToday} subtitle={`Tingkat hadir: ${metrics.attendanceRateToday}%`} color="text-green-600" />
                <InfoCard title="Terlambat Hari Ini" value={metrics.lateToday} subtitle={`Late rate: ${metrics.lateRateToday}%`} color="text-amber-600" />
                <InfoCard title="Estimasi Tidak Hadir" value={metrics.absenceEstimateToday} subtitle={`Cuti aktif: ${metrics.approvedLeaveToday}`} color="text-red-600" />
            </div>

            {/* Metrics Cards - Row 2 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <InfoCard title={`Rata-rata Hadir (${selectedRange} hari)`} value={metrics.avgPresentPerDay} subtitle={`Total hadir: ${metrics.totalPresentRange}`} color="text-emerald-700" />
                <InfoCard title={`Total Lembur (${selectedRange} hari)`} value={`${metrics.totalOvertimeRange} jam`} subtitle={`Hari ini: ${metrics.overtimeToday} jam`} color="text-sky-700" />
                <InfoCard title="Permohonan Pending" value={metrics.pendingRequests} subtitle={`Cuti: ${metrics.pendingLeave} | Reimburse: ${metrics.pendingReimburse}`} color="text-yellow-600" />
                <InfoCard title="Skor Ketepatan" value={`${metrics.punctualityScore}%`} subtitle={`Rata-rata keterlambatan: ${metrics.avgLateRateRange}%`} color="text-[#06736a]" />
            </div>

            {/* Chart */}
            <AttendanceChart trendData={trendData} selectedRange={selectedRange} onRangeChange={setSelectedRange} />

            {/* Tables */}
            <LateEmployeesTable frequentLateEmployees={frequentLateEmployees} />
            <RecentRequestsList recentRequests={recentRequests} />

            {/* Quick Actions */}
            <div className="bg-[#e6f3f2] p-6 rounded-xl">
                <h2 className="text-xl font-bold text-[#06736a] mb-4">Aksi Cepat HR</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <ActionCard title="Data Karyawan" description="Kelola data dan profil karyawan" onClick={() => onNavigate?.('employees')} />
                    <ActionCard title="Kehadiran" description="Audit absensi, keterlambatan, dan lembur" onClick={() => onNavigate?.('attendance')} />
                    <ActionCard title="Permohonan" description="Review cuti dan reimbursement" onClick={() => onNavigate?.('requests')} />
                    <ActionCard title="Payroll" description="Lihat ringkasan penggajian" onClick={() => onNavigate?.('payroll')} />
                </div>
            </div>
        </div>
    );
};

export default HRDashboard;
