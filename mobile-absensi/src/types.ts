export type AttendanceTab =
  | 'dashboard'
  | 'attendance'
  | 'schedule'
  | 'history'
  | 'requests'
  | 'profile'
  | 'device'
  | 'face';

export type BiometricType = 'face' | 'fingerprint' | 'iris' | 'code' | 'totp' | 'manual';

export interface FaceVerificationResult {
  verified: boolean;
  score: number;
  details?: Record<string, any>;
}

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  platform: 'Android' | 'iOS' | 'web' | 'unknown';
  deviceFingerprint: string;
  isPrimary: boolean;
}

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
  sisaCuti?: number;
  telepon?: string;
  foto?: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  tanggal: string;
  clockIn: string;
  clockOut?: string;
  location: string;
  latitude?: number;
  longitude?: number;
  isLate: boolean;
  overtimeHours: number;
  status: 'Hadir' | 'Terlambat' | 'Absen' | 'Cuti' | 'Sakit' | 'Pending' | 'Recorded';
  source?: 'mobile' | 'web-ess' | 'web-admin';
  notes?: string;
  deviceId?: string;
  biometricType?: BiometricType;
  biometricVerified?: boolean;
  faceMatchScoreCheckIn?: number;
  faceMatchScoreCheckOut?: number;
  faceVerificationCheckIn?: Record<string, any>;
  faceVerificationCheckOut?: Record<string, any>;
}

export interface CheckInDraft {
  tanggal: string;
  clockIn: string;
  clockOut?: string;
  location: string;
  latitude?: number;
  longitude?: number;
}
