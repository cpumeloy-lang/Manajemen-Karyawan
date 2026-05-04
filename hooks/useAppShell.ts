/**
 * useAppShell.ts
 * Manages app shell state: portal selection, view routing, data organization
 * Extracted from App.tsx to reduce complexity
 */

import { useMemo, useEffect } from 'react';
import { useAuth, useAppData, useUI, useUIActions } from '../stores/appStore';
import { isAdminRole, isHrRole, isKepalaRuanganRole } from '../utils/roleUtils';
import { RequestStatus } from '../types';
import type { View, Document, SortKey } from '../types';

export interface AppShellState {
  // Portal & auth
  activePortal: 'personal' | 'operational' | null;
  authUser: ReturnType<typeof useAuth>['authUser'];
  canAccessOperationalPortal: boolean;

  // Views
  effectiveView: View;
  isPersonalView: boolean;

  // Data
  employees: ReturnType<typeof useAppData>['employees'];
  employeesWithDocuments: Array<any>;
  sortedAndFilteredEmployees: Array<any>;

  // UI state
  pendingRequestsCount: number;
  dataLoading: boolean;
}

export interface AppShellActions {
  handlePortalChange: (nextPortal: 'personal' | 'operational', source: 'selector' | 'toggle') => void;
  handleSort: (key: SortKey) => void;
}

/**
 * Centralizes all app shell logic in one place
 * Returns both state and action handlers
 */
export const useAppShell = (): [AppShellState, AppShellActions] => {
  // Get all required state
  const { authUser } = useAuth();
  const {
    employees,
    documents,
    allRequests,
    dataLoading,
  } = useAppData();

  const {
    activePortal,
    view,
    searchTerm,
    sortKey,
    sortDirection,
  } = useUI();

  const {
    setActivePortal,
    setView,
    setSortKey,
    setSortDirection,
  } = useUIActions();

  // Check if user can access operational portal
  const canAccessOperationalPortal = useMemo(() => {
    if (!authUser) return false;
    return (
      isAdminRole(authUser.profile.role) ||
      isHrRole(authUser.profile.role) ||
      isKepalaRuanganRole(authUser.profile.role)
    );
  }, [authUser]);

  // Force personal portal if no access to operational
  useEffect(() => {
    if (!authUser) return;
    if (!canAccessOperationalPortal && activePortal !== 'personal') {
      setActivePortal('personal');
      setView('personal-dashboard');
    }
  }, [authUser, canAccessOperationalPortal, activePortal, setActivePortal, setView]);

  // Determine effective view based on portal and current view
  const effectiveView = useMemo<View>(() => {
    if (activePortal === 'personal') {
      if (view === 'personal-dashboard' || view === 'ess') return view;
      return 'personal-dashboard';
    }

    if (activePortal === 'operational') {
      if (view === 'personal-dashboard' || view === 'ess') return 'dashboard';
      return view;
    }

    return view;
  }, [activePortal, view]);

  // Combine employees with their documents
  const employeesWithDocuments = useMemo(() => {
    const docsByEmployee = documents.reduce((acc, doc) => {
      (acc[doc.employeeId] = acc[doc.employeeId] || []).push(doc);
      return acc;
    }, {} as Record<string, Document[]>);

    return employees.map((emp) => ({
      ...emp,
      documents: docsByEmployee[emp.id] || [],
    }));
  }, [employees, documents]);

  // Apply search and sort, with role-based filtering for kepala ruangan
  const sortedAndFilteredEmployees = useMemo(() => {
    let filteredEmployees = [...employeesWithDocuments];

    // Filter by unit for kepala ruangan
    if (isKepalaRuanganRole(authUser?.profile?.role)) {
      const userUnitId = authUser?.profile?.unitKerjaId;
      if (userUnitId) {
        filteredEmployees = filteredEmployees.filter((e) => e.unitKerjaId === userUnitId);
      }
    }

    // Apply search filter
    filteredEmployees = filteredEmployees.filter((e) =>
      e.nama.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Apply sorting
    return filteredEmployees.sort((a, b) => {
      const aVal = a[sortKey as keyof typeof a] || '';
      const bVal = b[sortKey as keyof typeof b] || '';
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [employeesWithDocuments, searchTerm, sortKey, sortDirection, authUser]);

  // Count pending requests
  const pendingRequestsCount = useMemo(() => {
    return allRequests.filter((req) => req.status === RequestStatus.Pending).length;
  }, [allRequests]);

  // Check if current view is personal view
  const personalViews: View[] = ['personal-dashboard', 'ess'];
  const isPersonalView = personalViews.includes(effectiveView);

  // State object
  const state: AppShellState = {
    activePortal,
    authUser,
    canAccessOperationalPortal,
    effectiveView,
    isPersonalView,
    employees,
    employeesWithDocuments,
    sortedAndFilteredEmployees,
    pendingRequestsCount,
    dataLoading,
  };

  // Action handlers
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const handlePortalChange = (nextPortal: 'personal' | 'operational', source: 'selector' | 'toggle') => {
    const previousPortal = activePortal;
    setActivePortal(nextPortal);
    setView(nextPortal === 'personal' ? 'personal-dashboard' : 'dashboard');

    // Fire-and-forget audit logging
    import('../services/portalContextAuditService').then((module) => {
      void module.logPortalSwitch(previousPortal, nextPortal, source);
    });
  };

  const actions: AppShellActions = {
    handlePortalChange,
    handleSort,
  };

  return [state, actions];
};
