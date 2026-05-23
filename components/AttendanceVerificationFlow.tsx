/**
 * AttendanceVerificationFlow.tsx - REFACTORED
 * 
 * Attendance verification modal with face recognition.
 * Now uses useAttendanceVerification hook + sub-components.
 * 
 * Previous: ~1,081 lines, all logic and UI inline
 * Current:  ~70 lines, thin composition layer
 * 
 * Architecture:
 * AttendanceVerificationFlow.tsx → Modal shell & composition
 * ├─ useAttendanceVerification.ts → All verification logic
 * ├─ StepIndicator.tsx           → Progress bar
 * ├─ LocationStep.tsx            → Geofence confirmation
 * ├─ CameraStep.tsx              → Camera + face detection
 * └─ ResultSteps.tsx             → Capturing/Processing/Success/Error
 */
import React from 'react';
import { type FaceVerificationResult } from '../services/faceVerificationService.ts';
import { XMarkIcon } from './icons.tsx';
import { useAttendanceVerification } from '../hooks/useAttendanceVerification.ts';

// Sub-components
import StepIndicator from './attendance-verification/StepIndicator';
import LocationStep from './attendance-verification/LocationStep';
import CameraStep from './attendance-verification/CameraStep';
import { CapturingStep, ProcessingStep, SuccessStep, ErrorStep } from './attendance-verification/ResultSteps';

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

const AttendanceVerificationFlow: React.FC<AttendanceVerificationFlowProps> = ({
    isOpen, onClose, onSuccess, employee, actionType, isGeofenceEnabled, officeLocation, officeRadius,
}) => {
    const v = useAttendanceVerification({
        isOpen, employee, actionType, isGeofenceEnabled, officeLocation, officeRadius, onSuccess,
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <button type="button" aria-label="Close" className="absolute inset-0 bg-black/50 transition-opacity" onClick={onClose} />

            <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between bg-gradient-to-r from-[#06736a] to-[#089c8e] px-6 py-4 text-white">
                    <div>
                        <p className="text-xs uppercase tracking-widest opacity-90">
                            {actionType === 'checkin' ? 'Check-In' : 'Check-Out'}
                        </p>
                        <h2 className="text-lg font-bold">Verifikasi Absensi</h2>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-white/20 transition">
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>

                {/* Step Indicator */}
                <StepIndicator currentStep={v.currentStep} />

                {/* Content */}
                <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
                    {v.currentStep === 'location' && (
                        <LocationStep
                            isGeofenceEnabled={isGeofenceEnabled}
                            location={v.location}
                            officeLocation={officeLocation}
                            officeRadius={officeRadius}
                            onConfirm={v.handleLocationConfirmation}
                        />
                    )}

                    {v.currentStep === 'camera-ready' && (
                        <CameraStep
                            videoRef={v.videoRef}
                            canvasRef={v.canvasRef}
                            modelsLoaded={v.modelsLoaded}
                            faceDetected={v.faceDetected}
                            onCapture={v.handleCapture}
                        />
                    )}

                    {v.currentStep === 'capturing' && <CapturingStep />}

                    {v.currentStep === 'processing' && (
                        <ProcessingStep livenessStatus={v.livenessStatus} livenessConfidence={v.livenessConfidence} />
                    )}

                    {v.currentStep === 'success' && (
                        <SuccessStep successMessage={v.successMessage} verificationResult={v.verificationResult} onClose={onClose} />
                    )}

                    {v.currentStep === 'error' && (
                        <ErrorStep
                            error={v.error}
                            locationError={v.locationError}
                            locationPermissionDenied={v.locationPermissionDenied}
                            onClose={onClose}
                            onRetry={v.resetState}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default AttendanceVerificationFlow;
