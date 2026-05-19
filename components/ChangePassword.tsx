import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient.ts';

interface ChangePasswordProps {
    isOpen: boolean;
    onClose: () => void;
}

const ChangePassword: React.FC<ChangePasswordProps> = ({ isOpen, onClose }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        setError('');

        // Validasi
        if (newPassword.length < 6) {
            setError('Password baru minimal 6 karakter');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Konfirmasi password tidak cocok');
            return;
        }

        setLoading(true);

        try {
            // Update password
            const { data, error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            
            setMessage('✅ Password berhasil diubah! Perubahan sudah tersimpan ke database.');
            
            // Auto close after 2 seconds
            setTimeout(() => {
                onClose();
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setMessage('');
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'Gagal mengubah password');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        if (isOpen) document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    return (
        <div
            className={`fixed inset-0 z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            aria-modal="true"
            role="dialog"
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            {/* Drawer */}
            <div className={`absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out rounded-l-2xl overflow-hidden ${
                isOpen ? 'translate-x-0' : 'translate-x-full'
            }`}>
                {/* Header */}
                <div className="flex-shrink-0 p-6 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-[#06736a]">🔒 Ubah Password</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                        aria-label="Tutup"
                    >
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>

                <form id="change-password-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Password Baru
                        </label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#06736a] focus:border-transparent"
                            placeholder="Minimal 6 karakter"
                            required
                            minLength={6}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Konfirmasi Password Baru
                        </label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#06736a] focus:border-transparent"
                            placeholder="Ketik ulang password baru"
                            required
                            minLength={6}
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    {message && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-sm text-green-600">{message}</p>
                        </div>
                    )}

                </form>

                {/* Footer */}
                <div className="flex-shrink-0 border-t bg-white px-6 py-4 flex justify-end gap-3 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        disabled={loading}
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        form="change-password-form"
                        className="px-5 py-2.5 bg-[#06736a] text-white rounded-lg text-sm font-semibold hover:bg-[#054f46] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={loading}
                    >
                        {loading ? 'Mengubah...' : 'Ubah Password'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChangePassword;
