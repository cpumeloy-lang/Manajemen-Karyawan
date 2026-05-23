import React from 'react';

type PortalType = 'personal' | 'operational';

interface PortalSelectorProps {
  userName: string;
  canAccessOperational: boolean;
  onSelectPortal: (portal: PortalType) => void;
}

const PortalSelector: React.FC<PortalSelectorProps> = ({
  userName,
  canAccessOperational,
  onSelectPortal,
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/40 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-white shadow-lg shadow-primary/30 mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-9 w-9"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Selamat datang, {userName}</h1>
          <p className="text-slate-600 mt-2">
            Pilih konteks kerja Anda untuk melanjutkan ke dashboard
          </p>
        </div>

        {/* Portal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Personal Portal */}
          <button
            onClick={() => onSelectPortal('personal')}
            className="group relative overflow-hidden rounded-2xl border-2 border-primary/20 bg-white p-7 text-left shadow-sm transition-all hover:border-primary hover:shadow-xl hover:shadow-primary/10 focus:outline-none focus:ring-4 focus:ring-primary/20"
          >
            {/* Decorative gradient */}
            <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 blur-2xl group-hover:from-primary/20 transition-all" />

            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary-light text-primary ring-4 ring-primary/5">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-7 w-7"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary-light px-3 py-1 rounded-full">
                  Untuk Semua
                </span>
              </div>

              <h2 className="text-xl font-bold text-slate-900 mb-2">Portal Personal</h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-5">
                Akses dashboard pribadi, lakukan absensi, lihat slip gaji, ajukan cuti, dan kelola
                informasi profil Anda.
              </p>

              <ul className="space-y-2 mb-5">
                <li className="flex items-center gap-2 text-sm text-slate-600">
                  <span className="text-primary">✓</span> Absensi & jadwal pribadi
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-600">
                  <span className="text-primary">✓</span> Slip gaji & riwayat
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-600">
                  <span className="text-primary">✓</span> Pengajuan cuti & permohonan
                </li>
              </ul>

              <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary group-hover:gap-2 transition-all">
                Masuk Portal Personal
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </span>
            </div>
          </button>

          {/* Operational Portal */}
          <button
            onClick={() => canAccessOperational && onSelectPortal('operational')}
            disabled={!canAccessOperational}
            className={`group relative overflow-hidden rounded-2xl border-2 p-7 text-left shadow-sm transition-all focus:outline-none focus:ring-4 ${
              canAccessOperational
                ? 'border-amber-200 dark:border-amber-500/30 bg-white dark:bg-[#0f1724] hover:border-amber-400 dark:hover:border-amber-500/60 hover:shadow-xl hover:shadow-amber-200/30 dark:hover:shadow-amber-900/30 focus:ring-amber-200'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 cursor-not-allowed opacity-60'
            }`}
          >
            {canAccessOperational && (
              <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-gradient-to-br from-amber-200/30 dark:from-amber-500/20 to-amber-100/20 dark:to-amber-900/10 blur-2xl group-hover:from-amber-300/40 dark:group-hover:from-amber-500/30 transition-all" />
            )}

            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-xl ring-4 ${
                    canAccessOperational
                      ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-100/50 dark:ring-amber-500/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 ring-slate-100 dark:ring-slate-800'
                  }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-7 w-7"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <span
                  className={`text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full ${
                    canAccessOperational
                      ? 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10'
                      : 'text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800'
                  }`}
                >
                  {canAccessOperational ? 'Akses Khusus' : 'Tidak Tersedia'}
                </span>
              </div>

              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Portal Operasional</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-5">
                {canAccessOperational
                  ? 'Kelola karyawan, validasi absensi, atur jadwal shift, proses penggajian, dan akses audit log.'
                  : 'Portal ini hanya dapat diakses oleh role HRD, Admin, atau Kepala Ruangan.'}
              </p>

              <ul className="space-y-2 mb-5">
                <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <span className={canAccessOperational ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'}>✓</span>
                  Manajemen karyawan & jadwal
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <span className={canAccessOperational ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'}>✓</span>
                  Approval permohonan & absensi
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <span className={canAccessOperational ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'}>✓</span>
                  Penggajian & audit log
                </li>
              </ul>

              {canAccessOperational ? (
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-amber-700 dark:text-amber-400 group-hover:gap-2 transition-all">
                  Masuk Portal Operasional
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-sm font-medium text-slate-400 dark:text-slate-500">
                  🔒 Akses ditolak
                </span>
              )}
            </div>
          </button>
        </div>

        {/* Footer hint */}
        <p className="text-center text-xs text-slate-400 mt-8">
          Anda dapat berpindah portal kapan saja melalui tombol di sidebar
        </p>
      </div>
    </div>
  );
};

export default PortalSelector;
