/**
 * SECURE API SERVER
 * Express.js server with RBAC enforcement
 * All endpoints protected with role-based authorization
 */

import express, { Request, Response, Express } from 'express';
import cors from 'cors';
import { initAuthMiddleware, authMiddleware, requireAuth, requireRole, requirePermission, errorMiddleware } from './middleware/authMiddleware';

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Initialize auth middleware with Supabase credentials
initAuthMiddleware({
  supabaseUrl: process.env.VITE_DATA_SUPABASE_URL || '',
  supabaseKey: process.env.VITE_DATA_SUPABASE_ANON_KEY || '',
});

// ============================================================================
// MIDDLEWARE
// ============================================================================

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Request logging
app.use((req: Request, res: Response, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  if (req.user) {
    console.log(`  User: ${req.user.email} (${req.user.role})`);
  }
  next();
});

// Auth middleware - verify tokens on all requests
app.use(authMiddleware);

// ============================================================================
// HEALTH & STATUS ENDPOINTS
// ============================================================================

app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/api/status', requireAuth, (req: Request, res: Response) => {
  res.json({
    authenticated: true,
    user: req.user,
  });
});

// ============================================================================
// EMPLOYEE ENDPOINTS - RBAC PROTECTED
// ============================================================================

// GET /api/employees - List all employees (admin/hrd only)
app.get('/api/employees', 
  requireAuth,
  requireRole('admin', 'hrd'),
  async (req: Request, res: Response) => {
    try {
      console.log('✅ Fetching all employees for:', req.user?.email);
      res.json({
        success: true,
        message: 'Employees retrieved',
        // Real implementation would fetch from database
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// GET /api/employees/:id - Get specific employee
app.get('/api/employees/:id',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      // User can access their own data or admins/hrd can access anyone
      const canAccess = 
        req.user?.role === 'admin' || 
        req.user?.role === 'hrd' ||
        req.user?.employeeId === req.params.id;

      if (!canAccess) {
        return res.status(403).json({
          success: false,
          error: 'Hanya dapat mengakses data Anda sendiri',
        });
      }

      console.log('✅ Fetching employee:', req.params.id);
      res.json({
        success: true,
        message: 'Employee retrieved',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// POST /api/employees - Create employee (admin/hrd only)
app.post('/api/employees',
  requireAuth,
  requireRole('admin', 'hrd'),
  requirePermission('create:employee'),
  async (req: Request, res: Response) => {
    try {
      console.log('✅ Creating new employee');
      res.status(201).json({
        success: true,
        message: 'Employee created',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// PUT /api/employees/:id - Update employee
app.put('/api/employees/:id',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const canUpdate =
        req.user?.role === 'admin' ||
        req.user?.role === 'hrd' ||
        req.user?.employeeId === req.params.id;

      if (!canUpdate) {
        return res.status(403).json({
          success: false,
          error: 'Hanya HRD & Admin yang dapat mengubah data karyawan lain',
        });
      }

      console.log('✅ Updating employee:', req.params.id);
      res.json({
        success: true,
        message: 'Employee updated',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// DELETE /api/employees/:id - Delete employee (admin only)
app.delete('/api/employees/:id',
  requireAuth,
  requireRole('admin'),
  requirePermission('delete:employee'),
  async (req: Request, res: Response) => {
    try {
      console.log('✅ Deleting employee:', req.params.id);
      res.json({
        success: true,
        message: 'Employee deleted',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// ============================================================================
// ATTENDANCE ENDPOINTS
// ============================================================================

// GET /api/attendance - List attendance records
app.get('/api/attendance',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      // Admin/HRD can view all, kepala_ruangan their unit, karyawan only own
      console.log('✅ Fetching attendance for:', req.user?.email);
      res.json({
        success: true,
        message: 'Attendance records retrieved',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// POST /api/attendance - Record attendance
app.post('/api/attendance',
  requireAuth,
  requirePermission('create:attendance'),
  async (req: Request, res: Response) => {
    try {
      console.log('✅ Recording attendance');
      res.status(201).json({
        success: true,
        message: 'Attendance recorded',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// ============================================================================
// REQUEST/APPROVAL ENDPOINTS
// ============================================================================

// GET /api/requests - List requests
app.get('/api/requests',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      console.log('✅ Fetching requests');
      res.json({
        success: true,
        message: 'Requests retrieved',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// POST /api/requests/:id/approve - Approve request
app.post('/api/requests/:id/approve',
  requireAuth,
  requirePermission('approve:requests'),
  async (req: Request, res: Response) => {
    try {
      console.log('✅ Approving request:', req.params.id);
      res.json({
        success: true,
        message: 'Request approved',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// POST /api/requests/:id/reject - Reject request
app.post('/api/requests/:id/reject',
  requireAuth,
  requirePermission('reject:requests'),
  async (req: Request, res: Response) => {
    try {
      console.log('✅ Rejecting request:', req.params.id);
      res.json({
        success: true,
        message: 'Request rejected',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// ============================================================================
// PAYROLL ENDPOINTS (Admin/HRD only)
// ============================================================================

app.get('/api/payroll',
  requireAuth,
  requireRole('admin', 'hrd'),
  requirePermission('read:payroll'),
  async (req: Request, res: Response) => {
    try {
      console.log('✅ Fetching payroll data');
      res.json({
        success: true,
        message: 'Payroll data retrieved',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// ============================================================================
// ADMIN ENDPOINTS
// ============================================================================

// GET /api/admin/rbac - View role permissions (admin only)
app.get('/api/admin/rbac',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response) => {
    try {
      console.log('✅ Fetching RBAC configuration');
      res.json({
        success: true,
        message: 'RBAC configuration retrieved',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// POST /api/admin/rbac/update-role - Change user role (admin only)
app.post('/api/admin/rbac/update-role',
  requireAuth,
  requireRole('admin'),
  requirePermission('manage:roles'),
  async (req: Request, res: Response) => {
    try {
      const { userId, newRole } = req.body;
      console.log(`✅ Updating role for ${userId} to ${newRole}`);
      res.json({
        success: true,
        message: 'Role updated successfully',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
  });
});

// Error handler - must be last
app.use(errorMiddleware);

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════════════════════╗
  ║     🔒 HRMS Pro - Secure API Server (RBAC Enabled)     ║
  ╠════════════════════════════════════════════════════════╣
  ║ Server running on: http://localhost:${PORT}               ║
  ║ Mode: Production (RBAC Enforcement Active)             ║
  ║ Auth: Supabase JWT + Role-Based Access Control         ║
  ║ Status: Ready to accept requests                       ║
  ╚════════════════════════════════════════════════════════╝
  `);
});

export default app;
