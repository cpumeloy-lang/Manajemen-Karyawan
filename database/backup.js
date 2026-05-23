#!/usr/bin/env node
/**
 * Database Backup Script
 * 
 * Usage: node database/backup.js
 * Schedule: Add to cron/scheduled task (daily at 2 AM recommended)
 * 
 * Prerequisites:
 *   - pg_dump must be installed and in PATH
 *   - SUPABASE_DB_URL env var set (e.g. postgresql://postgres:password@host:5432/postgres)
 *   - BACKUP_DIR env var (default: ./backups)
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join } from 'path';

const DB_URL = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
const BACKUP_DIR = process.env.BACKUP_DIR || join(process.cwd(), 'backups');
const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10);

if (!DB_URL) {
  console.error('❌ SUPABASE_DB_URL or DATABASE_URL environment variable is required');
  process.exit(1);
}

// Ensure backup directory exists
if (!existsSync(BACKUP_DIR)) {
  mkdirSync(BACKUP_DIR, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const filename = `hrms-backup-${timestamp}.sql`;
const filepath = join(BACKUP_DIR, filename);

try {
  console.log(`📦 Starting database backup to ${filepath}...`);
  
  execSync(`pg_dump "${DB_URL}" --no-owner --no-acl --clean --if-exists > "${filepath}"`, {
    stdio: 'inherit',
    timeout: 300000, // 5 minutes
  });

  const stats = statSync(filepath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`✅ Backup completed: ${filename} (${sizeMB} MB)`);

  // Cleanup old backups
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const files = readdirSync(BACKUP_DIR).filter(f => f.endsWith('.sql'));
  let deleted = 0;

  for (const file of files) {
    const fullPath = join(BACKUP_DIR, file);
    if (statSync(fullPath).mtimeMs < cutoff) {
      unlinkSync(fullPath);
      deleted++;
    }
  }

  if (deleted > 0) {
    console.log(`🧹 Cleaned up ${deleted} old backup(s) older than ${RETENTION_DAYS} days`);
  }

  console.log(`📁 Total backups: ${readdirSync(BACKUP_DIR).filter(f => f.endsWith('.sql')).length}`);
} catch (err) {
  console.error('❌ Backup failed:', err.message);
  process.exit(1);
}
