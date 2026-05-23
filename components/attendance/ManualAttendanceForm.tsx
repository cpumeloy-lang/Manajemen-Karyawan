import React, { useState } from 'react';
import { Employee, AttendanceRecord, AttendanceReasonCode } from '../../types';
import { ClockIcon } from '../icons';

export const ATTENDANCE_REASON_CODE_OPTIONS: Array<{ code: AttendanceReasonCode; label: string }> = [
    { code: 'FORGOT_CHECK_IN', label: 'Lupa Check-in' },
    { code: 'FORGOT_CHECK_OUT', label: 'Lupa Check-out' },
    { code: 'DEVICE_FAILURE', label: 'Gangguan Perangkat' },
    { code: 'NETWORK_FAILURE', label: 'Gangguan Jaringan' },
    { code: 'SHIFT_ADJUSTMENT', label: 'Penyesuaian Shift' },
    { code: 'EMERGENCY_OVERRIDE', label: 'Emergency Override' },
    { code: 'BULK_IMPORT_FIX', label: 'Perbaikan Bulk Import' },
];

interface ManualAttendanceFormProps {
    employees: Employee[];
    canManageAttendance: boolean;
    onSave: (record: Omit<AttendanceRecord, 'id'>) => Promise<boolean> | boolean;
    loadPendingRequests: () => Promise<void>;
    calculateAttendanceDetails: (employeeId: string, clockIn: string, clockOut: string, recordDate?: string) => { isLate: boolean; overtimeHours: number };
    isGeofenceConfigured: boolean;
    officeLat: number;
    officeLng: number;
    officeRadiusMeters: number;
}

const ManualAttendanceForm: React.FC<ManualAttendanceFormProps> = ({
    employees,
    canManageAttendance,
    onSave,
    loadPendingRequests,
    calculateAttendanceDetails,
    isGeofenceConfigured,
    officeLat,
    officeLng,
    officeRadiusMeters
}) => {
    const today = new Date().toISOString().split('T')[0];
    const [showManualForm, setShowManualForm] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    
    const [newRecord, setNewRecord] = useState({
        employeeId: '',
        tanggal: today,
        clockIn: '',
        clockOut: '',
        location: 'RS Utama (Manual)',
        notes: '',
        source: 'web-admin' as const,
        reasonCode: '' as AttendanceReasonCode | '',
        reasonDetail: '',
        latitude: '',
        longitude: '',
        locationDistanceMeters: '',
        locationVerified: false,
    });

    const calculateDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const toRad = (value: number) => (value * Math.PI) / 180;
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return 6371000 * c;
    };

    const handleCaptureCurrentLocation = async () => {
        if (!navigator.geolocation) {
            alert('Browser tidak mendukung geolocation.');
            return;
        }

        setIsLocating(true);
        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 12000,
                    maximumAge: 0,
                });
            });

            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            let verified = true;
            let distance = '';

            if (isGeofenceConfigured) {
                const meters = calculateDistanceMeters(lat, lng, officeLat, officeLng);
                distance = String(Math.round(meters));
                verified = meters <= officeRadiusMeters;
            }

            setNewRecord((prev) => ({
                ...prev,
                latitude: String(lat),
                longitude: String(lng),
                locationDistanceMeters: distance,
                locationVerified: verified,
            }));
        } catch {
            alert('Gagal mengambil lokasi saat ini. Aktifkan izin lokasi lalu coba lagi.');
        } finally {
            setIsLocating(false);
        }
    };

    const handleSaveRecord = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canManageAttendance) {
            alert('Akses ditolak. Anda tidak memiliki izin input absensi operasional.');
            return;
        }

        if (!newRecord.employeeId || !newRecord.clockIn || !newRecord.clockOut) {
            alert("Harap lengkapi semua field.");
            return;
        }

        if (!newRecord.reasonCode) {
            alert('Reason code wajib dipilih untuk perubahan absensi manual.');
            return;
        }

        if (!newRecord.latitude || !newRecord.longitude) {
            alert('Koordinat GPS wajib diisi untuk verifikasi lokasi maker.');
            return;
        }
        
        const { isLate, overtimeHours } = calculateAttendanceDetails(newRecord.employeeId, newRecord.clockIn, newRecord.clockOut, newRecord.tanggal);

        setIsSaving(true);
        try {
            const saved = await onSave({
                ...newRecord,
                isLate,
                overtimeHours,
                latitude: Number(newRecord.latitude),
                longitude: Number(newRecord.longitude),
                reasonCode: newRecord.reasonCode,
                reasonDetail: newRecord.reasonDetail,
                locationDistanceMeters: newRecord.locationDistanceMeters ? Number(newRecord.locationDistanceMeters) : null,
                locationVerified: newRecord.locationVerified,
            } as any);
            if (!saved) return;

            setNewRecord({
                employeeId: '',
                tanggal: today,
                clockIn: '',
                clockOut: '',
                location: 'RS Utama (Manual)',
                notes: '',
                source: 'web-admin',
                reasonCode: '',
                reasonDetail: '',
                latitude: '',
                longitude: '',
                locationDistanceMeters: '',
                locationVerified: false,
            });

            void loadPendingRequests();
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <section className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between gap-1.5">
                <h3 className="text-sm font-bold text-primary flex items-center gap-1.5"><ClockIcon className="w-4 h-4" />Input Manual</h3>
                <button
                    type="button"
                    onClick={() => setShowManualForm(prev => !prev)}
                    className="rounded-lg border border-[#06736a]/30 px-3 py-1.5 text-xs font-semibold text-[#06736a] hover:bg-[#e6f3f2]"
                >
                    {showManualForm ? 'Sembunyikan' : 'Tampilkan'}
                </button>
            </div>
            {!canManageAttendance && (
                <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    Mode baca saja: akun Anda tidak memiliki izin untuk membuat atau memperbarui catatan absensi operasional.
                </div>
            )}
            {showManualForm ? (
                <form onSubmit={handleSaveRecord} className="grid grid-cols-1 gap-2">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Karyawan</label>
                        <select
                            value={newRecord.employeeId}
                            onChange={e => setNewRecord({ ...newRecord, employeeId: e.target.value })}
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#06736a] focus:ring-2 focus:ring-[#06736a]/20"
                            disabled={!canManageAttendance || isSaving}
                            required
                            title="Pilih karyawan"
                        >
                            <option value="">Pilih Karyawan</option>
                            {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.nama}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Tanggal</label>
                            <input type="date" value={newRecord.tanggal} onChange={e => setNewRecord({ ...newRecord, tanggal: e.target.value })} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#06736a] focus:ring-2 focus:ring-[#06736a]/20" required title="Tanggal kehadiran" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Lokasi</label>
                            <input type="text" value={newRecord.location} onChange={e => setNewRecord({ ...newRecord, location: e.target.value })} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#06736a] focus:ring-2 focus:ring-[#06736a]/20" placeholder="RS Utama / GPS kantor" title="Lokasi kehadiran" disabled={!canManageAttendance || isSaving} />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Reason Code *</label>
                            <select
                                value={newRecord.reasonCode}
                                onChange={e => setNewRecord({ ...newRecord, reasonCode: e.target.value as AttendanceReasonCode })}
                                className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#06736a] focus:ring-2 focus:ring-[#06736a]/20"
                                disabled={!canManageAttendance || isSaving}
                                required
                                title="Reason code perubahan absensi"
                            >
                                <option value="">Pilih Reason Code</option>
                                {ATTENDANCE_REASON_CODE_OPTIONS.map(option => (
                                    <option key={option.code} value={option.code}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Detail Alasan</label>
                            <input
                                type="text"
                                value={newRecord.reasonDetail}
                                onChange={e => setNewRecord({ ...newRecord, reasonDetail: e.target.value })}
                                className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#06736a] focus:ring-2 focus:ring-[#06736a]/20"
                                placeholder="Contoh: perangkat fingerprint error shift pagi"
                                disabled={!canManageAttendance || isSaving}
                                title="Detail alasan perubahan"
                            />
                        </div>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-2.5">
                        <div className="mb-2 flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Verifikasi Lokasi Maker</p>
                            <button
                                type="button"
                                onClick={handleCaptureCurrentLocation}
                                disabled={!canManageAttendance || isSaving || isLocating}
                                className="rounded-lg border border-[#06736a]/30 px-2.5 py-1 text-xs font-semibold text-[#06736a] hover:bg-[#e6f3f2] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isLocating ? 'Mengambil GPS...' : 'Ambil GPS Saat Ini'}
                            </button>
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Latitude *</label>
                                <input
                                    type="number"
                                    step="any"
                                    value={newRecord.latitude}
                                    onChange={e => setNewRecord({ ...newRecord, latitude: e.target.value })}
                                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#06736a] focus:ring-2 focus:ring-[#06736a]/20"
                                    disabled={!canManageAttendance || isSaving}
                                    required
                                    placeholder="Contoh: -6.200000"
                                    title="Koordinat latitude maker"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Longitude *</label>
                                <input
                                    type="number"
                                    step="any"
                                    value={newRecord.longitude}
                                    onChange={e => setNewRecord({ ...newRecord, longitude: e.target.value })}
                                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#06736a] focus:ring-2 focus:ring-[#06736a]/20"
                                    disabled={!canManageAttendance || isSaving}
                                    required
                                    placeholder="Contoh: 106.816666"
                                    title="Koordinat longitude maker"
                                />
                            </div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                            <span className="rounded-full bg-white px-2 py-1 text-gray-600 border border-gray-200">
                                Jarak ke kantor: {newRecord.locationDistanceMeters ? `${newRecord.locationDistanceMeters} m` : '-'}
                            </span>
                            <span className={`rounded-full px-2 py-1 border ${newRecord.locationVerified ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                                {newRecord.locationVerified ? 'Lokasi terverifikasi' : 'Lokasi belum terverifikasi'}
                            </span>
                            {isGeofenceConfigured && (
                                <span className="rounded-full bg-white px-2 py-1 text-gray-600 border border-gray-200">
                                    Radius geofence: {officeRadiusMeters} m
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Jam Masuk</label>
                            <input type="time" value={newRecord.clockIn} onChange={e => setNewRecord({ ...newRecord, clockIn: e.target.value })} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#06736a] focus:ring-2 focus:ring-[#06736a]/20" required title="Jam masuk" disabled={!canManageAttendance || isSaving} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Jam Pulang</label>
                            <input type="time" value={newRecord.clockOut} onChange={e => setNewRecord({ ...newRecord, clockOut: e.target.value })} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#06736a] focus:ring-2 focus:ring-[#06736a]/20" required title="Jam pulang" disabled={!canManageAttendance || isSaving} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Catatan / Alasan</label>
                        <textarea
                            value={newRecord.notes}
                            onChange={e => setNewRecord({ ...newRecord, notes: e.target.value })}
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#06736a] focus:ring-2 focus:ring-[#06736a]/20"
                            rows={3}
                            placeholder="Masukkan keterangan untuk audit kehadiran manual"
                            title="Catatan atau alasan manual"
                            disabled={!canManageAttendance || isSaving}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={!canManageAttendance || isSaving}
                        className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSaving ? 'Mengirim request...' : 'Kirim Request Perubahan'}
                    </button>
                </form>
            ) : (
                <p className="text-sm text-gray-500">Panel input manual disembunyikan.</p>
            )}
        </section>
    );
};

export default ManualAttendanceForm;
