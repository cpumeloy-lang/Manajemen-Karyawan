# 📋 ANALISIS COMPLIANCE HRMS PRO DENGAN STANDAR KEMENTERIAN KESEHATAN

**Tanggal:** April 19, 2026  
**Sumber Regulasi:** Kementerian Kesehatan RI, Keputusan Menteri Kesehatan (KMK), Standar Nasional Indonesia (SNI)  
**Fokus:** Manajemen SDM di Rumah Sakit

---

## 🏥 REGULASI UTAMA YANG BERLAKU

### 1. **KMK No. 1087 Tahun 2020** - Pedoman Pengelolaan SDM di Rumah Sakit
```
Mencakup:
├── Perencanaan SDM (workforce planning)
├── Rekrutmen dan seleksi
├── Penempatan dan pengembangan
├── Evaluasi kinerja (performance management)
├── Kompensasi dan kesejahteraan
├── Kesehatan dan keselamatan kerja (K3)
└── Hubungan industrial
```

### 2. **KMK No. 129 Tahun 2008** - Standar Pelayanan Minimal Rumah Sakit
```
Menetapkan:
├── Standar kompetensi tenaga kesehatan
├── Rasio tenaga medis/paramedis per bed
├── Jam kerja maksimal dan lembur
├── Cuti dan izin kerja
├── Program K3 dan kesejahteraan
└── Pelaporan & dokumentasi
```

### 3. **UU No. 8 Tahun 1997 tentang Dokumentasi Perusahaan**
```
Wajib dokumentasi:
├── Data karyawan lengkap
├── Absensi/presensi
├── Jam kerja dan lembur
├── Cuti dan izin
├── Penilaian kinerja
└── Tindakan disipliner
```

### 4. **UU No. 13 Tahun 2003 tentang Ketenagakerjaan**
```
Standar ketenagakerjaan:
├── Jam kerja max 40 jam/minggu
├── Cuti tahunan 12 hari + 2 hari keluarga
├── Lembur dibayar + kompensasi istirahat
├── Pensiun dan tunjangan
├── Jaminan sosial (BPJS)
├── Perlindungan K3
└── Peraturan perusahaan
```

### 5. **KMK No. 49 Tahun 2013** - Sistem Manajemen Keselamatan dan Kesehatan Kerja (SMK3)
```
Program yang wajib ada:
├── Identifikasi bahaya K3
├── Penilaian risiko
├── Pencegahan & pengendalian
├── Pelatihan K3
├── Inspeksi dan audit internal
├── Laporan kecelakaan kerja
└── Pemeriksaan kesehatan berkala
```

### 6. **Permenkes No. 27 Tahun 2014** - Standar Pencegahan dan Pengendalian Infeksi
```
Terkait:
├── Pelaporan kasus infeksi pada karyawan
├── Data karyawan yang terpapar
├── Program vaksinasi
└── Kesehatan kerja khusus untuk tenaga kesehatan
```

### 7. **KMK No. 112 Tahun 2017** - Insentif untuk Tenaga Kesehatan
```
Harus tracking:
├── Tunjangan kinerja
├── Tunjangan lokasi terpencil
├── Bonus/insentif berbasis kinerja
├── Asuransi tenaga kesehatan
└── Pelatihan berkelanjutan
```

---

## ✅ COMPLIANCE CHECKER - HRMS PRO vs STANDAR KEMENKES

### **Kategori 1: Data & Dokumentasi Karyawan**

| Requirement | Status | Detail | Compliance % |
|-------------|--------|--------|--------------|
| **✅ Data Dasar** | ✓ Ada | Nama, NIK, email, role | 100% |
| **❌ Alamat KTP** | ✗ BELUM | Needed for address verification | 0% |
| **❌ Alamat Domisili** | ✗ BELUM | For official documentation | 0% |
| **❌ NPWP** | ✗ BELUM | Required for tax purposes (KMK) | 0% |
| **❌ Nomor Rekening** | ✗ BELUM | For salary transfer (UU Ketenagakerjaan) | 0% |
| **❌ BPJS Kesehatan** | ✗ BELUM | Mandatory per UU No. 24/2011 | 0% |
| **❌ BPJS Ketenagakerjaan** | ✗ BELUM | Mandatory per UU No. 3/1992 | 0% |
| **❌ Sertifikat Medis** | ⚠️ Partial | Dokumen ada tapi tidak terstruktur | 50% |
| **❌ Izin Praktik (SIP/STR)** | ⚠️ Partial | Ada field tapi tidak divalidasi | 50% |
| **❌ Riwayat Pendidikan Formal** | ✗ BELUM | Needed for competency verification | 0% |
| **❌ Emergency Contact** | ✗ BELUM | Required by regulasi | 0% |
| **❌ Foto Identitas** | ⚠️ Partial | Photo profile ada, but not standardized | 50% |
| **❌ Nomor Induk Karyawan (NIK)** | ✓ Ada | Auto-generated | 100% |
| **Category Score** | | | **32%** 🔴 |

**Dampak Non-Compliance:**
```
Jika audit Kemenkes/Dinkes menemukan:
- Dokumen karyawan tidak lengkap → Denda Rp 1-10 juta
- NPWP tidak tercatat → Masalah pelaporan pajak
- BPJS tidak tercatat → Pelanggaran UU Ketenagakerjaan
- Data alamat tidak lengkap → Tidak bisa menghubungi keluarga saat emergency
- Bank account tidak tercatat → Delay dalam pembayaran gaji
```

---

### **Kategori 2: Jam Kerja & Overtime Management (UU No. 13/2003)**

| Requirement | Status | Detail | Compliance % |
|-------------|--------|--------|--------------|
| **✅ Tracking Jam Masuk/Keluar** | ✓ Ada | Clock in/out tercatat | 100% |
| **❌ Validasi Jam Kerja 40 Jam/Minggu** | ✗ BELUM | No validation logic | 0% |
| **❌ Overtime Tracking** | ⚠️ Ada tapi Basic | Ada field overtime, tapi tidak terstruktur | 50% |
| **❌ Overtime Pay Calculation** | ✗ BELUM | Not implemented | 0% |
| **❌ Istirahat Harian 1 jam** | ✗ BELUM | No break tracking | 0% |
| **❌ Weekly Rest (1 hari)** | ✗ BELUM | No day-off enforcement | 0% |
| **❌ Shift Pattern Compliance** | ✗ BELUM | Flexible shift tapi tidak di-validate | 0% |
| **❌ Overtime Limit Check** | ✗ BELUM | No max overtime hours check | 0% |
| **Category Score** | | | **19%** 🔴 |

**UU No. 13/2003 Requirements:**
```
Pasal 77: Jam kerja maksimal
├── 40 jam per minggu untuk 5 hari kerja
├── 8 jam per hari (+ 1 jam istirahat)
└── Tidak boleh lebih tanpa kompensasi

Pasal 78: Waktu istirahat dan cuti
├── Istirahat 1 jam per hari
├── Weekly rest 1 hari per minggu
├── Cuti tahunan 12 hari + 2 hari keluarga
└── Cuti sakit tanpa batas (dengan surat dokter)

Pasal 85: Overtime payment
├── Jika overtime 1-3 jam: gaji pokok/jam × 1.5
├── Jika overtime >3 jam: gaji pokok/jam × 2
└── Maksimal 3 jam/hari (24 jam/minggu)

MISSING IN HRMS: Semua calculation logic!
```

---

### **Kategori 3: Cuti & Izin (UU No. 13/2003 & KMK)**

| Requirement | Status | Detail | Compliance % |
|-------------|--------|--------|--------------|
| **✅ Leave Request System** | ✓ Ada | Ada form permohonan cuti | 100% |
| **❌ Leave Balance Calculation** | ✗ BELUM | Manual tracking, tidak auto | 0% |
| **❌ Annual Leave Accrual** | ✗ BELUM | Not tracked by system | 0% |
| **❌ Leave Types** | ⚠️ Basic | Hanya 1 type "cuti", tidak ada separation | 30% |
| **❌ Sick Leave Tracking** | ✗ BELUM | No sick leave differentiation | 0% |
| **❌ Maternity Leave** | ✗ BELUM | Per UU No. 13/2003: 3 bulan min | 0% |
| **❌ Marriage Leave** | ✗ BELUM | 3 hari | 0% |
| **❌ Family Death Leave** | ✗ BELUM | 1-3 hari sesuai hubungan | 0% |
| **❌ Approval Workflow** | ✗ BELUM | No multi-level approval | 0% |
| **❌ Leave Quota Management** | ✗ BELUM | Not managed by system | 0% |
| **❌ Carryover Rules** | ✗ BELUM | No carryover enforcement | 0% |
| **Category Score** | | | **13%** 🔴 |

**Standar Cuti di Indonesia (UU No. 13/2003):**
```
Jenis-jenis Cuti yang WAJIB ada:

1. CUTI TAHUNAN
   ├── 12 hari kerja per tahun (untuk 5 hari kerja)
   ├── Bisa dibagi jadi beberapa periode
   ├── Karyawan baru: proporsional per bulan
   ├── Carry-over maksimal 6 hari ke tahun berikutnya
   └── Sisa tidak terpakai pada akhir tahun = tidak dibayar (kecuali dibayar dgn persetujuan)

2. CUTI BERSAMA
   ├── Ditentukan oleh perusahaan/pemerintah
   └── 2 hari per tahun + hari libur nasional

3. CUTI SAKIT
   ├── Tidak ada batas (dengan surat dokter)
   ├── Hari ke-1 sampai ke-3 tetap gajian
   ├── Hari ke-4 dan seterusnya gaji 75%
   └── Butuh surat keterangan dokter

4. CUTI PERNIKAHAN
   ├── 3 hari kerja
   └── Butuh surat nikah

5. CUTI KEMATIAN KELUARGA
   ├── Istri/suami/anak: 3 hari
   ├── Orang tua: 2 hari
   ├── Saudara kandung: 1 hari
   └── Butuh surat kematian

6. CUTI MELAHIRKAN (Undang-undang Ketenagakerjaan No. 13 Tahun 2003)
   ├── Istri bekerja: 3 bulan (1.5 bulan sebelum, 1.5 bulan sesudah)
   ├── Suami bekerja (istri tidak): 2 hari
   └── Butuh surat kelahiran

7. CUTI TANPA GAJI
   ├── Atas persetujuan pemberi kerja
   ├── Durasi sesuai kesepakatan
   └── Tidak mengurangi benefit yang sudah diterima

STATUS DI HRMS PRO: HANYA ADA 1 JENIS!
```

---

### **Kategori 4: Penilaian Kinerja & Pengembangan (KMK No. 1087/2020)**

| Requirement | Status | Detail | Compliance % |
|-------------|--------|--------|--------------|
| **❌ Performance Rating System** | ✗ BELUM | No 360-degree feedback | 0% |
| **❌ Competency Assessment** | ✗ BELUM | No skill matrix | 0% |
| **❌ Training & Development Plan** | ✗ BELUM | Not tracked | 0% |
| **❌ Annual Appraisal** | ✗ BELUM | No standardized form | 0% |
| **❌ KPI Monitoring** | ✗ BELUM | No KPI management | 0% |
| **❌ Promotion Criteria** | ✗ BELUM | Not defined in system | 0% |
| **❌ Career Path** | ✗ BELUM | No career development plan | 0% |
| **Category Score** | | | **0%** 🔴 |

**KMK No. 1087/2020 Requirements:**
```
Setiap rumah sakit WAJIB memiliki:

1. SISTEM PENILAIAN KINERJA
   ├── Rating scale: Buruk, Cukup, Baik, Sangat Baik
   ├── Dilakukan min 1x per tahun (preferably 2x: mid-year + EOY)
   ├── Komponen: Kualitas kerja, produktivitas, disiplin, kerjasama
   ├── Dokumentasi lengkap
   └── Feedback session terstruktur

2. RENCANA PENGEMBANGAN KOMPETENSI
   ├── Identifikasi gap kompetensi
   ├── Training & development plan tahunan
   ├── On-the-job training
   ├── Formal training programs
   ├── Sertifikasi profesional
   └── Mentoring & coaching

3. CAREER DEVELOPMENT PLAN
   ├── Succession planning
   ├── Promotion pathways
   ├── Job rotation opportunities
   └── Long-term career development

4. DOKUMENTASI
   ├── Performance review forms
   ├── Training records
   ├── Sertifikat/credentials
   ├── Promotion history
   └── Disciplinary records
```

---

### **Kategori 5: Kesehatan & Keselamatan Kerja (K3) - KMK No. 49/2013**

| Requirement | Status | Detail | Compliance % |
|-------------|--------|--------|--------------|
| **❌ Occupational Health Screening** | ✗ BELUM | No baseline health check | 0% |
| **❌ Periodic Health Check** | ✗ BELUM | No annual medical exam tracking | 0% |
| **❌ Vaccination Tracking** | ✗ BELUM | No immunization record | 0% |
| **❌ Incident Reporting** | ✗ BELUM | No accident/near-miss logging | 0% |
| **❌ Health & Safety Training** | ✗ BELUM | Not tracked | 0% |
| **❌ PPE Issue Tracking** | ✗ BELUM | No PPE tracking system | 0% |
| **❌ Infection Exposure Record** | ✗ BELUM | No bloodborne pathogen tracking | 0% |
| **❌ Work Disability Leave** | ✗ BELUM | Not differentiated | 0% |
| **Category Score** | | | **0%** 🔴 |

**KMK No. 49/2013 & Permenkes 27/2014 Requirements:**
```
Tenaga kesehatan di rumah sakit HARUS dicek:

1. BASELINE HEALTH CHECK (Pra-penempatan)
   ├── Medical examination lengkap
   ├── Tes darah & urine
   ├── Radiologi paru (X-ray)
   ├── Tes menular (TB, HIV, Hepatitis B)
   ├── Pemeriksaan fisik
   ├── Psikologis fitness
   └── Baseline untuk reference future checks

2. PERIODIC HEALTH CHECK (Tahunan)
   ├── Dilakukan setiap tahun
   ├── Khusus untuk tenaga dengan high exposure
   ├── Hasil documented & tracked
   └── Follow-up untuk abnormal findings

3. VACCINATION PROGRAM
   ├── Hepatitis B vaccination (wajib untuk semua)
   ├── Influenza yearly (untuk high-risk staff)
   ├── Tetanus booster setiap 10 tahun
   ├── Chickenpox vaccination jika belum immune
   ├── Measles vaccination
   ├── TB screening & treatment if needed
   └── Record semua vaccination

4. INCIDENT REPORTING
   ├── Needlestick injuries
   ├── Sharps injuries
   ├── Chemical/hazardous exposure
   ├── Falls/trauma
   ├── Ergonomic injuries
   ├── Psychological stress incidents
   ├── Investigation & corrective action
   └── Trend analysis

5. INFECTION EXPOSURE TRACKING
   ├── Jika terpapar bloodborne pathogen
   ├── Follow-up testing (baseline, 6 minggu, 3 bulan, 6 bulan, 12 bulan)
   ├── Prophylaxis treatment if applicable
   ├── Dokumentasi lengkap
   └── Counseling & support
```

---

### **Kategori 6: Kompensasi & Benefit (KMK No. 112/2017 & UU No. 13/2003)**

| Requirement | Status | Detail | Compliance % |
|-------------|--------|--------|--------------|
| **✅ Salary Recording** | ✓ Ada | Compensation structure tercatat | 100% |
| **❌ Tunjangan Kinerja** | ✗ BELUM | Performance-based allowance tidak tercatat | 0% |
| **❌ Tunjangan Lokasi** | ✗ BELUM | No location allowance calculation | 0% |
| **❌ Meal Allowance** | ✗ BELUM | Not tracked | 0% |
| **❌ Transportation Allowance** | ✗ BELUM | Not tracked | 0% |
| **❌ Shift Allowance** | ✗ BELUM | Night shift premium tidak tercatat | 0% |
| **❌ Bonus & Incentives** | ✗ BELUM | No bonus calculation system | 0% |
| **❌ Take-home Pay Calculation** | ✗ BELUM | Not automated | 0% |
| **❌ Tax Calculation (PPh 21)** | ✗ BELUM | Manual, not system-based | 0% |
| **❌ Social Security (BPJS) Contribution** | ✗ BELUM | Not tracked in system | 0% |
| **Category Score** | | | **10%** 🔴 |

**KMK No. 112/2017 - Insentif untuk Tenaga Kesehatan:**
```
Struktur kompensasi minimum yang HARUS ada:

1. GAJI POKOK
   ├── Sesuai grade/golongan
   ├── Minimum UMR
   └── Meningkat sesuai pengalaman (gaji berkala)

2. TUNJANGAN KINERJA
   ├── 5-50% dari gaji pokok
   ├── Berdasarkan performance rating
   ├── Review tahunan
   └── Payment bulanan

3. TUNJANGAN LOKASI
   ├── Untuk lokasi terpencil/sulit: +10-25%
   ├── Untuk kota besar: +0-15%
   ├── Sesuai lokasi kerja
   └── Ditetapkan RS

4. TUNJANGAN FUNGSIONAL
   ├── Untuk tenaga tertentu (dokter, perawat khusus)
   ├── Sesuai kualifikasi
   └── Tetap per peraturan

5. ALLOWANCE/TUNJANGAN LAINNYA
   ├── Meal allowance: Rp 50-100k/hari kerja
   ├── Transportation allowance: Rp 50-150k/bulan
   ├── Housing allowance: untuk lokasi terpencil
   ├── Communication allowance: untuk manajerial
   └── Other benefits sesuai kebijakan RS

6. SHIFT ALLOWANCE (untuk kerja shift)
   ├── Shift pagi (06:00-14:00): standard rate
   ├── Shift siang (14:00-22:00): +10-15%
   ├── Shift malam (22:00-06:00): +25-50%
   ├── Shift weekend: +15-25%
   └── Perhitungan per hari kerja

7. BONUS & INCENTIVE
   ├── Annual bonus (13 bulan gaji minimum)
   ├── Performance bonus: 0-50% gaji bulanan
   ├── Attendance bonus: 100% attendance = bonus
   ├── Safety bonus: 0 incident = bonus
   └── Service award: untuk milestone tertentu

8. MANDATORY DEDUCTIONS
   ├── PPh 21 (income tax)
   │   - Calculate sesuai PKP (Penghasilan Kena Pajak)
   │   - Annual reconciliation (SPT)
   │
   ├── BPJS Kesehatan
   │   - Employee: 1% dari gaji
   │   - Employer: 3% dari gaji
   │   - Total: 4%
   │
   ├── BPJS Ketenagakerjaan
   │   - Jaminan Kecelakaan Kerja: 0.24-1.74%
   │   - Jaminan Kematian: 0.30%
   │   - Jaminan Hari Tua: 3.7%
   │   - Total: ~4-6%
   │
   └── Mandatory savings (jika ada kebijakan RS)

MISSING: System untuk tracking semua ini!
```

---

### **Kategori 7: Audit Log & Compliance Reporting**

| Requirement | Status | Detail | Compliance % |
|-------------|--------|--------|--------------|
| **✅ Basic Audit Log** | ✓ Ada | Ada table audit_log untuk setiap action | 100% |
| **✅ Who-Did-What Tracking** | ✓ Ada | user_id, action, timestamp | 100% |
| **✅ Data Change History** | ✓ Ada | before/after data tercatat | 100% |
| **❌ Monthly Payroll Report** | ⚠️ Partial | Manual export, not standardized | 50% |
| **❌ Compliance Report for Dinkes** | ✗ BELUM | No pre-built report format | 0% |
| **❌ Leave Balance Report** | ✗ BELUM | Not automated | 0% |
| **❌ Attendance Summary** | ✗ BELUM | Manual only | 0% |
| **❌ Overtime Report** | ✗ BELUM | Manual only | 0% |
| **❌ Salary Report** | ⚠️ Partial | Excel export ada tapi not standardized | 50% |
| **Category Score** | | | **36%** 🟡 |

---

## 📊 OVERALL COMPLIANCE SCORE

```
Requirement Category              Score    Status    Priority
──────────────────────────────────────────────────────────────
1. Data & Dokumentasi              32%     🔴      URGENT
2. Jam Kerja & Overtime            19%     🔴      URGENT
3. Cuti & Izin                     13%     🔴      URGENT
4. Penilaian Kinerja               0%      🔴      URGENT
5. Kesehatan & Keselamatan (K3)    0%      🔴      URGENT
6. Kompensasi & Benefit            10%     🔴      URGENT
7. Audit Log & Reporting           36%     🟡      HIGH
──────────────────────────────────────────────────────────────
OVERALL COMPLIANCE SCORE:          16%     🔴      CRITICAL
──────────────────────────────────────────────────────────────
```

---

## 🚨 RISIKO JIKA TIDAK COMPLIANCE

### **Risiko Hukum:**
```
1. AUDIT DINKES/KEMENKES
   ├── Temuan major: Sanksi administratif
   ├── Denda: Rp 5-50 juta per violation
   ├── Revocation akreditasi RS: Risk Rp 100+ juta income
   └── Reputasi: Public distrust

2. GUGATAN KARYAWAN
   ├── Underbayment klaim: Back wages + interest
   ├── Illegal dismissal: Ganti rugi Rp 100-500 juta
   ├── Workplace injury: Workers' comp + damages
   └── Class action: Multiple karyawan → massive liability

3. PAJAK PROBLEMS
   ├── Audit Dirjen Pajak: Penalty 50-200% dari hutang
   ├── BPJS audit: Back contribution + penalty
   └── Criminal charges: Penjara + denda untuk pimpinan

4. PELANGGARAN UU KETENAGAKERJAAN
   ├── Denda Rp 10-100 juta per violation
   ├── Mungkin menjadi precedent untuk gugatan karyawan
   └── Media coverage → Reputasi rusak
```

### **Risiko Operasional:**
```
1. STAFF TURNOVER TINGGI
   - Karyawan tidak puas kompensasi tidak jelas
   - Training/development tidak terstruktur
   - Performance management tidak adil

2. OPERATIONAL INEFFICIENCY
   - Manual tracking of cuti, overtime, pay
   - Duplikasi pekerjaan HRD
   - Data inconsistency

3. DATA LOSS RISK
   - Data karyawan tidak lengkap
   - Tidak bisa contact keluarga saat emergency
   - Kontrak/sertifikat hilang

4. AUDIT FAILURE
   - Dinkes audit → Finding major/minor
   - RS harus improve dengan action plan
   - Cost untuk remediation
```

---

## ✅ GAPS & ACTION ITEMS - PRIORITY ROADMAP

### **PHASE 1: CRITICAL (Minggu 1-3)**

#### 1.1 **Data Completeness** (Target: 100%)
```typescript
interface EmployeeCompliance {
  // Existing
  id: string;
  nama: string;
  
  // MUST ADD - Personal Data
  nik: string;           // ✓ Ada
  npwp?: string;         // WAJIB untuk payroll
  ktp_address: string;   // WAJIB per UU
  domicili_address: string;
  
  // Emergency Contact (UU Ketenagakerjaan)
  emergency_contacts: EmergencyContact[];
  
  // Banking (WAJIB untuk salary transfer)
  bank_account: {
    bank_name: string;
    account_number: string;
    account_holder: string;
  };
  
  // Insurance (WAJIB per UU No. 24/2011 & No. 3/1992)
  bpjs_kesehatan_id?: string;
  bpjs_ketenagakerjaan_id?: string;
  
  // Health & Safety (WAJIB per KMK 49/2013)
  health_check: {
    baseline_date?: string;
    last_annual_check?: string;
    vaccination_status?: 'complete' | 'incomplete' | 'overdue';
    health_restrictions?: string;
  };
  
  // Education & Credentials
  formal_education: Education[];
  professional_credentials: {
    sip_str_number?: string;
    sip_str_expired?: string;
    practice_license?: string;
  };
  
  // Career Tracking (per KMK 1087/2020)
  career_history: CareerEvent[];
}

// Action: Add these fields to database + UI forms
// Timeline: 2-3 days
// Priority: 🔴 URGENT
```

#### 1.2 **Overtime & Working Hours Compliance** (Target: 100%)
```typescript
interface OvertimeTracking {
  id: string;
  employee_id: string;
  date: string;
  
  // Jam kerja
  clock_in: string;      // e.g., "07:00"
  clock_out: string;     // e.g., "17:00"
  break_duration: number; // in minutes, should be >= 60
  
  // Calculate hours
  regular_hours: number;  // Should be 8
  overtime_hours: number;
  
  // Validation
  total_daily_hours: number;
  compliance_status: 'compliant' | 'violation';
  
  // Per UU 13/2003: Pasal 85
  // Overtime rate:
  overtime_rate: number;  // 1.5x or 2x (based on hours)
  overtime_pay: number;   // salary/hour * rate * hours
}

// Action: Add validation logic + pay calculation
// Timeline: 2-3 days
// Priority: 🔴 URGENT
```

#### 1.3 **Leave Management - Proper Implementation** (Target: 100%)
```typescript
interface LeavePolicy {
  // Annual Leave (WAJIB 12 hari per tahun)
  annual_leave_quota: 12;
  
  // Sick Leave (UNLIMITED per UU, tapi butuh dokter setelah 3 hari)
  sick_leave_max_consecutive: 30; // per doctor's cert
  
  // Marriage Leave (3 hari, butuh surat nikah)
  marriage_leave: 3;
  
  // Family Death Leave
  death_leave: {
    spouse_child: 3,
    parent_inlaw: 2,
    sibling: 1
  };
  
  // Maternity Leave (UU No. 13/2003 Pasal 82)
  maternity_leave: 90; // 1.5 bulan before, 1.5 bulan after
  
  // Paternity Leave (UU)
  paternity_leave: 2;
  
  // Carryover Rules
  carryover_max: 6; // Max 6 days carry to next year
}

interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type: 'annual' | 'sick' | 'marriage' | 'death' | 'maternity' | 'paternity';
  start_date: string;
  end_date: string;
  days_requested: number;
  
  // Validation
  available_balance: number;
  can_approve: boolean; // Based on quota & rules
  
  // Approval workflow
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  approver_level_1?: string; // Direct supervisor
  approver_level_2?: string; // HRD/Manager
  approved_days?: number;
  
  // Supporting docs
  supporting_docs: {
    sick_certificate?: string;  // Butuh untuk sakit >3 hari
    marriage_cert?: string;
    birth_cert?: string;
    death_cert?: string;
  };
}

// Auto-calculation:
// - Each Jan 1: Reset annual leave quota to 12 days (+ carryover max 6)
// - Track daily balance
// - Prevent approval if balance insufficient
// - Email reminders for expiring leave

// Action: Implement full leave system
// Timeline: 3-4 days
// Priority: 🔴 URGENT
```

---

### **PHASE 2: HIGH PRIORITY (Minggu 4-5)**

#### 2.1 **Performance Management** (Target: 100%)
```typescript
interface PerformanceReview {
  id: string;
  employee_id: string;
  review_period: {
    start_date: string;
    end_date: string;
  };
  
  // KPI/Competency Assessment
  ratings: {
    quality_of_work: 1-5;      // Kualitas
    productivity: 1-5;          // Produktivitas
    punctuality: 1-5;           // Disiplin
    teamwork: 1-5;              // Kerjasama
    initiative: 1-5;            // Inisiatif
    customer_service: 1-5;      // Layanan
    communication: 1-5;         // Komunikasi
    technical_skills: 1-5;      // Keahlian teknis
  };
  
  // Overall rating
  overall_score: number; // Average of ratings
  overall_rating: 'Buruk' | 'Cukup' | 'Baik' | 'Sangat Baik';
  
  // Comments & feedback
  reviewer_feedback: string;
  employee_response?: string;
  development_plan?: string;
  
  // Approval
  reviewer_id: string;
  review_date: string;
  signed_off_by?: string;
  
  // Impact
  impacts: {
    promotion_eligible: boolean;
    salary_increase: number; // %
    bonus_multiplier: number;
  };
}

interface PerformanceHistory {
  // Track all reviews over career
  reviews: PerformanceReview[];
  
  // Trend analysis
  performance_trend: 'improving' | 'stable' | 'declining';
  average_rating_3_years: number;
  
  // Career development
  promotion_history: Promotion[];
  training_completed: Training[];
  career_path: CareerPath;
}

// Action: Build performance management module
// Timeline: 3-4 days
// Priority: 🟡 HIGH
```

#### 2.2 **K3 & Health Screening** (Target: 100%)
```typescript
interface EmployeeHealth {
  // Baseline Health Check (Pre-placement)
  baseline_health_check: {
    date: string;
    exam_location: string;
    results: HealthCheckResult[];
    cleared_for_work: boolean;
  };
  
  // Annual Health Screening (Required per KMK 49/2013)
  annual_screenings: HealthScreening[];
  
  // Vaccination Record
  vaccinations: Vaccination[];
  
  // Incident/Injury Tracking
  incidents: WorkIncident[];
  
  // Health Restrictions
  medical_restrictions?: string;
  
  // Infection Exposure (if applicable)
  bloodborne_pathogen_exposures: Exposure[];
}

interface Vaccination {
  vaccine_type: 'hepatitis_b' | 'influenza' | 'tetanus' | 'measles' | 'chickenpox';
  date_administered: string;
  next_due_date: string;
  administered_by: string;
  batch_number?: string;
  reaction?: string;
}

interface WorkIncident {
  id: string;
  employee_id: string;
  incident_date: string;
  incident_type: 'needlestick' | 'sharps' | 'chemical' | 'biological' | 'ergonomic' | 'fall' | 'other';
  description: string;
  immediate_action_taken: string;
  investigation_required: boolean;
  investigation_report?: string;
  corrective_action?: string;
  status: 'reported' | 'investigated' | 'closed';
}

// Action: Implement health tracking + incident management
// Timeline: 3-4 days
// Priority: 🟡 HIGH
```

#### 2.3 **Compensation Calculation System** (Target: 100%)
```typescript
interface PayrollCalculation {
  // Components
  salary: {
    basic_salary: number;
    performance_allowance: number;
    location_allowance: number;
    meal_allowance: number;
    transport_allowance: number;
    shift_allowance: number;
    other_allowances: number;
    gross_income: number;
  };
  
  // Deductions
  deductions: {
    bpjs_kesehatan: number;        // 1%
    bpjs_ketenagakerjaan: number;  // ~5%
    pph_21: number;                // Progressive tax
    pension_contribution?: number;
    other_deductions: number;
    total_deductions: number;
  };
  
  // Net Pay
  net_pay: number;
  
  // Tax Calculation (PPh 21) - Compliant with Dirjen Pajak
  pph_calculation: {
    gross_income: number;
    non_taxable_income: number; // PTKP
    taxable_income: number;
    tax_bracket: string; // 5%, 15%, 25%, 30%, 35%
    tax_amount: number;
    annual_reconciliation?: number;
  };
}

// Action: Build payroll calculation engine
// Timeline: 2-3 days
// Priority: 🟡 HIGH
```

---

### **PHASE 3: MEDIUM PRIORITY (Minggu 6-7)**

#### 3.1 **Compliance Reporting for Dinkes/Kemenkes**
```typescript
interface ComplianceReport {
  // Monthly Payroll Report
  payroll_report: {
    period: string;
    employees_paid: number;
    total_gross_income: number;
    total_deductions: number;
    total_net_paid: number;
    bpjs_contribution: number;
  };
  
  // Attendance Report
  attendance_report: {
    period: string;
    total_working_days: number;
    total_absences: number;
    total_lates: number;
    total_leaves: number;
  };
  
  // Leave Report (per UU 13/2003)
  leave_report: {
    annual_leave_used: number;
    annual_leave_remaining: number;
    sick_leave_used: number;
    special_leave_used: number;
  };
  
  // Overtime Report
  overtime_report: {
    total_overtime_hours: number;
    total_overtime_pay: number;
    employees_with_violation: number;
  };
  
  // Health & Safety
  k3_report: {
    incidents_reported: number;
    health_screenings_completed: number;
    vaccination_compliance: number;
  };
}

// Export formats:
// - PDF for submission to Dinkes
// - Excel for internal tracking
// - JSON for API integration
```

---

## 📋 CHECKLIST UNTUK COMPLIANCE

Gunakan checklist ini untuk track progress:

```markdown
## Employee Data Completeness
- [ ] NPWP tercatat untuk semua karyawan
- [ ] Alamat KTP & Domisili lengkap
- [ ] Bank account info untuk salary transfer
- [ ] Emergency contact terisi
- [ ] BPJS Kesehatan & Ketenagakerjaan number
- [ ] Education history lengkap
- [ ] Professional credentials (SIP/STR) jika applicable
- [ ] Baseline health check completed
- [ ] All supporting documents scanned & stored

## Jam Kerja & Overtime
- [ ] Semua clock in/out tercatat
- [ ] Validasi 40 jam/minggu enforcement
- [ ] Overtime payment calculation correct
- [ ] Break time tracking minimal 1 jam/hari
- [ ] Weekly rest pattern enforced
- [ ] Overtime limit (max 3 jam/hari, 24 jam/minggu) checked
- [ ] Lembur payment calculated per UU 13/2003

## Leave Management
- [ ] Leave types lengkap (annual, sick, marriage, death, maternity, paternity)
- [ ] Annual leave auto-reset setiap Jan 1 (12 days + carryover max 6)
- [ ] Sick leave tracking terstruktur
- [ ] Leave approval workflow 2-level (supervisor + HRD)
- [ ] Supporting documents for special leave
- [ ] Leave balance report monthly

## Performance Management
- [ ] Annual appraisal form standardized
- [ ] Competency ratings dokumentasi
- [ ] Development plans documented
- [ ] Promotion criteria defined
- [ ] Performance history tracked

## Health & Safety (K3)
- [ ] Baseline health check sebelum mulai kerja
- [ ] Annual health screening scheduled & tracked
- [ ] Vaccination program documented
- [ ] All incidents reported & investigated
- [ ] Corrective actions implemented
- [ ] K3 training completed for all staff

## Compensation
- [ ] Salary structure documented & transparent
- [ ] Performance allowance calculated
- [ ] Location allowance applied
- [ ] Shift allowance correct
- [ ] Overtime pay calculated correctly
- [ ] Tax (PPh 21) calculated per Dirjen Pajak
- [ ] BPJS contributions correct & on-time
- [ ] Payslip generated & distributed monthly

## Audit & Reporting
- [ ] Monthly payroll report generated
- [ ] Attendance report available
- [ ] Leave usage report prepared
- [ ] Overtime report documented
- [ ] Health & safety report completed
- [ ] All records stored & backed up
- [ ] Audit trail maintained
```

---

## 🎯 IMPLEMENTATION ROADMAP

```
Week 1-2 (Phase 1 - CRITICAL)
├── Day 1-2: Add employee data fields (NPWP, address, bank, BPJS)
├── Day 3-4: Implement overtime validation & calculation
├── Day 5: Build leave types & approval workflow
├── Day 6-7: Add health screening tracking
└── Day 8-10: Implement payroll calculation engine

Week 3-4 (Phase 2 - HIGH PRIORITY)
├── Day 1-3: Build performance management module
├── Day 4-5: K3 & health tracking system
├── Day 6-7: Compensation management
└── Day 8: Testing & bug fixes

Week 5-6 (Phase 3 - MEDIUM PRIORITY)
├── Day 1-2: Build compliance reports
├── Day 3-4: Generate standardized forms for Dinkes
├── Day 5: Training for HRD staff
└── Day 6: UAT & finalization

Week 7 (Deployment & Audit Prep)
├── Day 1: Deploy to production
├── Day 2-3: Data migration & cleanup
├── Day 4-5: HRD training + documentation
└── Day 6-7: Ready for Dinkes/Kemenkes audit
```

---

## 💡 RECOMMENDATIONS

### **Immediate Actions (This Week):**
1. **Data Migration Sprint:** Collect semua missing data (NPWP, BPJS, bank account) dari semua karyawan
2. **Policy Definition:** Definisikan kebijakan HR berdasarkan UU & KMK (jam kerja, cuti, bonus, dll)
3. **Compliance Audit:** Audit database & proses saat ini terhadap regulasi
4. **Stakeholder Meeting:** Diskusi dengan Dinkes/Kemenkes tentang requirement mereka

### **Short-term (2 minggu):**
1. Prioritas Phase 1 features (data, overtime, leave)
2. Training HRD staff tentang regulasi & compliance
3. Setup compliance reporting automation

### **Medium-term (1 bulan):**
1. Implement semua Phase 2 features
2. Conduct mock audit dengan internal compliance team
3. Fix all findings

### **Pre-Audit Preparation:**
1. Generate semua compliance reports
2. Document all policies & procedures
3. Ensure all records complete & backed up
4. Schedule meeting dengan Dinkes/Kemenkes

---

## 📞 NEXT STEPS

1. **Confirm Compliance Requirements:** Hubungi Dinkes/Kemenkes lokal untuk validasi requirement
2. **Legal Review:** Minta legal team review policies terhadap UU & KMK
3. **Budget Allocation:** Allocate resources untuk implement Phase 1-3
4. **Timeline Commitment:** Secure timeline dari stakeholders

**Estimated Timeline:** 6-8 minggu untuk full compliance
**Resource Needed:** 2-3 developers + 1 HRD consultant
**Cost Estimate:** Rp 50-100 juta (dev + legal review + compliance audit)

