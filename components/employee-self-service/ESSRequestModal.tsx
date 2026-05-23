import React, { useState } from 'react';
import { RequestType } from '../../types.ts';
import { XMarkIcon } from '../icons.tsx';

interface ESSRequestModalProps {
    isOpen: boolean;
    requestType: RequestType;
    onClose: () => void;
    onSubmit: (data: any) => void;
    employeeId: string;
}

const ESSRequestModal: React.FC<ESSRequestModalProps> = ({ isOpen, requestType, onClose, onSubmit, employeeId }) => {
    const [leaveData, setLeaveData] = useState({ startDate: '', endDate: '', reason: '' });
    const [reimbursementData, setReimbursementData] = useState({ date: '', description: '', amount: 0 });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (requestType === RequestType.Cuti) {
            onSubmit({ ...leaveData, type: RequestType.Cuti, employeeId });
        } else {
            onSubmit({ ...reimbursementData, type: RequestType.Reimbursement, employeeId });
        }
        onClose();
        setLeaveData({ startDate: '', endDate: '', reason: '' });
        setReimbursementData({ date: '', description: '', amount: 0 });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
            <div className="w-full rounded-t-3xl bg-white shadow-2xl sm:max-w-md sm:rounded-2xl">
                <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 sm:p-5">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Pengajuan Baru</p>
                        <h2 className="text-lg sm:text-xl font-bold text-primary">Pengajuan {requestType}</h2>
                    </div>
                    <button aria-label="Tutup modal" title="Tutup modal" onClick={onClose} className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"><XMarkIcon className="h-6 w-6" /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5 sm:p-6">
                    {requestType === RequestType.Cuti ? (
                        <>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Tanggal Mulai</label>
                                    <input type="date" title="Tanggal Mulai" value={leaveData.startDate} onChange={e => setLeaveData({...leaveData, startDate: e.target.value})} className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-3 shadow-sm focus:border-[#06736a] focus:outline-none focus:ring-4 focus:ring-[#06736a]/10" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Tanggal Selesai</label>
                                    <input type="date" title="Tanggal Selesai" value={leaveData.endDate} onChange={e => setLeaveData({...leaveData, endDate: e.target.value})} className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-3 shadow-sm focus:border-[#06736a] focus:outline-none focus:ring-4 focus:ring-[#06736a]/10" required />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Alasan</label>
                                <textarea title="Alasan Cuti" placeholder="Tulis alasan pengajuan cuti" value={leaveData.reason} onChange={e => setLeaveData({...leaveData, reason: e.target.value})} rows={4} className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-3 shadow-sm focus:border-[#06736a] focus:outline-none focus:ring-4 focus:ring-[#06736a]/10" required></textarea>
                            </div>
                        </>
                    ) : (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Tanggal Transaksi</label>
                                <input type="date" title="Tanggal Transaksi" value={reimbursementData.date} onChange={e => setReimbursementData({...reimbursementData, date: e.target.value})} className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-3 shadow-sm focus:border-[#06736a] focus:outline-none focus:ring-4 focus:ring-[#06736a]/10" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Jumlah (Rp)</label>
                                <input type="number" title="Jumlah Reimbursement" placeholder="Contoh: 150000" value={reimbursementData.amount} onChange={e => setReimbursementData({...reimbursementData, amount: Number(e.target.value)})} className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-3 shadow-sm focus:border-[#06736a] focus:outline-none focus:ring-4 focus:ring-[#06736a]/10" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Deskripsi</label>
                                <textarea title="Deskripsi Reimbursement" placeholder="Tulis deskripsi biaya yang diklaim" value={reimbursementData.description} onChange={e => setReimbursementData({...reimbursementData, description: e.target.value})} rows={4} className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-3 shadow-sm focus:border-[#06736a] focus:outline-none focus:ring-4 focus:ring-[#06736a]/10" required></textarea>
                            </div>
                        </>
                    )}
                    <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                        <button type="button" onClick={onClose} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 sm:w-auto">Batal</button>
                        <button type="submit" className="w-full rounded-xl border border-transparent bg-[#06736a] px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-[#054f46] sm:w-auto">Ajukan</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ESSRequestModal;
