import React, { RefObject } from 'react';
import { HikvisionSyncResult } from '../../services/hikvisionService';

interface HikvisionSyncLogProps {
    lastSync: HikvisionSyncResult | null;
    syncLog: HikvisionSyncResult[];
    onClearLog: () => void;
    logRef: RefObject<HTMLDivElement>;
}

const HikvisionSyncLog: React.FC<HikvisionSyncLogProps> = ({ lastSync, syncLog, onClearLog, logRef }) => {
    return (
        <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-700">📊 Status Sinkronisasi</h4>

            {/* Last sync summary */}
            {lastSync ? (
                <div className={`rounded-xl p-4 border ${lastSync.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-700">{lastSync.success ? '✅ Sync Berhasil' : '❌ Sync Gagal'}</span>
                        <span className="text-xs text-gray-400">{new Date(lastSync.lastSyncTime).toLocaleString('id-ID')}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-white rounded-lg p-2 text-center border border-green-100">
                            <p className="text-xl font-bold text-green-600">{lastSync.synced}</p>
                            <p className="text-gray-500">Data Disinkron</p>
                        </div>
                        <div className="bg-white rounded-lg p-2 text-center border border-red-100">
                            <p className="text-xl font-bold text-red-500">{lastSync.failed}</p>
                            <p className="text-gray-500">Gagal</p>
                        </div>
                    </div>
                    {lastSync.errors.length > 0 && (
                        <div className="mt-2 text-xs text-red-600 bg-red-100 rounded-lg px-2 py-1 space-y-0.5">
                            {lastSync.errors.map((e, i) => <p key={i}>• {e}</p>)}
                        </div>
                    )}
                </div>
            ) : (
                <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-gray-400 text-sm">
                    <p className="text-2xl mb-2">📭</p>
                    <p>Belum ada data sync</p>
                    <p className="text-xs mt-1">Test koneksi lalu klik Sync Manual</p>
                </div>
            )}

            {/* Sync history log */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Riwayat Sync</p>
                    {syncLog.length > 0 && (
                        <button onClick={onClearLog} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                            Hapus Log
                        </button>
                    )}
                </div>
                <div ref={logRef} className="rounded-xl border border-gray-100 bg-gray-50 divide-y divide-gray-100 max-h-52 overflow-y-auto">
                    {syncLog.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-4">Belum ada riwayat</p>
                    ) : (
                        syncLog.map((log, i) => (
                            <div key={i} className="flex items-center justify-between px-3 py-2 text-xs">
                                <div className="flex items-center gap-2">
                                    <span>{log.success ? '✅' : '❌'}</span>
                                    <span className="text-gray-600">
                                        {log.synced} masuk {log.failed > 0 && <span className="text-red-500">· {log.failed} gagal</span>}
                                    </span>
                                </div>
                                <span className="text-gray-400 tabular-nums">
                                    {new Date(log.lastSyncTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Info box */}
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-xs text-blue-700 space-y-1">
                <p className="font-semibold text-blue-800 mb-1">ℹ️ Cara Kerja Sinkronisasi</p>
                <p>• <strong>Manual Sync:</strong> Tarik data 24 jam terakhir dari device sekarang</p>
                <p>• <strong>Auto-Sync:</strong> Tarik data 1 jam terakhir setiap N menit secara otomatis</p>
                <p>• <strong>Duplikat:</strong> Data yang sama tidak akan disimpan dua kali (upsert)</p>
                <p>• <strong>Delay:</strong> Data masuk ke HRMS Pro dengan jeda sesuai interval sync</p>
            </div>
        </div>
    );
};

export default HikvisionSyncLog;
