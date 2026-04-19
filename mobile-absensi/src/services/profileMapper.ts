import type { MobileUser } from '../types';

export function mapEmployeeRowToMobileUser(employee: any, authEmail?: string, authId?: string): MobileUser {
  return {
    id: String(employee.id || authId || ''),
    employeeId: String(employee.id || ''),
    nik: employee.nik || undefined,
    email: employee.email || authEmail || '',
    name: employee.nama || authEmail || 'Karyawan',
    role: 'karyawan',
    jabatan: employee.jabatan || undefined,
    departemen: employee.departemen || undefined,
    unitName: employee.unitKerjaId || employee.managedUnitId || undefined,
    shift: employee.shift || undefined,
    status: employee.status || undefined,
  };
}
