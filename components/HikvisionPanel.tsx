/**
 * HikvisionPanel.tsx - REFACTORED
 * 
 * Manages the Hikvision face recognition device integration.
 * 
 * Previous: ~378 lines, monolithic
 * Current:  ~130 lines, layout and state orchestration
 */
import React, { useState, useEffect, useRef } from 'react';
import {
    testHikvisionConnection, runHikvisionSync, startHikvisionAutoSync, stopHikvisionAutoSync,
    getHikvisionConfig, type HikvisionConfig, type HikvisionSyncResult,
} from '../services/hikvisionService';
import { dataService } from '../services/DataService';
import { useAppDataActions } from '../stores/appStore';
import { mapAttendanceRecordToUI, sortAttendanceByDateDesc } from '../utils/dataMapping';
import HikvisionConfigForm from './hikvision/HikvisionConfigForm';
import HikvisionSyncLog from './hikvision/HikvisionSyncLog';

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

    useEffect(() => {
        if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
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
            if (result.success && result.synced > 0) await refreshAttendanceStore();
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
                if (result.success && result.synced > 0) await refreshAttendanceStore();
            });
            setAutoSyncOn(true);
            setFormDirty(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
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
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                    connStatus === 'connected' ? 'bg-green-100 text-green-700' :
                    connStatus === 'error'     ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
                }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                        connStatus === 'connected' ? 'bg-green-500 animate-pulse' :
                        connStatus === 'error'     ? 'bg-red-500' : 'bg-gray-400'
                    }`} />
                    {connStatus === 'connected' ? 'Terhubung' : connStatus === 'error' ? 'Gagal' : 'Belum Dicek'}
                </div>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <HikvisionConfigForm
                    config={config} onConfigChange={handleConfigChange} formDirty={formDirty}
                    connStatus={connStatus} connInfo={connInfo} actionStatus={actionStatus}
                    autoSyncOn={autoSyncOn} showPassword={showPassword} setShowPassword={setShowPassword}
                    onTestConnection={handleTestConnection} onManualSync={handleManualSync} onAutoSyncToggle={handleAutoSyncToggle}
                />
                
                <HikvisionSyncLog
                    lastSync={lastSync} syncLog={syncLog} onClearLog={() => setSyncLog([])} logRef={logRef}
                />
            </div>
        </div>
    );
};

export default HikvisionPanel;
