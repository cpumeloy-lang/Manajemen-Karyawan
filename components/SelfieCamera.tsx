import React, { useRef, useEffect, useState } from 'react';
import * as faceapi from 'face-api.js';
import { livenessDetectionService } from '../services/livenessDetectionService.ts';
import { XMarkIcon } from './icons.tsx';

interface SelfieCameraProps {
    isOpen: boolean;
    onClose: () => void;
    onCapture: (file: File, faceDescriptor?: Float32Array) => void;
    title: string;
    requireFaceDetection?: boolean;
    requireLivenessCheck?: boolean;
}

const SelfieCamera: React.FC<SelfieCameraProps> = ({ isOpen, onClose, onCapture, title, requireFaceDetection = true, requireLivenessCheck = false }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [faceDetected, setFaceDetected] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [livenessStatus, setLivenessStatus] = useState<string>('idle');
    const [livenessConfidence, setLivenessConfidence] = useState(0);

    useEffect(() => {
        if (isOpen) {
            loadModels().then(() => {
                startCamera();
            });
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [isOpen]);

    const loadModels = async () => {
        try {
            setError(null);
            const MODEL_URL = '/models/face-api';
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
            ]);
            setModelsLoaded(true);
        } catch (err) {
            console.error('Error loading face-api models:', err);
            setError('Gagal memuat model face detection. Pastikan koneksi internet stabil.');
        }
    };

    const startCamera = async () => {
        setError(null);
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: "user" }, 
                audio: false 
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                await videoRef.current.play();
                
                // Start face detection if required
                if (requireFaceDetection && modelsLoaded) {
                    startFaceDetection();
                }
            }
        } catch (err: any) {
            if (err.name === 'AbortError') {
                // Expected during React strict mode or rapid mount/unmount — not a real error
                return;
            }
            console.error("Error accessing camera:", err);
            setError("Gagal mengakses kamera. Pastikan Anda memberikan izin akses kamera ke browser ini.");
        }
    };

    const startFaceDetection = () => {
        if (!videoRef.current || !modelsLoaded) return;

        const detectFace = async () => {
            if (!videoRef.current || !modelsLoaded) return;

            const detections = await faceapi.detectSingleFace(
                videoRef.current,
                new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.3 })
            );
            
            setFaceDetected(!!detections);
            
            if (stream && isOpen) {
                requestAnimationFrame(detectFace);
            }
        };
        
        detectFace();
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    const handleCapture = async () => {
        if (!videoRef.current || !canvasRef.current) return;

        setIsProcessing(true);
        try {
            // Liveness check first if required
            if (requireLivenessCheck && videoRef.current) {
                setLivenessStatus('checking');
                try {
                    const livenessResult = await livenessDetectionService.checkLiveness(videoRef.current, 8, 150);
                    setLivenessConfidence(livenessResult.confidence);

                    if (!livenessResult.isLive) {
                        setError(`Liveness check gagal. Pastikan Anda sedang melakukan live video (bukan foto/video playback).`);
                        setIsProcessing(false);
                        setLivenessStatus('failed');
                        return;
                    }
                    setLivenessStatus('passed');
                } catch (livenessErr) {
                    console.error('Liveness detection error:', livenessErr);
                    setError('Gagal melakukan liveness check. Coba lagi.');
                    setIsProcessing(false);
                    return;
                }
            }

            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            const context = canvas.getContext('2d');
            if (!context) return;

            // Draw video frame to canvas
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Convert canvas to File
            canvas.toBlob(async (blob) => {
                if (!blob) return;

                const file = new File([blob], `selfie_${Date.now()}.jpg`, { type: 'image/jpeg' });
                
                let faceDescriptor: Float32Array | undefined;
                
                // Extract face descriptor if face detection is required
                if (requireFaceDetection && modelsLoaded) {
                    try {
                        const detection = await faceapi.detectSingleFace(
                            canvas,
                            new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.3 })
                        ).withFaceLandmarks().withFaceDescriptor();
                        
                        if (detection) {
                            faceDescriptor = detection.descriptor;
                        } else {
                            setError('Wajah tidak terdeteksi dengan jelas. Pastikan pencahayaan cukup dan posisikan wajah di tengah.');
                            setIsProcessing(false);
                            return;
                        }
                    } catch (faceErr) {
                        console.error('Face detection error:', faceErr);
                        setError('Gagal mendeteksi wajah. Coba lagi.');
                        setIsProcessing(false);
                        return;
                    }
                }
                
                onCapture(file, faceDescriptor);
                stopCamera();
            }, 'image/jpeg', 0.8);
        } catch (err) {
            console.error('Capture error:', err);
            setError('Gagal mengambil foto. Coba lagi.');
        } finally {
            setIsProcessing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-gray-100">
                    <h3 className="font-bold text-lg text-gray-800">{title}</h3>
                    <button 
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="relative bg-black aspect-[3/4] sm:aspect-video w-full flex items-center justify-center">
                    {error ? (
                        <div className="p-6 text-center text-red-400">
                            <p>📷</p>
                            <p className="mt-2 text-sm">{error}</p>
                        </div>
                    ) : (
                        <>
                            <video 
                                ref={videoRef} 
                                className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]" 
                                playsInline 
                                muted 
                                autoPlay 
                            />
                            {/* Overlay border to guide face position */}
                            <div className={`absolute inset-0 border-4 m-8 rounded-full border-dashed pointer-events-none opacity-50 ${
                                faceDetected ? 'border-green-400' : 'border-[#06736a]'
                            }`}></div>

                            {/* Face detection status */}
                            {requireFaceDetection && (
                                <div className="absolute top-4 left-4 right-4 flex flex-col gap-2">
                                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                                        modelsLoaded 
                                            ? 'bg-green-500/80 text-white' 
                                            : 'bg-yellow-500/80 text-black'
                                    }`}>
                                        {modelsLoaded ? '✅ Model Ready' : '⏳ Loading Models...'}
                                    </div>
                                    <div className="flex gap-2">
                                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                                            faceDetected 
                                                ? 'bg-green-500/80 text-white' 
                                                : 'bg-red-500/80 text-white'
                                        }`}>
                                            {faceDetected ? '👤 Face Detected' : '❌ No Face'}
                                        </div>
                                        {requireLivenessCheck && (
                                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                livenessStatus === 'passed'
                                                    ? 'bg-green-500/80 text-white'
                                                    : livenessStatus === 'checking'
                                                    ? 'bg-blue-500/80 text-white'
                                                    : livenessStatus === 'failed'
                                                    ? 'bg-red-500/80 text-white'
                                                    : 'bg-gray-500/80 text-white'
                                            }`}>
                                                {livenessStatus === 'passed' && `✅ Live (${Math.round(livenessConfidence * 100)}%)`}
                                                {livenessStatus === 'checking' && '⏳ Checking Liveness...'}
                                                {livenessStatus === 'failed' && '❌ Not Live'}
                                                {livenessStatus === 'idle' && '👁️ Liveness Check'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                    <canvas ref={canvasRef} className="hidden" />
                </div>
                
                <div className="p-6 bg-white flex flex-col items-center">
                    <p className="text-sm text-gray-500 mb-4 text-center">
                        {requireFaceDetection 
                            ? "Posisikan wajah Anda di tengah layar dan pastikan pencahayaan cukup. Tunggu hingga wajah terdeteksi."
                            : "Posisikan wajah Anda di tengah layar dan pastikan pencahayaan cukup."
                        }
                    </p>
                    <button
                        onClick={handleCapture}
                        disabled={!!error || !stream || isProcessing || (requireFaceDetection && !faceDetected)}
                        className="w-16 h-16 rounded-full bg-[#06736a] border-4 border-white shadow-[0_0_0_2px_#06736a] flex items-center justify-center hover:bg-[#055f57] hover:shadow-[0_0_0_4px_#06736a] transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        {isProcessing ? (
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <div className="w-6 h-6 rounded-full bg-white group-hover:scale-90 transition-transform"></div>
                        )}
                    </button>
                    <p className="mt-3 text-xs font-semibold text-[#06736a] uppercase tracking-widest">
                        {isProcessing ? 'Memproses...' : 'Ambil Foto'}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SelfieCamera;
