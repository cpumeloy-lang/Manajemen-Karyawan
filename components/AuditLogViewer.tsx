import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

const AUDIT_LOG_UNAVAILABLE_CACHE_KEY = 'hrms.audit_logs_unavailable';

const getCachedAuditLogUnavailable = (): boolean => {
    try {
        return localStorage.getItem(AUDIT_LOG_UNAVAILABLE_CACHE_KEY) === '1';
    } catch {
        return false;
    }
};

const setCachedAuditLogUnavailable = (isUnavailable: boolean): void => {
    try {
        if (isUnavailable) {
            localStorage.setItem(AUDIT_LOG_UNAVAILABLE_CACHE_KEY, '1');
        } else {
            localStorage.removeItem(AUDIT_LOG_UNAVAILABLE_CACHE_KEY);
        }
    } catch {
        // Ignore storage access errors.
    }
};

interface AuditLog {
    id: string;
    user_id: string;
    user_email: string;
    user_name: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE';
    entity_type: string;
    entity_id: string | null;
    entity_name: string | null;
    old_data: any;
    new_data: any;
    changes: any;
    description: string;
    ip_address: string | null;
    user_agent: string | null;
    created_at: string;
}

interface AuditLogViewerProps {
    onClose?: () => void;
    isInline?: boolean;
}

const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ onClose, isInline = false }) => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [auditLogUnavailable, setAuditLogUnavailable] = useState(getCachedAuditLogUnavailable);
    const [auditLogUnavailableMessage, setAuditLogUnavailableMessage] = useState(
        getCachedAuditLogUnavailable()
            ? 'Tabel audit_logs belum tersedia. Jalankan script setup audit log terlebih dahulu.'
            : ''
    );
    const [filter, setFilter] = useState({
        action: 'ALL',
        entity_type: 'ALL',
        user_email: 'ALL',
        date_from: '',
        date_to: '',
        search: ''
    });
    const [expandedLog, setExpandedLog] = useState<string | null>(null);

    useEffect(() => {
        fetchAuditLogs();
    }, [filter, auditLogUnavailable]);

    const fetchAuditLogs = async () => {
        if (auditLogUnavailable) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            let query = supabase
                .from('audit_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(500);

            // Apply filters
            if (filter.action !== 'ALL') {
                query = query.eq('action', filter.action);
            }
            if (filter.entity_type !== 'ALL') {
                query = query.eq('entity_type', filter.entity_type);
            }
            if (filter.user_email !== 'ALL') {
                query = query.eq('user_email', filter.user_email);
            }
            if (filter.date_from) {
                query = query.gte('created_at', filter.date_from);
            }
            if (filter.date_to) {
                query = query.lte('created_at', filter.date_to);
            }
            if (filter.search) {
                query = query.or(`description.ilike.%${filter.search}%,entity_name.ilike.%${filter.search}%`);
            }

            const { data, error } = await query;

            if (error) throw error;
            setLogs(data || []);
        } catch (error: any) {
            // Supabase/PostgREST code for relation/table not found
            if (error?.code === 'PGRST205' || error?.message?.includes('audit_logs')) {
                setAuditLogUnavailable(true);
                setCachedAuditLogUnavailable(true);
                setAuditLogUnavailableMessage('Tabel audit_logs belum tersedia. Jalankan script setup audit log terlebih dahulu.');
                setLogs([]);
                return;
            }

            console.error('Error fetching audit logs:', error);
            setAuditLogUnavailableMessage(`Gagal memuat audit log: ${error?.message || 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleRetryAfterSetup = () => {
        setCachedAuditLogUnavailable(false);
        setAuditLogUnavailable(false);
        setAuditLogUnavailableMessage('');
        fetchAuditLogs();
    };

    const getActionBadge = (action: string) => {
        const colors = {
            CREATE: 'bg-green-100 text-green-800',
            UPDATE: 'bg-blue-100 text-blue-800',
            DELETE: 'bg-red-100 text-red-800'
        };
        return colors[action as keyof typeof colors] || 'bg-gray-100 text-gray-800';
    };

    const getActionIcon = (action: string) => {
        const icons = {
            CREATE: '➕',
            UPDATE: '✏️',
            DELETE: '🗑️'
        };
        return icons[action as keyof typeof icons] || '📝';
    };

    const getEntityTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            employees: 'Karyawan',
            attendance: 'Absensi',
            requests: 'Pengajuan',
            units: 'Unit Kerja',
            departments: 'Departemen',
            positions: 'Jabatan',
            payroll: 'Payroll'
        };
        return labels[type] || type;
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
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

    const uniqueUsers = [...new Set(logs.map(log => log.user_email))];
    const uniqueEntityTypes = [...new Set(logs.map(log => log.entity_type))];

    return (
        <div className={isInline ? 'w-full' : 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'}>
            <div className={isInline ? 'bg-white rounded-xl shadow-sm border border-gray-200 w-full flex flex-col' : 'bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col'}>
                {/* Header */}
                <div className="p-6 border-b border-gray-200">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                                📋 Audit Log / History Aktivitas
                            </h2>
                            <p className="text-sm text-gray-600 mt-1">
                                Catatan semua perubahan yang dilakukan oleh admin
                            </p>
                        </div>
                        {!isInline && onClose && (
                            <button
                                onClick={onClose}
                                title="Tutup audit log"
                                aria-label="Tutup audit log"
                                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                            >
                                ×
                            </button>
                        )}
                    </div>

                    {/* Filters */}
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
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6">
                    {auditLogUnavailable && (
                        <div className="mb-4 bg-yellow-50 border border-yellow-300 text-yellow-800 px-4 py-3 rounded-lg flex items-center justify-between gap-3">
                            <span>{auditLogUnavailableMessage}</span>
                            <button
                                onClick={handleRetryAfterSetup}
                                className="px-3 py-1.5 text-xs font-semibold rounded-md bg-yellow-100 hover:bg-yellow-200 text-yellow-900"
                            >
                                Coba Lagi
                            </button>
                        </div>
                    )}

                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#06736a] mx-auto"></div>
                            <p className="text-gray-600 mt-4">Memuat audit log...</p>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-600">Tidak ada audit log yang ditemukan</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {logs.map((log) => (
                                <div
                                    key={log.id}
                                    className="border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                                >
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
                                                    </div>
                                                    <p className="text-sm font-medium text-gray-800 mb-1">
                                                        {log.description}
                                                    </p>
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
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                    <div className="flex justify-between items-center">
                        <p className="text-sm text-gray-600">
                            Total: <span className="font-semibold">{logs.length}</span> aktivitas
                        </p>
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                        >
                            Tutup
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuditLogViewer;
