import { useState, useRef, useEffect, useCallback } from 'react';
import logger from '../services/logger.ts';
import * as faceapi from 'face-api.js';
import { faceVerificationService, type FaceVerificationResult } from '../services/faceVerificationService.ts';
import { livenessDetectionService } from '../services/livenessDetectionService.ts';

export type VerificationStep = 'location' | 'camera-ready' | 'capturing' | 'processing' | 'success' | 'error';

export interface UseAttendanceVerificationOptions {
    isOpen: boolean;
    employee: { id: string; name: string };
    actionType: 'checkin' | 'checkout';
    isGeofenceEnabled: boolean;
    officeLocation: { lat: number; lng: number };
    officeRadius: number;
    onSuccess: (result: { photoUrl: string; photoBlob?: Blob; faceDescriptor?: Float32Array; verificationResult: FaceVerificationResult }) => void;
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export function useAttendanceVerification(opts: UseAttendanceVerificationOptions) {
    const { isOpen, employee, actionType, isGeofenceEnabled, officeLocation, officeRadius, onSuccess } = opts;

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    // [HK-K1] Track the rAF ID so we can cancel the detection loop on cleanup
    const rafIdRef = useRef<number | null>(null);
    // Track mounted state to avoid state updates after unmount
    const mountedRef = useRef(true);
    const [currentStep, setCurrentStep] = useState<VerificationStep>('location');
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [faceDetected, setFaceDetected] = useState(false);
    const [livenessStatus, setLivenessStatus] = useState<'idle' | 'checking' | 'live' | 'not-live'>('idle');
    const [livenessConfidence, setLivenessConfidence] = useState(0);
    const [verificationResult, setVerificationResult] = useState<FaceVerificationResult | null>(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [location, setLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);

    // Cleanup on unmount: cancel rAF loop and mark as unmounted
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
        };
    }, []);

    const resetState = useCallback(() => {
        setCurrentStep('location');
        setError(null);
        setFaceDetected(false);
        setLivenessStatus('idle');
        setLivenessConfidence(0);
        setVerificationResult(null);
        setLocation(null);
        setLocationError(null);
        setLocationPermissionDenied(false);
    }, []);

    const stopCamera = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    }, [stream]);

    const loadModels = useCallback(async () => {
        try {
            const MODEL_URL = '/models/face-api';
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
            ]);
            setModelsLoaded(true);
        } catch (err) {
            logger.error('Error loading face-api models', err);
            setError('Gagal memuat model face detection.');
        }
    }, []);

    useEffect(() => {
        if (isOpen && !modelsLoaded) { loadModels(); }
    }, [isOpen, modelsLoaded, loadModels]);

    useEffect(() => {
        if (!isOpen) { stopCamera(); resetState(); }
    }, [isOpen, stopCamera, resetState]); // [HK-K2] include stopCamera & resetState to use latest closure

    const startFaceDetection = useCallback(() => {
        if (!videoRef.current || !modelsLoaded) return;
        // [HK-K1] Cancel any previous running loop before starting a new one
        if (rafIdRef.current !== null) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
        }
        const detectFace = async () => {
            // Stop the loop if component unmounted or camera no longer active
            if (!mountedRef.current || !videoRef.current || !modelsLoaded) return;
            try {
                const detections = await (faceapi.detectSingleFace(
                    videoRef.current,
                    new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.3 })
                ) as any).withFaceDescriptor();
                if (mountedRef.current) setFaceDetected(!!detections);
            } catch (err) {
                logger.error('Face detection error', err);
            }
            // Only schedule next frame if still mounted
            if (mountedRef.current) {
                rafIdRef.current = requestAnimationFrame(detectFace);
            }
        };
        rafIdRef.current = requestAnimationFrame(detectFace);
    }, [modelsLoaded]);

    const startCamera = useCallback(async () => {
        setError(null);
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                await videoRef.current.play();
                startFaceDetection();
            }
        } catch (err: any) {
            logger.error('Error accessing camera', err);
            setError('Gagal mengakses kamera. Berikan izin akses kamera.');
            setCurrentStep('error');
        }
    }, [startFaceDetection]);

    const startCameraFlow = useCallback(async () => {
        if (!modelsLoaded) {
            setError('Model face detection belum siap. Tunggu sebentar...');
            // [HK-min2] Don't use recursive setTimeout — just show message and return.
            // The parent useEffect [isOpen, modelsLoaded, loadModels] will re-trigger startCameraFlow
            // once modelsLoaded becomes true, so no polling needed here.
            return;
        }
        setCurrentStep('camera-ready');
        startCamera();
    }, [modelsLoaded, startCamera]);

    const handleLocationConfirmation = useCallback(async () => {
        setLocationError(null);
        setLocationPermissionDenied(false);

        if (!isGeofenceEnabled) {
            await startCameraFlow();
            return;
        }

        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude, accuracy } = position.coords;
                    setLocation({ lat: latitude, lng: longitude, accuracy });
                    const distance = calculateDistance(latitude, longitude, officeLocation.lat, officeLocation.lng);
                    if (distance > officeRadius) {
                        setError(`❌ Anda berada ${Math.round(distance)}m dari kantor (batas: ${officeRadius}m). Tidak bisa absensi.`);
                        setCurrentStep('error');
                    } else {
                        setLocationError(null);
                        startCameraFlow();
                    }
                },
                (err) => {
                    logger.error('Geolocation error', err);
                    if (err.code === 1) {
                        setLocationPermissionDenied(true);
                        setLocationError('Izin lokasi ditolak. Silakan aktifkan izin lokasi di pengaturan browser.');
                    } else {
                        setLocationError('Gagal mendapatkan lokasi. Pastikan GPS aktif.');
                    }
                    setCurrentStep('error');
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else {
            setLocationError('Browser tidak mendukung geolocation.');
            setCurrentStep('error');
        }
    }, [isGeofenceEnabled, officeLocation, officeRadius, startCameraFlow]);

    const handleCapture = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current || !modelsLoaded) return;
        setCurrentStep('capturing');

        try {
            const detections = await (faceapi.detectSingleFace(
                videoRef.current,
                new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.5 })
            ) as any).withFaceDescriptor();

            if (!detections) {
                setError('❌ Wajah tidak terdeteksi. Silakan coba lagi.');
                setCurrentStep('camera-ready');
                return;
            }

            setCurrentStep('processing');
            setLivenessStatus('checking');

            const livenessResult = await livenessDetectionService.checkLiveness(videoRef.current);
            setLivenessStatus(livenessResult.isLive ? 'live' : 'not-live');
            setLivenessConfidence(Math.round(livenessResult.confidence * 100));

            if (!livenessResult.isLive) {
                setError(`❌ Liveness detection gagal (confidence: ${Math.round(livenessResult.confidence * 100)}%). Pastikan Anda menunjukkan wajah asli.`);
                setCurrentStep('error');
                return;
            }

            const canvas = canvasRef.current;
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0);
                canvas.toBlob(async (blob) => {
                    if (!blob) {
                        setError('Gagal memproses foto.');
                        setCurrentStep('error');
                        return;
                    }

                    try {
                        const result = await faceVerificationService.verifyFace(
                            employee.id,
                            detections.descriptor,
                            employee.name,
                            actionType === 'checkin' ? 'checkin' : 'checkout',
                            location ? `${location.lat.toFixed(5)},${location.lng.toFixed(5)}` : 'Unknown'
                        );
                        setVerificationResult(result);

                        if (result.verified) {
                            setCurrentStep('success');
                            setSuccessMessage(`✅ Verifikasi berhasil (${Math.round(result.confidence * 100)}% match)`);
                            canvas.toBlob((photoBlob) => {
                                if (photoBlob) {
                                    onSuccess({
                                        photoUrl: '',
                                        photoBlob,
                                        faceDescriptor: detections.descriptor,
                                        verificationResult: result
                                    });
                                }
                            }, 'image/jpeg', 0.8);
                        } else {
                            setError(`❌ Wajah tidak cocok. ${result.message}`);
                            setCurrentStep('error');
                        }
                    } catch (err: any) {
                        logger.error('Verification error', err);
                        setError(`Gagal verifikasi: ${err.message}`);
                        setCurrentStep('error');
                    }
                }, 'image/jpeg', 0.8);
            }
        } catch (err: any) {
            logger.error('Capture error', err);
            setError('Gagal menangkap foto. Silakan coba lagi.');
            setCurrentStep('error');
        }
    }, [modelsLoaded, employee, actionType, location, onSuccess]);

    return {
        videoRef, canvasRef,
        currentStep, error, modelsLoaded, faceDetected,
        livenessStatus, livenessConfidence,
        verificationResult, successMessage,
        location, locationError, locationPermissionDenied,
        handleLocationConfirmation, handleCapture, resetState,
    };
}
