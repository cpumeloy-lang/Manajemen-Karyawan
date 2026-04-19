import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient.ts';

interface ForgotPasswordProps {
    isOpen: boolean;
    onClose: () => void;
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ isOpen, onClose }) => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const configuredRedirectUrl = import.meta.env.VITE_PASSWORD_RESET_REDIRECT_URL?.trim();
    const redirectTo = configuredRedirectUrl && configuredRedirectUrl.length > 0
        ? configuredRedirectUrl
        : `${window.location.origin}`;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        setError('');
        setLoading(true);

        try {
            // Kirim request reset password
            const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo,
            });

            if (error) throw error;

            setMessage('✅ Email reset password telah dikirim! Silakan cek inbox Anda dan klik link untuk mereset password. Link akan membawa Anda ke halaman reset password.');
            
            // Auto close after 8 seconds
            setTimeout(() => {
                onClose();
                setEmail('');
                setMessage('');
            }, 8000);
        } catch (err: any) {
            setError(err.message || 'Gagal mengirim email reset password');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-gray-800">Lupa Password?</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                        >
                            ×
                        </button>
                    </div>

                    <p className="text-sm text-gray-600 mb-4">
                        Masukkan email Anda dan kami akan mengirimkan link untuk reset password.
                    </p>

                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#06736a]"
                                placeholder="nama@email.com"
                                required
                                disabled={loading}
                            />
                        </div>

                        {message && (
                            <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-md text-sm">
                                {message}
                            </div>
                        )}

                        {error && (
                            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
                                {error}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                                disabled={loading}
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                className="flex-1 px-4 py-2 bg-[#06736a] text-white rounded-md hover:bg-[#054f46] transition-colors disabled:bg-gray-400"
                                disabled={loading}
                            >
                                {loading ? 'Mengirim...' : 'Kirim Link Reset'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
