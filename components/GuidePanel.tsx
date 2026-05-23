import React, { useState } from 'react';
import GuideOverview from './guides/GuideOverview';
import GuideEmployee from './guides/GuideEmployee';
import GuideAttendance from './guides/GuideAttendance';
import GuidePayroll from './guides/GuidePayroll';
import GuideFaceRecognition from './guides/GuideFaceRecognition';
import GuideHikvision from './guides/GuideHikvision';
import GuideShift from './guides/GuideShift';
import GuideKepala from './guides/GuideKepala';
import GuideNik from './guides/GuideNik';

type Tab = 'overview' | 'attendance' | 'face' | 'hikvision' | 'employee' | 'nik' | 'shift' | 'kepala' | 'payroll';

interface Section {
    title: string;
    icon: string;
    content: React.ReactNode;
}

const sections: Record<Tab, Section> = {
    overview: {
        title: 'Ringkasan Sistem',
        icon: '🏠',
        content: <GuideOverview />,
    },
    employee: {
        title: 'Manajemen Karyawan',
        icon: '👥',
        content: <GuideEmployee />,
    },
    attendance: {
        title: 'Manajemen Absensi',
        icon: '⏰',
        content: <GuideAttendance />,
    },
    payroll: {
        title: 'Konfigurasi Penggajian',
        icon: '💰',
        content: <GuidePayroll />,
    },
    face: {
        title: 'Face Recognition',
        icon: '👤',
        content: <GuideFaceRecognition />,
    },
    hikvision: {
        title: 'Mesin Absensi Hikvision',
        icon: '📡',
        content: <GuideHikvision />,
    },
    shift: {
        title: 'Manajemen Jadwal Shift',
        icon: '📅',
        content: <GuideShift />,
    },
    kepala: {
        title: 'Dashboard Kepala Ruangan',
        icon: '👨‍💼',
        content: <GuideKepala />,
    },
    nik: {
        title: 'Setup NIK Karyawan',
        icon: '🔢',
        content: <GuideNik />,
    },
};

const GuidePanel: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const tabs: { key: Tab; label: string; icon: string }[] = [
        { key: 'overview', label: 'Ringkasan', icon: '🏠' },
        { key: 'employee', label: 'Karyawan', icon: '👥' },
        { key: 'attendance', label: 'Absensi', icon: '⏰' },
        { key: 'face', label: 'Face Recognition', icon: '👤' },
        { key: 'hikvision', label: 'Mesin Absensi', icon: '📡' },
        { key: 'nik', label: 'Setup NIK', icon: '🔢' },
        { key: 'shift', label: 'Jadwal Shift', icon: '📅' },
        { key: 'kepala', label: 'Kepala Ruangan', icon: '👨‍💼' },
        { key: 'payroll', label: 'Penggajian', icon: '💰' },
    ];

    const current = sections[activeTab];

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-[#06736a]/10 to-transparent">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#06736a] flex items-center justify-center text-white text-xl">📚</div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Panduan HRMS Pro</h2>
                        <p className="text-sm text-gray-500">Panduan penggunaan fitur untuk Admin, HRD, dan Kepala Ruangan</p>
                    </div>
                </div>
            </div>

            <div className="flex min-h-[600px]">
                {/* Sidebar tabs */}
                <div className="w-48 border-r border-gray-100 bg-gray-50 p-3 space-y-1 flex-shrink-0">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                activeTab === tab.key
                                    ? 'bg-[#06736a] text-white shadow-sm'
                                    : 'text-gray-600 hover:bg-white hover:shadow-sm'
                            }`}
                        >
                            <span>{tab.icon}</span>
                            <span className="leading-tight">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 p-6 overflow-y-auto">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <span>{current.icon}</span> {current.title}
                    </h3>
                    {current.content}
                </div>
            </div>
        </div>
    );
};

export default GuidePanel;
