import React, { useState, useMemo } from 'react';
import { AllRequest, Employee, RequestStatus, RequestType } from '../types.ts';
import { CheckCircleIcon, XCircleIcon } from './icons.tsx';

interface RequestManagementProps {
    allRequests: AllRequest[];
    employees: Employee[];
    onUpdateRequestStatus: (requestId: string, type: RequestType, newStatus: RequestStatus) => void;
}

const RequestManagement: React.FC<RequestManagementProps> = ({ allRequests, employees, onUpdateRequestStatus }) => {
    const [statusFilter, setStatusFilter] = useState<RequestStatus | 'Semua'>('Semua');
    const [typeFilter, setTypeFilter] = useState<RequestType | 'Semua'>('Semua');

    const employeeMap = useMemo(() => new Map(employees.map(emp => [emp.id, emp])), [employees]);

    const filteredRequests = useMemo(() => {
        return allRequests
            .filter(req => statusFilter === 'Semua' || req.status === statusFilter)
            .filter(req => typeFilter === 'Semua' || req.type === typeFilter)
            .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
    }, [allRequests, statusFilter, typeFilter]);
    
    const StatusBadge: React.FC<{ status: RequestStatus }> = ({ status }) => {
        const baseClasses = "px-2 inline-flex text-xs leading-5 font-semibold rounded-full";
        const statusClasses = {
            [RequestStatus.Pending]: "bg-yellow-100 text-yellow-800",
            [RequestStatus.Approved]: "bg-green-100 text-green-800",
            [RequestStatus.Rejected]: "bg-red-100 text-red-800",
        };
        const statusLabels = {
            [RequestStatus.Pending]: "Menunggu",
            [RequestStatus.Approved]: "Disetujui",
            [RequestStatus.Rejected]: "Ditolak",
        };
        return <span className={`${baseClasses} ${statusClasses[status]}`}>{statusLabels[status]}</span>;
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-md">
            <h3 className="text-lg font-bold text-primary mb-4">Manajemen Permohonan Karyawan</h3>
            
            <div className="flex gap-4 mb-4">
                <select 
                    value={statusFilter} 
                    onChange={e => setStatusFilter(e.target.value as RequestStatus | 'Semua')}
                    className="border-gray-300 rounded-md shadow-sm"
                >
                    <option value="Semua">Semua Status</option>
                    {Object.values(RequestStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                 <select 
                    value={typeFilter} 
                    onChange={e => setTypeFilter(e.target.value as RequestType | 'Semua')}
                    className="border-gray-300 rounded-md shadow-sm"
                >
                    <option value="Semua">Semua Tipe</option>
                    {Object.values(RequestType).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Karyawan</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipe</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Detail</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tgl Diajukan</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredRequests.map(req => {
                            const employee = employeeMap.get(req.employeeId);
                            return (
                                <tr key={req.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{employee?.nama || 'N/A'}</div>
                                        <div className="text-sm text-gray-500">{employee?.jabatan}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{req.type}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {req.type === RequestType.Cuti && (
                                            <div>
                                                <p className="font-medium">{`${new Date(req.startDate).toLocaleDateString('id-ID')} - ${new Date(req.endDate).toLocaleDateString('id-ID')}`}</p>
                                                <p className="text-xs text-gray-500 truncate max-w-xs">{req.reason}</p>
                                            </div>
                                        )}
                                        {req.type === RequestType.Reimbursement && (
                                            <div>
                                                <p className="font-medium">{`Rp ${req.amount.toLocaleString('id-ID')}`}</p>
                                                <p className="text-xs text-gray-500 truncate max-w-xs">{req.description}</p>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(req.requestedAt).toLocaleDateString('id-ID')}</td>
                                    <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={req.status} /></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        {req.status === RequestStatus.Pending && (
                                            <>
                                                <button onClick={() => onUpdateRequestStatus(req.id, req.type, RequestStatus.Approved)} className="p-2 text-green-500 hover:text-green-700 rounded-full hover:bg-green-50" title="Setujui">
                                                    <CheckCircleIcon className="h-5 w-5" />
                                                </button>
                                                <button onClick={() => onUpdateRequestStatus(req.id, req.type, RequestStatus.Rejected)} className="p-2 text-red-500 hover:text-red-700 rounded-full hover:bg-red-50 ml-2" title="Tolak">
                                                    <XCircleIcon className="h-5 w-5" />
                                                </button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {filteredRequests.length === 0 && <p className="text-center py-10 text-gray-500">Tidak ada permohonan yang cocok dengan filter.</p>}
        </div>
    );
};

export default RequestManagement;