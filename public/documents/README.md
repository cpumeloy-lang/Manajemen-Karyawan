# 📄 Documents Folder - HRMS Pro

Folder ini untuk menyimpan berbagai file dokumen yang diupload oleh sistem atau user.

## 📂 Struktur Folder

```
public/documents/
├── employees/          # Dokumen karyawan (KTP, CV, Ijazah, dll)
├── payroll/           # Slip gaji, bukti transfer, laporan
├── contracts/         # Kontrak kerja, perjanjian
├── certificates/      # Sertifikat, STR/SIP, pelatihan
└── policies/          # Kebijakan perusahaan, SOP
```

## 📝 Detail Setiap Folder

### 1. `employees/` - Dokumen Karyawan
**Jenis dokumen:**
- ✅ KTP (Scan)
- ✅ Kartu Keluarga
- ✅ CV / Resume
- ✅ Ijazah & Transkrip
- ✅ NPWP
- ✅ BPJS Kesehatan & Ketenagakerjaan
- ✅ Foto profil
- ✅ Surat keterangan sehat
- ✅ SKCK

**Format:**
```
employees/
├── {employeeId}/
│   ├── ktp.pdf
│   ├── kk.pdf
│   ├── cv.pdf
│   ├── ijazah.pdf
│   ├── npwp.pdf
│   ├── bpjs-kesehatan.pdf
│   └── foto-profil.jpg
```

**Contoh penggunaan:**
```tsx
const ktpUrl = `/documents/employees/${employeeId}/ktp.pdf`;
<a href={ktpUrl} target="_blank">Lihat KTP</a>
```

---

### 2. `payroll/` - Dokumen Penggajian
**Jenis dokumen:**
- ✅ Slip gaji bulanan
- ✅ Bukti transfer
- ✅ Laporan pajak (PPh 21)
- ✅ Laporan BPJS
- ✅ Rekap gaji departemen

**Format:**
```
payroll/
├── slips/
│   ├── {year}/
│   │   ├── {month}/
│   │   │   └── {employeeId}.pdf
├── tax-reports/
│   └── {year}/
│       └── pph21-{month}.pdf
└── bpjs-reports/
    └── {year}/
        └── bpjs-{month}.pdf
```

**Contoh penggunaan:**
```tsx
const slipUrl = `/documents/payroll/slips/2025/10/${employeeId}.pdf`;
<button onClick={() => window.open(slipUrl)}>Download Slip Gaji</button>
```

---

### 3. `contracts/` - Kontrak & Perjanjian
**Jenis dokumen:**
- ✅ Kontrak kerja (PKWT/PKWTT)
- ✅ Surat Penawaran Kerja (Job Offer)
- ✅ Perjanjian Kerahasiaan (NDA)
- ✅ Surat Peringatan (SP)
- ✅ Surat Mutasi
- ✅ Surat Promosi

**Format:**
```
contracts/
├── {employeeId}/
│   ├── contract-{date}.pdf
│   ├── offer-letter.pdf
│   ├── nda.pdf
│   └── amendments/
│       └── amendment-{date}.pdf
```

**Contoh penggunaan:**
```tsx
const contractUrl = `/documents/contracts/${employeeId}/contract-2025-01-01.pdf`;
<a href={contractUrl} download>Download Kontrak</a>
```

---

### 4. `certificates/` - Sertifikat & Lisensi
**Jenis dokumen:**
- ✅ STR/SIP (untuk tenaga medis)
- ✅ Sertifikat pelatihan
- ✅ Sertifikat kompetensi
- ✅ Lisensi profesional
- ✅ Penghargaan

**Format:**
```
certificates/
├── {employeeId}/
│   ├── str-{number}.pdf
│   ├── training-{name}-{date}.pdf
│   ├── competency-{name}.pdf
│   └── awards/
│       └── award-{date}.pdf
```

**Contoh penggunaan:**
```tsx
const strUrl = `/documents/certificates/${employeeId}/str-${strNumber}.pdf`;
<img src={strUrl} alt="STR Certificate" />
```

---

### 5. `policies/` - Kebijakan Perusahaan
**Jenis dokumen:**
- ✅ SOP (Standard Operating Procedure)
- ✅ Peraturan perusahaan
- ✅ Code of Conduct
- ✅ Employee Handbook
- ✅ Kebijakan cuti
- ✅ Kebijakan reimbursement

**Format:**
```
policies/
├── employee-handbook.pdf
├── code-of-conduct.pdf
├── leave-policy.pdf
├── reimbursement-policy.pdf
└── sop/
    ├── sop-attendance.pdf
    ├── sop-payroll.pdf
    └── sop-recruitment.pdf
```

**Contoh penggunaan:**
```tsx
const handbookUrl = `/documents/policies/employee-handbook.pdf`;
<a href={handbookUrl} target="_blank">Baca Employee Handbook</a>
```

---

## 🔒 Security & Access Control

### File Permissions
```sql
-- Policy untuk akses dokumen karyawan
CREATE POLICY "Karyawan hanya bisa akses dokumen sendiri"
ON documents FOR SELECT
USING (
  employee_id = auth.uid() OR
  EXISTS (SELECT 1 FROM employees WHERE user_id = auth.uid() AND role = 'admin')
);
```

### Rekomendasi Security:
1. **Validasi file type** saat upload
   ```tsx
   const allowedTypes = [
     'application/pdf',
     'image/jpeg',
     'image/png',
     'application/msword',
     'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
   ];
   ```

2. **Batasi ukuran file** (max 5MB)
   ```tsx
   const maxSize = 5 * 1024 * 1024; // 5MB
   if (file.size > maxSize) {
     alert('File terlalu besar. Maksimal 5MB');
   }
   ```

3. **Scan virus** sebelum save (opsional)

4. **Enkripsi file sensitif** (KTP, NPWP, dll)

---

## 📤 Upload File - Contoh Implementasi

### 1. Component Upload
```tsx
import { useState } from 'react';

function DocumentUpload({ employeeId, documentType }) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    
    // Validasi
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      alert('Format file tidak didukung');
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      alert('File maksimal 5MB');
      return;
    }

    // Upload ke Supabase Storage atau server
    const formData = new FormData();
    formData.append('file', file);
    formData.append('employeeId', employeeId);
    formData.append('type', documentType);

    try {
      const response = await fetch('/api/upload-document', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      if (data.success) {
        alert('Dokumen berhasil diupload!');
        // Update database
        await saveDocumentInfo(data.url, data.fileName);
      }
    } catch (error) {
      alert('Gagal upload dokumen');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input 
        type="file" 
        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
        accept=".pdf,.jpg,.jpeg,.png"
        disabled={uploading}
      />
      {uploading && <p>Uploading...</p>}
    </div>
  );
}
```

### 2. Save ke Database
```tsx
const saveDocumentInfo = async (url: string, fileName: string) => {
  const { error } = await supabase.from('documents').insert({
    employee_id: employeeId,
    file_name: fileName,
    file_url: url,
    file_type: documentType,
    upload_date: new Date().toISOString()
  });
  
  if (error) {
    console.error('Error saving document:', error);
  }
};
```

### 3. View/Download Document
```tsx
function DocumentViewer({ documentUrl, fileName }) {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = documentUrl;
    link.download = fileName;
    link.click();
  };

  const handleView = () => {
    window.open(documentUrl, '_blank');
  };

  return (
    <div>
      <button onClick={handleView}>Lihat Dokumen</button>
      <button onClick={handleDownload}>Download</button>
    </div>
  );
}
```

---

## 🔄 Integrasi dengan Supabase Storage (Recommended)

### Setup Supabase Storage
```typescript
// services/storageService.ts
import { supabase } from './supabaseClient';

export const uploadDocument = async (
  file: File, 
  employeeId: string, 
  documentType: string
) => {
  // Upload ke Supabase Storage
  const fileName = `${employeeId}/${documentType}-${Date.now()}.${file.name.split('.').pop()}`;
  
  const { data, error } = await supabase.storage
    .from('documents')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('documents')
    .getPublicUrl(fileName);

  return { url: publicUrl, fileName: data.path };
};

export const downloadDocument = async (filePath: string) => {
  const { data, error } = await supabase.storage
    .from('documents')
    .download(filePath);

  if (error) throw error;
  return data;
};

export const deleteDocument = async (filePath: string) => {
  const { error } = await supabase.storage
    .from('documents')
    .remove([filePath]);

  if (error) throw error;
};
```

---

## 📋 Checklist Implementasi

### Backend/Database
- [ ] Buat bucket di Supabase Storage: `documents`
- [ ] Setup RLS policies untuk akses kontrol
- [ ] Buat tabel `documents` untuk metadata
- [ ] Implementasi virus scanning (opsional)
- [ ] Setup backup otomatis

### Frontend
- [ ] Component upload file dengan validasi
- [ ] Component view/preview dokumen
- [ ] Component download dokumen
- [ ] Component delete dokumen (admin only)
- [ ] Progress indicator saat upload
- [ ] Error handling

### Security
- [ ] Validasi file type
- [ ] Batasi ukuran file
- [ ] Cek permission user
- [ ] Enkripsi file sensitif
- [ ] Audit log untuk akses dokumen

---

## 🎯 Best Practices

1. **Naming Convention**
   - Gunakan format: `{employeeId}_{documentType}_{timestamp}.{ext}`
   - Contoh: `EMP001_ktp_1730000000.pdf`

2. **Organization**
   - Satu folder per karyawan: `/employees/{employeeId}/`
   - Subfolder per kategori jika banyak dokumen

3. **Versioning**
   - Simpan versi lama: `ktp_v1.pdf`, `ktp_v2.pdf`
   - Atau gunakan timestamp: `ktp_20250101.pdf`

4. **Backup**
   - Backup berkala ke cloud storage lain
   - Retention policy (simpan berapa lama)

5. **Compliance**
   - GDPR: User bisa request hapus data
   - Retention: Hapus dokumen sesuai aturan
   - Audit: Log siapa akses dokumen kapan

---

## 📊 Database Schema untuk Metadata

```sql
CREATE TABLE documents (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    employee_id TEXT REFERENCES employees(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL, -- 'ktp', 'ijazah', 'str', 'contract', dll
    file_size INTEGER, -- dalam bytes
    mime_type TEXT, -- 'application/pdf', 'image/jpeg', dll
    uploaded_by TEXT REFERENCES employees(id),
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at DATE, -- untuk dokumen dengan masa berlaku (STR, SIP)
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by TEXT REFERENCES employees(id),
    verified_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk performa
CREATE INDEX idx_documents_employee ON documents(employee_id);
CREATE INDEX idx_documents_type ON documents(file_type);
CREATE INDEX idx_documents_expiry ON documents(expires_at) WHERE expires_at IS NOT NULL;
```

---

**Status:** ✅ Folder struktur sudah dibuat dan siap digunakan untuk menyimpan dokumen!
