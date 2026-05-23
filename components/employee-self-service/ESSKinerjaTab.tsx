import React from 'react';
import { LeaveRequest, RequestStatus } from '../../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface ESSKinerjaTabProps {
    overallKinerja: { total: number; lateCount: number; totalOvertime: number; punctualityScore: number; avgOvertimePerDay: number; grade: { label: string; color: string; bg: string } };
    kinerjaTrendData: { label: string; hadir: number; terlambat: number; lembur: number }[];
    monthlyKinerjaSummary: { bulan: string; hadir: number; terlambat: number; lembur: number; skor: number }[];
    leaveRequests: LeaveRequest[];
    sisaCuti?: number;
}

const ESSKinerjaTab: React.FC<ESSKinerjaTabProps> = ({
    overallKinerja,
    kinerjaTrendData,
    monthlyKinerjaSummary,
    leaveRequests,
    sisaCuti = 12
}) => {
    return (
        <div className="p-4 sm:p-6 space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-xl font-bold text-[#06736a]">📊 Evaluasi Kinerja Mandiri</h2>
                <p className="text-sm text-gray-500 mt-1">Pantau performa kehadiran dan produktivitas Anda secara mandiri berdasarkan data absensi.</p>
            </div>

            {/* Skor Kinerja Utama */}
            <div className={`rounded-2xl border-2 p-5 flex flex-col sm:flex-row sm:items-center gap-4 ${overallKinerja.grade.bg}`}>
                <div className="flex-1">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Skor Ketepatan Kehadiran</p>
                    <p className={`text-5xl font-black mt-1 ${overallKinerja.grade.color}`}>{overallKinerja.punctualityScore}<span className="text-2xl">%</span></p>
                    <p className={`text-sm font-bold mt-1 ${overallKinerja.grade.color}`}>Grade: {overallKinerja.grade.label}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:min-w-[280px]">
                    <div className="bg-white/70 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-gray-800">{overallKinerja.total}</p>
                        <p className="text-xs text-gray-500 mt-1">Total Hadir</p>
                    </div>
                    <div className="bg-white/70 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-red-600">{overallKinerja.lateCount}</p>
                        <p className="text-xs text-gray-500 mt-1">Kali Terlambat</p>
                    </div>
                    <div className="bg-white/70 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-blue-600">{overallKinerja.totalOvertime}<span className="text-sm">j</span></p>
                        <p className="text-xs text-gray-500 mt-1">Total Lembur</p>
                    </div>
                    <div className="bg-white/70 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-purple-600">{overallKinerja.avgOvertimePerDay}<span className="text-sm">j</span></p>
                        <p className="text-xs text-gray-500 mt-1">Rata-rata Lembur/Hari</p>
                    </div>
                </div>
            </div>

            {/* Grafik Tren Mingguan */}
            {kinerjaTrendData.length > 1 ? (
                <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4 sm:p-5">
                    <h3 className="text-base font-bold text-gray-700 mb-4">📈 Tren Kehadiran Mingguan (90 Hari Terakhir)</h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={kinerjaTrendData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Line type="monotone" dataKey="hadir" name="Hari Hadir" stroke="#06736a" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="terlambat" name="Terlambat" stroke="#ef4444" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="lembur" name="Lembur (Jam)" stroke="#3b82f6" strokeWidth={2} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="rounded-2xl bg-gray-50 border border-dashed border-gray-300 p-8 text-center text-gray-400">
                    <p className="text-2xl mb-2">📭</p>
                    <p className="text-sm">Data absensi belum cukup untuk menampilkan grafik tren.</p>
                </div>
            )}

            {/* Tabel Perbandingan Bulanan */}
            {monthlyKinerjaSummary.length > 0 && (
                <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4 sm:p-5">
                    <h3 className="text-base font-bold text-gray-700 mb-4">📅 Perbandingan Kinerja per Bulan</h3>
                    <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={monthlyKinerjaSummary} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="bulan" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                            <Tooltip />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Bar dataKey="skor" name="Skor Ketepatan (%)" fill="#06736a" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="terlambat" name="Kali Terlambat" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-4 overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead>
                                <tr className="text-xs font-semibold text-gray-500 uppercase border-b">
                                    <th className="py-2 pr-4">Bulan</th>
                                    <th className="py-2 pr-4 text-center">Hadir</th>
                                    <th className="py-2 pr-4 text-center">Terlambat</th>
                                    <th className="py-2 pr-4 text-center">Lembur (j)</th>
                                    <th className="py-2 text-center">Skor</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {monthlyKinerjaSummary.map((m, i) => (
                                    <tr key={i} className="hover:bg-white transition-colors">
                                        <td className="py-2 pr-4 font-medium">{m.bulan}</td>
                                        <td className="py-2 pr-4 text-center">{m.hadir}</td>
                                        <td className={`py-2 pr-4 text-center font-semibold ${m.terlambat > 0 ? 'text-red-600' : 'text-green-600'}`}>{m.terlambat}</td>
                                        <td className="py-2 pr-4 text-center text-blue-600">{m.lembur}</td>
                                        <td className="py-2 text-center">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                                m.skor >= 90 ? 'bg-green-100 text-green-700'
                                                : m.skor >= 75 ? 'bg-blue-100 text-blue-700'
                                                : m.skor >= 60 ? 'bg-yellow-100 text-yellow-700'
                                                : 'bg-red-100 text-red-700'
                                            }`}>{m.skor}%</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Status Cuti */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-[#e6f3f2] border border-[#b2dbd7] p-4 text-center">
                    <p className="text-3xl font-black text-[#06736a]">{sisaCuti}</p>
                    <p className="text-sm text-gray-600 mt-1">Sisa Cuti Tahunan</p>
                </div>
                <div className="rounded-2xl bg-yellow-50 border border-yellow-200 p-4 text-center">
                    <p className="text-3xl font-black text-yellow-600">
                        {leaveRequests.filter(r => r.status === RequestStatus.Pending).length}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">Pengajuan Cuti Pending</p>
                </div>
                <div className="rounded-2xl bg-green-50 border border-green-200 p-4 text-center">
                    <p className="text-3xl font-black text-green-600">
                        {leaveRequests.filter(r => r.status === RequestStatus.Approved).length}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">Cuti Disetujui</p>
                </div>
            </div>

            {/* Tips Peningkatan Kinerja */}
            {overallKinerja.punctualityScore < 90 && (
                <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
                    <h4 className="font-bold text-amber-800 mb-2">💡 Catatan untuk Peningkatan</h4>
                    <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
                        {overallKinerja.lateCount > 3 && <li>Anda tercatat terlambat {overallKinerja.lateCount} kali — usahakan tiba sebelum jam shift dimulai.</li>}
                        {overallKinerja.punctualityScore < 75 && <li>Skor ketepatan di bawah 75% — konsultasikan dengan HRD jika ada kendala transportasi atau jadwal.</li>}
                        {overallKinerja.avgOvertimePerDay > 2 && <li>Rata-rata lembur {overallKinerja.avgOvertimePerDay} jam/hari — pastikan keseimbangan kerja terjaga.</li>}
                    </ul>
                </div>
            )}
            {overallKinerja.punctualityScore >= 90 && (
                <div className="rounded-2xl bg-green-50 border border-green-200 p-4">
                    <h4 className="font-bold text-green-800 mb-1">🏆 Performa Sangat Baik!</h4>
                    <p className="text-sm text-green-700">Skor ketepatan Anda {overallKinerja.punctualityScore}% — pertahankan kedisiplinan ini. Kinerja Anda sudah sesuai standar rumah sakit.</p>
                </div>
            )}
        </div>
    );
};

export default ESSKinerjaTab;
