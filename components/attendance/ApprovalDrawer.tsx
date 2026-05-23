import React, { useEffect } from 'react';
import { Employee, AttendanceRecord, AttendanceChangeRequest } from '../../types';
import ManualAttendanceForm from './ManualAttendanceForm';
import ApprovalQueue from './ApprovalQueue';

interface ApprovalDrawerProps {
    setIsApprovalDrawerOpen: (open: boolean) => void;
    employees: Employee[];
    canManageAttendance: boolean;
    onSave: (record: Omit<AttendanceRecord, 'id'>) => Promise<boolean> | boolean;
    loadPendingRequests: () => Promise<void>;
    calculateAttendanceDetails: (employeeId: string, clockIn: string, clockOut: string, recordDate?: string) => { isLate: boolean; overtimeHours: number };
    isGeofenceConfigured: boolean;
    officeLat: number;
    officeLng: number;
    officeRadiusMeters: number;
    
    loadingPending: boolean;
    pendingRequests: AttendanceChangeRequest[];
    currentUserId?: string;
    canApproveAttendanceRequests: boolean;
    handleApproveRequest: (requestId: string) => Promise<void>;
    handleRejectRequest: (requestId: string) => Promise<void>;
}

const ApprovalDrawer: React.FC<ApprovalDrawerProps> = ({
    setIsApprovalDrawerOpen,
    employees,
    canManageAttendance,
    onSave,
    loadPendingRequests,
    calculateAttendanceDetails,
    isGeofenceConfigured,
    officeLat,
    officeLng,
    officeRadiusMeters,
    
    loadingPending,
    pendingRequests,
    currentUserId,
    canApproveAttendanceRequests,
    handleApproveRequest,
    handleRejectRequest,
}) => {
    useEffect(() => {
        void loadPendingRequests();
    }, [loadPendingRequests]);

    return (
        <div className="fixed inset-0 z-50">
            <button
                type="button"
                aria-label="Tutup panel approval"
                className="absolute inset-0 bg-black/35"
                onClick={() => setIsApprovalDrawerOpen(false)}
            />
            <aside className="absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto border-l border-gray-200 bg-white shadow-2xl">
                <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs uppercase tracking-wide text-gray-500">Workflow</p>
                            <h3 className="text-lg font-bold text-[#06736a]">Approval Queue</h3>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsApprovalDrawerOpen(false)}
                            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                        >
                            Tutup
                        </button>
                    </div>
                </div>

                <div className="space-y-3 p-4">
                    <ManualAttendanceForm 
                        employees={employees}
                        canManageAttendance={canManageAttendance}
                        onSave={onSave}
                        loadPendingRequests={loadPendingRequests}
                        calculateAttendanceDetails={calculateAttendanceDetails}
                        isGeofenceConfigured={isGeofenceConfigured}
                        officeLat={officeLat}
                        officeLng={officeLng}
                        officeRadiusMeters={officeRadiusMeters}
                    />

                    <ApprovalQueue 
                        loadPendingRequests={loadPendingRequests}
                        loadingPending={loadingPending}
                        pendingRequests={pendingRequests}
                        currentUserId={currentUserId}
                        canApproveAttendanceRequests={canApproveAttendanceRequests}
                        handleApproveRequest={handleApproveRequest}
                        handleRejectRequest={handleRejectRequest}
                    />
                </div>
            </aside>
        </div>
    );
};

export default ApprovalDrawer;
