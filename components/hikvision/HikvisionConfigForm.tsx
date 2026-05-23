import React from 'react';
import { HikvisionConfig } from '../../services/hikvisionService';

const STATUS_IDLE = 'idle';
const STATUS_TESTING = 'testing';
const STATUS_SYNCING = 'syncing';

interface HikvisionConfigFormProps {
    config: HikvisionConfig;
    onConfigChange: (field: keyof HikvisionConfig, value: string | number | boolean) => void;
    formDirty: boolean;
    connStatus: 'unknown' | 'connected' | 'error';
    connInfo: string;
    actionStatus: string;
    autoSyncOn: boolean;
    showPassword: boolean;
    setShowPassword: (val: boolean | ((prev: boolean) => boolean)) => void;
    onTestConnection: () => void;
    onManualSync: () => void;
    onAutoSyncToggle: () => void;
}

const HikvisionConfigForm: React.FC<HikvisionConfigFormProps> = ({
    config, onConfigChange, formDirty, connStatus, connInfo, actionStatus,
    autoSyncOn, showPassword, setShowPassword,
    onTestConnection, onManualSync, onAutoSyncToggle
}) => {
    const inputClass = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06736a] bg-gray-50';
    const labelClass = 'block text-xs font-medium text-gray-600 mb-1';

    return (
        <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-700">⚙️ Konfigurasi Device</h4>

            <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                    <label className={labelClass}>IP Address Device</label>
                    <input className={inputClass} placeholder="192.168.1.100" value={config.ip} onChange={e => onConfigChange('ip', e.target.value)} />
                </div>
                <div>
                    <label className={labelClass}>Port</label>
                    <input className={inputClass} placeholder="80" type="number" value={config.port} onChange={e => onConfigChange('port', Number(e.target.value))} />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className={labelClass}>Username</label>
                    <input className={inputClass} placeholder="admin" value={config.username} onChange={e => onConfigChange('username', e.target.value)} />
                </div>
                <div>
                    <label className={labelClass}>Password</label>
                    <div className="relative">
                        <input className={inputClass + ' pr-8'} type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={config.password} onChange={e => onConfigChange('password', e.target.value)} />
                        <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs" onClick={() => setShowPassword(p => !p)}>
                            {showPassword ? '🙈' : '👁️'}
                        </button>
                    </div>
                </div>
            </div>

            <div>
                <label className={labelClass}>Nama Lokasi Device</label>
                <input className={inputClass} placeholder="Kantor Utama" value={config.deviceLocation} onChange={e => onConfigChange('deviceLocation', e.target.value)} />
                <p className="text-xs text-gray-400 mt-1">Dipakai sebagai field "Location" pada record absensi</p>
            </div>

            <div>
                <label className={labelClass}>Interval Sync Otomatis (menit)</label>
                <input className={inputClass} type="number" min={1} max={60} value={config.syncIntervalMinutes} onChange={e => onConfigChange('syncIntervalMinutes', Number(e.target.value))} />
            </div>

            {connInfo && (
                <div className={`rounded-lg px-3 py-2 text-xs ${connStatus === 'connected' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                    {connStatus === 'connected' ? '✅ ' : '❌ '}{connInfo}
                </div>
            )}

            {formDirty && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    ⚠️ Konfigurasi berubah — test koneksi ulang sebelum aktifkan auto-sync
                </p>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
                <button onClick={onTestConnection} disabled={actionStatus !== STATUS_IDLE || !config.ip} className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-xl font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    {actionStatus === STATUS_TESTING ? <><span className="animate-spin">⟳</span> Testing...</> : <>🔌 Test Koneksi</>}
                </button>

                <button onClick={onManualSync} disabled={actionStatus !== STATUS_IDLE || connStatus !== 'connected'} className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-xl font-medium bg-[#06736a] text-white hover:bg-[#055f57] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    {actionStatus === STATUS_SYNCING ? <><span className="animate-spin">⟳</span> Syncing...</> : <>🔄 Sync Manual (24 jam)</>}
                </button>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 bg-gray-50">
                <div>
                    <p className="text-sm font-medium text-gray-700">Auto-Sync Otomatis</p>
                    <p className="text-xs text-gray-400">
                        {autoSyncOn ? `Berjalan — sync tiap ${config.syncIntervalMinutes} menit` : 'Nonaktif — data tidak otomatis masuk'}
                    </p>
                </div>
                <button onClick={onAutoSyncToggle} disabled={!autoSyncOn && (connStatus !== 'connected' || actionStatus !== STATUS_IDLE)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${autoSyncOn ? 'bg-[#06736a]' : 'bg-gray-300'}`}>
                    <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${autoSyncOn ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
            </div>
        </div>
    );
};

export default HikvisionConfigForm;
