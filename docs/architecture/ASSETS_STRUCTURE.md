# 📁 Struktur Folder Assets & Public - HRMS Pro

## 📂 Struktur Folder

```
HRMS Pro/
├── assets/                      # Assets yang di-import dalam kode
│   ├── icons/                   # Icon SVG/PNG untuk komponen
│   │   ├── .gitkeep
│   │   └── README.md
│   ├── images/                  # Gambar untuk UI (logo, ilustrasi)
│   │   ├── .gitkeep
│   │   └── README.md
│   └── README.md
│
├── services/
│   └── documentService.ts       # Service untuk upload/download dokumen
│
└── public/                      # File statis yang diakses via URL
    ├── icons/                   # Favicon, app icons, PWA icons
    │   ├── .gitkeep
    │   └── README.md
    ├── images/                  # Gambar dynamic/upload (foto profil)
    │   ├── .gitkeep
    │   ├── .gitignore
    │   └── README.md
    ├── documents/               # 📄 DOKUMEN KARYAWAN & PERUSAHAAN
    │   ├── employees/          # Dokumen karyawan (KTP, CV, Ijazah)
    │   ├── payroll/            # Slip gaji, laporan payroll
    │   ├── contracts/          # Kontrak kerja, perjanjian
    │   ├── certificates/       # Sertifikat, STR/SIP, pelatihan
    │   ├── policies/           # SOP, kebijakan perusahaan
    │   ├── .gitignore
    │   └── README.md
    └── README.md
```

## 🎯 Kapan Menggunakan `assets/` vs `public/`?

### 📦 `assets/` - Static Imports (Via Import Statement)

**Gunakan untuk:**
- ✅ Logo aplikasi
- ✅ Icon UI components
- ✅ Ilustrasi tetap
- ✅ Background images
- ✅ Assets yang di-bundle oleh Vite

**Keuntungan:**
- File di-hash oleh Vite untuk cache busting
- Optimasi otomatis (compress, minify)
- Tree shaking (unused assets tidak di-bundle)
- Type-safe dengan TypeScript

**Cara Pakai:**
```tsx
import logo from '../assets/icons/logo.svg';
import heroBanner from '../assets/images/hero.jpg';

function Header() {
  return (
    <div>
      <img src={logo} alt="Logo" />
      <img src={heroBanner} alt="Banner" />
    </div>
  );
}
```

---

### 🌐 `public/` - Public URL (Via URL Path)

**Gunakan untuk:**
- ✅ Favicon & app icons
- ✅ PWA manifest icons
- ✅ Dynamic images (user uploads)
- ✅ File yang perlu URL tetap
- ✅ External references

**Keuntungan:**
- URL path tetap (tidak berubah)
- Tidak di-bundle (langsung copy)
- Bisa diakses external
- Perfect untuk dynamic loading

**Cara Pakai:**
```tsx
// Static public file
<img src="/icons/favicon.ico" />

// Dynamic public file
const employeePhoto = `/images/employees/${employeeId}.jpg`;
<img src={employeePhoto} alt="Employee" />

// Dalam index.html
<link rel="icon" href="/icons/favicon.ico" />
```

## 📝 Contoh Penggunaan

### 1. Logo Aplikasi
**Letakkan di:** `assets/icons/logo.svg`
```tsx
import logo from '../assets/icons/logo.svg';

<img src={logo} alt="HRMS Pro Logo" className="h-8" />
```

### 2. Favicon
**Letakkan di:** `public/icons/favicon.ico`
```html
<!-- index.html -->
<link rel="icon" href="/icons/favicon.ico" />
```

### 3. Background Login
**Letakkan di:** `assets/images/login-bg.jpg`
```tsx
import loginBg from '../assets/images/login-bg.jpg';

<div style={{ backgroundImage: `url(${loginBg})` }}>
  <LoginForm />
</div>
```

### 4. Foto Profil Karyawan (Upload)
**Letakkan di:** `public/images/employees/`
```tsx
// URL dynamic based on employee ID
const avatarUrl = employee.foto || `/images/employees/default-avatar.png`;
<img src={avatarUrl} alt={employee.nama} />
```

## 🎨 Rekomendasi Konten

### `assets/icons/`
- `logo.svg` - Logo utama aplikasi
- `logo-white.svg` - Logo versi putih
- `logo-icon.svg` - Icon-only logo (untuk mobile/compact)

### `assets/images/`
- `hero-banner.jpg` - Banner homepage
- `login-background.jpg` - Background halaman login
- `empty-state.svg` - Ilustrasi empty state
- `success-illustration.svg` - Ilustrasi success
- `error-illustration.svg` - Ilustrasi error

### `public/icons/`
- `favicon.ico` - Icon browser tab
- `favicon-16x16.png` - Favicon 16x16
- `favicon-32x32.png` - Favicon 32x32
- `apple-touch-icon.png` - iOS icon (180x180)
- `android-chrome-192x192.png` - Android icon
- `android-chrome-512x512.png` - Android icon large

### `public/images/`
- `employees/` - Folder untuk foto karyawan
  - `default-avatar.png` - Avatar default
- `documents/` - Folder untuk dokumen scan
- `branding/` - Material branding perusahaan

## 🔧 Setup Favicon Lengkap

1. **Generate Favicon** menggunakan [favicon.io](https://favicon.io/) atau [realfavicongenerator.net](https://realfavicongenerator.net/)

2. **Letakkan di** `public/icons/`:
   - `favicon.ico`
   - `favicon-16x16.png`
   - `favicon-32x32.png`
   - `apple-touch-icon.png`
   - `android-chrome-192x192.png`
   - `android-chrome-512x512.png`

3. **Update** `index.html`:
```html
<head>
  <link rel="icon" type="image/x-icon" href="/icons/favicon.ico">
  <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png">
  <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png">
  <link rel="manifest" href="/manifest.json">
</head>
```

## 📐 Best Practices

### 1. Naming Convention
- Gunakan **kebab-case**: `login-background.jpg` ✅
- Hindari spaces: `login background.jpg` ❌
- Hindari uppercase: `LoginBackground.jpg` ❌

### 2. Optimasi File
- **Compress images**: Gunakan TinyPNG, ImageOptim
- **Use WebP**: Format modern, ukuran lebih kecil
- **SVG over PNG**: Untuk icon dan ilustrasi sederhana
- **Lazy loading**: Untuk gambar besar

### 3. Accessibility
- Selalu sediakan `alt` text:
  ```tsx
  <img src={logo} alt="HRMS Pro - Human Resource Management System" />
  ```

### 4. Responsive Images
```tsx
// Sediakan berbagai ukuran
import logoSmall from '../assets/icons/logo-sm.svg';
import logoMedium from '../assets/icons/logo-md.svg';
import logoLarge from '../assets/icons/logo-lg.svg';

<picture>
  <source media="(max-width: 640px)" srcSet={logoSmall} />
  <source media="(max-width: 1024px)" srcSet={logoMedium} />
  <img src={logoLarge} alt="Logo" />
</picture>
```

## 🚀 Quick Start

### Upload Logo Baru
1. Simpan file di `assets/icons/logo.svg`
2. Import di komponen:
   ```tsx
   import logo from '../assets/icons/logo.svg';
   ```
3. Gunakan:
   ```tsx
   <img src={logo} alt="Logo" />
   ```

### Upload Foto Karyawan
1. Upload ke server/storage
2. Simpan URL di database: `https://...` atau `/images/employees/123.jpg`
3. Gunakan URL langsung:
   ```tsx
   <img src={employee.foto} alt={employee.nama} />
   ```

### Upload Dokumen Karyawan (KTP, Ijazah, dll)
1. Gunakan documentService:
   ```tsx
   import { uploadDocument } from '../services/documentService';
   
   const handleUpload = async (file: File) => {
     const result = await uploadDocument(file, employeeId, 'ktp', currentUserId);
     if (result.success) {
       alert('Dokumen berhasil diupload!');
     }
   };
   ```
2. File tersimpan di `public/documents/employees/{employeeId}/`
3. Metadata tersimpan di database tabel `documents`

## 📄 Fitur Document Management

### Upload Dokumen
```tsx
import { uploadDocument, validateFile } from '../services/documentService';

function DocumentUpload({ employeeId }) {
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validasi
    const validation = validateFile(file);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    // Upload
    const result = await uploadDocument(file, employeeId, 'ktp', 'admin-id');
    if (result.success) {
      alert('Upload berhasil!');
    } else {
      alert(result.error);
    }
  };

  return <input type="file" onChange={handleFileChange} accept=".pdf,.jpg,.png" />;
}
```

### Download Dokumen
```tsx
import { downloadDocument } from '../services/documentService';

<button onClick={() => downloadDocument(doc.fileUrl, doc.fileName)}>
  Download
</button>
```

### View Dokumen
```tsx
// PDF viewer
<iframe src={doc.fileUrl} width="100%" height="600px" />

// Image preview
<img src={doc.fileUrl} alt={doc.fileName} />

// Open in new tab
<button onClick={() => window.open(doc.fileUrl, '_blank')}>
  Lihat Dokumen
</button>
```

## 📚 Resources

- [Vite Static Assets](https://vitejs.dev/guide/assets.html)
- [Favicon Generator](https://favicon.io/)
- [TinyPNG - Image Compression](https://tinypng.com/)
- [SVGO - SVG Optimizer](https://jakearchibald.github.io/svgomg/)

---

**Status:** ✅ Folder struktur sudah dibuat dan siap digunakan!
