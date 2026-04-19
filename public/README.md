# Public Folder

Folder `public/` berisi file statis yang dapat diakses langsung melalui URL.

## Struktur Folder

```
public/
├── icons/          # Icon untuk favicon, app icons, manifest
└── images/         # Gambar statis yang diakses langsung via URL
```

## Penggunaan

### Icons (`public/icons/`)
- **Favicon**: `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`
- **App Icons**: Icon untuk PWA manifest
- **Apple Touch Icon**: `apple-touch-icon.png`
- **Android Chrome**: `android-chrome-192x192.png`, `android-chrome-512x512.png`

**Cara akses:**
```html
<link rel="icon" href="/icons/favicon.ico" />
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
```

### Images (`public/images/`)
- Gambar yang perlu diakses via URL langsung
- Untuk dynamic loading atau external references
- Contoh: foto profil karyawan (uploaded), dokumen scan

**Cara akses:**
```tsx
// Via public URL
<img src="/images/logo.png" alt="Logo" />

// Via dynamic URL
const imageUrl = `/images/employees/${employeeId}.jpg`;
<img src={imageUrl} alt="Employee Photo" />
```

## Perbedaan `assets/` vs `public/`

| Aspek | `assets/` | `public/` |
|-------|-----------|-----------|
| **Import** | Via ES6 import | Via public URL |
| **Build** | Diproses Vite (hash, optimize) | Copy as-is |
| **URL** | Hash dalam nama file | URL tetap |
| **Gunakan untuk** | Static assets dalam kode | Dynamic files, external refs |

**Contoh:**

```tsx
// ✅ assets/ - untuk static imports
import logo from '../assets/images/logo.png';
<img src={logo} alt="Logo" />

// ✅ public/ - untuk dynamic/external
<img src="/images/hero-banner.jpg" alt="Banner" />
<img src={`/images/avatars/${user.id}.jpg`} alt={user.name} />
```

## Best Practices

1. **Favicon**: Sediakan berbagai ukuran
   - favicon.ico (16x16, 32x32, 48x48)
   - favicon-16x16.png
   - favicon-32x32.png
   - apple-touch-icon.png (180x180)

2. **Caching**: File di public/ di-cache browser
   - Gunakan versioning jika perlu update: `logo-v2.png`

3. **Security**: Jangan simpan file sensitif di public/
   - ❌ Credentials, API keys, private data
   - ✅ Logo, icon, public images

4. **Organization**: Buat struktur subfolder yang jelas
   ```
   public/images/
   ├── branding/
   ├── employees/
   └── documents/
   ```
