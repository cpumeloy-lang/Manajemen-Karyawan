# HRMS Pro — Sistem Informasi SDM Rumah Sakit

Sistem manajemen SDM terintegrasi untuk rumah sakit dengan modul karyawan, absensi, cuti, shift scheduling, payroll, dan aplikasi mobile absensi.

## 🏗️ Stack

- **Web Frontend:** React 19 + TypeScript + Vite + Zustand + Tailwind
- **Mobile:** React Native (Expo SDK 51) + TypeScript
- **Backend:** Supabase (PostgreSQL + Auth + Storage + RLS)
- **Infra:** Docker + Nginx + Prometheus + Grafana + ELK
- **Testing:** Vitest

## 📁 Struktur Project

```
HRMS Pro/
├── components/          # React UI components (web)
├── hooks/               # Custom React hooks
├── services/            # API & business logic (Supabase, RBAC, dll)
├── stores/              # Zustand state stores
├── utils/               # Helper functions
├── mobile-absensi/      # Expo React Native mobile app
├── database/            # SQL migration scripts
├── docs/                # Documentation (deployment, guides)
├── monitoring/          # Prometheus/Grafana/Logstash configs
├── middleware/          # Server middleware
└── scripts/             # Utility scripts
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Supabase project (atau local Supabase via CLI)
- Android Studio (untuk mobile dev)

### Web Development

```bash
npm install
cp .env.example .env.local  # configure VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY
npm run dev                 # frontend + backend together
```

- Frontend only: `npm run dev:web`
- Frontend + backend: `npm run dev`

### Mobile Development

```bash
cd mobile-absensi
npm install
npx expo install expo-secure-store expo-crypto
npm run android:dev
```

### Run Tests

```bash
npx vitest run
```

### Production Build

```bash
npm run build               # web → dist/
cd mobile-absensi && npm run build:android:release
```

## 📚 Dokumentasi

- **[Production Checklist](docs/PRODUCTION_CHECKLIST.md)** — panduan deployment lengkap
- **[Mobile README](mobile-absensi/README.md)** — setup aplikasi mobile
- **Database migrations:** `database/`

## 🔐 Security Notes

- Auth token mobile disimpan di **expo-secure-store** (Keystore/Keychain)
- Biometric verification **di-block di production build** sampai implementasi real dikirim
- Supabase RLS policies aktif untuk semua tabel
- CORS restricted, security headers via Nginx + server.js
- Rate limiting: 120 req/min per IP

## 📜 License

Private — Internal use only.
