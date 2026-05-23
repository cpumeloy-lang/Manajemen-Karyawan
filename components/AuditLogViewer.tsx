import React from 'react';
import { useAuditLogs } from '../hooks/useAuditLogs.ts';
import AuditLogFilters from './audit-log/AuditLogFilters.tsx';
import AuditLogList from './audit-log/AuditLogList.tsx';

interface AuditLogViewerProps {
    onClose?: () => void;
    isInline?: boolean;
}

const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ onClose, isInline = false }) => {
    const { logs, loading, filter, setFilter, auditLogUnavailable, unavailableMessage, retry } = useAuditLogs();

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

                    <AuditLogFilters filter={filter} setFilter={setFilter} logs={logs} />
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6">
                    {auditLogUnavailable && (
                        <div className="mb-4 bg-yellow-50 border border-yellow-300 text-yellow-800 px-4 py-3 rounded-lg flex items-center justify-between gap-3">
                            <span>{unavailableMessage}</span>
                            <button
                                onClick={retry}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-yellow-100 hover:bg-yellow-200 text-yellow-900"
                            >
                                Coba Lagi
                            </button>
                        </div>
                    )}

                    <AuditLogList logs={logs} loading={loading} />
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
