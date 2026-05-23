import React from 'react';
import { FaceVerificationResult } from '../../services/faceVerificationService.ts';

interface CapturingStepProps {}
export const CapturingStep: React.FC<CapturingStepProps> = () => (
    <div className="text-center py-8 space-y-4">
        <div className="text-4xl animate-pulse">📸</div>
        <p className="font-semibold text-gray-700">Menangkap Foto...</p>
        <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#06736a] animate-pulse" />
        </div>
    </div>
);

interface ProcessingStepProps {
    livenessStatus: 'idle' | 'checking' | 'live' | 'not-live';
    livenessConfidence: number;
}
export const ProcessingStep: React.FC<ProcessingStepProps> = ({ livenessStatus, livenessConfidence }) => (
    <div className="text-center py-8 space-y-4">
        <div className="text-4xl animate-bounce">🤖</div>
        <p className="font-semibold text-gray-700">Verifikasi Wajah...</p>
        {livenessStatus === 'checking' && (
            <>
                <p className="text-xs text-gray-500">Checking liveness...</p>
                <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 animate-pulse" />
                </div>
            </>
        )}
        {livenessStatus !== 'idle' && (
            <p className="text-xs text-gray-600">
                Liveness: {livenessStatus === 'live' ? '✅ Live' : '❌ Not Live'} ({livenessConfidence}%)
            </p>
        )}
    </div>
);

interface SuccessStepProps {
    successMessage: string;
    verificationResult: FaceVerificationResult | null;
    onClose: () => void;
}
export const SuccessStep: React.FC<SuccessStepProps> = ({ successMessage, verificationResult, onClose }) => (
    <div className="text-center py-8 space-y-4">
        <div className="text-5xl">✅</div>
        <p className="font-semibold text-gray-700 text-lg">{successMessage}</p>
        {verificationResult && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2 text-sm">
                <p className="text-green-800">
                    <span className="font-semibold">Kecocokan:</span> {Math.round(verificationResult.confidence * 100)}%
                </p>
                <p className="text-green-800">
                    <span className="font-semibold">Status:</span> {verificationResult.verified ? 'Terverifikasi' : 'Gagal'}
                </p>
            </div>
        )}
        <button
            type="button"
            onClick={onClose}
            className="w-full bg-[#06736a] text-white py-3 rounded-lg font-semibold hover:bg-[#055b55] transition"
        >
            Selesai
        </button>
    </div>
);

interface ErrorStepProps {
    error: string | null;
    locationError: string | null;
    locationPermissionDenied: boolean;
    onClose: () => void;
    onRetry: () => void;
}
export const ErrorStep: React.FC<ErrorStepProps> = ({ error, locationError, locationPermissionDenied, onClose, onRetry }) => (
    <div className="text-center py-8 space-y-4">
        <div className="text-5xl">❌</div>
        {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
                {error}
            </div>
        )}
        {locationError && !locationPermissionDenied && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                {locationError}
            </div>
        )}
        {locationPermissionDenied && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 space-y-2">
                <p className="font-semibold">Izin Lokasi Ditolak</p>
                <p>{locationError}</p>
                <p className="text-xs">
                    Untuk aktifkan: Browser Settings → Privacy → Location → Allow untuk aplikasi ini
                </p>
            </div>
        )}
        <div className="flex gap-2 pt-4">
            <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-300 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-400 transition"
            >
                Batal
            </button>
            <button
                type="button"
                onClick={onRetry}
                className="flex-1 bg-[#06736a] text-white py-3 rounded-lg font-semibold hover:bg-[#055b55] transition"
            >
                Coba Lagi
            </button>
        </div>
    </div>
);
