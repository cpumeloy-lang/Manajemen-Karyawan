import React, { Suspense, useEffect, useRef, useState } from 'react';
import { supabase } from '../services/supabaseClient';

const DatabaseSetup = React.lazy(() => import('./DatabaseSetup.tsx'));

const DatabaseStatus: React.FC = () => {
    const [status, setStatus] = useState<'checking' | 'connected' | 'error'>('checking');
    const [error, setError] = useState<string>('');
    const hasChecked = useRef(false);

    useEffect(() => {
        if (hasChecked.current) return;
        hasChecked.current = true;

        const checkConnection = async () => {
            try {
                // Test basic connection
                const { error } = await supabase.from('units').select('count', { count: 'exact', head: true });
                
                if (error) {
                    console.error('Database connection error:', error);
                    setError(error.message);
                    setStatus('error');
                } else {
                    setStatus('connected');
                }
            } catch (err: any) {
                console.error('Connection test failed:', err);
                setError(err.message || 'Unknown error');
                setStatus('error');
            }
        };

        checkConnection();
    }, []);

    if (status === 'checking') {
        return (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                <div className="flex">
                    <div className="ml-3">
                        <p className="text-sm text-yellow-700">
                            🔄 Memeriksa koneksi database... Pastikan Supabase sudah dikonfigurasi dengan benar.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (status === 'error') {
        // Deteksi jenis error untuk memberikan petunjuk yang lebih spesifik
        const errorMessage = String(error || '').toLowerCase();
        const isTableMissing = errorMessage.includes('relation') && errorMessage.includes('does not exist');
        const isAuthError = errorMessage.includes('auth') || errorMessage.includes('permission');
        const isConnectionRefused =
            errorMessage.includes('failed to fetch') ||
            errorMessage.includes('connection refused') ||
            errorMessage.includes('err_connection_refused');
        
        return (
            <>
                <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
                <div className="flex">
                    <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">
                            ❌ Koneksi Database Bermasalah
                        </h3>
                        <div className="mt-2 text-sm text-red-700">
                            <p>Error: {error}</p>
                            <div className="mt-2">
                                <p className="font-semibold">Kemungkinan penyebab:</p>
                                <ul className="list-disc list-inside mt-1">
                                    <li>Tabel 'units' belum dibuat di Supabase</li>
                                    <li>Konfigurasi Supabase tidak benar</li>
                                    <li>Masalah koneksi internet</li>
                                    {isConnectionRefused && <li>Supabase lokal (port 54321) tidak sedang berjalan</li>}
                                </ul>
                                <p className="mt-2">
                                    <strong>Solusi:</strong> Lihat file DATABASE_SETUP.md untuk panduan setup database.
                                </p>
                                {isConnectionRefused && (
                                    <p className="mt-2">
                                        <strong>Tips cepat:</strong> jalankan Supabase lokal Anda, atau gunakan URL project Supabase cloud di VITE_SUPABASE_URL.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {isTableMissing && (
                <Suspense fallback={<div className="text-sm text-gray-500 mt-3">Memuat panduan setup database...</div>}>
                    <DatabaseSetup />
                </Suspense>
            )}
            </>
        );
    }

    return (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
            <div className="flex">
                <div className="ml-3">
                    <p className="text-sm text-green-700">
                        ✅ Database terhubung dengan baik
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DatabaseStatus;