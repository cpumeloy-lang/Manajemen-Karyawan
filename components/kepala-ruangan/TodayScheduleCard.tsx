import React from 'react';
import { Employee, ShiftDefinition } from '../../types.ts';

interface TodayScheduleCardProps {
    employees: Employee[];
    unitShifts: ShiftDefinition[];
    todayScheduleMap: Record<string, string>;
}

const TodayScheduleCard: React.FC<TodayScheduleCardProps> = ({ employees, unitShifts, todayScheduleMap }) => {
    const shiftColors: Record<string, string> = {};
    const palette = ['bg-blue-100 text-blue-800', 'bg-green-100 text-green-800', 'bg-yellow-100 text-yellow-800', 'bg-purple-100 text-purple-800', 'bg-pink-100 text-pink-800', 'bg-orange-100 text-orange-800'];
    unitShifts.forEach((s, i) => { shiftColors[s.name] = palette[i % palette.length]; });
    shiftColors['Libur'] = 'bg-gray-100 text-gray-600';

    return (
        <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-lg font-bold text-[#06736a] mb-4">📅 Jadwal Hari Ini</h2>
            {employees.length === 0 ? (
                <p className="text-gray-500 text-sm">Belum ada karyawan di unit ini.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jabatan</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shift Hari Ini</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {employees.map((emp) => {
                                const shiftName = todayScheduleMap[emp.id] || emp.shift || 'Tidak Diatur';
                                const colorClass = shiftColors[shiftName] || 'bg-gray-100 text-gray-600';
                                return (
                                    <tr key={emp.id}>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                {emp.foto && <img src={emp.foto} alt={emp.nama} className="w-8 h-8 rounded-full object-cover" />}
                                                <span className="text-sm font-medium text-gray-900">{emp.nama}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{emp.jabatan || '-'}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
                                                {shiftName}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default TodayScheduleCard;
