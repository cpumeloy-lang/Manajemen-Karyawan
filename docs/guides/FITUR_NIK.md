# Fitur NIK (Nomor Induk Karyawan)

## Ringkasan
Fitur NIK menambahkan nomor identifikasi karyawan yang human-readable untuk keperluan administrasi HR seperti pencetakan ID card, laporan, dan identifikasi karyawan dalam dokumen.

## Perbedaan ID dan NIK

### ID (Primary Key)
- **Format**: UUID (contoh: `550e8400-e29b-41d4-a716-446655440000`)
- **Fungsi**: Identifikasi unik di database
- **Karakteristik**: 
  - Auto-generated oleh PostgreSQL
  - Tidak bisa diubah
  - Tidak ramah untuk dibaca manusia
  - Digunakan untuk relasi antar tabel
  - Wajib ada untuk setiap karyawan

### NIK (Employee Number)
- **Format**: `YYYY-DEPT-NNN` (contoh: `2024-MED-001`)
- **Fungsi**: Nomor identitas karyawan untuk keperluan HR
- **Karakteristik**:
  - Human-readable dan mudah diingat
  - Dapat di-generate otomatis atau diinput manual
  - Bisa diubah jika diperlukan
  - Digunakan untuk ID card, laporan, dan dokumen
  - Opsional (boleh kosong)
  - Harus unik jika diisi

## Format NIK

```
YYYY-DEPT-NNN
```

### Komponen:
1. **YYYY**: Tahun masuk kerja (4 digit)
2. **DEPT**: Kode departemen (3 huruf)
3. **NNN**: Nomor urut (3 digit, dimulai dari 001)

### Contoh:
- `2024-MED-001` - Karyawan pertama Departemen Medis tahun 2024
- `2024-NUR-015` - Karyawan ke-15 Departemen Keperawatan tahun 2024
- `2023-ADM-042` - Karyawan ke-42 Departemen Administrasi tahun 2023

## Kode Departemen

| Departemen                  | Kode |
|----------------------------|------|
| Departemen Medis           | MED  |
| Departemen Keperawatan     | NUR  |
| Departemen Penunjang       | SUP  |
| Departemen Administrasi    | ADM  |
| Departemen Keuangan        | FIN  |
| Departemen HRD             | HRD  |
| Lainnya                    | GEN  |

## Cara Menggunakan

### 1. Auto-Generate NIK (Direkomendasikan)

Saat menambah karyawan baru:
1. Isi data karyawan (nama, email, departemen, tanggal masuk, dll)
2. Klik tombol **"Generate NIK"** di samping field NIK
3. Sistem akan otomatis membuat NIK berdasarkan:
   - Tahun dari tanggal masuk kerja
   - Kode departemen
   - Nomor urut berikutnya untuk departemen tersebut

### 2. Input Manual NIK

Jika ingin menggunakan format NIK sendiri:
1. Ketik NIK langsung di field NIK
2. Format harus: `YYYY-XXX-NNN` (tahun-kode-nomor)
3. Sistem akan validasi format dan keunikan

### 3. Import dengan NIK

Saat import dari Excel:
1. File template sudah termasuk kolom NIK
2. NIK bersifat **opsional** - boleh dikosongkan
3. Jika diisi, format harus benar: `YYYY-XXX-NNN`
4. Sistem akan validasi keunikan NIK

## Validasi NIK

### Format Validation
- Pattern: `^\d{4}-[A-Z]{3}-\d{3}$`
- Contoh valid: `2024-MED-001`, `2023-NUR-025`
- Contoh tidak valid: `24-MED-1`, `2024-MEDIS-001`, `2024-med-001`

### Uniqueness Validation
- NIK harus unik di seluruh sistem
- Tidak boleh ada 2 karyawan dengan NIK yang sama
- Validasi dilakukan saat:
  - Membuat karyawan baru
  - Mengubah NIK karyawan
  - Import data karyawan

## Penggunaan NIK

### 1. ID Card
NIK dapat digunakan sebagai nomor identifikasi di ID card karyawan yang mudah dibaca dan diingat.

### 2. Laporan HR
Gunakan NIK untuk referensi karyawan dalam laporan seperti:
- Laporan absensi
- Laporan gaji
- Laporan kinerja
- Surat-surat administrasi

### 3. Export/Import
- NIK disertakan dalam export Excel (kolom pertama)
- NIK dapat diisi saat import (opsional)
- Template Excel sudah termasuk contoh format NIK

## Database

### Struktur Tabel
```sql
ALTER TABLE employees
ADD COLUMN nik TEXT UNIQUE;

CREATE INDEX idx_employees_nik ON employees(nik);
```

### Karakteristik:
- **Tipe Data**: TEXT (untuk mendukung format dengan tanda hubung)
- **Constraint**: UNIQUE (tidak boleh duplikat)
- **Nullable**: Ya (opsional)
- **Index**: Ada (untuk performa pencarian)

## Migration

Jalankan file SQL berikut di Supabase SQL Editor:

```bash
database-add-nik.sql
```

File ini akan:
1. Menambah kolom `nik` ke tabel `employees`
2. Membuat constraint UNIQUE
3. Membuat index untuk performa
4. Menambah komentar kolom

## Service Layer

### nikService.ts

#### generateNIK(departemen: string, hireDate?: string): Promise<string>
Generate NIK otomatis berdasarkan departemen dan tanggal masuk.

**Parameter:**
- `departemen`: Nama departemen karyawan
- `hireDate`: Tanggal masuk kerja (opsional, default: hari ini)

**Return:**
- String NIK dengan format `YYYY-DEPT-NNN`

**Contoh:**
```typescript
const nik = await generateNIK('Departemen Medis', '2024-01-15');
// Result: "2024-MED-001"
```

#### validateNIK(nik: string): boolean
Validasi format NIK.

**Parameter:**
- `nik`: NIK yang akan divalidasi

**Return:**
- `true` jika format valid
- `false` jika format tidak valid

**Contoh:**
```typescript
validateNIK('2024-MED-001'); // true
validateNIK('24-MED-1');     // false
```

#### isNIKUnique(nik: string, excludeEmployeeId?: string): Promise<boolean>
Cek apakah NIK sudah digunakan.

**Parameter:**
- `nik`: NIK yang akan dicek
- `excludeEmployeeId`: ID karyawan yang dikecualikan (untuk edit)

**Return:**
- `true` jika NIK unik
- `false` jika NIK sudah digunakan

**Contoh:**
```typescript
const unique = await isNIKUnique('2024-MED-001');
if (!unique) {
  alert('NIK sudah digunakan!');
}
```

## UI Components

### EmployeeForm
- Field NIK dengan tombol "Generate NIK"
- Auto-generate berdasarkan departemen dan tanggal masuk
- Validasi format dan keunikan real-time
- Error message jika NIK tidak valid/duplikat

### EmployeeTable
- Kolom NIK ditampilkan sebagai kolom pertama
- Menampilkan '-' jika NIK belum diisi
- NIK disertakan dalam export Excel
- NIK dapat diimport dari Excel

## Best Practices

### 1. Kapan Menggunakan Auto-Generate
✅ **Gunakan auto-generate jika:**
- Belum memiliki sistem penomoran sendiri
- Ingin konsistensi format
- Ingin penomoran otomatis per departemen

❌ **Jangan gunakan auto-generate jika:**
- Sudah memiliki NIK dari sistem lama
- Menggunakan format NIK khusus institusi
- Import data karyawan existing

### 2. Migrasi dari Sistem Lama
Jika memiliki nomor karyawan dari sistem lama:
1. Sesuaikan format ke `YYYY-XXX-NNN` jika memungkinkan
2. Atau input manual NIK lama (tanpa auto-generate)
3. Pastikan tidak ada duplikat

### 3. Perubahan Departemen
Jika karyawan pindah departemen:
- NIK **tidak** perlu diubah
- NIK tetap mengacu pada departemen awal masuk
- Ini membantu tracking histori karyawan

## Troubleshooting

### NIK Generate Gagal
**Problem:** Tombol Generate NIK tidak menghasilkan NIK

**Solution:**
1. Pastikan departemen sudah dipilih
2. Pastikan tanggal masuk sudah diisi
3. Cek console browser untuk error

### NIK Duplikat saat Import
**Problem:** Error "NIK sudah terdaftar" saat import Excel

**Solution:**
1. Cek file Excel untuk NIK yang sama
2. Kosongkan kolom NIK untuk auto-generate
3. Atau ubah NIK duplikat dengan format unik

### Format NIK Tidak Valid
**Problem:** Error "Format NIK tidak valid"

**Solution:**
- Format harus: `YYYY-XXX-NNN`
- Tahun: 4 digit angka
- Kode: 3 huruf KAPITAL
- Nomor: 3 digit angka (001-999)
- Contoh benar: `2024-MED-001`
- Contoh salah: `24-MED-1`, `2024-MEDIS-001`

## Checklist Implementasi

- [x] Tambah kolom NIK di database
- [x] Buat nikService.ts
- [x] Update EmployeeForm dengan field NIK
- [x] Tambah tombol Generate NIK
- [x] Validasi format NIK
- [x] Validasi keunikan NIK
- [x] Update EmployeeTable untuk menampilkan NIK
- [x] Tambah NIK di export Excel
- [x] Update import Excel untuk handle NIK
- [x] Update template Excel dengan kolom NIK
- [x] Dokumentasi fitur NIK

## File yang Dimodifikasi

1. **database-add-nik.sql** - SQL migration
2. **types.ts** - Tambah field `nik?: string` di interface Employee
3. **services/nikService.ts** - NEW FILE - Service untuk NIK
4. **components/EmployeeForm.tsx** - Tambah field NIK dengan auto-generate
5. **components/EmployeeTable.tsx** - Tambah kolom NIK di tabel
6. **services/excelTemplateService.ts** - Update template dengan kolom NIK
7. **App.tsx** - Update handleImportEmployees untuk validasi NIK

## Referensi

- [PostgreSQL TEXT Type](https://www.postgresql.org/docs/current/datatype-character.html)
- [PostgreSQL UNIQUE Constraint](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-UNIQUE-CONSTRAINTS)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
