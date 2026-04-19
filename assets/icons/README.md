# Icons Folder

Tempat penyimpanan file icon untuk aplikasi.

## Format yang Disarankan
- **SVG** (lebih disarankan - scalable, file kecil)
- PNG (untuk raster icon)

## Contoh File
- `logo.svg` - Logo aplikasi
- `logo-white.svg` - Logo versi putih (untuk background gelap)
- `favicon.ico` - Icon untuk browser tab
- `user-icon.svg` - Icon user
- `notification-icon.svg` - Icon notifikasi

## Cara Penggunaan dalam React
```tsx
import logo from './assets/icons/logo.svg';

function Header() {
  return <img src={logo} alt="HRMS Pro" />;
}
```
