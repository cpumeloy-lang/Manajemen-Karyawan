import React from 'react';
import LoadingSpinner from '../LoadingSpinner';

interface LoginFormProps {
    email: string;
    setEmail: (email: string) => void;
    password: string;
    setPassword: (password: string) => void;
    error: string | null;
    loading: boolean;
    onSubmit: (e: React.FormEvent) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ email, setEmail, password, setPassword, error, loading, onSubmit }) => {
    return (
        <form className="space-y-5" onSubmit={onSubmit}>
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
    );
};

export default LoginForm;
