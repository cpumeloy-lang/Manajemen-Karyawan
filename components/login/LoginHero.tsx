import React from 'react';

const LoginHero: React.FC = () => {
    return (
        <div className="hidden lg:flex flex-col justify-center text-white">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                HRMS Pro Access Portal
            </div>
            <h1 className="mt-6 max-w-xl text-5xl font-black tracking-tight text-white xl:text-6xl">
                Sistem SDM yang rapi, aman, dan siap mobile.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/80">
                Login karyawan, absensi, cuti, reimbursement, dan pengelolaan data tenaga kerja dalam satu portal yang dirancang untuk penggunaan kantor dan perangkat mobile.
            </p>

            <div className="mt-8 grid max-w-2xl gap-4 sm:grid-cols-2">
                <div className="rounded-[1.5rem] border border-white/15 bg-white/10 p-5 shadow-2xl shadow-black/10 backdrop-blur">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-white/60">Status akses</p>
                            <p className="mt-1 text-xl font-bold text-white">Secure & Verified</p>
                        </div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-300/20">
                            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <path d="M12 2l7 3v5c0 4.97-3.07 9.37-7 12-3.93-2.63-7-7.03-7-12V5l7-3z" stroke="currentColor" strokeWidth="1.6" />
                                <path d="M9.5 12l1.8 1.8 3.9-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    </div>
                    <div className="mt-4 h-2 w-full rounded-full bg-white/10">
                        <div className="h-2 w-4/5 rounded-full bg-gradient-to-r from-[#21d3c2] to-white/80" />
                    </div>
                </div>

                <div className="rounded-[1.5rem] border border-white/15 bg-white/10 p-5 shadow-2xl shadow-black/10 backdrop-blur">
                    <p className="text-sm text-white/60">Akses cepat</p>
                    <div className="mt-3 space-y-3 text-sm text-white/90">
                        <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                            <span>Absensi</span>
                            <span className="font-semibold text-emerald-300">Realtime</span>
                        </div>
                        <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                            <span>Cuti & Reimbursement</span>
                            <span className="font-semibold text-emerald-300">Self Service</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-10 grid max-w-2xl grid-cols-3 gap-4">
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                    <div className="text-3xl font-black text-white">1</div>
                    <div className="mt-1 text-sm text-white/70">Akses berbasis karyawan terdaftar</div>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                    <div className="text-3xl font-black text-white">2</div>
                    <div className="mt-1 text-sm text-white/70">Akses Lokal Offline (LAN)</div>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                    <div className="text-3xl font-black text-white">3</div>
                    <div className="mt-1 text-sm text-white/70">Reset Password Sentral (HRD)</div>
                </div>
            </div>

            <div className="mt-10 flex items-center gap-4 text-sm text-white/70">
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">Role-based access</span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">Mobile-friendly</span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">Supabase Auth</span>
            </div>
        </div>
    );
};

export default LoginHero;
