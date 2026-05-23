import { useState, useMemo } from 'react';
import { Employee, AttendanceRecord, LeaveRequest, Payslip } from '../types.ts';
import { calculatePayslip, buildPayrollConfig } from '../services/payrollService.ts';

interface UseESSDataProps {
    user: Employee;
    attendanceRecords: AttendanceRecord[];
    systemSettings: any;
}

export function useESSData({ user, attendanceRecords, systemSettings }: UseESSDataProps) {
    // Attendance filter state
    const [attendanceMonthFilter, setAttendanceMonthFilter] = useState('all');
    const [attendanceDateFilter, setAttendanceDateFilter] = useState({ start: '', end: '' });

    // Available months from records
    const attendanceMonths = useMemo(() => {
        const values = new Set<string>();
        attendanceRecords.forEach((record) => {
            values.add(record.tanggal.slice(0, 7));
        });
        return [...values].sort((a, b) => b.localeCompare(a));
    }, [attendanceRecords]);

    // Filtered records based on month and date range
    const filteredAttendanceRecords = useMemo(() => {
        return [...attendanceRecords]
            .filter((record) => attendanceMonthFilter === 'all' || record.tanggal.startsWith(attendanceMonthFilter))
            .filter((record) => {
                if (attendanceDateFilter.start && record.tanggal < attendanceDateFilter.start) return false;
                if (attendanceDateFilter.end && record.tanggal > attendanceDateFilter.end) return false;
                return true;
            })
            .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
    }, [attendanceRecords, attendanceDateFilter.end, attendanceDateFilter.start, attendanceMonthFilter]);

    // Attendance summary stats
    const attendanceSummary = useMemo(() => {
        const total = filteredAttendanceRecords.length;
        const lateCount = filteredAttendanceRecords.filter((record) => record.isLate).length;
        const onTimeCount = total - lateCount;
        const totalOvertime = Number(filteredAttendanceRecords.reduce((sum, record) => sum + (record.overtimeHours || 0), 0).toFixed(2));
        const lateRate = total ? Number(((lateCount / total) * 100).toFixed(0)) : 0;
        const onTimeRate = total ? Number(((onTimeCount / total) * 100).toFixed(0)) : 0;
        return { total, lateCount, onTimeCount, totalOvertime, lateRate, onTimeRate };
    }, [filteredAttendanceRecords]);

    // Kinerja trend data (last 90 days, weekly)
    const kinerjaTrendData = useMemo(() => {
        const now = new Date();
        const weeks: Record<string, { hadir: number; terlambat: number; lembur: number; label: string }> = {};

        attendanceRecords.forEach(rec => {
            const d = new Date(rec.tanggal);
            const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
            if (diffDays > 90) return;
            const weekNum = Math.floor(diffDays / 7);
            const key = String(weekNum);
            if (!weeks[key]) {
                const weekStart = new Date(now);
                weekStart.setDate(now.getDate() - (weekNum + 1) * 7);
                weeks[key] = {
                    label: weekStart.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
                    hadir: 0, terlambat: 0, lembur: 0
                };
            }
            weeks[key].hadir += 1;
            if (rec.isLate) weeks[key].terlambat += 1;
            weeks[key].lembur += Number(rec.overtimeHours || 0);
        });

        return Object.keys(weeks)
            .sort((a, b) => Number(b) - Number(a))
            .reverse()
            .map(k => ({ ...weeks[k], lembur: Number(weeks[k].lembur.toFixed(1)) }));
    }, [attendanceRecords]);

    // Monthly kinerja summary (last 6 months)
    const monthlyKinerjaSummary = useMemo(() => {
        const byMonth: Record<string, { bulan: string; hadir: number; terlambat: number; lembur: number; skor: number }> = {};

        attendanceRecords.forEach(rec => {
            const ym = rec.tanggal.slice(0, 7);
            if (!byMonth[ym]) {
                const [y, m] = ym.split('-').map(Number);
                byMonth[ym] = {
                    bulan: new Date(y, m - 1).toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
                    hadir: 0, terlambat: 0, lembur: 0, skor: 0
                };
            }
            byMonth[ym].hadir += 1;
            if (rec.isLate) byMonth[ym].terlambat += 1;
            byMonth[ym].lembur += Number(rec.overtimeHours || 0);
        });

        return Object.keys(byMonth)
            .sort()
            .slice(-6)
            .map(k => {
                const d = byMonth[k];
                const skor = d.hadir > 0 ? Math.max(0, Math.round(100 - (d.terlambat / d.hadir) * 100)) : 0;
                return { ...d, lembur: Number(d.lembur.toFixed(1)), skor };
            });
    }, [attendanceRecords]);

    // Overall kinerja metrics
    const overallKinerja = useMemo(() => {
        const total = attendanceRecords.length;
        const lateCount = attendanceRecords.filter(r => r.isLate).length;
        const totalOvertime = attendanceRecords.reduce((s, r) => s + Number(r.overtimeHours || 0), 0);
        const punctualityScore = total > 0 ? Math.max(0, Math.round(100 - (lateCount / total) * 100)) : 0;
        const avgOvertimePerDay = total > 0 ? Number((totalOvertime / total).toFixed(1)) : 0;
        const grade = punctualityScore >= 90 ? { label: 'Sangat Baik', color: 'text-green-600', bg: 'bg-green-50 border-green-200' }
            : punctualityScore >= 75 ? { label: 'Baik', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' }
            : punctualityScore >= 60 ? { label: 'Cukup', color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' }
            : { label: 'Perlu Perhatian', color: 'text-red-600', bg: 'bg-red-50 border-red-200' };
        return { total, lateCount, totalOvertime: Number(totalOvertime.toFixed(1)), punctualityScore, avgOvertimePerDay, grade };
    }, [attendanceRecords]);

    // Payslip history
    const payslipHistory = useMemo(() => {
        const history: { period: string, payslip: Payslip }[] = [];
        const periods = new Set(attendanceRecords.map(r => new Date(r.tanggal).toISOString().slice(0, 7)));
        
        periods.forEach(p => {
            const [year, month] = p.split('-').map(Number);
            const periodName = `${new Date(year, month - 1).toLocaleString('id-ID', { month: 'long' })} ${year}`;
            const recordsForPeriod = attendanceRecords.filter(r => r.tanggal.startsWith(p));
            if (recordsForPeriod.length > 0 && user.compensation) {
                const payslip = calculatePayslip(user, recordsForPeriod, periodName, buildPayrollConfig(systemSettings));
                history.push({ period: periodName, payslip, rawPeriod: p } as any);
            }
        });
        
        // [HK-M6] Sort by the actual ISO period 'YYYY-MM' instead of parsing UUID slice
        return history
            .sort((a: any, b: any) => b.rawPeriod.localeCompare(a.rawPeriod))
            .map(item => ({ period: item.period, payslip: item.payslip }));
    }, [attendanceRecords, user, systemSettings]);

    // Utility functions
    const formatDate = (dateStr: string, options?: Intl.DateTimeFormatOptions) => {
        return new Date(dateStr).toLocaleDateString('id-ID', options);
    };

    const formatMoney = (value: number) => new Intl.NumberFormat('id-ID').format(value);

    return {
        // Filter state
        attendanceMonthFilter,
        setAttendanceMonthFilter,
        attendanceDateFilter,
        setAttendanceDateFilter,
        // Computed data
        attendanceMonths,
        filteredAttendanceRecords,
        attendanceSummary,
        kinerjaTrendData,
        monthlyKinerjaSummary,
        overallKinerja,
        payslipHistory,
        // Utilities
        formatDate,
        formatMoney,
    };
}
