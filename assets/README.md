# Assets Folder

Folder ini berisi aset-aset statis untuk aplikasi HRMS Pro.

## Struktur Folder

```
assets/
├── icons/          # Icon-icon untuk komponen React (SVG, PNG)
└── images/         # Gambar-gambar untuk UI (logo, ilustrasi, background)
```

## Penggunaan

### Icons (`assets/icons/`)
- File icon dalam format SVG atau PNG
- Untuk digunakan sebagai React components atau import langsung
- Contoh: logo aplikasi, icon custom, ilustrasi mini

**Cara import:**
```tsx
import logo from '../assets/icons/logo.svg';
import customIcon from '../assets/icons/custom-icon.png';
```

### Images (`assets/images/`)
- Gambar-gambar untuk UI seperti background, ilustrasi, banner
- Format: PNG, JPG, SVG, WebP
- Contoh: hero image, background login, ilustrasi dashboard

**Cara import:**
```tsx
import heroImage from '../assets/images/hero.png';
import loginBg from '../assets/images/login-background.jpg';
```

## Best Practices

1. **Naming Convention**: Gunakan kebab-case untuk nama file
   - ✅ `user-profile-icon.svg`
   - ❌ `UserProfileIcon.svg`

2. **Optimasi**: Kompres gambar sebelum upload
   - SVG: Gunakan SVGO
   - PNG/JPG: Gunakan TinyPNG atau ImageOptim

3. **Organisasi**: Buat subfolder jika diperlukan
   ```
   icons/
   ├── navigation/
   ├── actions/
   └── status/
   ```

4. **Alt Text**: Selalu sediakan alt text untuk accessibility
   ```tsx
   <img src={logo} alt="HRMS Pro Logo" />
   ```
