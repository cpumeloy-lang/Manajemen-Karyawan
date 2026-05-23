import React from 'react';
import { AuditLogFilter, AuditLog, getLogPortalType } from '../../hooks/useAuditLogs.ts';

const ENTITY_TYPE_LABELS: Record<string, string> = {
    employees: 'Karyawan',
    attendance: 'Absensi',
    requests: 'Pengajuan',
    units: 'Unit Kerja',
    departments: 'Departemen',
    positions: 'Jabatan',
    payroll: 'Payroll'
};

export const getEntityTypeLabel = (type: string) => ENTITY_TYPE_LABELS[type] || type;

interface AuditLogFiltersProps {
    filter: AuditLogFilter;
    setFilter: (filter: AuditLogFilter) => void;
    logs: AuditLog[];
}

const AuditLogFilters: React.FC<AuditLogFiltersProps> = ({ filter, setFilter, logs }) => {
    const uniqueUsers = [...new Set(logs.map(log => log.user_email))];
    const uniqueEntityTypes = [...new Set(logs.map(log => log.entity_type))];
    const uniquePortalTypes = [...new Set(logs.map(log => getLogPortalType(log)))];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            <div>
                <label htmlFor="audit-filter-action" className="block text-xs font-medium text-gray-700 mb-1">Aksi</label>
                <select
                    id="audit-filter-action"
                    title="Filter aksi audit log"
                    value={filter.action}
                    onChange={(e) => setFilter({ ...filter, action: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#06736a] focus:border-transparent"
                >
                    <option value="ALL">Semua Aksi</option>
                    <option value="CREATE">Create (Tambah)</option>
                    <option value="UPDATE">Update (Ubah)</option>
                    <option value="DELETE">Delete (Hapus)</option>
                </select>
            </div>

            <div>
                <label htmlFor="audit-filter-entity-type" className="block text-xs font-medium text-gray-700 mb-1">Tipe Data</label>
                <select
                    id="audit-filter-entity-type"
                    title="Filter tipe data audit log"
                    value={filter.entity_type}
                    onChange={(e) => setFilter({ ...filter, entity_type: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#06736a] focus:border-transparent"
                >
                    <option value="ALL">Semua Tipe</option>
                    {uniqueEntityTypes.map(type => (
                        <option key={type as string} value={type as string}>{getEntityTypeLabel(type as string)}</option>
                    ))}
                </select>
            </div>

            <div>
                <label htmlFor="audit-filter-user-email" className="block text-xs font-medium text-gray-700 mb-1">User</label>
                <select
                    id="audit-filter-user-email"
                    title="Filter user audit log"
                    value={filter.user_email}
                    onChange={(e) => setFilter({ ...filter, user_email: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#06736a] focus:border-transparent"
                >
                    <option value="ALL">Semua User</option>
                    {uniqueUsers.map(email => (
                        <option key={email} value={email}>{email}</option>
                    ))}
                </select>
            </div>

            <div>
                <label htmlFor="audit-filter-portal-type" className="block text-xs font-medium text-gray-700 mb-1">Portal</label>
                <select
                    id="audit-filter-portal-type"
                    title="Filter portal audit log"
                    value={filter.portal_type}
                    onChange={(e) => setFilter({ ...filter, portal_type: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#06736a] focus:border-transparent"
                >
                    <option value="ALL">Semua Portal</option>
                    {uniquePortalTypes.map(portal => (
                        <option key={portal as string} value={portal as string}>{String(portal).toUpperCase()}</option>
                    ))}
                </select>
            </div>

            <div>
                <label htmlFor="audit-filter-date-from" className="block text-xs font-medium text-gray-700 mb-1">Dari Tanggal</label>
                <input
                    id="audit-filter-date-from"
                    title="Filter tanggal mulai"
                    type="date"
                    value={filter.date_from}
                    onChange={(e) => setFilter({ ...filter, date_from: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#06736a] focus:border-transparent"
                />
            </div>

            <div>
                <label htmlFor="audit-filter-date-to" className="block text-xs font-medium text-gray-700 mb-1">Sampai Tanggal</label>
                <input
                    id="audit-filter-date-to"
                    title="Filter tanggal akhir"
                    type="date"
                    value={filter.date_to}
                    onChange={(e) => setFilter({ ...filter, date_to: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#06736a] focus:border-transparent"
                />
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Cari</label>
                <input
                    type="text"
                    value={filter.search}
                    onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                    placeholder="Cari deskripsi atau nama..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#06736a] focus:border-transparent"
                />
            </div>
        </div>
    );
};

export default AuditLogFilters;
