import React, { useState, useRef, useEffect } from 'react';

import * as faceapi from 'face-api.js';

import { faceVerificationService, type FaceVerificationResult } from '../services/faceVerificationService.ts';

import { livenessDetectionService } from '../services/livenessDetectionService.ts';

import { XMarkIcon, CheckCircleIcon } from './icons.tsx';



interface AttendanceVerificationFlowProps {

    isOpen: boolean;

    onClose: () => void;

    onSuccess: (result: { photoUrl: string; photoBlob?: Blob; faceDescriptor?: Float32Array; verificationResult: FaceVerificationResult }) => void;

    employee: { id: string; name: string };

    actionType: 'checkin' | 'checkout';

    isGeofenceEnabled: boolean;

    officeLocation: { lat: number; lng: number };

    officeRadius: number;

}



type VerificationStep = 'location' | 'camera-ready' | 'capturing' | 'processing' | 'success' | 'error';



const AttendanceVerificationFlow: React.FC<AttendanceVerificationFlowProps> = ({

    isOpen,

    onClose,

    onSuccess,

    employee,

    actionType,

    isGeofenceEnabled,

    officeLocation,

    officeRadius,

}) => {

    const videoRef = useRef<HTMLVideoElement>(null);

    const canvasRef = useRef<HTMLCanvasElement>(null);

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



    // Load models on mount

    useEffect(() => {

        if (isOpen && !modelsLoaded) {

            loadModels();

        }

    }, [isOpen, modelsLoaded]);



    // Handle step changes

    useEffect(() => {

        if (!isOpen) {

            stopCamera();

            resetState();

        }

    }, [isOpen]);



    const loadModels = async () => {

        try {

            const MODEL_URL = '/models/face-api';

            await Promise.all([

                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),

                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),

                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)

            ]);

            setModelsLoaded(true);

        } catch (err) {

            console.error('Error loading face-api models:', err);

            setError('Gagal memuat model face detection.');

        }

    };



    const resetState = () => {

        setCurrentStep('location');

        setError(null);

        setFaceDetected(false);

        setLivenessStatus('idle');

        setLivenessConfidence(0);

        setVerificationResult(null);

        setLocation(null);

        setLocationError(null);

        setLocationPermissionDenied(false);

    };



    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {

        const R = 6371000; // Earth radius in meters

        const dLat = ((lat2 - lat1) * Math.PI) / 180;

        const dLon = ((lon2 - lon1) * Math.PI) / 180;

        const a =

            Math.sin(dLat / 2) * Math.sin(dLat / 2) +

            Math.cos((lat1 * Math.PI) / 180) *

                Math.cos((lat2 * Math.PI) / 180) *

                Math.sin(dLon / 2) *

                Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;

    };



    // Step 1: Location Confirmation

    const handleLocationConfirmation = async () => {

        setLocationError(null);

        setLocationPermissionDenied(false);



        if (!isGeofenceEnabled) {

            // Skip to camera if geofence not enabled

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

                    console.error('Geolocation error:', err);

                    if (err.code === 1) {

                        setLocationPermissionDenied(true);

                        setLocationError('Izin lokasi ditolak. Silakan aktifkan izin lokasi di pengaturan browser.');

                    } else {

                        setLocationError('Gagal mendapatkan lokasi. Pastikan GPS aktif.');

                    }

                    setCurrentStep('error');

                },

                {

                    enableHighAccuracy: true,

                    timeout: 10000,

                    maximumAge: 0

                }

            );

        } else {

            setLocationError('Browser tidak mendukung geolocation.');

            setCurrentStep('error');

        }

    };



    const startCameraFlow = async () => {

        if (!modelsLoaded) {

            setError('Model face detection belum siap. Tunggu sebentar...');

            setTimeout(startCameraFlow, 1000);

            return;

        }

        setCurrentStep('camera-ready');

        startCamera();

    };



    const startCamera = async () => {

        setError(null);

        try {

            const mediaStream = await navigator.mediaDevices.getUserMedia({

                video: { facingMode: 'user' },

                audio: false

            });

            setStream(mediaStream);

            if (videoRef.current) {

                videoRef.current.srcObject = mediaStream;

                await videoRef.current.play();

                startFaceDetection();

            }

        } catch (err: any) {

            console.error('Error accessing camera:', err);

            setError('Gagal mengakses kamera. Berikan izin akses kamera.');

            setCurrentStep('error');

        }

    };



    const startFaceDetection = () => {

        if (!videoRef.current || !modelsLoaded) return;



        const detectFace = async () => {

            if (!videoRef.current || !modelsLoaded || !stream) return;



            try {

                const detections = await (faceapi.detectSingleFace(

                    videoRef.current,

                    new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.3 })

                ) as any).withFaceDescriptor();



                setFaceDetected(!!detections);

            } catch (err) {

                console.error('Face detection error:', err);

            }



            requestAnimationFrame(detectFace);

        };



        detectFace();

    };



    const handleCapture = async () => {

        if (!videoRef.current || !canvasRef.current || !modelsLoaded) return;



        setCurrentStep('capturing');



        try {

            // Get face detection with descriptor

            const detections = await (faceapi.detectSingleFace(

                videoRef.current,

                new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.5 })

            ) as any).withFaceDescriptor();



            if (!detections) {

                setError('❌ Wajah tidak terdeteksi. Silakan coba lagi.');

                setCurrentStep('camera-ready');

                return;

            }



            // Check liveness

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



            // Capture image

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



                    const file = new File([blob], `face-${Date.now()}.jpg`, { type: 'image/jpeg' });

                    

                    // Verify face

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

                            

                            // Convert canvas to blob for upload

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

                        console.error('Verification error:', err);

                        setError(`Gagal verifikasi: ${err.message}`);

                        setCurrentStep('error');

                    }

                }, 'image/jpeg', 0.8);

            }

        } catch (err: any) {

            console.error('Capture error:', err);

            setError('Gagal menangkap foto. Silakan coba lagi.');

            setCurrentStep('error');

        }

    };



    const stopCamera = () => {

        if (stream) {

            stream.getTracks().forEach(track => track.stop());

            setStream(null);

        }

    };



    if (!isOpen) return null;



    return (

        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">

            <button

                type="button"

                aria-label="Close"

                className="absolute inset-0 bg-black/50 transition-opacity"

                onClick={onClose}

            />



            <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">

                {/* Header */}

                <div className="sticky top-0 z-10 flex items-center justify-between bg-gradient-to-r from-[#06736a] to-[#089c8e] px-6 py-4 text-white">

                    <div>

                        <p className="text-xs uppercase tracking-widest opacity-90">

                            {actionType === 'checkin' ? 'Check-In' : 'Check-Out'}

                        </p>

                        <h2 className="text-lg font-bold">Verifikasi Absensi</h2>

                    </div>

                    <button

                        type="button"

                        onClick={onClose}

                        className="rounded-full p-2 hover:bg-white/20 transition"

                    >

                        <XMarkIcon className="h-5 w-5" />

                    </button>

                </div>



                {/* Step Indicator */}

                <div className="flex gap-1 bg-gray-100 px-4 py-3">

                    {['location', 'camera-ready', 'capturing', 'processing', 'success'].map((step) => (

                        <div

                            key={step}

                            className={`h-1.5 flex-1 rounded-full transition ${

                                ['location', 'camera-ready', 'capturing', 'processing', 'success'].indexOf(step) <=

                                ['location', 'camera-ready', 'capturing', 'processing', 'success'].indexOf(currentStep)

                                    ? 'bg-[#06736a]'

                                    : 'bg-gray-300'

                            }`}

                        />

                    ))}

                </div>



                {/* Content */}

                <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto">

                    {/* Step 1: Location Confirmation */}

                    {currentStep === 'location' && (

                        <div className="space-y-4">

                            <div className="text-center">

                                <p className="text-sm font-semibold text-gray-700 mb-2">📍 Verifikasi Lokasi</p>

                                <p className="text-xs text-gray-500">

                                    {isGeofenceEnabled

                                        ? 'Sistem akan memverifikasi lokasi Anda berada di kantor sebelum absensi.'

                                        : 'Geofencing tidak aktif. Lanjut ke verifikasi wajah.'}

                                </p>

                            </div>



                            {isGeofenceEnabled && location && (

                                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">

                                    <p className="text-green-800">

                                        ✅ Lokasi terdeteksi:{' '}

                                        <span className="font-semibold">

                                            {Math.round(calculateDistance(location.lat, location.lng, officeLocation.lat, officeLocation.lng))}m

                                        </span>{' '}

                                        dari kantor (batas: {officeRadius}m)

                                    </p>

                                </div>

                            )}



                            <button

                                type="button"

                                onClick={handleLocationConfirmation}

                                className="w-full bg-[#06736a] text-white py-3 rounded-lg font-semibold hover:bg-[#055b55] transition"

                            >

                                {isGeofenceEnabled ? 'Konfirmasi Lokasi' : 'Lanjut ke Verifikasi Wajah'}

                            </button>

                        </div>

                    )}



                    {/* Step 2: Camera Ready */}

                    {currentStep === 'camera-ready' && (

                        <div className="space-y-4">

                            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">

                                <video

                                    ref={videoRef}

                                    autoPlay

                                    playsInline

                                    className="w-full h-full object-cover"

                                />

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

                                onClick={handleCapture}

                                disabled={!faceDetected || !modelsLoaded}

                                className="w-full bg-[#06736a] text-white py-3 rounded-lg font-semibold hover:bg-[#055b55] disabled:opacity-50 disabled:cursor-not-allowed transition"

                            >

                                📷 Ambil Foto

                            </button>

                        </div>

                    )}



                    {/* Step 3: Capturing */}

                    {currentStep === 'capturing' && (

                        <div className="text-center py-8 space-y-4">

                            <div className="text-4xl animate-pulse">📸</div>

                            <p className="font-semibold text-gray-700">Menangkap Foto...</p>

                            <div className="h-1 bg-gray-200 rounded-full overflow-hidden">

                                <div className="h-full bg-[#06736a] animate-pulse" />

                            </div>

                        </div>

                    )}



                    {/* Step 4: Processing */}

                    {currentStep === 'processing' && (

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

                    )}



                    {/* Step 5: Success */}

                    {currentStep === 'success' && (

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

                    )}



                    {/* Error State */}

                    {currentStep === 'error' && (

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

                                    onClick={() => {

                                        resetState();

                                        setCurrentStep('location');

                                    }}

                                    className="flex-1 bg-[#06736a] text-white py-3 rounded-lg font-semibold hover:bg-[#055b55] transition"

                                >

                                    Coba Lagi

                                </button>

                            </div>

                        </div>

                    )}

                </div>

            </div>

        </div>

    );

};



export default AttendanceVerificationFlow;

