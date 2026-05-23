import React from 'react';
import { Employee } from '../../types.ts';

interface CompensationTabProps {
    employee: Employee;
}

const CompensationTab: React.FC<CompensationTabProps> = ({ employee }) => (
    <div className="space-y-4">
        <h4 className="font-semibold text-primary mb-2 text-lg">Informasi Kompensasi</h4>
        {employee.compensation ? (
            <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Gaji Pokok</p>
                        <p className="mt-1 text-xl font-bold text-emerald-900">
                            Rp {(employee.compensation.gajiPokok || 0).toLocaleString('id-ID')}
                        </p>
                    </div>
                    <div className="rounded-lg border border-sky-100 bg-sky-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Tunjangan Profesi</p>
                        <p className="mt-1 text-xl font-bold text-sky-900">
                            Rp {(employee.compensation.tunjanganProfesi || 0).toLocaleString('id-ID')}
                        </p>
                    </div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total Kompensasi / Bulan</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">
                        Rp {((employee.compensation.gajiPokok || 0) + (employee.compensation.tunjanganProfesi || 0)).toLocaleString('id-ID')}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">Gaji Pokok + Tunjangan Profesi (sebelum potongan)</p>
                </div>
            </>
        ) : (
            <p className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg">Data kompensasi belum diisi. Edit profil karyawan untuk menambahkan informasi kompensasi.</p>
        )}
        <p className="text-xs text-gray-400">⚠ Data ini bersifat rahasia. Hanya HR dan Admin yang dapat melihat kompensasi karyawan.</p>
    </div>
);

export default CompensationTab;
