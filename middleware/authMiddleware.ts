/**
 * AUTHORIZATION MIDDLEWARE
 * Express middleware for role-based access control
 * Validates JWT tokens and enforces role-based permissions on API endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

// Extend Express Request to include user context
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        employeeId?: string;
        unitId?: string;
      };
      authError?: string;
    }
  }
}

interface AuthMiddlewareOptions {
  supabaseUrl: string;
  supabaseKey: string;
}

let supabaseClient: any = null;

/**
 * Initialize Supabase client for auth verification
 */
export const initAuthMiddleware = (options: AuthMiddlewareOptions) => {
  supabaseClient = createClient(options.supabaseUrl, options.supabaseKey);
  console.log('✅ Auth Middleware initialized');
};

/**
 * Verify JWT token and extract user info
 */
export const verifyToken = async (token: string) => {
  if (!supabaseClient) {
    throw new Error('Auth middleware not initialized');
  }

  try {
    const { data: { user }, error } = await supabaseClient.auth.getUser(token);
    
    if (error || !user) {
      return null;
    }

    return user;
  } catch (error: any) {
    console.error('❌ Token verification error:', error.message);
    return null;
  }
};

/**
 * Get user's role from database
 */
const getUserRole = async (userId: string) => {
  if (!supabaseClient) {
    return null;
  }

  try {
    const { data, error } = await supabaseClient
      .from('employees')
      .select('id, email, role, "unitKerjaId"')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      employeeId: data.id,
      email: data.email,
      role: data.role?.toLowerCase() || 'karyawan',
      unitId: data.unitKerjaId,
    };
  } catch (error: any) {
    console.error('❌ Error fetching user role:', error.message);
    return null;
  }
};

/**
 * Middleware: Authenticate request (verify JWT token)
 * Usage: app.use(authMiddleware)
 */
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      // Allow requests without token to proceed (some endpoints may be public)
      return next();
    }

    const token = authHeader.slice(7); // Remove 'Bearer ' prefix

    // Verify token
    const authUser = await verifyToken(token);
    if (!authUser) {
      req.authError = 'Invalid or expired token';
      return next();
    }

    // Get user role and details from database
    const userContext = await getUserRole(authUser.id);
    if (!userContext) {
      req.authError = 'User not found in database';
      return next();
    }

    // Attach user context to request
    req.user = {
      id: authUser.id,
      email: userContext.email,
      role: userContext.role,
      employeeId: userContext.employeeId,
      unitId: userContext.unitId,
    };

    next();
  } catch (error: any) {
    console.error('❌ Auth middleware error:', error.message);
    req.authError = 'Authentication error';
    next();
  }
};

/**
 * Middleware: Require authentication
 * Usage: app.get('/api/protected', requireAuth, handler)
 */
export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: req.authError || 'Authentication required',
    });
  }

  next();
};

/**
 * Middleware: Require specific role(s)
 * Usage: app.post('/api/admin/users', requireRole('admin'), handler)
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Insufficient permissions. Required roles: ${allowedRoles.join(', ')}`,
      });
    }

    next();
  };
};

/**
 * Middleware: Require specific permission
 * Usage: app.delete('/api/employees/:id', requirePermission('delete:employee'), handler)
 */
const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: [
    'read:all_employees',
    'create:employee',
    'update:employee',
    'delete:employee',
    'read:all_attendance',
    'create:attendance',
    'update:attendance',
    'delete:attendance',
    'approve:requests',
    'reject:requests',
    'read:all_requests',
    'read:all_documents',
    'upload:document',
    'delete:document',
    'read:payroll',
    'create:payroll',
    'update:payroll',
    'delete:payroll',
    'manage:organization',
    'manage:system_settings',
    'manage:roles',
    'view:audit_logs',
    'export:data',
    'import:data',
  ],
  hrd: [
    'read:all_employees',
    'create:employee',
    'update:employee',
    'read:all_attendance',
    'update:attendance',
    'approve:requests',
    'reject:requests',
    'read:all_requests',
    'read:all_documents',
    'upload:document',
    'read:payroll',
    'create:payroll',
    'update:payroll',
    'view:audit_logs',
    'export:data',
    'import:data',
  ],
  kepala_ruangan: [
    'read:unit_employees',
    'read:unit_attendance',
    'update:unit_attendance',
    'approve:unit_requests',
    'reject:unit_requests',
    'read:unit_requests',
  ],
  karyawan: [
    'read:own_profile',
    'update:own_profile',
    'read:own_attendance',
    'create:own_request',
    'read:own_requests',
  ],
};

export const requirePermission = (...permissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const rolePermissions = ROLE_PERMISSIONS[req.user.role] || [];
    const hasPermission = permissions.some(permission =>
      rolePermissions.includes(permission)
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: `Permission denied. Required: ${permissions.join(' or ')}`,
      });
    }

    next();
  };
};

/**
 * Middleware: Context-aware authorization for employees
 * Checks if user can access target employee (admin/hrd can access all, others only own)
 */
export const canAccessEmployee = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  const targetEmployeeId = req.params.employeeId || req.body.employeeId;
  
  // Admin & HRD can access any employee
  if (['admin', 'hrd'].includes(req.user.role)) {
    return next();
  }

  // Others can only access their own data
  if (req.user.employeeId === targetEmployeeId) {
    return next();
  }

  return res.status(403).json({
    success: false,
    error: 'Hanya dapat mengakses data Anda sendiri',
  });
};

/**
 * Middleware: Context-aware authorization for unit data
 * Kepala ruangan can only access their unit
 */
export const canAccessUnit = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  // Admin & HRD can access any unit
  if (['admin', 'hrd'].includes(req.user.role)) {
    return next();
  }

  // Kepala ruangan can only access their unit
  if (req.user.role === 'kepala_ruangan') {
    const targetUnitId = req.params.unitId || req.body.unitId;
    if (req.user.unitId === targetUnitId) {
      return next();
    }
    return res.status(403).json({
      success: false,
      error: 'Hanya dapat mengakses unit Anda sendiri',
    });
  }

  return res.status(403).json({
    success: false,
    error: 'Hak akses terbatas',
  });
};

/**
 * Error handling middleware
 * Usage: app.use(errorMiddleware) - must be last middleware
 */
export const errorMiddleware = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('❌ API Error:', err.message);

  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
};
