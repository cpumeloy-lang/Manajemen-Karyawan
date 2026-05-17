# Assets — HRMS Absensi Mobile

## File yang dibutuhkan

| File | Dimensi | Deskripsi |
|---|---|---|
| `icon.png` | 1024×1024 | App icon (Expo akan generate semua ukuran) |
| `splash.png` | 1284×2778 | Splash screen (resizeMode: contain) |
| `adaptive-icon.png` | 1024×1024 | Android adaptive icon foreground |
| `favicon.png` | 48×48 | Web favicon |

## Cara generate

1. Siapkan logo HRMS dalam resolusi tinggi (minimal 1024×1024, PNG transparan).
2. Letakkan sebagai `icon.png` di folder ini.
3. Untuk splash screen, gunakan `npx expo-splash-screen` atau buat manual.
4. Jalankan `npx expo prebuild` — Expo akan auto-generate semua ukuran.

## Model TFLite

Folder `models/` berisi `mobilefacenet.tflite` untuk face recognition on-device.
Lihat `models/README.md` untuk instruksi download model asli (~5 MB).
