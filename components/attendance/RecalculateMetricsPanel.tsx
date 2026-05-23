import React, { useState } from 'react';
import { ShiftDefinition } from '../../types';
import { recalculateAttendanceMetrics } from '../../services/attendanceMetricsService';

interface RecalculateMetricsPanelProps {
    activeShiftDefs: ShiftDefinition[];
}

const RecalculateMetricsPanel: React.FC<RecalculateMetricsPanelProps> = ({ activeShiftDefs }) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const firstOfMonthStr = todayStr.slice(0, 8) + '01';

    const [recalcFrom, setRecalcFrom] = useState(firstOfMonthStr);
    const [recalcTo, setRecalcTo] = useState(todayStr);
    const [recalcSource, setRecalcSource] = useState<'all' | 'hikvision' | 'mobile'>('hikvision');
    const [recalculating, setRecalculating] = useState(false);
    const [recalcResult, setRecalcResult] = useState<{ updated: number; skipped: number; errors: number } | null>(null);

    const handleRecalculate = async () => {
        if (!recalcFrom || !recalcTo) return;
        setRecalculating(true);
        setRecalcResult(null);
        try {
            const res = await recalculateAttendanceMetrics(
                recalcFrom, 
                recalcTo, 
                activeShiftDefs,
                recalcSource === 'all' ? undefined : recalcSource
            );
            setRecalcResult(res);
        } catch (e: any) {
            setRecalcResult({ updated: 0, skipped: 0, errors: 1 });
        } finally {
            setRecalculating(false);
        }
    };

    return (
        <section className="rounded-xl border border-orange-200 bg-orange-50 p-5 mt-2">
            <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🔄</span>
                <h4 className="font-semibold text-orange-900 text-sm">Hitung Ulang Terlambat & Lembur</h4>
                <span className="text-xs text-orange-700 ml-1">— untuk data Hikvision / biometrik yang belum terhitung</span>
            </div>
            <div className="flex flex-wrap items-end gap-3">
                <div>
                    <label className="block text-xs text-orange-700 mb-1">Dari Tanggal</label>
                    <input type="date" value={recalcFrom} onChange={e => setRecalcFrom(e.target.value)}
                        className="px-3 py-2 text-sm border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-400 bg-white" />
                </div>
                <div>
                    <label className="block text-xs text-orange-700 mb-1">Sampai Tanggal</label>
                    <input type="date" value={recalcTo} onChange={e => setRecalcTo(e.target.value)}
                        className="px-3 py-2 text-sm border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-400 bg-white" />
                </div>
                <div>
                    <label className="block text-xs text-orange-700 mb-1">Sumber Data</label>
                    <select value={recalcSource} onChange={e => setRecalcSource(e.target.value as any)}
                        className="px-3 py-2 text-sm border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-400 bg-white">
                        <option value="hikvision">Hikvision saja</option>
                        <option value="mobile">Mobile saja</option>
                        <option value="all">Semua sumber</option>
                    </select>
                </div>
                <button
                    onClick={handleRecalculate}
                    disabled={recalculating || !recalcFrom || !recalcTo}
                    className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 font-medium transition-colors"
                >
                    {recalculating ? '⏳ Menghitung...' : '🔄 Hitung Ulang'}
                </button>
            </div>
            {recalcResult && (
                <div className={`mt-3 rounded-lg px-4 py-2.5 text-sm font-medium ${recalcResult.errors > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                    {recalcResult.errors > 0
                        ? `⚠️ Selesai dengan error: ${recalcResult.updated} diperbarui, ${recalcResult.skipped} dilewati, ${recalcResult.errors} error`
                        : `✅ Berhasil: ${recalcResult.updated} rekaman diperbarui, ${recalcResult.skipped} dilewati`
                    }
                </div>
            )}
            <p className="mt-2 text-xs text-orange-600">
                ⓘ Proses ini membaca jadwal karyawan dari <code>employee_schedules</code> (atau definisi shift aktif) lalu memperbarui kolom <code>is_late</code> dan <code>overtime_hours</code> di database. Muat ulang halaman setelah selesai.
            </p>
        </section>
    );
};

export default RecalculateMetricsPanel;
