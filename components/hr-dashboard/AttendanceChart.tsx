import React, { useEffect, useRef, useState } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { RANGE_OPTIONS, type RangeOption } from '../../hooks/useHRDashboard';

interface AttendanceChartProps {
    trendData: Array<{
        hari: string; tanggal: string; hadir: number; terlambat: number;
        cutiAktif: number; tidakHadirEstimasi: number; lemburJam: number;
    }>;
    selectedRange: RangeOption;
    onRangeChange: (range: RangeOption) => void;
}

const AttendanceChart: React.FC<AttendanceChartProps> = ({ trendData, selectedRange, onRangeChange }) => {
    const chartContainerRef = useRef<HTMLDivElement | null>(null);
    const [canRenderChart, setCanRenderChart] = useState(false);
    const [chartSize, setChartSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const el = chartContainerRef.current;
        if (!el) return;

        const update = () => {
            if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
                setCanRenderChart(false);
                return;
            }
            const { width, height } = el.getBoundingClientRect();
            const safeWidth = Math.max(280, Math.floor(width));
            const safeHeight = Math.max(240, Math.floor(height));
            setCanRenderChart(width > 0 && height > 0);
            setChartSize({ width: safeWidth, height: safeHeight });
        };

        update();
        const observer = new ResizeObserver(() => update());
        observer.observe(el);
        const onVisibilityChange = () => update();
        document.addEventListener('visibilitychange', onVisibilityChange);

        return () => {
            observer.disconnect();
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, []);

    return (
        <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-xl font-bold text-[#06736a]">Analitik Kehadiran</h2>
                    <p className="text-sm text-gray-500">Tren hadir, terlambat, cuti aktif, dan estimasi tidak hadir</p>
                </div>
                <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
                    {RANGE_OPTIONS.map((day) => (
                        <button
                            key={day}
                            type="button"
                            onClick={() => onRangeChange(day)}
                            className={`rounded-lg px-3 py-1 text-sm font-semibold transition ${
                                selectedRange === day
                                    ? 'bg-[#06736a] text-white'
                                    : 'text-gray-600 hover:bg-white'
                            }`}
                        >
                            {day} Hari
                        </button>
                    ))}
                </div>
            </div>
            <div ref={chartContainerRef} className="h-80 min-h-[240px]">
                {canRenderChart ? (
                    <LineChart width={chartSize.width} height={chartSize.height} data={trendData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="hari" tick={{ fill: '#6b7280', fontSize: 12 }} />
                        <YAxis allowDecimals={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                        <Tooltip
                            formatter={(value: number | string, name: string) => [value, name]}
                            labelFormatter={(_, payload) => {
                                const first = payload?.[0]?.payload;
                                return first?.tanggal ? `${first.hari}, ${first.tanggal}` : '';
                            }}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="hadir" name="Hadir" stroke="#059669" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                        <Line type="monotone" dataKey="terlambat" name="Terlambat" stroke="#d97706" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                        <Line type="monotone" dataKey="cutiAktif" name="Cuti Aktif" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                        <Line type="monotone" dataKey="tidakHadirEstimasi" name="Estimasi Tidak Hadir" stroke="#dc2626" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                        <Line type="monotone" dataKey="lemburJam" name="Lembur (Jam)" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                    </LineChart>
                ) : (
                    <div className="h-full w-full animate-pulse rounded-lg bg-slate-100" />
                )}
            </div>
        </div>
    );
};

export default AttendanceChart;
