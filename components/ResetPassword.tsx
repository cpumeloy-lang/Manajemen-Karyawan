import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient.ts';

const ResetPassword: React.FC = () => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isValidSession, setIsValidSession] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);

    useEffect(() => {
        let mounted = true;
        
        const initializeRecovery = async () => {
            try {
                const hash = window.location.hash;
                
                // Wait for Supabase to process the URL hash
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                if (!mounted) return;

                // Cek session setelah token diproses
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                
                if (sessionError) {
                    setError('Terjadi kesalahan saat memverifikasi session');
                    setIsValidSession(false);
                } else if (session) {
                    setIsValidSession(true);
                } else {
                    setError('Link reset password tidak valid atau sudah kadaluarsa. Silakan kirim ulang email reset password.');
                    setIsValidSession(false);
                }
            } catch (err: any) {
                setError('Gagal memverifikasi link reset password');
                setIsValidSession(false);
            } finally {
                if (mounted) {
                    setCheckingSession(false);
                }
            }
        };

        // Listen for auth events
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY' && session) {
                setIsValidSession(true);
                setCheckingSession(false);
            }
        });

        initializeRecovery();

        return () => {
            mounted = false;
            authListener.subscription.unsubscribe();
        };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        setError('');

        // Validasi password
        if (newPassword.length < 6) {
            setError('Password minimal 6 karakter');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Password dan konfirmasi password tidak sama');
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            setMessage('Password berhasil direset! Anda akan diarahkan ke halaman login...');
            
            // Sign out dan redirect ke halaman login setelah 2 detik
            setTimeout(async () => {
                await supabase.auth.signOut();
                window.location.href = '/';
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'Gagal reset password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#06736a] to-[#0a9b8a] flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">Reset Password</h1>
                    <p className="text-sm text-gray-600">Masukkan password baru Anda</p>
                </div>

                {checkingSession ? (
                    <div className="text-center py-8">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#06736a]"></div>
                        <p className="mt-3 text-sm text-gray-600">Memverifikasi link...</p>
                    </div>
                ) : !isValidSession ? (
                    <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm text-center">
                        {error}
                        <div className="mt-3">
                            <a href="/" className="text-[#06736a] hover:underline">
                                Kembali ke Login
                            </a>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Password Baru
                            </label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06736a]"
                                placeholder="Minimal 6 karakter"
                                required
                                disabled={loading}
                            />
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Konfirmasi Password
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06736a]"
                                placeholder="Ulangi password baru"
                                required
                                disabled={loading}
                            />
                        </div>

                        {message && (
                            <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg text-sm">
                                {message}
                            </div>
                        )}

                        {error && (
                            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full px-4 py-2 bg-[#06736a] text-white rounded-lg hover:bg-[#054f46] transition-colors disabled:bg-gray-400 font-medium"
                            disabled={loading}
                        >
                            {loading ? 'Menyimpan...' : 'Reset Password'}
                        </button>

                        <div className="mt-4 text-center">
                            <a href="/" className="text-sm text-[#06736a] hover:underline">
                                Kembali ke Login
                            </a>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ResetPassword;
