import { useCallback, useEffect, useRef } from 'react';
import logger from '../services/logger.ts';

import { authService } from '../services/AuthService';

import { dataService } from '../services/DataService';

import { Employee, Status } from '../types';

import { useAuth, useAuthActions, useAppDataActions, useAppErrorActions, useUIActions } from '../stores/appStore';

import { mapAttendanceRecordToUI, sortAttendanceByDateDesc, mapEmployeeFromDatabase } from '../utils/dataMapping';



const PERF_ENABLED = import.meta.env.DEV;

const SESSION_CHECK_STUCK_MS = 15000;

const SESSION_QUERY_TIMEOUT_MS = 12000;

const normalizeRole = (role?: string | null) => String(role || '').trim().toLowerCase();

const isOperationalRole = (role?: string | null) => {

  const normalized = normalizeRole(role);

  return normalized === 'admin' || normalized === 'hrd' || normalized === 'hr';

};



const timed = async <T>(label: string, task: () => Promise<T>): Promise<T> => {

  const startedAt = performance.now();

  try {

    return await task();

  } finally {

    if (PERF_ENABLED) {

      const elapsed = performance.now() - startedAt;

      logger.debug(`[PERF] ${label}: ${elapsed.toFixed(1)}ms`);

    }

  }

};



const withTimeout = async <T>(task: Promise<T>, timeoutMs: number, label: string): Promise<T> => {

  return new Promise<T>((resolve, reject) => {

    const timeoutId = window.setTimeout(() => {

      reject(new Error(`${label} timeout (${timeoutMs}ms)`));

    }, timeoutMs);



    task

      .then((value) => {

        window.clearTimeout(timeoutId);

        resolve(value);

      })

      .catch((error) => {

        window.clearTimeout(timeoutId);

        reject(error);

      });

  });

};



export const useAppInitialization = () => {

  const mounted = useRef(true);

  const isSessionCheckRunning = useRef(false);

  const sessionCheckStartedAt = useRef<number | null>(null);

  const perfBootstrapLogCount = useRef(0);

  const { isResetPasswordPage, authUser } = useAuth();



  const { setAuthUser, setAuthLoading, setAuthError, setIsResetPasswordPage } = useAuthActions();

  const {

    setEmployees,

    setWorkUnits,

    setDepartments,

    setPositions,

    setSystemSettings,

    setAttendanceRecords,

    setAllRequests,

    setDocuments,

    setDataLoading,

  } = useAppDataActions();

  const { setError: setAppError, setIsDatabaseError } = useAppErrorActions();

  const { setView } = useUIActions();



  const loadAdminData = useCallback(async () => {

    // Use DataService to get employees from LOCAL database

    const employeesResult = await timed('admin:employees', () => dataService.getEmployees());



    if (!employeesResult.success) {

      throw new Error(`Gagal mengambil data karyawan: ${employeesResult.error}`);

    }



    // Menggunakan mapEmployeeFromDatabase dari utils



    const employeesWithCompensation = (employeesResult.data || []).map((emp) =>

      mapEmployeeFromDatabase({

        ...emp,

        compensation: {

          gajiPokok: emp.gajiPokok || 0,

          tunjanganProfesi: emp.tunjanganProfesi || 0,

        },

      })

    );

    setEmployees(employeesWithCompensation);



    // Use DataService to get attendance, requests, documents

    const [attendanceResult, requestsResult, documentsResult] = await Promise.all([

      timed('admin:attendance', () => dataService.getAttendance()),

      timed('admin:requests', () => dataService.getRequests()),

      timed('admin:documents', () => dataService.getDocuments()),

    ]);



    if (!attendanceResult.success) {

      throw new Error(`Gagal mengambil data kehadiran: ${attendanceResult.error}`);

    }



    setAttendanceRecords(sortAttendanceByDateDesc((attendanceResult.data || []).map(mapAttendanceRecordToUI)));

    setAllRequests(requestsResult.data || []);

    setDocuments(documentsResult.data || []);

  }, [setEmployees, setAttendanceRecords, setAllRequests, setDocuments]);



  const loadEmployeeData = useCallback(

    async (employeeId: string, profile: any) => {

      const mappedProfile = mapEmployeeFromDatabase({

        ...profile,

        compensation: {

          gajiPokok: profile.gajiPokok || 0,

          tunjanganProfesi: profile.tunjanganProfesi || 0,

        },

      });



      const isKR = normalizeRole(profile.role) === 'kepala_ruangan';

      const unitId = mappedProfile.unitKerjaId || (profile as any).unit_kerja_id;



      if (isKR && unitId) {

        // Load all unit employees so Data Karyawan Unit, Kehadiran, Laporan work correctly

        const unitEmployeesResult = await timed('kr:unitEmployees', () =>

          dataService.getEmployeesByUnit(unitId)

        );

        const unitEmployees = (unitEmployeesResult.data || []).map((emp: any) =>

          mapEmployeeFromDatabase({

            ...emp,

            compensation: { gajiPokok: emp.gajiPokok || 0, tunjanganProfesi: emp.tunjanganProfesi || 0 },

          })

        );

        setEmployees(unitEmployees.length > 0 ? unitEmployees : [mappedProfile]);



        const unitEmployeeIds = unitEmployees.map((e: any) => e.id as string);

        const [attendanceResult, requestsResult, documentsResult] = await Promise.all([

          timed('kr:attendance', () => dataService.getAttendance()),

          timed('kr:requests', () => dataService.getRequests({ employeeId })),

          timed('kr:documents', () => dataService.getDocuments({ employeeId })),

        ]);



        const allAttendance = (attendanceResult.data || []).map(mapAttendanceRecordToUI);

        const unitAttendance = unitEmployeeIds.length > 0

          ? allAttendance.filter((r: any) => unitEmployeeIds.includes(r.employeeId || r.employee_id))

          : allAttendance;



        setAttendanceRecords(sortAttendanceByDateDesc(unitAttendance));

        setAllRequests(requestsResult.data || []);

        setDocuments(documentsResult.data || []);

      } else {

        setEmployees([mappedProfile]);



        const [attendanceResult, requestsResult, documentsResult] = await Promise.all([

          timed('employee:attendance', () => dataService.getAttendance({ employeeId })),

          timed('employee:requests', () => dataService.getRequests({ employeeId })),

          timed('employee:documents', () => dataService.getDocuments({ employeeId })),

        ]);



        if (!attendanceResult.success) {

          throw new Error(`Gagal mengambil data kehadiran karyawan: ${attendanceResult.error}`);

        }

        if (!requestsResult.success) {

          throw new Error(`Gagal mengambil data permohonan karyawan: ${requestsResult.error}`);

        }

        if (!documentsResult.success) {

          throw new Error(`Gagal mengambil data dokumen karyawan: ${documentsResult.error}`);

        }



        setAttendanceRecords(sortAttendanceByDateDesc((attendanceResult.data || []).map(mapAttendanceRecordToUI)));

        setAllRequests(requestsResult.data || []);

        setDocuments(documentsResult.data || []);

      }

    },

    [setEmployees, setAttendanceRecords, setAllRequests, setDocuments]

  );



  const handleSession = useCallback(async (options?: { silent?: boolean }) => {

    const isSilent = options?.silent ?? false;



    if (isSessionCheckRunning.current) {

      const elapsed = sessionCheckStartedAt.current ? performance.now() - sessionCheckStartedAt.current : 0;

      if (elapsed < SESSION_CHECK_STUCK_MS) return;



      if (PERF_ENABLED) {

        logger.warn('[PERF] session-check watchdog: forcing recovery from stale lock');

      }

      isSessionCheckRunning.current = false;

      sessionCheckStartedAt.current = null;

    }



    isSessionCheckRunning.current = true;

    sessionCheckStartedAt.current = performance.now();



    const bootstrapStartedAt = performance.now();

    if (isResetPasswordPage) {

      setAuthLoading(false);

      isSessionCheckRunning.current = false;

      sessionCheckStartedAt.current = null;

      return;

    }



    if (!isSilent) {

      setAuthLoading(true);

    }

    setAuthError(null);

    setIsDatabaseError(false);



    try {

      // Use AuthService to get session from CLOUD Supabase

      const sessionResult = await timed('auth:getSession', () => 

        withTimeout(authService.getSession(), SESSION_QUERY_TIMEOUT_MS, 'auth:getSession')

      );



      if (!mounted.current) {

        isSessionCheckRunning.current = false;

        sessionCheckStartedAt.current = null;

        return;

      }



      if (!sessionResult.success || !sessionResult.session) {

        setAuthUser(null);

        setAuthLoading(false);

        isSessionCheckRunning.current = false;

        sessionCheckStartedAt.current = null;

        return;

      }



      const session = sessionResult.session;



      // Use DataService to get employee profile from LOCAL database

      const profileResult = await timed('auth:employeeProfile', () =>

        dataService.getEmployee(session.user.id)

      );



      if (!mounted.current) {

        isSessionCheckRunning.current = false;

        sessionCheckStartedAt.current = null;

        return;

      }



      if (!profileResult.success || !profileResult.data) {

        // Sign out if employee profile not found in local DB

        await authService.logout();

        setAuthError('Akun Anda tidak terdaftar sebagai karyawan. Hubungi admin HRD.');

        setAuthUser(null);

        setAuthLoading(false);

        isSessionCheckRunning.current = false;

        sessionCheckStartedAt.current = null;

        return;

      }



      const rawProfile = profileResult.data as any;

      const profile = mapEmployeeFromDatabase(rawProfile) as Employee;



      await enforceEmployeeAccess(session.user.email, profile);
      setAuthUser({ id: session.user.id, email: session.user.email, profile });



      const [

        workUnitsResult,

        departmentsResult,

        positionsResult,

        settingsResult,

      ] = await Promise.all([

        timed('master:units', () => dataService.getWorkUnits()),

        timed('master:departments', () => dataService.getDepartments()),

        timed('master:positions', () => dataService.getPositions()),

        timed('master:system_settings', () => dataService.getSystemSettings()),

      ]);



      if (!mounted.current) {

        isSessionCheckRunning.current = false;

        sessionCheckStartedAt.current = null;

        return;

      }



      if (!workUnitsResult.success) {

        if (workUnitsResult.error?.includes('relation "public.units" does not exist')) {

          setIsDatabaseError(true);

        } else {

          throw new Error(`Gagal mengambil data unit kerja: ${workUnitsResult.error}`);

        }

        setDataLoading(false);

        setAuthLoading(false);

        isSessionCheckRunning.current = false;

        sessionCheckStartedAt.current = null;

        return;

      }



      setWorkUnits(workUnitsResult.data || []);

      setDepartments(departmentsResult.data || []);

      setPositions(positionsResult.data || []);

      setSystemSettings(settingsResult.data?.[0] || null);



      // Release initial full-screen loading as soon as auth + master data are ready.

      if (!isSilent) {

        setAuthLoading(false);

      }

      isSessionCheckRunning.current = false;

      sessionCheckStartedAt.current = null;



      // Continue loading heavy role-specific data in background.

      setDataLoading(true);

      void (async () => {

        try {

          if (isOperationalRole(profile.role)) {

            await loadAdminData();

          } else {

            await loadEmployeeData(profile.id, profile);

          }

          if (PERF_ENABLED) {

            const total = performance.now() - bootstrapStartedAt;

            // Keep early startup visibility but avoid noisy repeated logs on silent refresh.

            if (perfBootstrapLogCount.current < 3) {

              logger.debug(`[PERF] bootstrap:totalUntilBackgroundDone: ${total.toFixed(1)}ms`);

            }

            perfBootstrapLogCount.current += 1;

          }

        } catch (backgroundError: any) {

          if (!mounted.current) return;

          setAppError(`Terjadi kesalahan saat memuat data lanjutan: ${backgroundError.message}`);

        } finally {

          if (mounted.current) {

            setDataLoading(false);

          }

        }

      })();

    } catch (err: any) {

      if (!mounted.current) return;

      setAppError(`Terjadi kesalahan: ${err.message}`);

      setDataLoading(false);

      setAuthLoading(false);

    } finally {

      isSessionCheckRunning.current = false;

      sessionCheckStartedAt.current = null;

    }

  }, [
    isResetPasswordPage,
    setAuthLoading,
    setAuthError,

    setIsDatabaseError,

    setAuthUser,

    setDataLoading,

    setWorkUnits,

    setDepartments,

    setPositions,

    setSystemSettings,

    loadAdminData,

    loadEmployeeData,

    setAppError,

  ]);



  useEffect(() => {

    const recoveryCheckTimerRef = { current: null as ReturnType<typeof setTimeout> | null };

    const checkForPasswordRecovery = () => {

      const hash = window.location.hash;

      const search = window.location.search;

      const referrer = document.referrer;



      const isRecoveryUrl =

        hash.includes('type=recovery') ||

        hash.includes('access_token=') ||

        hash.includes('recovery_token=') ||

        search.includes('type=recovery') ||

        referrer.includes('/auth/v1/verify');



      if (isRecoveryUrl) {

        setIsResetPasswordPage(true);

        setAuthLoading(false);

        return true;

      }



      return false;

    };



    const isRecovery = checkForPasswordRecovery();

    if (!isRecovery) {

      // [HK-K4] Track timeout ID so it can be cleared on unmount
      recoveryCheckTimerRef.current = setTimeout(checkForPasswordRecovery, 1000);

    }



    const handleHashChange = () => {

      checkForPasswordRecovery();

    };



    window.addEventListener('hashchange', handleHashChange);

    return () => {

      window.removeEventListener('hashchange', handleHashChange);

      // [HK-K4] Clear timeout on cleanup to prevent state update after unmount
      if (recoveryCheckTimerRef.current) {
        clearTimeout(recoveryCheckTimerRef.current);
        recoveryCheckTimerRef.current = null;
      }

    };

  }, [setAuthLoading, setIsResetPasswordPage]);



  useEffect(() => {

    // Use AuthService to listen for auth state changes (local-first Supabase)

    const { data: authListener } = authService.onAuthStateChange(async (event) => {

      if (event === 'PASSWORD_RECOVERY') {

        setIsResetPasswordPage(true);

        setAuthLoading(false);

        return;

      }



      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {

        setIsResetPasswordPage(false);

        // [HK-K3] Guard: only call handleSession if component is still mounted.
        // In React StrictMode, this listener fires before the mounted.current = true
        // assignment in the last useEffect, causing handleSession to run on unmounted state.
        if (!mounted.current) return;

        await handleSession({ silent: Boolean(authUser) || event !== 'SIGNED_IN' });

      }



      if (event === 'SIGNED_OUT') {

        setAuthUser(null);

        setAuthLoading(false);

      }

    });



    return () => {

      authListener?.subscription.unsubscribe();

    };

  }, [authUser, handleSession, setAuthLoading, setAuthUser, setIsResetPasswordPage]);



  // Auto-refresh every 60s for admin/HRD + listen for manual refresh trigger

  useEffect(() => {

    if (!authUser || !isOperationalRole(authUser.profile.role)) return;



    let isRefreshing = false;

    const doRefresh = async () => {

      if (isRefreshing || !mounted.current) return;

      isRefreshing = true;

      try {

        setDataLoading(true);

        await loadAdminData();

      } catch { /* silent fail */ } finally {

        if (mounted.current) setDataLoading(false);

        isRefreshing = false;

      }

    };



    const intervalId = window.setInterval(doRefresh, 60_000);

    const onManualRefresh = () => { void doRefresh(); };

    window.addEventListener('hrms:refresh-data', onManualRefresh);



    return () => {

      window.clearInterval(intervalId);

      window.removeEventListener('hrms:refresh-data', onManualRefresh);

    };

  }, [authUser, loadAdminData, setDataLoading]);



  useEffect(() => {

    const refreshOnResume = () => {

      if (!mounted.current || !authUser) return;

      if (document.visibilityState === 'hidden') return;

      void handleSession({ silent: true });

    };



    const onVisibilityChange = () => {

      if (document.visibilityState === 'visible') {

        refreshOnResume();

      }

    };



    window.addEventListener('focus', refreshOnResume);

    window.addEventListener('online', refreshOnResume);

    document.addEventListener('visibilitychange', onVisibilityChange);



    return () => {

      window.removeEventListener('focus', refreshOnResume);

      window.removeEventListener('online', refreshOnResume);

      document.removeEventListener('visibilitychange', onVisibilityChange);

    };

  }, [authUser, handleSession]);



  useEffect(() => {

    // Ensure mounted flag is valid for each effect run (including StrictMode re-run in dev)

    mounted.current = true;



    handleSession();

    return () => {

      mounted.current = false;

    };

  }, [handleSession]);

};



const enforceEmployeeAccess = async (sessionEmail: string | undefined, profile: Employee) => {

  if (!profile) {
    throw new Error('Akun Anda tidak terdaftar sebagai karyawan. Hubungi admin HRD.');
  }

  const normalizeEmail = (email?: string | null) => email?.trim().toLowerCase() || '';

  const authEmail = normalizeEmail(sessionEmail);

  const employeeEmail = normalizeEmail(profile.email);





  if (profile.status !== Status.Aktif) {

    throw new Error('Akun karyawan Anda tidak aktif. Hubungi admin HRD.');

  }



  if (!employeeEmail || employeeEmail !== authEmail) {

    throw new Error('Email login tidak sesuai dengan data karyawan. Hubungi admin HRD.');

  }

};

