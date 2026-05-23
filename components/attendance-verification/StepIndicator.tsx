import React from 'react';
import { VerificationStep } from '../../hooks/useAttendanceVerification.ts';

const STEPS: VerificationStep[] = ['location', 'camera-ready', 'capturing', 'processing', 'success'];

interface StepIndicatorProps {
    currentStep: VerificationStep;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep }) => (
    <div className="flex gap-1 bg-gray-100 px-4 py-3">
        {STEPS.map((step) => (
            <div
                key={step}
                className={`h-1.5 flex-1 rounded-full transition ${
                    STEPS.indexOf(step) <= STEPS.indexOf(currentStep as any)
                        ? 'bg-[#06736a]'
                        : 'bg-gray-300'
                }`}
            />
        ))}
    </div>
);

export default StepIndicator;
