import React from 'react';
import { Payslip, Employee } from '../types.ts';
import { XMarkIcon, PrinterIcon } from './icons.tsx';

interface PayslipDetailProps {
    isOpen: boolean;
    onClose: () => void;
    payslip: Payslip | null;
    employee: Employee | null;
}

const PayslipDetail: React.FC<PayslipDetailProps> = ({ isOpen, onClose, payslip, employee }) => {
    if (!isOpen || !payslip || !employee) return null;
    
    const handlePrint = () => {
        const printContent = document.getElementById('payslip-print-area');
        if (printContent) {
            const originalContents = document.body.innerHTML;
            const printContents = printContent.innerHTML;
            document.body.innerHTML = `
                <html>
                    <head>
                        <title>Cetak Slip Gaji</title>
                        <script src="https://cdn.tailwindcss.com"></script>
                        <style>
                            @media print {
                                body { -webkit-print-color-adjust: exact; }
                                .no-print { display: none; }
                            }
                        </style>
                    </head>
                    <body class="p-8">${printContents}</body>
                </html>
            `;
            window.print();
            document.body.innerHTML = originalContents;
            window.location.reload(); // Reload to restore scripts and event listeners
        }
    };

    const DetailRow: React.FC<{ label: string; value: number; isTotal?: boolean; isNegative?: boolean }> = ({ label, value, isTotal, isNegative }) => (
        <div className={`flex justify-between py-2 ${isTotal ? 'font-bold border-t mt-2 pt-2' : ''}`}>
            <p>{label}</p>
            <p className={isNegative ? 'text-red-600' : ''}>
                {isNegative ? '-' : ''} Rp {value.toLocaleString('id-ID')}
            </p>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
                <div className="p-5 border-b flex justify-between items-center no-print">
                    <h2 className="text-xl font-bold text-primary">Detail Slip Gaji</h2>
                    <div>
                         <button onClick={handlePrint} className="text-gray-500 hover:text-primary mr-4">
                            <PrinterIcon className="h-6 w-6" />
                        </button>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </div>
                </div>
                <div className="flex-grow overflow-y-auto p-6" id="payslip-print-area">
                    <div className="text-center mb-6">
                        <h3 className="text-2xl font-bold text-gray-800">SLIP GAJI</h3>
                        <p className="text-gray-600">Periode: {payslip.periode}</p>
                    </div>
                    <div className="mb-6 border-b pb-4">
                        <h4 className="font-semibold text-gray-700">Informasi Karyawan</h4>
                        <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                            <p><strong className="font-medium">Nama:</strong> {employee.nama}</p>
                            <p><strong className="font-medium">Jabatan:</strong> {employee.jabatan}</p>
                            <p><strong className="font-medium">Departemen:</strong> {employee.departemen}</p>
                            <p><strong className="font-medium">ID Karyawan:</strong> {employee.id}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
                        <div>
                            <h4 className="font-bold text-green-600 border-b pb-2 mb-2">Pendapatan</h4>
                            <DetailRow label="Gaji Pokok" value={payslip.gajiPokok} />
                            <DetailRow label="Tunjangan Profesi" value={payslip.tunjanganProfesi} />
                            <DetailRow label="Upah Lembur" value={payslip.upahLembur} />
                            <DetailRow label="Total Pendapatan" value={payslip.totalPendapatan} isTotal />
                        </div>
                        <div>
                            <h4 className="font-bold text-red-600 border-b pb-2 mb-2">Potongan</h4>
                            <DetailRow label="PPh 21" value={payslip.potonganPPh21} isNegative />
                            <DetailRow label="BPJS" value={payslip.potonganBPJS} isNegative />
                            <DetailRow label="Total Potongan" value={payslip.totalPotongan} isTotal />
                        </div>
                    </div>
                    <div className="mt-8 pt-4 border-t-2 border-gray-800 flex justify-between items-center">
                        <h4 className="text-lg font-bold">Gaji Bersih (Take Home Pay)</h4>
                        <p className="text-xl font-bold text-primary">Rp {payslip.gajiBersih.toLocaleString('id-ID')}</p>
                    </div>
                    <div className="text-xs text-gray-400 text-center mt-8">
                        Ini adalah dokumen yang dibuat oleh komputer. Tidak memerlukan tanda tangan.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PayslipDetail;
