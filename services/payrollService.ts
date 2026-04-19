import { Employee, AttendanceRecord, Payslip } from '../types.ts';

const PPH21_RATE = 0.05; // Simplified PPh 21 rate (5%)
const BPJS_RATE = 0.01; // Simplified BPJS Kesehatan rate (1%)
const OVERTIME_RATE_PER_HOUR = 30000; // Simplified overtime pay rate

export const calculatePayslip = (
    employee: Employee,
    attendanceForPeriod: AttendanceRecord[],
    period: string // e.g., "Juli 2024"
): Payslip => {
    const { compensation } = employee;

    if (!compensation) {
        throw new Error(`Data kompensasi tidak ditemukan untuk karyawan ${employee.nama}`);
    }

    const { gajiPokok, tunjanganProfesi } = compensation;

    // Calculate total overtime hours for the period
    const totalOvertime = attendanceForPeriod.reduce((acc, record) => acc + record.overtimeHours, 0);
    const upahLembur = totalOvertime * OVERTIME_RATE_PER_HOUR;

    const totalPendapatan = gajiPokok + tunjanganProfesi + upahLembur;

    // Calculate deductions
    const potonganPPh21 = totalPendapatan * PPH21_RATE;
    const potonganBPJS = gajiPokok * BPJS_RATE; // BPJS is often based on base salary
    const totalPotongan = potonganPPh21 + potonganBPJS;

    const gajiBersih = totalPendapatan - totalPotongan;

    return {
        id: `payslip-${employee.id}-${period.replace(' ', '-')}`,
        employeeId: employee.id,
        periode: period,
        gajiPokok,
        tunjanganProfesi,
        upahLembur,
        totalPendapatan,
        potonganPPh21,
        potonganBPJS,
        totalPotongan,
        gajiBersih,
    };
};