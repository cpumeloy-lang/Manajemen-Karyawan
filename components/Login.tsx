import React, { useState, useEffect } from 'react';
import DatabaseStatus from './DatabaseStatus';
import LoadingSpinner from './LoadingSpinner';
import ForgotPassword from './ForgotPassword';
import { classifyError } from '../services/errorHandlingService';
import { supabase } from '../services/supabaseClient';
import { generateCSRFToken, storeCSRFToken } from '../services/securityUtils';

interface LoginProps {
    onLogin: (email: string, password: string) => Promise<void>;
    initialError?: string | null;
}

const Login: React.FC<LoginProps> = ({ onLogin, initialError }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState<string | null>(initialError || null);
    const [loginAttempts, setLoginAttempts] = useState(0);
    const [lockoutUntil, setLockoutUntil] = useState<Date | null>(null);
    const [showForgotPassword, setShowForgotPassword] = useState(false);

    useEffect(() => {
        if (initialError) {
            setError(initialError);
        }
        
        // Cek apakah ada lockout yang tersimpan
        const storedLockout = localStorage.getItem('loginLockout');
        if (storedLockout) {
            const lockoutTime = new Date(storedLockout);
            if (lockoutTime > new Date()) {
                setLockoutUntil(lockoutTime);
            } else {
                localStorage.removeItem('loginLockout');
            }
        }
        
        // Reset login attempts setelah 30 menit
        const storedAttempts = localStorage.getItem('loginAttempts');
        const attemptsTime = localStorage.getItem('loginAttemptsTime');
        if (storedAttempts && attemptsTime) {
            const attemptDate = new Date(attemptsTime);
            const thirtyMinutesAgo = new Date();
            thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);
            
            if (attemptDate > thirtyMinutesAgo) {
                setLoginAttempts(parseInt(storedAttempts));
            } else {
                localStorage.removeItem('loginAttempts');
                localStorage.removeItem('loginAttemptsTime');
            }
        }
    }, [initialError]);

    const getOAuthRedirectUrl = () => {
        const configuredRedirectUrl = String(import.meta.env.VITE_OAUTH_REDIRECT_URL || '').trim();
        return configuredRedirectUrl && configuredRedirectUrl.length > 0
            ? configuredRedirectUrl
            : window.location.origin;
    };

    const handleGoogleLogin = async () => {
        setError(null);
        setGoogleLoading(true);

        try {
            const redirectTo = getOAuthRedirectUrl();

            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo,
                },
            });

            if (error) throw error;

            if (data?.url) {
                window.location.href = data.url;
            }
        } catch (err: any) {
            setError(classifyError(err).userMessage);
        } finally {
            setGoogleLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validasi input
        if (!email.trim() || !password.trim()) {
            setError('Email dan password tidak boleh kosong');
            return;
        }
        
        // Validasi format email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('Format email tidak valid');
            return;
        }
        
        // Cek apakah akun terkunci
        if (lockoutUntil && lockoutUntil > new Date()) {
            const minutesLeft = Math.ceil((lockoutUntil.getTime() - new Date().getTime()) / 60000);
            setError(`Terlalu banyak percobaan login. Coba lagi dalam ${minutesLeft} menit.`);
            return;
        }
        
        // Generate dan simpan CSRF token untuk keamanan
        const csrfToken = generateCSRFToken();
        storeCSRFToken(csrfToken);
        
        setError(null);
        setLoading(true);
        try {
            // Clear any stale app data from previous sessions
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('app_data_') || key.startsWith('profile_')) {
                    localStorage.removeItem(key);
                }
            });
            await onLogin(email, password);
            // Reset login attempts after successful login
            setLoginAttempts(0);
            localStorage.removeItem('loginAttempts');
            localStorage.removeItem('loginAttemptsTime');
            localStorage.removeItem('loginLockout');
        } catch (err: any) {
            // Tambah jumlah percobaan login
            const newAttempts = loginAttempts + 1;
            setLoginAttempts(newAttempts);
            localStorage.setItem('loginAttempts', newAttempts.toString());
            localStorage.setItem('loginAttemptsTime', new Date().toISOString());
            
            // Kunci akun setelah 5 percobaan gagal
            if (newAttempts >= 5) {
                const lockoutTime = new Date();
                lockoutTime.setMinutes(lockoutTime.getMinutes() + 15); // Kunci selama 15 menit
                setLockoutUntil(lockoutTime);
                localStorage.setItem('loginLockout', lockoutTime.toISOString());
                setError(`Terlalu banyak percobaan login. Coba lagi dalam 15 menit.`);
            } else {
                setError(classifyError(err).userMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen overflow-hidden bg-[#061f1d]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(6,115,106,0.35),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(255,255,255,0.16),_transparent_20%),linear-gradient(135deg,_#061f1d_0%,_#093732_50%,_#041514_100%)]" />
            <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-[#21d3c2]/15 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />

            <div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-4 py-8 sm:px-6 lg:px-8">
                <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
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

                    <div className="flex items-center justify-center">
                        <div className="w-full max-w-lg rounded-[2rem] border border-white/15 bg-white/90 p-5 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-8">
                            <div className="mb-6 flex items-center gap-4">
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#06736a] text-white shadow-lg shadow-[#06736a]/30">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 100 100" aria-hidden="true">
                                        <text y=".9em" fontSize="90">🏥</text>
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#06736a]">HRMS Pro</p>
                                    <h2 className="text-2xl font-black text-slate-900">Masuk ke Dashboard</h2>
                                    <p className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Secure access for hospital staff</p>
                                </div>
                            </div>

                            <p className="mb-6 text-sm leading-6 text-slate-600">
                                Gunakan akun karyawan yang sudah didaftarkan HRD. Jika belum punya akses, hubungi admin.
                            </p>

                            <DatabaseStatus />

                            <form className="space-y-5" onSubmit={handleSubmit}>
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                                        Alamat Email
                                    </label>
                                    <div className="mt-1">
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            autoComplete="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="block w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-[#06736a] focus:ring-4 focus:ring-[#06736a]/10"
                                            placeholder="nama@perusahaan.com"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                                        Password
                                    </label>
                                    <div className="mt-1">
                                        <input
                                            id="password"
                                            name="password"
                                            type="password"
                                            autoComplete="current-password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="block w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-[#06736a] focus:ring-4 focus:ring-[#06736a]/10"
                                            placeholder="Masukkan password"
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                                        <p>{error}</p>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex w-full items-center justify-center rounded-lg bg-[#06736a] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[#06736a]/30 transition hover:bg-[#054f46] focus:outline-none focus:ring-4 focus:ring-[#06736a]/20 disabled:bg-slate-400"
                                >
                                    {loading ? (
                                        <div className="flex items-center">
                                            <LoadingSpinner size="small" text="" />
                                            <span className="ml-2">Memproses...</span>
                                        </div>
                                    ) : 'Login'}
                                </button>

                                <div className="relative py-2">
                                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                        <div className="w-full border-t border-slate-200" />
                                    </div>
                                    <div className="relative flex justify-center text-sm">
                                        <span className="bg-white px-3 text-slate-500">Lupa Password?</span>
                                    </div>
                                </div>
                                <div className="text-center mt-4">
                                    <p className="text-sm text-slate-600 mb-2">
                                        Karena sistem berjalan di jaringan lokal (Offline-First), <br/><strong>fitur Lupa Password via Email dinonaktifkan.</strong>
                                    </p>
                                    <p className="text-sm font-medium text-[#06736a] bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                                        Silakan hubungi HRD atau Admin untuk mereset password akun Anda secara langsung.
                                    </p>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
