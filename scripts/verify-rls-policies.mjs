#!/usr/bin/env node

/**
 * RLS POLICY AUDIT SCRIPT
 * Run this script to verify Row Level Security policies are properly configured
 * 
 * Usage:
 *   node scripts/verify-rls-policies.mjs
 * 
 * Environment variables required:
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY (bypasses RLS for inspection)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Tables that should have RLS enabled
const TABLES_TO_CHECK = [
  'employees',
  'units',
  'departments',
  'positions',
  'attendance',
  'requests',
  'documents',
  'audit_logs',
  'attendance_change_requests',
  'attendance_revision_history',
  'rotation_patterns',
  'employee_schedules',
  'schedule_publish_logs',
  'system_settings',
];

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(type, message) {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  switch (type) {
    case 'pass':
      console.log(`${COLORS.green}✅${COLORS.reset} [${timestamp}] ${message}`);
      break;
    case 'warn':
      console.log(`${COLORS.yellow}⚠️ ${COLORS.reset} [${timestamp}] ${message}`);
      break;
    case 'fail':
      console.log(`${COLORS.red}❌${COLORS.reset} [${timestamp}] ${message}`);
      break;
    case 'info':
      console.log(`${COLORS.cyan}ℹ️ ${COLORS.reset} [${timestamp}] ${message}`);
      break;
  }
}

async function checkRLSEnabled(tableName) {
  try {
    const { data, error } = await adminClient
      .from('pg_tables')
      .select('rowsecurity')
      .eq('schemaname', 'public')
      .eq('tablename', tableName)
      .single();

    if (error) {
      log('fail', `Table ${tableName}: Failed to check RLS status - ${error.message}`);
      return false;
    }

    const rlsEnabled = data?.rowsecurity === true;
    if (rlsEnabled) {
      log('pass', `Table ${tableName}: RLS enabled`);
    } else {
      log('warn', `Table ${tableName}: RLS NOT enabled`);
    }
    return rlsEnabled;
  } catch (err) {
    log('fail', `Table ${tableName}: Error checking RLS - ${err.message}`);
    return false;
  }
}

async function checkRLSPolicies(tableName) {
  try {
    const { data, error } = await adminClient
      .from('pg_policies')
      .select('*')
      .eq('schemaname', 'public')
      .eq('tablename', tableName);

    if (error) {
      log('warn', `Table ${tableName}: Failed to fetch policies - ${error.message}`);
      return [];
    }

    const policies = data || [];
    if (policies.length === 0) {
      log('warn', `Table ${tableName}: No RLS policies defined`);
    } else {
      log('info', `Table ${tableName}: ${policies.length} policy(ies) found`);
      policies.forEach(policy => {
        log('info', `  - ${policy.policyname} (${policy.permissive ? 'permissive' : 'restrictive'})`);
      });
    }
    return policies;
  } catch (err) {
    log('warn', `Table ${tableName}: Error fetching policies - ${err.message}`);
    return [];
  }
}

async function main() {
  log('info', 'Starting RLS Policy Audit...\n');

  const results = {
    tablesChecked: 0,
    rlsEnabled: 0,
    rlsDisabled: 0,
    policiesFound: 0,
    issues: [],
  };

  for (const table of TABLES_TO_CHECK) {
    results.tablesChecked++;
    const rlsEnabled = await checkRLSEnabled(table);
    
    if (rlsEnabled) {
      results.rlsEnabled++;
      const policies = await checkRLSPolicies(table);
      results.policiesFound += policies.length;
      
      if (policies.length === 0) {
        results.issues.push(`${table}: RLS enabled but no policies defined`);
      }
    } else {
      results.rlsDisabled++;
      results.issues.push(`${table}: RLS not enabled`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('RLS AUDIT SUMMARY');
  console.log('='.repeat(60));
  console.log(`Tables checked: ${results.tablesChecked}`);
  console.log(`RLS enabled: ${results.rlsEnabled}`);
  console.log(`RLS disabled: ${results.rlsDisabled}`);
  console.log(`Total policies: ${results.policiesFound}`);
  console.log(`Issues found: ${results.issues.length}`);

  if (results.issues.length > 0) {
    console.log('\n' + COLORS.yellow + 'ISSUES:' + COLORS.reset);
    results.issues.forEach(issue => {
      console.log(`  - ${issue}`);
    });
    console.log('\n' + COLORS.yellow + 'Recommendation: Fix these issues before production deployment' + COLORS.reset);
    process.exit(1);
  } else {
    console.log('\n' + COLORS.green + '✅ All RLS checks passed' + COLORS.reset);
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
