# Images Folder

Tempat penyimpanan gambar-gambar untuk UI aplikasi.

## Format yang Disarankan
- **PNG** - Untuk gambar dengan transparansi
- **JPG** - Untuk foto dan gambar tanpa transparansi
- **WebP** - Format modern, file lebih kecil
- **SVG** - Untuk ilustrasi vector

## Contoh File
- `hero-banner.jpg` - Banner halaman utama
- `login-background.jpg` - Background halaman login
- `default-avatar.png` - Avatar default untuk user
- `illustration-dashboard.svg` - Ilustrasi dashboard
- `company-logo.png` - Logo perusahaan

## Struktur Subfolder (Opsional)
```
images/
├── backgrounds/
│   ├── login-bg.jpg
│   └── dashboard-bg.jpg
├── avatars/
│   └── default-avatar.png
└── illustrations/
    ├── empty-state.svg
    └── success.svg
```

## Cara Penggunaan dalam React
```tsx
import heroBanner from './assets/images/hero-banner.jpg';

function HomePage() {
  return (
    <div style={{ backgroundImage: `url(${heroBanner})` }}>
      <h1>Welcome</h1>
    </div>
  );
}
```

## Tips Optimasi
1. Kompres gambar sebelum upload
2. Gunakan format WebP untuk web modern
3. Sediakan versi responsive (small, medium, large)
4. Gunakan lazy loading untuk gambar besar
