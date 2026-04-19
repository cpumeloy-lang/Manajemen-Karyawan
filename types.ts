export enum Status {
    Aktif = 'Aktif',
    Cuti = 'Cuti',
    NonAktif = 'Non-Aktif',
}

export type Shift = 'Pagi' | 'Siang' | 'Malam';

export type DocumentType = 'Ijazah' | 'STR/SIP' | 'Sertifikat' | 'Lainnya';

export interface Document {
    id: string;
    employeeId: string;
    name: string;
    type: DocumentType;
    fileUrl: string;
    uploadedAt: string; // ISO string
}

export interface Compensation {
    gajiPokok: number;
    tunjanganProfesi: number;
}

export interface WorkUnit {
    id: string;
    nama: string;
}

export interface Department {
    id: string;
    nama: string;
}

export interface Position {
    id: string;
    nama: string;
}

export interface SystemSettings {
    id: string;
    institution_name: string;
    institution_type: 'Rumah Sakit' | 'Klinik' | 'Puskesmas';
    logo_url?: string;
    address?: string;
    phone?: string;
    updated_at: string;
}

export type Role = 'admin' | 'hrd' | 'kepala_ruangan' | 'karyawan';
export type MaritalStatus = 'Single' | 'Married' | 'Divorced' | 'Widowed';
export type EducationLevel = 'SD' | 'SMP' | 'SMA' | 'D3' | 'D4' | 'S1' | 'S2' | 'S3';

// Address Information
export interface Address {
    ktp: string;
    domisili: string;
    province: string;
    city: string;
    postalCode: string;
}

// Emergency Contact
export interface EmergencyContact {
    name: string;
    relationship: string;
    phone: string;
    address: string;
}

// Education History
export interface Education {
    id: string;
    level: EducationLevel;
    institution: string;
    major: string;
    graduationYear: number;
    gpa?: number;
}

// Work History
export interface WorkHistory {
    id: string;
    company: string;
    position: string;
    startDate: string; // "YYYY-MM-DD"
    endDate: string; // "YYYY-MM-DD"
    reasonLeaving: string;
}

// Bank Account
export interface BankAccount {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
}

export interface Employee {
    id: string;
    user_id: string; // Foreign key to supabase.auth.users.id
    nik?: string; // Nomor Induk Karyawan (untuk ID card)
    nama: string;
    foto: string;
    jabatan: string;
    departemen: string;
    email: string;
    telepon: string;
    hireDate: string; // "YYYY-MM-DD"
    birthDate: string; // "YYYY-MM-DD"
    status: Status;
    shift: Shift;
    sisaCuti: number;
    role: Role;
    spesialisasi?: string;
    kredensial?: string;
    nomorSTR?: string;
    tanggalKadaluarsaSTR?: string; // "YYYY-MM-DD"
    unitKerjaId?: string;
    sertifikasi: string[];
    kompetensi: string[];
    documents: Document[];
    compensation?: Compensation;
    
    // NEW FIELDS - Personal & Contact Info
    ktpNumber?: string;
    npwp?: string;
    bpjsKesehatan?: string;
    bpjsKetenagakerjaan?: string;
    maritalStatus?: MaritalStatus;
    dependents?: number; // Jumlah tanggungan
    address?: Address;
    emergencyContacts?: EmergencyContact[];
    
    // NEW FIELDS - Professional Info
    education?: Education[];
    workHistory?: WorkHistory[];
    bankAccount?: BankAccount;
    
    // VALIDATION & LOCKING FIELDS
    isProfileCompleted?: boolean;
    isVerified?: boolean;
    verifiedBy?: string; // ID of HRD who verified
    verifiedAt?: string; // ISO timestamp
    isLocked?: boolean; // If true, employee cannot edit
    
    // ROLE-SPECIFIC FIELDS
    managedUnitId?: string; // Unit kerja yang dikelola (untuk kepala_ruangan)
}

export interface AuthenticatedUser {
    id: string;
    email?: string;
    profile: Employee;
}

export type SortKey = 'jabatan' | 'departemen' | 'status' | 'hireDate' | 'nama';
export type SortDirection = 'asc' | 'desc';

export interface AttendanceRecord {
    id: string;
    employeeId: string;
    tanggal: string; // "YYYY-MM-DD"
    clockIn: string; // "HH:mm"
    clockOut: string; // "HH:mm"
    location: string;
    isLate: boolean;
    overtimeHours: number;
}

export interface Payslip {
    id: string;
    employeeId: string;
    periode: string;
    gajiPokok: number;
    tunjanganProfesi: number;
    upahLembur: number;
    totalPendapatan: number;
    potonganPPh21: number;
    potonganBPJS: number;
    totalPotongan: number;
    gajiBersih: number;
}

export enum RequestStatus {
    Pending = 'Pending',
    Approved = 'Approved',
    Rejected = 'Rejected',
}

export enum RequestType {
    Cuti = 'Cuti',
    Reimbursement = 'Reimbursement',
}

export interface LeaveRequest {
    id: string;
    employeeId: string;
    type: RequestType.Cuti;
    startDate: string; // "YYYY-MM-DD"
    endDate: string; // "YYYY-MM-DD"
    reason: string;
    status: RequestStatus;
    requestedAt: string; // ISO string
}

export interface ReimbursementRequest {
    id: string;
    employeeId: string;
    type: RequestType.Reimbursement;
    date: string; // "YYYY-MM-DD"
    description: string;
    amount: number;
    status: RequestStatus;
    requestedAt: string; // ISO string
}

export type AllRequest = LeaveRequest | ReimbursementRequest;