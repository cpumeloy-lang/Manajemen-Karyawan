import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import {
  Employee,
  WorkUnit,
  Department,
  Position,
  SystemSettings,
  AttendanceRecord,
  AllRequest,
  Document,
  AuthenticatedUser,
  SortDirection,
  SortKey,
  View,
} from '../types';

// ============================================================================
// STATE TYPES
// ============================================================================

interface AuthState {
  authUser: AuthenticatedUser | null;
  loading: boolean;
  error: string | null;
  isResetPasswordPage: boolean;
}

interface DataState {
  employees: Employee[];
  workUnits: WorkUnit[];
  departments: Department[];
  positions: Position[];
  systemSettings: SystemSettings | null;
  attendanceRecords: AttendanceRecord[];
  allRequests: AllRequest[];
  documents: Document[];
  dataLoading: boolean;
  isDatabaseError: boolean;
}

interface UIState {
  activePortal: 'personal' | 'operational' | null;
  view: View;
  essDefaultTab: 'overview' | 'attendance';
  isChangePasswordOpen: boolean;
  isAuditLogOpen: boolean;
  isFormOpen: boolean;
  isDetailOpen: boolean;
  isLoggingOut: boolean;
  employeeToEdit: Employee | null;
  employeeToView: Employee | null;
  searchTerm: string;
  statusFilter: string;
  departmentFilter: string;
  unitFilter: string;
  sortKey: SortKey;
  sortDirection: SortDirection;
  successMessage: string | null;
}

interface ErrorState {
  error: string | null;
}

export interface AppStore extends AuthState, DataState, UIState, ErrorState {
  // Auth actions
  setAuthUser: (user: AuthenticatedUser | null) => void;
  setAuthLoading: (loading: boolean) => void;
  setAuthError: (error: string | null) => void;
  setIsResetPasswordPage: (isReset: boolean) => void;
  logout: () => void;

  // Data actions
  setEmployees: (employees: Employee[] | ((prev: Employee[]) => Employee[])) => void;
  setWorkUnits: (units: WorkUnit[] | ((prev: WorkUnit[]) => WorkUnit[])) => void;
  setDepartments: (departments: Department[] | ((prev: Department[]) => Department[])) => void;
  setPositions: (positions: Position[] | ((prev: Position[]) => Position[])) => void;
  setSystemSettings: (settings: SystemSettings | null | ((prev: SystemSettings | null) => SystemSettings | null)) => void;
  setAttendanceRecords: (records: AttendanceRecord[] | ((prev: AttendanceRecord[]) => AttendanceRecord[])) => void;
  setAllRequests: (requests: AllRequest[] | ((prev: AllRequest[]) => AllRequest[])) => void;
  setDocuments: (documents: Document[] | ((prev: Document[]) => Document[])) => void;
  setDataLoading: (loading: boolean) => void;
  setIsDatabaseError: (isDatabaseError: boolean) => void;

  // Data modification actions
  addEmployee: (employee: Employee) => void;
  updateEmployee: (employee: Employee) => void;
  deleteEmployee: (id: string) => void;
  addAttendanceRecord: (record: AttendanceRecord) => void;
  addRequest: (request: AllRequest) => void;
  updateRequest: (request: AllRequest) => void;

  // UI actions
  setActivePortal: (portal: UIState['activePortal']) => void;
  setView: (view: UIState['view']) => void;
  setEssDefaultTab: (tab: 'overview' | 'attendance') => void;
  setIsChangePasswordOpen: (open: boolean) => void;
  setIsAuditLogOpen: (open: boolean) => void;
  setIsFormOpen: (open: boolean) => void;
  setIsDetailOpen: (open: boolean) => void;
  setIsLoggingOut: (loggingOut: boolean) => void;
  setEmployeeToEdit: (employee: Employee | null) => void;
  setEmployeeToView: (employee: Employee | null) => void;
  setSearchTerm: (term: string) => void;
  setStatusFilter: (status: string) => void;
  setDepartmentFilter: (dept: string) => void;
  setUnitFilter: (unit: string) => void;
  setSortKey: (key: SortKey) => void;
  setSortDirection: (direction: SortDirection) => void;
  setSuccessMessage: (message: string | null) => void;

  // Error actions
  setError: (error: string | null) => void;
  clearError: () => void;

  // Combined actions
  resetAuthState: () => void;
  resetAppState: () => void;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialAuthState: AuthState = {
  authUser: null,
  loading: true,
  error: null,
  isResetPasswordPage: false,
};

const initialDataState: DataState = {
  employees: [],
  workUnits: [],
  departments: [],
  positions: [],
  systemSettings: null,
  attendanceRecords: [],
  allRequests: [],
  documents: [],
  dataLoading: false,
  isDatabaseError: false,
};

const initialUIState: UIState = {
  activePortal: null,
  view: (typeof window !== 'undefined' && window.location.pathname.length > 1) 
    ? (window.location.pathname.slice(1) as View) 
    : 'dashboard',
  essDefaultTab: 'overview',
  isChangePasswordOpen: false,
  isAuditLogOpen: false,
  isFormOpen: false,
  isDetailOpen: false,
  isLoggingOut: false,
  employeeToEdit: null,
  employeeToView: null,
  searchTerm: '',
  statusFilter: '',
  departmentFilter: '',
  unitFilter: '',
  sortKey: 'nama',
  sortDirection: 'asc',
  successMessage: null,
};

const initialErrorState: ErrorState = {
  error: null,
};

// ============================================================================
// ZUSTAND STORE
// ============================================================================

export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        ...initialAuthState,
        ...initialDataState,
        ...initialUIState,
        ...initialErrorState,

        // Auth actions
        setAuthUser: (user) =>
          set({ authUser: user }, false, 'setAuthUser'),
        setAuthLoading: (loading) =>
          set({ loading }, false, 'setAuthLoading'),
        setAuthError: (error) =>
          set({ error }, false, 'setAuthError'),
        setIsResetPasswordPage: (isReset) =>
          set({ isResetPasswordPage: isReset }, false, 'setIsResetPasswordPage'),
        logout: () =>
          set(
            {
              authUser: null,
              isLoggingOut: false,
              activePortal: null,
              view: 'dashboard',
            },
            false,
            'logout'
          ),

        // Data actions
        setEmployees: (employees) => {
          const value = typeof employees === 'function' ? (employees as any)(useAppStore.getState().employees) : employees;
          set({ employees: value }, false, 'setEmployees');
        },
        setWorkUnits: (workUnits) => {
          const value = typeof workUnits === 'function' ? (workUnits as any)(useAppStore.getState().workUnits) : workUnits;
          set({ workUnits: value }, false, 'setWorkUnits');
        },
        setDepartments: (departments) => {
          const value = typeof departments === 'function' ? (departments as any)(useAppStore.getState().departments) : departments;
          set({ departments: value }, false, 'setDepartments');
        },
        setPositions: (positions) => {
          const value = typeof positions === 'function' ? (positions as any)(useAppStore.getState().positions) : positions;
          set({ positions: value }, false, 'setPositions');
        },
        setSystemSettings: (systemSettings) => {
          const value = typeof systemSettings === 'function' ? (systemSettings as any)(useAppStore.getState().systemSettings) : systemSettings;
          set({ systemSettings: value }, false, 'setSystemSettings');
        },
        setAttendanceRecords: (attendanceRecords) => {
          const value = typeof attendanceRecords === 'function' ? (attendanceRecords as any)(useAppStore.getState().attendanceRecords) : attendanceRecords;
          set({ attendanceRecords: value }, false, 'setAttendanceRecords');
        },
        setAllRequests: (allRequests) => {
          const value = typeof allRequests === 'function' ? (allRequests as any)(useAppStore.getState().allRequests) : allRequests;
          set({ allRequests: value }, false, 'setAllRequests');
        },
        setDocuments: (documents) => {
          const value = typeof documents === 'function' ? (documents as any)(useAppStore.getState().documents) : documents;
          set({ documents: value }, false, 'setDocuments');
        },
        setDataLoading: (dataLoading) =>
          set({ dataLoading }, false, 'setDataLoading'),
        setIsDatabaseError: (isDatabaseError) =>
          set({ isDatabaseError }, false, 'setIsDatabaseError'),

        // Data modification actions
        addEmployee: (employee) =>
          set(
            (state) => ({
              employees: [...state.employees, employee],
            }),
            false,
            'addEmployee'
          ),
        updateEmployee: (employee) =>
          set(
            (state) => ({
              employees: state.employees.map((e) =>
                e.id === employee.id ? employee : e
              ),
            }),
            false,
            'updateEmployee'
          ),
        deleteEmployee: (id) =>
          set(
            (state) => ({
              employees: state.employees.filter((e) => e.id !== id),
            }),
            false,
            'deleteEmployee'
          ),
        addAttendanceRecord: (record) =>
          set(
            (state) => ({
              attendanceRecords: [record, ...state.attendanceRecords],
            }),
            false,
            'addAttendanceRecord'
          ),
        addRequest: (request) =>
          set(
            (state) => ({
              allRequests: [request, ...state.allRequests],
            }),
            false,
            'addRequest'
          ),
        updateRequest: (request) =>
          set(
            (state) => ({
              allRequests: state.allRequests.map((r) =>
                r.id === request.id ? request : r
              ),
            }),
            false,
            'updateRequest'
          ),

        // UI actions
        setActivePortal: (activePortal) =>
          set({ activePortal }, false, 'setActivePortal'),
        setView: (view) =>
          set({ view }, false, 'setView'),
        setEssDefaultTab: (essDefaultTab) =>
          set({ essDefaultTab }, false, 'setEssDefaultTab'),
        setIsChangePasswordOpen: (isChangePasswordOpen) =>
          set({ isChangePasswordOpen }, false, 'setIsChangePasswordOpen'),
        setIsAuditLogOpen: (isAuditLogOpen) =>
          set({ isAuditLogOpen }, false, 'setIsAuditLogOpen'),
        setIsFormOpen: (isFormOpen) =>
          set({ isFormOpen }, false, 'setIsFormOpen'),
        setIsDetailOpen: (isDetailOpen) =>
          set({ isDetailOpen }, false, 'setIsDetailOpen'),
        setIsLoggingOut: (isLoggingOut) =>
          set({ isLoggingOut }, false, 'setIsLoggingOut'),
        setEmployeeToEdit: (employeeToEdit) =>
          set({ employeeToEdit }, false, 'setEmployeeToEdit'),
        setEmployeeToView: (employeeToView) =>
          set({ employeeToView }, false, 'setEmployeeToView'),
        setSearchTerm: (searchTerm) =>
          set({ searchTerm }, false, 'setSearchTerm'),
        setStatusFilter: (statusFilter) =>
          set({ statusFilter }, false, 'setStatusFilter'),
        setDepartmentFilter: (departmentFilter) =>
          set({ departmentFilter }, false, 'setDepartmentFilter'),
        setUnitFilter: (unitFilter) =>
          set({ unitFilter }, false, 'setUnitFilter'),
        setSortKey: (sortKey) =>
          set({ sortKey }, false, 'setSortKey'),
        setSortDirection: (sortDirection) =>
          set({ sortDirection }, false, 'setSortDirection'),
        setSuccessMessage: (successMessage) =>
          set({ successMessage }, false, 'setSuccessMessage'),

        // Error actions
        setError: (error) =>
          set({ error }, false, 'setError'),
        clearError: () =>
          set({ error: null }, false, 'clearError'),

        // Combined reset actions
        resetAuthState: () =>
          set(initialAuthState, false, 'resetAuthState'),
        resetAppState: () =>
          set(
            {
              ...initialDataState,
              ...initialUIState,
              ...initialErrorState,
            },
            false,
            'resetAppState'
          ),
      }),
      {
        name: 'hrms-app-store',
        partialize: (state) => ({
          // Only persist UI state, not auth/data (view is managed by React Router URL now)
          activePortal: state.activePortal,
          essDefaultTab: state.essDefaultTab,
          searchTerm: state.searchTerm,
          sortKey: state.sortKey,
          sortDirection: state.sortDirection,
        }),
      }
    )
  )
);

// ============================================================================
// SELECTORS (for optimization)
// ============================================================================

export const useAuth = () =>
  useAppStore(
    useShallow((state) => ({
      authUser: state.authUser,
      loading: state.loading,
      error: state.error,
      isResetPasswordPage: state.isResetPasswordPage,
    }))
  );

export const useAuthActions = () =>
  useAppStore(
    useShallow((state) => ({
      setAuthUser: state.setAuthUser,
      setAuthLoading: state.setAuthLoading,
      setAuthError: state.setAuthError,
      setIsResetPasswordPage: state.setIsResetPasswordPage,
      logout: state.logout,
    }))
  );

export const useAppData = () =>
  useAppStore(
    useShallow((state) => ({
      employees: state.employees,
      workUnits: state.workUnits,
      departments: state.departments,
      positions: state.positions,
      systemSettings: state.systemSettings,
      attendanceRecords: state.attendanceRecords,
      allRequests: state.allRequests,
      documents: state.documents,
      dataLoading: state.dataLoading,
      isDatabaseError: state.isDatabaseError,
    }))
  );

export const useAppDataActions = () =>
  useAppStore(
    useShallow((state) => ({
      setEmployees: state.setEmployees,
      setWorkUnits: state.setWorkUnits,
      setDepartments: state.setDepartments,
      setPositions: state.setPositions,
      setSystemSettings: state.setSystemSettings,
      setAttendanceRecords: state.setAttendanceRecords,
      setAllRequests: state.setAllRequests,
      setDocuments: state.setDocuments,
      setDataLoading: state.setDataLoading,
      setIsDatabaseError: state.setIsDatabaseError,
      addEmployee: state.addEmployee,
      updateEmployee: state.updateEmployee,
      deleteEmployee: state.deleteEmployee,
    }))
  );

export const useUI = () =>
  useAppStore(
    useShallow((state) => ({
      activePortal: state.activePortal,
      view: state.view,
      essDefaultTab: state.essDefaultTab,
      isChangePasswordOpen: state.isChangePasswordOpen,
      isAuditLogOpen: state.isAuditLogOpen,
      isFormOpen: state.isFormOpen,
      isDetailOpen: state.isDetailOpen,
      isLoggingOut: state.isLoggingOut,
      employeeToEdit: state.employeeToEdit,
      employeeToView: state.employeeToView,
      searchTerm: state.searchTerm,
      statusFilter: state.statusFilter,
      departmentFilter: state.departmentFilter,
      unitFilter: state.unitFilter,
      sortKey: state.sortKey,
      sortDirection: state.sortDirection,
      successMessage: state.successMessage,
    }))
  );

export const useUIActions = () =>
  useAppStore(
    useShallow((state) => ({
      setActivePortal: state.setActivePortal,
      setView: state.setView,
      setEssDefaultTab: state.setEssDefaultTab,
      setIsChangePasswordOpen: state.setIsChangePasswordOpen,
      setIsAuditLogOpen: state.setIsAuditLogOpen,
      setIsFormOpen: state.setIsFormOpen,
      setIsDetailOpen: state.setIsDetailOpen,
      setIsLoggingOut: state.setIsLoggingOut,
      setEmployeeToEdit: state.setEmployeeToEdit,
      setEmployeeToView: state.setEmployeeToView,
      setSearchTerm: state.setSearchTerm,
      setStatusFilter: state.setStatusFilter,
      setDepartmentFilter: state.setDepartmentFilter,
      setUnitFilter: state.setUnitFilter,
      setSortKey: state.setSortKey,
      setSortDirection: state.setSortDirection,
      setSuccessMessage: state.setSuccessMessage,
    }))
  );

export const useAppError = () =>
  useAppStore(
    useShallow((state) => ({
      error: state.error,
      isDatabaseError: state.isDatabaseError,
    }))
  );

export const useAppErrorActions = () =>
  useAppStore(
    useShallow((state) => ({
      setError: state.setError,
      clearError: state.clearError,
      setIsDatabaseError: state.setIsDatabaseError,
    }))
  );
