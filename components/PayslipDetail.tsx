import React, { useEffect } from 'react';
import { Payslip, Employee } from '../types.ts';
import { XMarkIcon, PrinterIcon } from './icons.tsx';

interface PayslipDetailProps {
    isOpen: boolean;
    onClose: () => void;
    payslip: Payslip | null;
    employee: Employee | null;
}

const PayslipDetail: React.FC<PayslipDetailProps> = ({ isOpen, onClose, payslip, employee }) => {
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

    if (!payslip || !employee) return null;
    
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
        <div
            className={`fixed inset-0 z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            aria-modal="true"
            role="dialog"
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            {/* Drawer */}
            <div className={`absolute inset-y-0 right-0 flex w-full max-w-lg flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out rounded-l-2xl overflow-hidden ${
                isOpen ? 'translate-x-0' : 'translate-x-full'
            }`}>
                {/* Header */}
                <div className="flex-shrink-0 p-5 border-b bg-white flex justify-between items-center no-print">
                    <div>
                        <h2 className="text-lg font-bold text-primary">Detail Slip Gaji</h2>
                        <p className="text-xs text-gray-500 mt-0.5">{payslip.periode}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            title="Cetak slip gaji"
                            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-primary transition-colors"
                        >
                            <PrinterIcon className="h-5 w-5" />
                        </button>
                        <button
                            onClick={onClose}
                            title="Tutup"
                            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                        >
                            <XMarkIcon className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto p-6" id="payslip-print-area">
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
