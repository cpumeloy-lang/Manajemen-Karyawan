import React, { useState, useEffect, useRef } from 'react';
import {
    testHikvisionConnection,
    runHikvisionSync,
    startHikvisionAutoSync,
    stopHikvisionAutoSync,
    getHikvisionConfig,
    type HikvisionConfig,
    type HikvisionSyncResult,
} from '../services/hikvisionService';
import { dataService } from '../services/DataService';
import { useAppDataActions } from '../stores/appStore';
import { mapAttendanceRecordToUI, sortAttendanceByDateDesc } from '../utils/dataMapping';

const STATUS_IDLE = 'idle';
const STATUS_TESTING = 'testing';
const STATUS_SYNCING = 'syncing';

const HikvisionPanel: React.FC = () => {
    const { setAttendanceRecords } = useAppDataActions();
    const [config, setConfig] = useState<HikvisionConfig>(getHikvisionConfig());
    const [connStatus, setConnStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
    const [connInfo, setConnInfo] = useState<string>('');
    const [autoSyncOn, setAutoSyncOn] = useState(false);
    const [actionStatus, setActionStatus] = useState(STATUS_IDLE);
    const [syncLog, setSyncLog] = useState<HikvisionSyncResult[]>([]);
    const [lastSync, setLastSync] = useState<HikvisionSyncResult | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [formDirty, setFormDirty] = useState(false);
    const logRef = useRef<HTMLDivElement>(null);

    // Scroll log to bottom when new entry appears
    useEffect(() => {
        if (logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [syncLog]);

    const handleConfigChange = (field: keyof HikvisionConfig, value: string | number | boolean) => {
        setConfig(prev => ({ ...prev, [field]: value }));
        setFormDirty(true);
        setConnStatus('unknown');
    };

    const handleTestConnection = async () => {
        setActionStatus(STATUS_TESTING);
        setConnStatus('unknown');
        setConnInfo('');
        try {
            const result = await testHikvisionConnection(config);
            if (result.connected) {
                setConnStatus('connected');
                const info = result.deviceInfo as Record<string, unknown>;
                const model = info?.deviceModel ?? info?.model ?? '-';
                const serial = info?.serialNumber ?? '-';
                setConnInfo(`Model: ${model} | Serial: ${serial}`);
            } else {
                setConnStatus('error');
                setConnInfo(result.error ?? 'Koneksi gagal');
            }
        } catch (e: unknown) {
            setConnStatus('error');
            setConnInfo(e instanceof Error ? e.message : 'Koneksi gagal');
        } finally {
            setActionStatus(STATUS_IDLE);
        }
    };

    const refreshAttendanceStore = async () => {
        const result = await dataService.getAttendance();
        if (result.success && result.data) {
            setAttendanceRecords(sortAttendanceByDateDesc((result.data as any[]).map(mapAttendanceRecordToUI)));
        }
    };

    const handleManualSync = async () => {
        setActionStatus(STATUS_SYNCING);
        try {
            const result = await runHikvisionSync(config, 24);
            setLastSync(result);
            setSyncLog(prev => [result, ...prev].slice(0, 20));
            if (result.success && result.synced > 0) {
                await refreshAttendanceStore();
            }
        } finally {
            setActionStatus(STATUS_IDLE);
        }
    };

    const handleAutoSyncToggle = () => {
        if (autoSyncOn) {
            stopHikvisionAutoSync();
            setAutoSyncOn(false);
        } else {
            startHikvisionAutoSync(async (result) => {
                setLastSync(result);
                setSyncLog(prev => [result, ...prev].slice(0, 20));
                if (result.success && result.synced > 0) {
                    await refreshAttendanceStore();
                }
            });
            setAutoSyncOn(true);
            setFormDirty(false);
        }
    };

    const inputClass = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06736a] bg-gray-50';
    const labelClass = 'block text-xs font-medium text-gray-600 mb-1';

    return (
        <div className="hrms-card">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#06736a]/10 flex items-center justify-center">
                        <span className="text-lg">📷</span>
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 text-base">Hikvision DS-K1T321MFX</h3>
                        <p className="text-xs text-gray-500">Integrasi mesin absensi face recognition</p>
                    </div>
                </div>
                {/* Connection badge */}
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                    connStatus === 'connected' ? 'bg-green-100 text-green-700' :
                    connStatus === 'error'     ? 'bg-red-100 text-red-600' :
                                                'bg-gray-100 text-gray-500'
                }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                        connStatus === 'connected' ? 'bg-green-500 animate-pulse' :
                        connStatus === 'error'     ? 'bg-red-500' : 'bg-gray-400'
                    }`} />
                    {connStatus === 'connected' ? 'Terhubung' : connStatus === 'error' ? 'Gagal' : 'Belum Dicek'}
                </div>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* LEFT — Config Form */}
                <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-gray-700">⚙️ Konfigurasi Device</h4>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                            <label className={labelClass}>IP Address Device</label>
                            <input
                                className={inputClass}
                                placeholder="192.168.1.100"
                                value={config.ip}
                                onChange={e => handleConfigChange('ip', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Port</label>
                            <input
                                className={inputClass}
                                placeholder="80"
                                type="number"
                                value={config.port}
                                onChange={e => handleConfigChange('port', Number(e.target.value))}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass}>Username</label>
                            <input
                                className={inputClass}
                                placeholder="admin"
                                value={config.username}
                                onChange={e => handleConfigChange('username', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Password</label>
                            <div className="relative">
                                <input
                                    className={inputClass + ' pr-8'}
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={config.password}
                                    onChange={e => handleConfigChange('password', e.target.value)}
                                />
                                <button
                                    type="button"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                                    onClick={() => setShowPassword(p => !p)}
                                >
                                    {showPassword ? '🙈' : '👁️'}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className={labelClass}>Nama Lokasi Device</label>
                        <input
                            className={inputClass}
                            placeholder="Kantor Utama"
                            value={config.deviceLocation}
                            onChange={e => handleConfigChange('deviceLocation', e.target.value)}
                        />
                        <p className="text-xs text-gray-400 mt-1">Dipakai sebagai field "Location" pada record absensi</p>
                    </div>

                    <div>
                        <label className={labelClass}>Interval Sync Otomatis (menit)</label>
                        <input
                            className={inputClass}
                            type="number"
                            min={1}
                            max={60}
                            value={config.syncIntervalMinutes}
                            onChange={e => handleConfigChange('syncIntervalMinutes', Number(e.target.value))}
                        />
                    </div>

                    {/* Device info */}
                    {connInfo && (
                        <div className={`rounded-lg px-3 py-2 text-xs ${
                            connStatus === 'connected' ? 'bg-green-50 text-green-700 border border-green-200' :
                                                         'bg-red-50 text-red-600 border border-red-200'
                        }`}>
                            {connStatus === 'connected' ? '✅ ' : '❌ '}{connInfo}
                        </div>
                    )}

                    {formDirty && (
                        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                            ⚠️ Konfigurasi berubah — test koneksi ulang sebelum aktifkan auto-sync
                        </p>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-1">
                        <button
                            onClick={handleTestConnection}
                            disabled={actionStatus !== STATUS_IDLE || !config.ip}
                            className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-xl font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {actionStatus === STATUS_TESTING ? (
                                <><span className="animate-spin">⟳</span> Testing...</>
                            ) : (
                                <>🔌 Test Koneksi</>
                            )}
                        </button>

                        <button
                            onClick={handleManualSync}
                            disabled={actionStatus !== STATUS_IDLE || connStatus !== 'connected'}
                            className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-xl font-medium bg-[#06736a] text-white hover:bg-[#055f57] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {actionStatus === STATUS_SYNCING ? (
                                <><span className="animate-spin">⟳</span> Syncing...</>
                            ) : (
                                <>🔄 Sync Manual (24 jam)</>
                            )}
                        </button>
                    </div>

                    {/* Auto-sync toggle */}
                    <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 bg-gray-50">
                        <div>
                            <p className="text-sm font-medium text-gray-700">Auto-Sync Otomatis</p>
                            <p className="text-xs text-gray-400">
                                {autoSyncOn
                                    ? `Berjalan — sync tiap ${config.syncIntervalMinutes} menit`
                                    : 'Nonaktif — data tidak otomatis masuk'}
                            </p>
                        </div>
                        <button
                            onClick={handleAutoSyncToggle}
                            disabled={!autoSyncOn && (connStatus !== 'connected' || actionStatus !== STATUS_IDLE)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                                autoSyncOn ? 'bg-[#06736a]' : 'bg-gray-300'
                            }`}
                        >
                            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${
                                autoSyncOn ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                        </button>
                    </div>
                </div>

                {/* RIGHT — Sync Log & Status */}
                <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-gray-700">📊 Status Sinkronisasi</h4>

                    {/* Last sync summary */}
                    {lastSync ? (
                        <div className={`rounded-xl p-4 border ${
                            lastSync.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                        }`}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-semibold text-gray-700">
                                    {lastSync.success ? '✅ Sync Berhasil' : '❌ Sync Gagal'}
                                </span>
                                <span className="text-xs text-gray-400">
                                    {new Date(lastSync.lastSyncTime).toLocaleString('id-ID')}
                                </span>
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
                                <button
                                    onClick={() => setSyncLog([])}
                                    className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                                >
                                    Hapus Log
                                </button>
                            )}
                        </div>
                        <div
                            ref={logRef}
                            className="rounded-xl border border-gray-100 bg-gray-50 divide-y divide-gray-100 max-h-52 overflow-y-auto"
                        >
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
            </div>
        </div>
    );
};

export default HikvisionPanel;
