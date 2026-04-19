export type AttendanceTab = 'dashboard' | 'attendance' | 'history' | 'profile';

export interface MobileUser {
  id: string;
  name: string;
  email: string;
  employeeId?: string;
  nik?: string;
  role: 'karyawan' | 'hrd' | 'admin';
  jabatan?: string;
  departemen?: string;
  unitName?: string;
  shift?: string;
  status?: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  tanggal: string;
  clockIn: string;
  clockOut?: string;
  location: string;
  isLate: boolean;
  overtimeHours: number;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Recorded';
}

export interface CheckInDraft {
  tanggal: string;
  clockIn: string;
  location: string;
  latitude?: number;
  longitude?: number;
}
