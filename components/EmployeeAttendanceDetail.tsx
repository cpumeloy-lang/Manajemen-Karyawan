import React from 'react';
import { Employee, AttendanceRecord, WorkUnit, AttendanceRevisionHistory } from '../types.ts';
import { useAttendanceStats } from '../hooks/useAttendanceStats.ts';
import AttendanceHeader from './employee-attendance/AttendanceHeader.tsx';
import AttendanceFilters from './employee-attendance/AttendanceFilters.tsx';
import AttendanceStatsCards from './employee-attendance/AttendanceStatsCards.tsx';
import LiveHistorySection from './employee-attendance/LiveHistorySection.tsx';
import RevisionHistorySection from './employee-attendance/RevisionHistorySection.tsx';
import ExportSection from './employee-attendance/ExportSection.tsx';

interface EmployeeAttendanceDetailProps {
    employee: Employee;
    attendanceRecords: AttendanceRecord[];
    workUnit?: WorkUnit;
    onLoadRevisionHistory?: () => Promise<AttendanceRevisionHistory[]>;
    onBack: () => void;
}

const EmployeeAttendanceDetail: React.FC<EmployeeAttendanceDetailProps> = ({
    employee, attendanceRecords, workUnit, onLoadRevisionHistory, onBack,
}) => {
    const {
        monthFilter, setMonthFilter, dateFilter, setDateFilter, months,
        filteredRecords, stats, performanceMetrics, attendanceStatusCounts, trendMetrics,
        liveHistoryRecords, liveHistoryMode, setLiveHistoryMode,
        liveHistoryLimit, setLiveHistoryLimit, liveHistorySyncedAt,
        isLiveAutoRefresh, setIsLiveAutoRefresh, nextLiveRefreshIn, setNextLiveRefreshIn,
        refreshLiveHistory,
        loadingRevision, revisionActionFilter, setRevisionActionFilter,
        revisionReasonFilter, setRevisionReasonFilter, revisionSearchTerm, setRevisionSearchTerm,
        revisionPage, setRevisionPage, revisionPageSize, setRevisionPageSize,
        totalRevisionPages, filteredRevisionHistory, pagedRevisionHistory, revisionReasonOptions,
        exportAttendance, exportRevisionHistory,
    } = useAttendanceStats({ employee, attendanceRecords, onLoadRevisionHistory });

    return (
        <div className="space-y-6 print:space-y-4">
            <AttendanceHeader employee={employee} workUnit={workUnit} onBack={onBack} />

            <AttendanceFilters
                monthFilter={monthFilter} setMonthFilter={setMonthFilter}
                dateFilter={dateFilter} setDateFilter={setDateFilter}
                months={months}
            />

            <AttendanceStatsCards stats={stats} />

            <LiveHistorySection
                employee={employee}
                liveHistoryRecords={liveHistoryRecords}
                performanceMetrics={performanceMetrics}
                trendMetrics={trendMetrics}
                attendanceStatusCounts={attendanceStatusCounts}
                liveHistoryMode={liveHistoryMode} setLiveHistoryMode={setLiveHistoryMode}
                liveHistoryLimit={liveHistoryLimit} setLiveHistoryLimit={setLiveHistoryLimit}
                liveHistorySyncedAt={liveHistorySyncedAt}
                isLiveAutoRefresh={isLiveAutoRefresh} setIsLiveAutoRefresh={setIsLiveAutoRefresh}
                nextLiveRefreshIn={nextLiveRefreshIn} setNextLiveRefreshIn={setNextLiveRefreshIn}
                onRefresh={refreshLiveHistory}
            />

            <RevisionHistorySection
                employee={employee}
                loadingRevision={loadingRevision}
                filteredRevisionHistory={filteredRevisionHistory}
                pagedRevisionHistory={pagedRevisionHistory}
                revisionActionFilter={revisionActionFilter} setRevisionActionFilter={setRevisionActionFilter}
                revisionReasonFilter={revisionReasonFilter} setRevisionReasonFilter={setRevisionReasonFilter}
                revisionSearchTerm={revisionSearchTerm} setRevisionSearchTerm={setRevisionSearchTerm}
                revisionPage={revisionPage} setRevisionPage={setRevisionPage}
                revisionPageSize={revisionPageSize} setRevisionPageSize={setRevisionPageSize}
                totalRevisionPages={totalRevisionPages}
                revisionReasonOptions={revisionReasonOptions}
            />

            <ExportSection
                employee={employee}
                monthFilter={monthFilter} dateFilter={dateFilter}
                filteredRecords={filteredRecords}
                filteredRevisionHistory={filteredRevisionHistory}
                exportAttendance={exportAttendance}
                exportRevisionHistory={exportRevisionHistory}
            />
        </div>
    );
};

export default EmployeeAttendanceDetail;
