import React, { useState, useMemo } from 'react';
import { Employee, AttendanceRecord, Payslip } from '../types.ts';
import { calculatePayslip, buildPayrollConfig } from '../services/payrollService.ts';
import PayslipDetail from './PayslipDetail.tsx';
import { CurrencyDollarIcon, UserGroupIcon } from './icons.tsx';
import { useAuth, useUI, useAppData } from '../stores/appStore.ts';
import { canManagePayroll, ensurePortalAccess } from '../services/portalAccessService.ts';
import { createAuditLog } from '../services/auditLogService.ts';

interface PayrollManagementProps {
    employees: Employee[];
    attendanceRecords: AttendanceRecord[];
}

const PayrollManagement: React.FC<PayrollManagementProps> = ({ employees, attendanceRecords }) => {
    const { authUser } = useAuth();
    const { activePortal } = useUI();
    const { systemSettings } = useAppData();
    const payrollConfig = useMemo(() => buildPayrollConfig(systemSettings), [systemSettings]);
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const [selectedMonth, setSelectedMonth] = useState(currentMonth);
    const [selectedYear, setSelectedYear] = useState(currentYear);
    
    const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
    const [selectedEmployeeForPayslip, setSelectedEmployeeForPayslip] = useState<Employee | null>(null);
    const [isPayslipOpen, setIsPayslipOpen] = useState(false);

    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

    const employeePayrollData = useMemo(() => {
        return employees.map(employee => {
            const attendanceForPeriod = attendanceRecords.filter(record => {
                const recordDate = new Date(record.tanggal);
                return record.employeeId === employee.id &&
                       recordDate.getMonth() === selectedMonth &&
                       recordDate.getFullYear() === selectedYear;
            });
            
            const totalHours = attendanceForPeriod.reduce((acc, rec) => {
                const [inH, inM] = rec.clockIn.split(':').map(Number);
                const [outH, outM] = rec.clockOut.split(':').map(Number);
                let outTime = outH + outM / 60;
                const inTime = inH + inM / 60;
                if (outTime < inTime) outTime += 24; // overnight shift
                return acc + (outTime - inTime);
            }, 0);

            const totalOvertime = attendanceForPeriod.reduce((acc, rec) => acc + rec.overtimeHours, 0);
            const totalLate = attendanceForPeriod.filter(rec => rec.isLate).length;

            return {
                ...employee,
                totalHours: totalHours.toFixed(2),
                totalOvertime: totalOvertime.toFixed(2),
                totalLate,
                attendanceForPeriod,
            };
        });
    }, [employees, attendanceRecords, selectedMonth, selectedYear]);
    
    const handleGeneratePayslip = async (employeeData: typeof employeePayrollData[0]) => {
        const portalError = ensurePortalAccess(activePortal, 'operational', 'Generate slip gaji');
        if (portalError) {
            alert(portalError);
            return;
        }

        if (!canManagePayroll(authUser?.profile.role)) {
            alert('Role Anda tidak memiliki izin membuat slip gaji.');
            return;
        }

        if (!employeeData.compensation) {
            alert(`Data kompensasi untuk ${employeeData.nama} tidak lengkap.`);
            return;
        }
        const period = `${months[selectedMonth]} ${selectedYear}`;
        const payslip = calculatePayslip(employeeData, employeeData.attendanceForPeriod, period, payrollConfig);
        setSelectedPayslip(payslip);
        setSelectedEmployeeForPayslip(employeeData);
        setIsPayslipOpen(true);

        void createAuditLog({
            action: 'CREATE',
            entityType: 'payroll',
            entityId: payslip.id,
            entityName: employeeData.nama,
            newData: {
                employeeId: employeeData.id,
                period,
                totalPendapatan: payslip.totalPendapatan,
                gajiBersih: payslip.gajiBersih,
            },
            description: `Generate slip gaji ${employeeData.nama} periode ${period}`,
            portalType: 'operational',
            metadata: { source: 'PayrollManagement.handleGeneratePayslip' },
        });
    };

    return (
        <>
            <div className="bg-white p-6 rounded-xl shadow-md">
                <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
                    <CurrencyDollarIcon className="w-6 h-6" />
                    Manajemen Penggajian
                </h3>
                
                <div className="bg-[#e6f3f2] p-4 rounded-lg mb-6 flex items-center gap-4">
                    <p className="font-medium">Pilih Periode Gaji:</p>
                     <select 
                                title="Pilih bulan periode gaji"
                        value={selectedMonth} 
                        onChange={e => setSelectedMonth(Number(e.target.value))}
                        className="border-gray-300 rounded-lg shadow-sm"
                    >
                        {months.map((month, index) => (
                            <option key={month} value={index}>{month}</option>
                        ))}
                    </select>
                     <select 
                                title="Pilih tahun periode gaji"
                        value={selectedYear} 
                        onChange={e => setSelectedYear(Number(e.target.value))}
                        className="border-gray-300 rounded-lg shadow-sm"
                    >
                        {years.map(year => <option key={year} value={year}>{year}</option>)}
                    </select>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Karyawan</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jabatan</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total Jam Kerja</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total Lembur</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Keterlambatan</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {employeePayrollData.map(emp => (
                                <tr key={emp.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{emp.nama}</div>
                                        <div className="text-sm text-gray-500">{emp.email}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.jabatan}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{emp.totalHours} jam</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{emp.totalOvertime} jam</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                        <span className={`font-semibold ${emp.totalLate > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            {emp.totalLate} hari
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button 
                                            onClick={() => handleGeneratePayslip(emp)}
                                            className="px-3 py-1 bg-primary text-white text-xs font-medium rounded-lg hover:bg-opacity-90 disabled:bg-gray-400"
                                            disabled={!emp.compensation}
                                            title={!emp.compensation ? 'Data kompensasi tidak lengkap' : 'Buat Slip Gaji'}
                                        >
                                            Buat Slip Gaji
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <PayslipDetail
                isOpen={isPayslipOpen}
                onClose={() => setIsPayslipOpen(false)}
                payslip={selectedPayslip}
                employee={selectedEmployeeForPayslip}
            />
        </>
    );
};

export default PayrollManagement;
