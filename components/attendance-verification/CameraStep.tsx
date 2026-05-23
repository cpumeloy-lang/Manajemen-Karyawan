import React, { RefObject } from 'react';

interface CameraStepProps {
    videoRef: RefObject<HTMLVideoElement | null>;
    canvasRef: RefObject<HTMLCanvasElement | null>;
    modelsLoaded: boolean;
    faceDetected: boolean;
    onCapture: () => void;
}

const CameraStep: React.FC<CameraStepProps> = ({ videoRef, canvasRef, modelsLoaded, faceDetected, onCapture }) => (
    <div className="space-y-4">
        <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />

            {/* Face Detection Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-48 h-48 border-2 border-dashed border-yellow-400 rounded-full flex items-center justify-center bg-white/5">
                    <div className="text-center">
                        <p className="text-white text-xs font-semibold">
                            {modelsLoaded ? '🔍 Model Ready' : '⏳ Loading...'}
                        </p>
                        <p className="text-white text-2xl mt-2">
                            {faceDetected ? '👤' : '❌'}
                        </p>
                        <p className="text-white text-xs mt-2">
                            {faceDetected ? 'Face Detected' : 'Tunjukkan Wajah'}
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <p className="font-semibold mb-1">💡 Tips:</p>
            <ul className="text-xs space-y-1 list-disc list-inside">
                <li>Pastikan wajah Anda terlihat jelas di lingkaran</li>
                <li>Pencahayaan cukup terang</li>
                <li>Jangan gunakan sunglasses atau topi</li>
            </ul>
        </div>

        <button
            type="button"
            onClick={onCapture}
            disabled={!faceDetected || !modelsLoaded}
            className="w-full bg-[#06736a] text-white py-3 rounded-lg font-semibold hover:bg-[#055b55] disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
            📷 Ambil Foto
        </button>
    </div>
);

export default CameraStep;
