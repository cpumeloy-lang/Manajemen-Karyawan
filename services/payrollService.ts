import { Employee, AttendanceRecord, Payslip, SystemSettings } from '../types.ts';

// Default rates (can be overridden via SystemSettings)
const DEFAULT_BPJS_KESEHATAN_RATE = 0.01;       // 1% for employee
const DEFAULT_BPJS_KESEHATAN_MAX_WAGE = 12000000;
const DEFAULT_OVERTIME_RATE_PER_HOUR = 30000;

export interface PayrollConfig {
    overtimeRatePerHour: number;
    bpjsKesehatanRate: number;
    bpjsKesehatanMaxWage: number;
}

/** Build payroll config from SystemSettings, fallback to defaults */
export function buildPayrollConfig(settings?: Partial<SystemSettings> | null): PayrollConfig {
    return {
        overtimeRatePerHour:  settings?.overtime_rate_per_hour  ?? DEFAULT_OVERTIME_RATE_PER_HOUR,
        bpjsKesehatanRate:    settings?.bpjs_kesehatan_rate     ?? DEFAULT_BPJS_KESEHATAN_RATE,
        bpjsKesehatanMaxWage: settings?.bpjs_kesehatan_max_wage ?? DEFAULT_BPJS_KESEHATAN_MAX_WAGE,
    };
}

// Calculate PTKP (Penghasilan Tidak Kena Pajak)
const getPTKP = (employee: Employee): number => {
    const basePTKP = 54000000; // TK/0 (Single)
    let ptkp = basePTKP;

    if (employee.maritalStatus === 'Married') {
        ptkp += 4500000; // Additional for married
    }

    const dependents = Math.min(employee.dependents || 0, 3);
    ptkp += dependents * 4500000; // Max 3 dependents

    return ptkp;
};

// Calculate Progressive PPh21
const calculateAnnualPPh21 = (pkp: number): number => {
    if (pkp <= 0) return 0;
    
    let tax = 0;
    let remainingPkp = Math.floor(pkp / 1000) * 1000; // Round down to nearest 1000

    if (remainingPkp > 5000000000) {
        tax += (remainingPkp - 5000000000) * 0.35;
        remainingPkp = 5000000000;
    }
    if (remainingPkp > 500000000) {
        tax += (remainingPkp - 500000000) * 0.30;
        remainingPkp = 500000000;
    }
    if (remainingPkp > 250000000) {
        tax += (remainingPkp - 250000000) * 0.25;
        remainingPkp = 250000000;
    }
    if (remainingPkp > 60000000) {
        tax += (remainingPkp - 60000000) * 0.15;
        remainingPkp = 60000000;
    }
    if (remainingPkp > 0) {
        tax += remainingPkp * 0.05;
    }

    return tax;
};

export const calculatePayslip = (
    employee: Employee,
    attendanceForPeriod: AttendanceRecord[],
    period: string, // e.g., "Juli 2024"
    config?: PayrollConfig
): Payslip => {
    const { compensation } = employee;

    if (!compensation) {
        throw new Error(`Data kompensasi tidak ditemukan untuk karyawan ${employee.nama}`);
    }

    const cfg = config || buildPayrollConfig(null);
    const { gajiPokok, tunjanganProfesi } = compensation;

    // Calculate total overtime hours for the period
    const totalOvertime = attendanceForPeriod.reduce((acc, record) => acc + (record.overtimeHours || 0), 0);
    const upahLembur = totalOvertime * cfg.overtimeRatePerHour;

    const totalPendapatan = gajiPokok + tunjanganProfesi + upahLembur;

    // BPJS Calculation (Kesehatan up to max wage)
    const bpjsWageBase = Math.min(gajiPokok, cfg.bpjsKesehatanMaxWage);
    const potonganBPJS = bpjsWageBase * cfg.bpjsKesehatanRate;

    // PPh 21 Calculation
    const annualGrossIncome = totalPendapatan * 12;
    const biayaJabatanAnnual = Math.min(annualGrossIncome * 0.05, 6000000); // Max 6M per year
    
    const annualNetIncome = annualGrossIncome - biayaJabatanAnnual;
    const ptkp = getPTKP(employee);
    const pkp = Math.max(annualNetIncome - ptkp, 0);
    
    const annualPPh21 = calculateAnnualPPh21(pkp);
    const potonganPPh21 = annualPPh21 / 12;

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