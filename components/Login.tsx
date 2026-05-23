/**
 * Login.tsx - REFACTORED
 * 
 * Main login view.
 * 
 * Previous: ~334 lines, monolithic
 * Current:  ~125 lines, extracted Hero and Form components
 */
import React, { useState, useEffect } from 'react';
import DatabaseStatus from './DatabaseStatus';
import { generateCSRFToken, storeCSRFToken } from '../services/securityUtils';
import LoginHero from './login/LoginHero';
import LoginForm from './login/LoginForm';

interface LoginProps {
    onLogin: (email: string, password: string) => Promise<void>;
    initialError?: string | null;
}

const Login: React.FC<LoginProps> = ({ onLogin, initialError }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(initialError || null);
    const [loginAttempts, setLoginAttempts] = useState(0);
    const [lockoutUntil, setLockoutUntil] = useState<Date | null>(null);

    useEffect(() => {
        if (initialError) setError(initialError);
        
        const storedLockout = localStorage.getItem('loginLockout');
        if (storedLockout) {
            const lockoutTime = new Date(storedLockout);
            if (lockoutTime > new Date()) setLockoutUntil(lockoutTime);
            else localStorage.removeItem('loginLockout');
        }
        
        const storedAttempts = localStorage.getItem('loginAttempts');
        const attemptsTime = localStorage.getItem('loginAttemptsTime');
        if (storedAttempts && attemptsTime) {
            const attemptDate = new Date(attemptsTime);
            const thirtyMinutesAgo = new Date();
            thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);
            
            if (attemptDate > thirtyMinutesAgo) setLoginAttempts(parseInt(storedAttempts));
            else {
                localStorage.removeItem('loginAttempts');
                localStorage.removeItem('loginAttemptsTime');
            }
        }
    }, [initialError]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!email.trim() || !password.trim()) return setError('Email dan password tidak boleh kosong');
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) return setError('Format email tidak valid');
        
        if (lockoutUntil && lockoutUntil > new Date()) {
            const minutesLeft = Math.ceil((lockoutUntil.getTime() - new Date().getTime()) / 60000);
            return setError(`Terlalu banyak percobaan login. Coba lagi dalam ${minutesLeft} menit.`);
        }
        
        const csrfToken = generateCSRFToken();
        storeCSRFToken(csrfToken);
        
        setError(null);
        setLoading(true);
        try {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('app_data_') || key.startsWith('profile_')) localStorage.removeItem(key);
            });
            await onLogin(email, password);
            setLoginAttempts(0);
            localStorage.removeItem('loginAttempts');
            localStorage.removeItem('loginAttemptsTime');
            localStorage.removeItem('loginLockout');
        } catch (err: any) {
            const newAttempts = loginAttempts + 1;
            setLoginAttempts(newAttempts);
            localStorage.setItem('loginAttempts', newAttempts.toString());
            localStorage.setItem('loginAttemptsTime', new Date().toISOString());
            
            if (newAttempts >= 5) {
                const lockoutTime = new Date();
                lockoutTime.setMinutes(lockoutTime.getMinutes() + 15);
                setLockoutUntil(lockoutTime);
                localStorage.setItem('loginLockout', lockoutTime.toISOString());
                setError(`Terlalu banyak percobaan login. Coba lagi dalam 15 menit.`);
            } else {
                setError(err.message || 'Login gagal. Periksa kembali email dan password Anda.');
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
                    <LoginHero />

                    <div className="flex items-center justify-center">
                        <div className="w-full max-w-lg rounded-[2rem] border border-white/15 bg-white/90 p-5 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-8">
                            <div className="mb-6 flex items-center gap-4">
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#06736a] text-white shadow-lg shadow-[#06736a]/30">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 100 100" aria-hidden="true"><text y=".9em" fontSize="90">🏥</text></svg>
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

                            <LoginForm
                                email={email} setEmail={setEmail}
                                password={password} setPassword={setPassword}
                                error={error} loading={loading} onSubmit={handleSubmit}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
