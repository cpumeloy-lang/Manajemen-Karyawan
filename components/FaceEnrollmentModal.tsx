import React, { useState } from 'react';
import { XMarkIcon } from './icons.tsx';
import SelfieCamera from './SelfieCamera.tsx';
import { faceVerificationService } from '../services/faceVerificationService.ts';

interface FaceEnrollmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    employeeId: string;
    employeeName: string;
    onEnrolled?: () => void;
}

const FaceEnrollmentModal: React.FC<FaceEnrollmentModalProps> = ({
    isOpen,
    onClose,
    employeeId,
    employeeName,
    onEnrolled
}) => {
    const [isEnrolling, setIsEnrolling] = useState(false);
    const [enrollmentStep, setEnrollmentStep] = useState<'instructions' | 'capture' | 'processing' | 'success' | 'error'>('instructions');
    const [error, setError] = useState<string | null>(null);

    const handleFaceCapture = async (file: File, faceDescriptor?: Float32Array) => {
        if (!faceDescriptor) {
            setError('Face descriptor tidak tersedia. Pastikan wajah terdeteksi dengan jelas.');
            setEnrollmentStep('error');
            return;
        }

        setIsEnrolling(true);
        setEnrollmentStep('processing');

        try {
            const success = await faceVerificationService.enrollFace(employeeId, faceDescriptor, employeeName);

            if (success) {
                setEnrollmentStep('success');
                setTimeout(() => {
                    onEnrolled?.();
                    onClose();
                }, 2000);
            } else {
                throw new Error('Gagal menyimpan data wajah');
            }
        } catch (err: any) {
            setError(err.message || 'Terjadi kesalahan saat enroll face');
            setEnrollmentStep('error');
        } finally {
            setIsEnrolling(false);
        }
    };

    const resetEnrollment = () => {
        setEnrollmentStep('instructions');
        setError(null);
        setIsEnrolling(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg bg-white rounded-2xl overflow-hidden shadow-2xl">
                <div className="flex justify-between items-center p-4 border-b border-gray-100">
                    <h3 className="font-bold text-lg text-gray-800">Enroll Face Recognition</h3>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6">
                    {enrollmentStep === 'instructions' && (
                        <div className="text-center">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl">📸</span>
                            </div>
                            <h4 className="font-semibold text-gray-800 mb-2">Panduan Enroll Face</h4>
                            <p className="text-sm text-gray-600 mb-6">
                                Kami akan mengambil foto wajah Anda untuk verifikasi absensi otomatis.
                                Pastikan pencahayaan cukup dan posisikan wajah di tengah kamera.
                            </p>
                            <button
                                onClick={() => setEnrollmentStep('capture')}
                                className="w-full bg-[#06736a] text-white py-3 px-6 rounded-xl font-medium hover:bg-[#055f57] transition-colors"
                            >
                                Mulai Enroll Face
                            </button>
                        </div>
                    )}

                    {enrollmentStep === 'capture' && (
                        <div>
                            <p className="text-sm text-gray-600 mb-4 text-center">
                                Posisikan wajah {employeeName} di tengah layar dan ambil foto.
                            </p>
                            <SelfieCamera
                                isOpen={true}
                                onClose={() => setEnrollmentStep('instructions')}
                                onCapture={handleFaceCapture}
                                title="Enroll Face - Ambil Foto"
                                requireFaceDetection={true}
                            />
                        </div>
                    )}

                    {enrollmentStep === 'processing' && (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 border-4 border-[#06736a] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <h4 className="font-semibold text-gray-800 mb-2">Memproses...</h4>
                            <p className="text-sm text-gray-600">
                                Menyimpan data wajah untuk verifikasi
                            </p>
                        </div>
                    )}

                    {enrollmentStep === 'success' && (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl">✅</span>
                            </div>
                            <h4 className="font-semibold text-green-800 mb-2">Berhasil!</h4>
                            <p className="text-sm text-gray-600">
                                Face recognition telah diaktifkan untuk {employeeName}
                            </p>
                        </div>
                    )}

                    {enrollmentStep === 'error' && (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl">❌</span>
                            </div>
                            <h4 className="font-semibold text-red-800 mb-2">Gagal Enroll</h4>
                            <p className="text-sm text-red-600 mb-4">{error}</p>
                            <button
                                onClick={resetEnrollment}
                                className="bg-[#06736a] text-white py-2 px-4 rounded-lg font-medium hover:bg-[#055f57] transition-colors"
                            >
                                Coba Lagi
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FaceEnrollmentModal;