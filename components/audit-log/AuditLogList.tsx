import React, { useState } from 'react';
import { AuditLog, getLogPortalType } from '../../hooks/useAuditLogs.ts';
import { getEntityTypeLabel } from './AuditLogFilters.tsx';

const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
        CREATE: 'bg-green-100 text-green-800',
        UPDATE: 'bg-blue-100 text-blue-800',
        DELETE: 'bg-red-100 text-red-800'
    };
    return colors[action] || 'bg-gray-100 text-gray-800';
};

const getActionIcon = (action: string) => {
    const icons: Record<string, string> = { CREATE: '➕', UPDATE: '✏️', DELETE: '🗑️' };
    return icons[action] || '📝';
};

const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).format(date);
};

const renderChanges = (log: AuditLog) => {
    if (!log.changes?.changed_fields) return null;
    const fields = log.changes.changed_fields;
    return (
        <div className="mt-2 p-3 bg-gray-50 rounded-lg">
            <h5 className="font-semibold text-xs text-gray-700 mb-2">Perubahan Detail:</h5>
            <div className="space-y-2">
                {Object.entries(fields).map(([field, values]: [string, any]) => (
                    <div key={field} className="text-xs">
                        <span className="font-medium text-gray-700">{field}:</span>
                        <div className="ml-4 mt-1">
                            <div className="text-red-600">
                                <span className="font-medium">Lama:</span> {JSON.stringify(values.old)}
                            </div>
                            <div className="text-green-600">
                                <span className="font-medium">Baru:</span> {JSON.stringify(values.new)}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

interface AuditLogListProps {
    logs: AuditLog[];
    loading: boolean;
}

const AuditLogList: React.FC<AuditLogListProps> = ({ logs, loading }) => {
    const [expandedLog, setExpandedLog] = useState<string | null>(null);

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#06736a] mx-auto"></div>
                <p className="text-gray-600 mt-4">Memuat audit log...</p>
            </div>
        );
    }

    if (logs.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-600">Tidak ada audit log yang ditemukan</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {logs.map((log) => (
                <div key={log.id} className="border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                    <div
                        className="p-4 cursor-pointer"
                        onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                                <span className="text-2xl">{getActionIcon(log.action)}</span>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${getActionBadge(log.action)}`}>
                                            {log.action}
                                        </span>
                                        <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-800">
                                            {getEntityTypeLabel(log.entity_type)}
                                        </span>
                                        <span className="px-2 py-1 rounded text-xs font-semibold bg-emerald-50 text-emerald-700">
                                            {getLogPortalType(log).toUpperCase()}
                                        </span>
                                    </div>
                                    <p className="text-sm font-medium text-gray-800 mb-1">{log.description}</p>
                                    <div className="flex items-center gap-4 text-xs text-gray-600">
                                        <span>👤 {log.user_name} ({log.user_email})</span>
                                        <span>🕐 {formatDate(log.created_at)}</span>
                                    </div>
                                </div>
                            </div>
                            <button className="text-gray-400 hover:text-gray-600">
                                {expandedLog === log.id ? '▲' : '▼'}
                            </button>
                        </div>

                        {expandedLog === log.id && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                                {log.action === 'UPDATE' && renderChanges(log)}
                                {log.action === 'DELETE' && log.old_data && (
                                    <div className="mt-2 p-3 bg-red-50 rounded-lg">
                                        <h5 className="font-semibold text-xs text-red-700 mb-2">Data yang Dihapus:</h5>
                                        <pre className="text-xs text-gray-700 overflow-auto">
                                            {JSON.stringify(log.old_data, null, 2)}
                                        </pre>
                                    </div>
                                )}
                                {log.action === 'CREATE' && log.new_data && (
                                    <div className="mt-2 p-3 bg-green-50 rounded-lg">
                                        <h5 className="font-semibold text-xs text-green-700 mb-2">Data yang Ditambahkan:</h5>
                                        <pre className="text-xs text-gray-700 overflow-auto">
                                            {JSON.stringify(log.new_data, null, 2)}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default AuditLogList;
