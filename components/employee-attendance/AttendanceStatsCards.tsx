import React from 'react';

interface AttendanceStatsCardsProps {
    stats: {
        total: number;
        late: number;
        overtime: number;
        presentDays: number;
        lateRate: number;
        completionRate: number;
    };
}

const AttendanceStatsCards: React.FC<AttendanceStatsCardsProps> = ({ stats }) => {
    const cards = [
        { label: 'Total Rekaman', value: stats.total, color: 'text-[#06736a]', bg: 'bg-[#e6f3f2]' },
        { label: 'Hadir', value: stats.presentDays, color: 'text-green-600', bg: 'bg-green-50' },
        { label: 'Terlambat', value: stats.late, color: 'text-red-600', bg: 'bg-red-50', sub: `${stats.lateRate}%` },
        { label: 'Lembur (jam)', value: stats.overtime, color: 'text-yellow-600', bg: 'bg-yellow-50' },
        { label: 'Kelengkapan', value: `${stats.completionRate}%`, color: 'text-blue-600', bg: 'bg-blue-50' },
    ];

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {cards.map((card) => (
                <div key={card.label} className={`${card.bg} rounded-xl p-4 shadow-sm`}>
                    <p className="text-xs text-gray-500 font-medium">{card.label}</p>
                    <p className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</p>
                    {card.sub && <p className="text-xs text-gray-400 mt-1">{card.sub} dari total</p>}
                </div>
            ))}
        </div>
    );
};

export default AttendanceStatsCards;
