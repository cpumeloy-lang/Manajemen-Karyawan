import React from 'react';

interface AttendanceStats {
    totalEmployees: number;
    presentToday: number;
    absentToday: number;
    onLeave: number;
}

interface UnitStatusAlertsProps {
    attendanceStats: AttendanceStats;
}

const UnitStatusAlerts: React.FC<UnitStatusAlertsProps> = ({ attendanceStats }) => {
    return (
        <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-bold text-[#06736a] mb-4">🚨 Status Unit Hari Ini</h2>
            <div className="space-y-3">
                {attendanceStats.presentToday < attendanceStats.totalEmployees * 0.8 && (
                    <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded">
                        <p className="text-sm text-red-700 font-medium">⚠️ Tingkat kehadiran rendah hari ini</p>
                        <p className="text-xs text-red-600 mt-1">
                            {attendanceStats.presentToday} dari {attendanceStats.totalEmployees} karyawan hadir
                        </p>
                    </div>
                )}
                {attendanceStats.absentToday > 0 && (
                    <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                        <p className="text-sm text-yellow-700 font-medium">📝 {attendanceStats.absentToday} karyawan tidak hadir</p>
                        <p className="text-xs text-yellow-600 mt-1">Periksa alasan ketidakhadiran</p>
                    </div>
                )}
                {attendanceStats.presentToday === attendanceStats.totalEmployees && (
                    <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded">
                        <p className="text-sm text-green-700 font-medium">✅ Semua karyawan hadir hari ini</p>
                        <p className="text-xs text-green-600 mt-1">Unit beroperasi dengan kapasitas penuh</p>
                    </div>
                )}
                {attendanceStats.presentToday === 0 && (
                    <div className="p-4 bg-gray-50 border-l-4 border-gray-500 rounded">
                        <p className="text-sm text-gray-700 font-medium">📊 Belum ada data kehadiran hari ini</p>
                        <p className="text-xs text-gray-600 mt-1">Data akan muncul setelah karyawan melakukan absensi</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UnitStatusAlerts;
