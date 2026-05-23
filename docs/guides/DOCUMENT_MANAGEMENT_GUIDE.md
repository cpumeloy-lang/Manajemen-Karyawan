# 📄 Panduan Cepat - Document Management

## ✅ Struktur Folder Sudah Dibuat

```
public/documents/
├── employees/      ✅ Dokumen karyawan (KTP, CV, Ijazah, NPWP, BPJS)
├── payroll/        ✅ Slip gaji, laporan pajak, bukti transfer
├── contracts/      ✅ Kontrak kerja, NDA, surat peringatan
├── certificates/   ✅ Sertifikat, STR/SIP, pelatihan
└── policies/       ✅ SOP, kebijakan perusahaan, handbook
```

## 🚀 Cara Menggunakan

### 1. Upload Dokumen

```tsx
import { uploadDocument } from '../services/documentService';

// Dalam component
const handleUpload = async (file: File) => {
  const result = await uploadDocument(
    file,                    // File object dari input
    employeeId,             // ID karyawan
    'ktp',                  // Tipe dokumen
    currentUser.id          // ID user yang upload
  );
  
  if (result.success) {
    console.log('Uploaded:', result.data);
    // Update UI
  } else {
    alert(result.error);
  }
};

// JSX
<input 
  type="file" 
  onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
  accept=".pdf,.jpg,.jpeg,.png"
/>
```

### 2. Validasi File

```tsx
import { validateFile } from '../services/documentService';

const validation = validateFile(file);
if (!validation.valid) {
  alert(validation.error);
  return;
}
```

### 3. Download Dokumen

```tsx
import { downloadDocument } from '../services/documentService';

<button onClick={() => downloadDocument(doc.fileUrl, doc.fileName)}>
  📥 Download
</button>
```

### 4. View/Preview Dokumen

```tsx
// PDF
<iframe src={doc.fileUrl} width="100%" height="600px" />

// Image
<img src={doc.fileUrl} alt={doc.fileName} />

// Open in new tab
<a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
  👁️ Lihat
</a>
```

### 5. Delete Dokumen

```tsx
import { deleteDocument } from '../services/documentService';

const handleDelete = async () => {
  const result = await deleteDocument(doc.id, doc.fileUrl);
  if (result.success) {
    alert('Dokumen dihapus!');
  }
};
```

### 6. Get Dokumen Karyawan

```tsx
import { getEmployeeDocuments } from '../services/documentService';

const docs = await getEmployeeDocuments(employeeId);
console.log('Documents:', docs);
```

### 7. Verify Dokumen (Admin)

```tsx
import { verifyDocument } from '../services/documentService';

const result = await verifyDocument(
  docId, 
  adminId, 
  'Dokumen terverifikasi dan sesuai'
);
```

### 8. Cek Dokumen Expired

```tsx
import { getExpiringDocuments } from '../services/documentService';

// Dokumen yang akan expired dalam 30 hari
const expiring = await getExpiringDocuments(30);
console.log('Expiring docs:', expiring);
```

## 📋 Tipe Dokumen yang Didukung

### File Types
- ✅ PDF (`.pdf`)
- ✅ JPEG/JPG (`.jpg`, `.jpeg`)
- ✅ PNG (`.png`)
- ✅ Word (`.doc`, `.docx`)

### Max File Size
- 📦 5 MB per file

### Kategori Dokumen

| Kategori | Folder | Contoh |
|----------|--------|--------|
| Identitas | `employees/` | KTP, KK, NPWP |
| Pendidikan | `employees/` | Ijazah, Transkrip, CV |
| Kesehatan | `employees/` | BPJS, Surat Sehat |
| Gaji | `payroll/` | Slip gaji, bukti transfer |
| Kontrak | `contracts/` | PKWT, PKWTT, NDA |
| Sertifikat | `certificates/` | STR, SIP, Pelatihan |
| Kebijakan | `policies/` | SOP, Handbook |

## 🔒 Security & Permissions

### RLS Policy (Supabase)
```sql
-- Karyawan hanya bisa akses dokumen sendiri
CREATE POLICY "employee_own_documents" 
ON documents FOR SELECT 
USING (
  employee_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM employees 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Admin bisa upload untuk karyawan
CREATE POLICY "admin_upload_documents" 
ON documents FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);
```

### Client-side Validation
```tsx
// Validasi otomatis di documentService.ts
- Format file: PDF, JPG, PNG, DOC
- Ukuran max: 5MB
- Nama file: sanitized & unique
```

## 📊 Database Schema

Tabel `documents` sudah didefinisikan di database dengan field:
- `id` - UUID
- `employeeId` - FK ke employees
- `fileName` - Nama file asli
- `fileUrl` - URL public/storage path
- `fileType` - Kategori dokumen
- `fileSize` - Ukuran dalam bytes
- `mimeType` - Content type
- `uploadedBy` - User yang upload
- `uploadedAt` - Timestamp upload
- `expiresAt` - Tanggal expired (untuk STR, SIP)
- `isVerified` - Status verifikasi
- `verifiedBy` - Admin yang verify
- `verifiedAt` - Timestamp verify
- `notes` - Catatan tambahan

## 🎯 Contoh Lengkap - Component Upload

```tsx
import { useState } from 'react';
import { uploadDocument, validateFile } from '../services/documentService';

function DocumentUploadForm({ employeeId, currentUserId }) {
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('ktp');
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    // Validasi
    const validation = validateFile(file);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    setUploading(true);
    
    try {
      const result = await uploadDocument(file, employeeId, docType, currentUserId);
      
      if (result.success) {
        alert('Dokumen berhasil diupload!');
        setFile(null);
        // Refresh document list
      } else {
        alert(result.error);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label>Tipe Dokumen:</label>
        <select value={docType} onChange={(e) => setDocType(e.target.value)}>
          <option value="ktp">KTP</option>
          <option value="ijazah">Ijazah</option>
          <option value="cv">CV</option>
          <option value="str">STR/SIP</option>
          <option value="contract">Kontrak</option>
        </select>
      </div>

      <div>
        <label>File:</label>
        <input 
          type="file" 
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          required
        />
        {file && <p>Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)</p>}
      </div>

      <button type="submit" disabled={!file || uploading}>
        {uploading ? 'Uploading...' : 'Upload Dokumen'}
      </button>
    </form>
  );
}
```

## 📚 File Dokumentasi

1. **`public/documents/README.md`** - Panduan lengkap
2. **`services/documentService.ts`** - Service functions
3. **`ASSETS_STRUCTURE.md`** - Struktur folder overview
4. **`DOCUMENT_MANAGEMENT_GUIDE.md`** - File ini (quick reference)

---

**Status:** ✅ System siap digunakan!  
**Next Steps:** 
1. Setup Supabase Storage bucket "documents"
2. Apply RLS policies
3. Implementasi upload component di UI
4. Testing upload/download/delete
