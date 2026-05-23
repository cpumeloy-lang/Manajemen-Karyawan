import React from 'react';
import { AllRequest, RequestStatus } from '../../types.ts';

const getRequestEmployeeId = (req: any): string => String(req.employeeId || req.employee_id || '-');

interface LateEmployeesTableProps {
    frequentLateEmployees: Array<{ name: string; lateCount: number; overtimeHours: number }>;
}

export const LateEmployeesTable: React.FC<LateEmployeesTableProps> = ({ frequentLateEmployees }) => (
    <div className="bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-xl font-bold text-[#06736a] mb-4">Karyawan dengan Keterlambatan Tertinggi</h2>
        {frequentLateEmployees.length === 0 ? (
            <p className="text-sm text-gray-500">Tidak ada catatan keterlambatan pada periode yang dipilih.</p>
        ) : (
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Karyawan</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jumlah Terlambat</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Akumulasi Lembur</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                        {frequentLateEmployees.map((item) => (
                            <tr key={item.name}>
                                <td className="px-4 py-3 text-sm font-medium text-gray-800">{item.name}</td>
                                <td className="px-4 py-3 text-sm text-amber-700 font-semibold">{item.lateCount} kali</td>
                                <td className="px-4 py-3 text-sm text-sky-700">{item.overtimeHours} jam</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
    </div>
);

interface RecentRequestsListProps {
    recentRequests: AllRequest[];
}

export const RecentRequestsList: React.FC<RecentRequestsListProps> = ({ recentRequests }) => (
    <div className="bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-xl font-bold text-[#06736a] mb-4">Permohonan Terbaru</h2>
        {recentRequests.length === 0 ? (
            <p className="text-sm text-gray-500">Belum ada data permohonan.</p>
        ) : (
            <div className="space-y-3">
                {recentRequests.map((req: any) => (
                    <div key={req.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3 last:border-none last:pb-0">
                        <div>
                            <p className="text-sm font-semibold text-gray-800">{req.type}</p>
                            <p className="text-xs text-gray-500">ID Karyawan: {getRequestEmployeeId(req)}</p>
                        </div>
                        <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                req.status === RequestStatus.Pending
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : req.status === RequestStatus.Approved
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-red-100 text-red-800'
                            }`}
                        >
                            {req.status}
                        </span>
                    </div>
                ))}
            </div>
        )}
    </div>
);
