import React from 'react';
import { calculateDistance } from '../../hooks/useAttendanceVerification.ts';

interface LocationStepProps {
    isGeofenceEnabled: boolean;
    location: { lat: number; lng: number; accuracy: number } | null;
    officeLocation: { lat: number; lng: number };
    officeRadius: number;
    onConfirm: () => void;
}

const LocationStep: React.FC<LocationStepProps> = ({ isGeofenceEnabled, location, officeLocation, officeRadius, onConfirm }) => (
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
            onClick={onConfirm}
            className="w-full bg-[#06736a] text-white py-3 rounded-lg font-semibold hover:bg-[#055b55] transition"
        >
            {isGeofenceEnabled ? 'Konfirmasi Lokasi' : 'Lanjut ke Verifikasi Wajah'}
        </button>
    </div>
);

export default LocationStep;
