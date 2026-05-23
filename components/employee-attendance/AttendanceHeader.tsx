import React from 'react';
import { Employee, WorkUnit } from '../../types.ts';
import { PrinterIcon } from '../icons.tsx';

interface AttendanceHeaderProps {
    employee: Employee;
    workUnit?: WorkUnit;
    onBack: () => void;
}

const AttendanceHeader: React.FC<AttendanceHeaderProps> = ({ employee, workUnit, onBack }) => {
    return (
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm print:shadow-none">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex items-start gap-4">
                    <img
                        src={employee.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(employee.nama)}&background=random`}
                        alt={employee.nama}
                        className="h-20 w-20 rounded-2xl object-cover ring-4 ring-[#e6f3f2]"
                    />
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#06736a]">Detail Absensi Karyawan</p>
                        <h2 className="mt-1 text-2xl font-bold text-gray-900">{employee.nama}</h2>
                        <p className="text-sm text-gray-600">{employee.jabatan} - {employee.departemen}</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
                            <span className="rounded-full bg-gray-100 px-3 py-1">NIK: {employee.nik || '-'}</span>
                            <span className="rounded-full bg-gray-100 px-3 py-1">Unit: {workUnit?.nama || '-'}</span>
                            <span className="rounded-full bg-gray-100 px-3 py-1">Shift: {employee.shift}</span>
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 print:hidden">
                    <button type="button" onClick={() => window.print()}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                        <PrinterIcon className="h-4 w-4" /> Cetak
                    </button>
                    <button type="button" onClick={onBack}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#06736a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#055f57]">
                        Kembali
                    </button>
                </div>
            </div>
        </section>
    );
};

export default AttendanceHeader;
