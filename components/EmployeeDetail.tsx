import React, { useEffect, useState } from 'react';
import { Employee, WorkUnit, AttendanceRecord } from '../types.ts';
import { XMarkIcon, PaperClipIcon, DocumentTextIcon, ClockIcon, CurrencyDollarIcon } from './icons.tsx';
import DetailTab from './employee-detail/DetailTab.tsx';
import DocumentTab from './employee-detail/DocumentTab.tsx';
import AttendanceTab from './employee-detail/AttendanceTab.tsx';
import CompensationTab from './employee-detail/CompensationTab.tsx';

interface EmployeeDetailProps {
    isOpen: boolean;
    onClose: () => void;
    employee: Employee;
    workUnit?: WorkUnit;
    attendanceRecords: AttendanceRecord[];
    onOpenAttendanceDetail?: () => void;
}

const EmployeeDetail: React.FC<EmployeeDetailProps> = ({ isOpen, onClose, employee, workUnit, attendanceRecords, onOpenAttendanceDetail }) => {
    const [activeTab, setActiveTab] = useState('detail');

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        if (isOpen) document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    const TabButton: React.FC<{ tabName: string; label: string; icon: React.ReactNode }> = ({ tabName, label, icon }) => (
        <button
            onClick={() => setActiveTab(tabName)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                activeTab === tabName ? 'bg-[#e6f3f2] text-[#06736a]' : 'text-gray-600 hover:bg-gray-100'
            }`}
        >
            {icon}
            {label}
        </button>
    );

    const renderContent = () => {
        switch (activeTab) {
            case 'dokumen':
                return <DocumentTab employee={employee} />;
            case 'kehadiran':
                return <AttendanceTab attendanceRecords={attendanceRecords} onOpenAttendanceDetail={onOpenAttendanceDetail} />;
            case 'kompensasi':
                return <CompensationTab employee={employee} />;
            default:
                return <DetailTab employee={employee} workUnit={workUnit} />;
        }
    };

    return (
        <div
            className={`fixed inset-0 z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            aria-modal="true"
            role="dialog"
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            {/* Drawer */}
            <div className={`absolute inset-y-0 right-0 flex w-full max-w-3xl flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out rounded-l-2xl overflow-hidden ${
                isOpen ? 'translate-x-0' : 'translate-x-full'
            }`}>
                {/* Header */}
                <div className="flex-shrink-0 p-5 border-b bg-white flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <img
                            className="h-14 w-14 rounded-full object-cover ring-2 ring-[#06736a]/20"
                            src={employee.foto || `https://ui-avatars.com/api/?name=${employee.nama.replace(/\s/g, '+')}&background=random`}
                            alt={employee.nama}
                        />
                        <div>
                            <h2 className="text-lg font-bold text-primary">
                                {employee.nama}
                                {employee.kredensial && <span className="ml-2 text-sm font-normal text-gray-500">{employee.kredensial}</span>}
                            </h2>
                            <p className="text-sm text-gray-500 mt-0.5">{employee.jabatan} &middot; {employee.departemen}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        title="Tutup detail karyawan"
                        aria-label="Tutup detail karyawan"
                        className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>

                {/* Tab Navigation Strip */}
                <div className="flex-shrink-0 border-b bg-gray-50 px-4">
                    <div className="flex gap-1">
                        <TabButton tabName="detail" label="Detail" icon={<DocumentTextIcon className="w-4 h-4" />} />
                        <TabButton tabName="dokumen" label="Dokumen" icon={<PaperClipIcon className="w-4 h-4" />} />
                        <TabButton tabName="kehadiran" label="Kehadiran" icon={<ClockIcon className="w-4 h-4" />} />
                        <TabButton tabName="kompensasi" label="Kompensasi" icon={<CurrencyDollarIcon className="w-4 h-4" />} />
                    </div>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default EmployeeDetail;
