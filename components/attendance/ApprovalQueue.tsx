import React from 'react';
import { AttendanceChangeRequest } from '../../types';

interface ApprovalQueueProps {
    loadPendingRequests: () => Promise<void>;
    loadingPending: boolean;
    pendingRequests: AttendanceChangeRequest[];
    currentUserId?: string;
    canApproveAttendanceRequests: boolean;
    handleApproveRequest: (requestId: string) => Promise<void>;
    handleRejectRequest: (requestId: string) => Promise<void>;
}

const ApprovalQueue: React.FC<ApprovalQueueProps> = ({
    loadPendingRequests,
    loadingPending,
    pendingRequests,
    currentUserId,
    canApproveAttendanceRequests,
    handleApproveRequest,
    handleRejectRequest
}) => {
    return (
        <section className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#06736a]">Maker-Checker Queue</h3>
                <button
                    type="button"
                    onClick={() => void loadPendingRequests()}
                    className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                    Refresh
                </button>
            </div>

            {loadingPending ? (
                <p className="text-sm text-gray-500">Memuat pending request...</p>
            ) : pendingRequests.length === 0 ? (
                <p className="text-sm text-gray-500">Tidak ada request absensi yang menunggu approval.</p>
            ) : (
                <div className="space-y-2">
                    {pendingRequests.map((request) => {
                        const isOwnRequest = Boolean(currentUserId && request.maker_user_id === currentUserId);
                        return (
                            <div key={request.id} className="rounded-lg border border-gray-100 bg-gray-50 p-2.5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <p className="text-xs font-semibold text-gray-900">{request.employee_id} · {request.attendance_date}</p>
                                        <p className="text-xs text-gray-600">Reason: {request.reason_code}</p>
                                        {request.reason_detail && <p className="text-xs text-gray-500 mt-0.5">{request.reason_detail}</p>}
                                    </div>
                                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Pending</span>
                                </div>

                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <span className={`rounded-full px-2 py-0.5 text-xs border ${request.location_verified ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                                        {request.location_verified ? 'Lokasi Verified' : 'Lokasi Unverified'}
                                    </span>
                                    {request.location_distance_meters !== null && request.location_distance_meters !== undefined && (
                                        <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-600">
                                            Jarak: {Math.round(request.location_distance_meters)} m
                                        </span>
                                    )}
                                </div>

                                {canApproveAttendanceRequests && !isOwnRequest && (
                                    <div className="mt-2 flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => void handleApproveRequest(request.id)}
                                            className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                                        >
                                            Approve
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => void handleRejectRequest(request.id)}
                                            className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700"
                                        >
                                            Reject
                                        </button>
                                    </div>
                                )}

                                {canApproveAttendanceRequests && isOwnRequest && (
                                    <p className="mt-2 text-xs text-amber-700">Request ini dibuat oleh akun Anda. Maker tidak dapat menjadi checker.</p>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
};

export default ApprovalQueue;
