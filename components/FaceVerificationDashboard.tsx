import React, { useState, useEffect } from 'react';
import logger from '../services/logger.ts';
import { supabase } from '../services/supabaseClient.ts';

interface FaceVerificationAttempt {
    id: string;
    employee_id: string;
    employee_name: string;
    verification_type: 'checkin' | 'checkout' | 'enrollment';
    verified: boolean;
    confidence: number;
    timestamp: string;
    location?: string;
}

interface FaceVerificationStats {
    totalAttempts: number;
    successfulAttempts: number;
    failedAttempts: number;
    successRate: number;
    averageConfidence: number;
    recentAttempts: FaceVerificationAttempt[];
}

const FaceVerificationDashboard: React.FC = () => {
    const [stats, setStats] = useState<FaceVerificationStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today');
    const [filterEmployee, setFilterEmployee] = useState<string>('');

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);
    }, [timeRange, filterEmployee]);

    const fetchStats = async () => {
        try {
            setLoading(true);
            setError(null);

            // Get date range
            const now = new Date();
            let startDate = new Date();

            if (timeRange === 'today') {
                startDate.setHours(0, 0, 0, 0);
            } else if (timeRange === 'week') {
                startDate.setDate(now.getDate() - 7);
            } else if (timeRange === 'month') {
                startDate.setDate(now.getDate() - 30);
            }

            // Query face verification attempts from audit log
            let query = supabase
                .from('audit_logs')
                .select('*')
                .gte('created_at', startDate.toISOString())
                .eq('entity_type', 'face_verification')
                .order('created_at', { ascending: false })
                .limit(100);

            if (filterEmployee) {
                query = query.ilike('entity_id', `%${filterEmployee}%`);
            }

            const { data, error: queryError } = await query;

            if (queryError) throw queryError;

            // Parse and calculate stats
            const attempts: FaceVerificationAttempt[] = (data || []).map((row: any) => ({
                id: row.id,
                employee_id: row.entity_id,
                employee_name: row.entity_name || 'Unknown',
                verification_type: row.metadata?.type || 'checkin',
                verified: row.metadata?.verified === true,
                confidence: row.metadata?.confidence || 0,
                timestamp: row.created_at,
                location: row.metadata?.location
            }));

            const successful = attempts.filter(a => a.verified).length;
            const total = attempts.length;
            const avgConfidence = total > 0
                ? attempts.reduce((sum, a) => sum + a.confidence, 0) / total
                : 0;

            setStats({
                totalAttempts: total,
                successfulAttempts: successful,
                failedAttempts: total - successful,
                successRate: total > 0 ? Math.round((successful / total) * 100) : 0,
                averageConfidence: Math.round(avgConfidence * 100),
                recentAttempts: attempts.slice(0, 20)
            });
        } catch (err: any) {
            logger.error('Error fetching face verification stats', err);
            setError(err.message || 'Gagal memuat statistik');
        } finally {
            setLoading(false);
        }
    };

    if (loading && !stats) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-[#06736a] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading face verification data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-white rounded-2xl shadow-lg">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">👤 Face Verification Monitoring</h2>

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6 text-red-800">
                    {error}
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center">
                <div className="flex gap-2">
                    {(['today', 'week', 'month'] as const).map(range => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                timeRange === range
                                    ? 'bg-[#06736a] text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            {range === 'today' ? 'Hari Ini' : range === 'week' ? '7 Hari' : '30 Hari'}
                        </button>
                    ))}
                </div>
                <input
                    type="text"
                    placeholder="Cari nama karyawan..."
                    value={filterEmployee}
                    onChange={(e) => setFilterEmployee(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06736a]"
                />
                <button
                    onClick={fetchStats}
                    className="px-4 py-2 bg-[#06736a] text-white rounded-lg font-medium hover:bg-[#055f57] transition-colors"
                >
                    🔄 Refresh
                </button>
            </div>

            {/* Statistics Cards */}
            {stats && (
                <div className="grid grid-cols-1 gap-4 mb-8 sm:grid-cols-3 lg:grid-cols-5">
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                        <p className="text-sm text-gray-600">Total Attempts</p>
                        <p className="text-3xl font-bold text-blue-600">{stats.totalAttempts}</p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                        <p className="text-sm text-gray-600">Successful</p>
                        <p className="text-3xl font-bold text-green-600">{stats.successfulAttempts}</p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-lg">
                        <p className="text-sm text-gray-600">Failed</p>
                        <p className="text-3xl font-bold text-red-600">{stats.failedAttempts}</p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                        <p className="text-sm text-gray-600">Success Rate</p>
                        <p className="text-3xl font-bold text-purple-600">{stats.successRate}%</p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg">
                        <p className="text-sm text-gray-600">Avg Confidence</p>
                        <p className="text-3xl font-bold text-amber-600">{stats.averageConfidence}%</p>
                    </div>
                </div>
            )}

            {/* Recent Attempts Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b-2 border-gray-300">
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Waktu</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Karyawan</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Tipe</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Confidence</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Lokasi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stats && stats.recentAttempts.length > 0 ? (
                            stats.recentAttempts.map((attempt) => (
                                <tr key={attempt.id} className="border-b border-gray-200 hover:bg-gray-50">
                                    <td className="px-4 py-3 text-gray-600">
                                        {new Date(attempt.timestamp).toLocaleString('id-ID')}
                                    </td>
                                    <td className="px-4 py-3 font-medium text-gray-800">
                                        {attempt.employee_name}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                            attempt.verification_type === 'checkin'
                                                ? 'bg-blue-100 text-blue-700'
                                                : attempt.verification_type === 'checkout'
                                                ? 'bg-orange-100 text-orange-700'
                                                : 'bg-purple-100 text-purple-700'
                                        }`}>
                                            {attempt.verification_type === 'checkin' ? 'Check In' : 
                                             attempt.verification_type === 'checkout' ? 'Check Out' :
                                             'Enrollment'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                            attempt.verified
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-red-100 text-red-700'
                                        }`}>
                                            {attempt.verified ? '✅ Verified' : '❌ Failed'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 bg-gray-200 rounded-full h-2">
                                                <div
                                                    className={`h-2 rounded-full ${
                                                        attempt.confidence >= 0.8
                                                            ? 'bg-green-600'
                                                            : attempt.confidence >= 0.6
                                                            ? 'bg-yellow-600'
                                                            : 'bg-red-600'
                                                    }`}
                                                    style={{ width: `${attempt.confidence * 100}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-gray-700">
                                                {Math.round(attempt.confidence * 100)}%
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-gray-600 text-xs">
                                        {attempt.location || '-'}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                    Belum ada data verifikasi face
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default FaceVerificationDashboard;
