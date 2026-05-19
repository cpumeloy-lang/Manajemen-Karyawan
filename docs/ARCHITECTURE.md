# HRMS Pro - Architecture Documentation

## Overview

HRMS Pro is a comprehensive Human Resource Management System built with modern web technologies. This document provides a high-level overview of the system architecture, data flow, and deployment strategy.

## Technology Stack

### Frontend
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Mobile**: React Native Expo

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL (via Supabase)
- **Cache**: Redis
- **Authentication**: Supabase Auth (JWT)

### Infrastructure
- **Deployment**: Vercel (frontend), Docker/PM2 (backend)
- **Monitoring**: Prometheus, Grafana
- **Error Tracking**: Sentry
- **CI/CD**: GitHub Actions

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
├────────────────────┬────────────────────┬──────────────────────┤
│   Web Browser      │   Mobile App       │   Admin Dashboard    │
│   (React 19)       │   (React Native)   │   (React 19)         │
└────────┬───────────┴──────────┬─────────┴──────────┬───────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │   Vercel CDN       │
                    │  (Static Assets)   │
                    └─────────┬──────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
    ┌────▼────┐         ┌────▼────┐         ┌────▼────┐
    │  API    │         │  API    │         │  API    │
    │ Server  │         │ Server  │         │ Server  │
    │(Node.js)│         │(Node.js)│         │(Node.js)│
    └────┬────┘         └────┬────┘         └────┬────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │   Load Balancer    │
                    │      (Nginx)       │
                    └─────────┬──────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
    ┌────▼────────┐   ┌──────▼──────┐   ┌────────▼────┐
    │  Supabase   │   │    Redis    │   │   Sentry    │
    │ (PostgreSQL)│   │   Cache     │   │ (Monitoring)│
    │   + Auth    │   │             │   │             │
    └─────────────┘   └─────────────┘   └─────────────┘
                              │
                    ┌─────────▼──────────┐
                    │  Prometheus +      │
                    │     Grafana        │
                    │  (Metrics & Logs)  │
                    └────────────────────┘
```

## Data Flow

### Authentication Flow

```
1. User Login
   └─> Client sends credentials to Supabase Auth
   └─> Supabase validates and returns JWT token
   └─> Client stores token (localStorage/secure storage)

2. API Request
   └─> Client includes JWT in Authorization header
   └─> API server validates token with Supabase
   └─> Extract user context (role, permissions)
   └─> RBAC middleware checks permissions
   └─> Request processed or rejected based on permissions
```

### Data Access Flow

```
1. Read Operations
   └─> Check Redis cache first
   └─> If cache miss, query Supabase
   └─> Store result in Redis (with TTL)
   └─> Return data to client

2. Write Operations
   └─> Validate input with Zod schemas
   └─> Apply RBAC permission checks
   └─> Write to Supabase
   └─> Invalidate related cache entries
   └─> Log operation to audit trail
```

### Attendance Recording Flow

```
1. Clock In/Out
   └─> Employee records attendance via mobile/web
   └─> Input validated (time, location, photo)
   └─> Face recognition (if enabled)
   └─> Data saved to attendance table
   └─> Cache invalidated
   └─> Notification sent to manager (if late/absent)

2. Attendance Verification
   └─> Manager reviews attendance
   └─> Can approve or flag for review
   └─> Changes logged in revision history
```

## Security Architecture

### Authentication & Authorization

- **Authentication**: Supabase Auth with JWT tokens
- **Authorization**: Role-Based Access Control (RBAC)
  - Roles: Admin, HRD, Kepala Ruangan, Karyawan
  - Permissions: Granular permission system
  - Row-Level Security (RLS): Enforced at database level

### Security Measures

1. **API Security**
   - Helmet.js for security headers
   - CORS configuration (strict in production)
   - Redis-based rate limiting (per IP)
   - Request validation with Zod

2. **Data Security**
   - RLS policies on all tables
   - Encrypted connections (HTTPS)
   - Sensitive data not logged
   - XSS sanitization with DOMPurify

3. **Monitoring**
   - Sentry for error tracking
   - Prometheus metrics collection
   - Alerting for critical failures

## Database Schema

### Core Tables

- **employees**: Employee records with roles and assignments
- **units**: Organizational units/departments
- **departments**: Department classifications
- **positions**: Job positions/titles
- **attendance**: Daily attendance records
- **requests**: Leave/overtime requests
- **documents**: Employee documents
- **audit_logs**: System audit trail
- **attendance_change_requests**: Attendance modification requests
- **attendance_revision_history**: Attendance change history
- **rotation_patterns**: Shift rotation patterns
- **employee_schedules**: Individual employee schedules
- **schedule_publish_logs**: Schedule publication history
- **system_settings**: Application configuration

### RLS Policies

All tables have RLS enabled with policies:
- Public read access limited (most require authentication)
- Role-based write access
- Row ownership checks for self-service operations

## Caching Strategy

### Redis Cache Keys

- `employees:*` - Employee data cache
- `organization:*` - Organization structure cache
- `units:*` - Work unit cache
- `user:{userId}` - User-specific data
- `ratelimit:{ip}` - Rate limiting data

### Cache TTL

- User data: 5 minutes
- Organization data: 30 minutes
- Static data: 1 hour
- Rate limit: 1 minute

### Cache Invalidation

- Manual: After write operations
- Pattern-based: For bulk invalidations
- User-specific: On user data changes

## Deployment Architecture

### Production Environment

```
┌─────────────────────────────────────────────────┐
│              Vercel (Frontend)                  │
│  - Static React build                           │
│  - CDN distribution                             │
│  - Automatic SSL                                │
└──────────────────┬──────────────────────────────┘
                   │
                   │ API Routes
┌──────────────────▼──────────────────────────────┐
│         Docker Swarm / PM2 Cluster              │
│  ┌──────────────┐  ┌──────────────┐            │
│  │  Server 1    │  │  Server 2    │  ...       │
│  │  (Node.js)   │  │  (Node.js)   │            │
│  └──────┬───────┘  └──────┬───────┘            │
└─────────┼──────────────────┼───────────────────┘
          │                  │
          └────────┬─────────┘
                   │
         ┌─────────▼──────────┐
         │     Nginx LB       │
         └─────────┬──────────┘
                   │
    ┌──────────────┼──────────────┐
    │              │              │
┌───▼────┐   ┌────▼────┐   ┌────▼────┐
│Supabase│   │  Redis  │   │Sentry   │
│ (DB)   │   │ (Cache) │   │ (Logs)  │
└────────┘   └─────────┘   └─────────┘
```

### Environment Variables

**Required for Production:**
- `CORS_ORIGINS`: Comma-separated list of allowed origins
- `SENTRY_DSN`: Sentry error tracking DSN
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key
- `REDIS_URL` or `REDIS_HOST`/`REDIS_PORT`: Redis connection

**Optional:**
- `INTERNAL_API_KEY`: For internal API endpoints
- `BACKUP_RETENTION_DAYS`: Backup retention period

## Monitoring & Observability

### Metrics Collection

- **Application Metrics**: Request rate, response time, error rate
- **System Metrics**: CPU, memory, disk, network
- **Database Metrics**: Query performance, connection pool
- **Cache Metrics**: Hit rate, memory usage, eviction rate

### Logging

- **Structured Logging**: JSON-formatted logs
- **Log Levels**: Error, Warn, Info, Debug
- **Centralized**: Sentry for errors, local files for debug

### Alerting

Critical alerts configured:
- Application down (> 1 min)
- High error rate (> 10%)
- Database connection failure
- Redis connection failure
- High memory usage (> 85%)
- High CPU usage (> 80%)
- Low disk space (< 20%)

## Backup & Disaster Recovery

### Database Backups

- **Automated**: Daily backups via cron job
- **Retention**: 30 days (configurable)
- **Location**: Local storage (can be extended to S3)
- **Verification**: Backup integrity checks

### Recovery Procedures

1. **Database Recovery**
   - Restore from latest backup
   - Replay transaction logs (if available)
   - Verify data integrity

2. **Cache Recovery**
   - Redis persistence enabled
   - Automatic rebuild from database on restart

## Performance Considerations

### Optimization Strategies

1. **Database**
   - Proper indexing on frequently queried columns
   - Query optimization with appropriate joins
   - Connection pooling

2. **Caching**
   - Redis for frequently accessed data
   - CDN for static assets
   - Browser caching headers

3. **API**
   - Pagination for list endpoints
   - Compression (gzip)
   - Response size optimization

### Scalability

- **Horizontal Scaling**: Multiple server instances supported
- **Load Balancing**: Nginx distributes traffic
- **Database**: Supabase handles scaling automatically
- **Cache**: Redis cluster for high availability

## Future Enhancements

- WebSocket support for real-time updates
- GraphQL API alternative
- Microservices architecture for specific features
- Advanced analytics with data warehouse
- Mobile push notifications (Expo)
- Automated testing pipeline improvements
