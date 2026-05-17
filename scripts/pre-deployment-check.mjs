#!/usr/bin/env node

/**
 * PRE-DEPLOYMENT VALIDATION SCRIPT
 * Run this before deploying to production to ensure all systems are ready
 * 
 * Usage:
 *   node scripts/pre-deployment-check.mjs [--strict]
 * 
 * Exit codes:
 *   0 = All checks passed
 *   1 = Warning (some checks failed but app might work)
 *   2 = Critical error (do not deploy)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const STRICT_MODE = process.argv.includes('--strict');
const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  bold: '\x1b[1m',
};

let checksPassed = 0;
let checksWarned = 0;
let checksFailed = 0;

function log(type, message) {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const prefix = `[${timestamp}]`;
  
  switch (type) {
    case 'pass':
      console.log(`${COLORS.green}✅${COLORS.reset} ${prefix} ${message}`);
      checksPassed++;
      break;
    case 'warn':
      console.log(`${COLORS.yellow}⚠️ ${COLORS.reset} ${prefix} ${message}`);
      checksWarned++;
      break;
    case 'fail':
      console.log(`${COLORS.red}❌${COLORS.reset} ${prefix} ${message}`);
      checksFailed++;
      break;
    case 'info':
      console.log(`${COLORS.blue}ℹ️ ${COLORS.reset} ${prefix} ${message}`);
      break;
    case 'title':
      console.log(`\n${COLORS.bold}${COLORS.blue}${message}${COLORS.reset}`);
      break;
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// CHECK FUNCTIONS
// ============================================================================

function checkEnvironment() {
  log('title', '🔍 Environment Variables Check');
  
  const required = [
    'VITE_DATA_SUPABASE_URL',
    'VITE_DATA_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'PORT',
  ];

  const optional = [
    'NODE_ENV',
    'CORS_ORIGIN',
    'REDIS_URL',
    'LOG_LEVEL',
  ];

  // Check required
  for (const key of required) {
    if (!process.env[key]) {
      log('fail', `Missing REQUIRED environment variable: ${key}`);
    } else {
      const value = key.includes('KEY') ? '***' : process.env[key];
      log('pass', `${key} is set (${value})`);
    }
  }

  // Check optional
  for (const key of optional) {
    if (!process.env[key]) {
      log('warn', `Optional environment variable ${key} not set (using defaults)`);
    } else {
      log('pass', `${key} is set`);
    }
  }
}

function checkNodeVersion() {
  log('title', '🟢 Node.js Version Check');
  
  const nodeVersion = process.version;
  const major = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (major < 18) {
    log('fail', `Node.js ${nodeVersion} is too old (require >= 18.0.0)`);
  } else if (major < 20) {
    log('warn', `Node.js ${nodeVersion} is supported but consider upgrading to 20+ for better performance`);
  } else {
    log('pass', `Node.js ${nodeVersion} is supported`);
  }
}

function checkDependencies() {
  log('title', '📦 Dependencies Check');
  
  const packageJsonPath = path.join(projectRoot, 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    log('fail', 'package.json not found');
    return;
  }

  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const nodeModules = path.join(projectRoot, 'node_modules');

  if (!fs.existsSync(nodeModules)) {
    log('fail', 'node_modules/ not found - run "npm install"');
    return;
  }

  const required = ['express', '@supabase/supabase-js', 'cors'];
  
  for (const dep of required) {
    const depPath = path.join(nodeModules, dep);
    if (!fs.existsSync(depPath)) {
      log('fail', `Missing dependency: ${dep}`);
    } else {
      const version = pkg.dependencies[dep] || 'unknown';
      log('pass', `${dep} is installed`);
    }
  }

  // Check for dev dependencies
  if (!fs.existsSync(path.join(nodeModules, 'typescript'))) {
    log('warn', 'TypeScript not installed (will need for local dev)');
  } else {
    log('pass', 'TypeScript is installed');
  }
}

async function checkDatabaseConnectivity() {
  log('title', '🗄️  Database Connectivity Check');
  
  const supabaseUrl = process.env.VITE_DATA_SUPABASE_URL;
  const supabaseKey = process.env.VITE_DATA_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey || !supabaseServiceKey) {
    log('warn', 'Supabase credentials not fully configured (env vars missing)');
    return;
  }

  try {
    const client = createClient(supabaseUrl, supabaseKey);
    
    // Try simple query
    const { data, error } = await client
      .from('employees')
      .select('id')
      .limit(1);

    if (error) {
      log('warn', `Database query failed: ${error.message}`);
    } else {
      log('pass', 'Database connectivity verified');
    }
  } catch (err) {
    log('fail', `Database connection error: ${err.message}`);
  }
}

function checkFilesStructure() {
  log('title', '📁 Files & Structure Check');
  
  const required = [
    'package.json',
    'tsconfig.json',
    'vite.config.ts',
    'api-server.ts',
    'server.js',
    'App.tsx',
  ];

  for (const file of required) {
    const filePath = path.join(projectRoot, file);
    if (!fs.existsSync(filePath)) {
      log('fail', `Missing critical file: ${file}`);
    } else {
      log('pass', `${file} exists`);
    }
  }

  // Check for important directories
  const dirs = ['src', 'components', 'services', 'database'];
  for (const dir of dirs) {
    const dirPath = path.join(projectRoot, dir);
    if (!fs.existsSync(dirPath)) {
      log('warn', `Directory ${dir}/ not found`);
    } else {
      log('pass', `${dir}/ directory exists`);
    }
  }
}

function checkBuildArtifacts() {
  log('title', '🏗️  Build Check');
  
  const distPath = path.join(projectRoot, 'dist');
  
  if (!fs.existsSync(distPath)) {
    log('warn', 'dist/ not found - run "npm run build" before deploying');
    return;
  }

  const requiredFiles = [
    'index.html',
    'assets',
  ];

  let allFound = true;
  for (const file of requiredFiles) {
    const filePath = path.join(distPath, file);
    if (!fs.existsSync(filePath)) {
      log('warn', `Missing build artifact: ${file}`);
      allFound = false;
    }
  }

  if (allFound) {
    const indexPath = path.join(distPath, 'index.html');
    const indexSize = fs.statSync(indexPath).size;
    log('pass', `Build artifacts ready (index.html: ${indexSize} bytes)`);
  }
}

function checkSSLCertificates() {
  log('title', '🔒 SSL Certificates Check');
  
  const sslPath = path.join(projectRoot, 'ssl');
  
  if (!fs.existsSync(sslPath)) {
    log('warn', 'ssl/ directory not found - will need to set up Let\'s Encrypt in production');
    return;
  }

  const certFiles = [
    'cert.pem',
    'key.pem',
    'fullchain.pem',
  ];

  let allFound = true;
  for (const file of certFiles) {
    const filePath = path.join(sslPath, file);
    if (!fs.existsSync(filePath)) {
      log('warn', `SSL certificate not found: ${file}`);
      allFound = false;
    }
  }

  if (allFound) {
    log('pass', 'SSL certificates found');
  }
}

function checkLogsDirectory() {
  log('title', '📝 Logs Directory Check');
  
  const logsPath = path.join(projectRoot, 'logs');
  
  if (!fs.existsSync(logsPath)) {
    log('warn', 'logs/ directory not found - creating symlink or will auto-create on first run');
  } else {
    log('pass', 'logs/ directory exists');
  }
}

function checkDatabaseBackup() {
  log('title', '💾 Database Backup Check');
  
  const backupsPath = path.join(projectRoot, 'backups');
  
  if (!fs.existsSync(backupsPath)) {
    log('fail', 'backups/ directory not found - need backup strategy before production');
    return;
  }

  const backups = fs.readdirSync(backupsPath).filter(f => f.endsWith('.sql'));
  
  if (backups.length === 0) {
    log('warn', 'No backup files found - ensure backup script is running');
  } else {
    // Get most recent backup
    const latest = backups.sort().pop();
    log('pass', `Database backups exist (latest: ${latest})`);
  }
}

function checkScripts() {
  log('title', '🔨 Scripts Check');
  
  const required = [
    'scripts/healthcheck.mjs',
    'scripts/pre-deployment-check.mjs',
  ];

  for (const script of required) {
    const scriptPath = path.join(projectRoot, script);
    if (!fs.existsSync(scriptPath)) {
      log('warn', `Script not found: ${script}`);
    } else {
      log('pass', `${script} exists`);
    }
  }
}

function checkDocumentation() {
  log('title', '📚 Documentation Check');
  
  const required = [
    'README.md',
    'docs/PRODUCTION_CHECKLIST.md',
    'API_TEST_GUIDE.md',
  ];

  for (const doc of required) {
    const docPath = path.join(projectRoot, doc);
    if (!fs.existsSync(docPath)) {
      log('warn', `Documentation not found: ${doc}`);
    } else {
      log('pass', `${doc} exists`);
    }
  }
}

// ============================================================================
// SUMMARY & EXIT
// ============================================================================

async function runAllChecks() {
  console.log(`\n${COLORS.bold}🚀 PRE-DEPLOYMENT VALIDATION${COLORS.reset}\n`);
  
  checkEnvironment();
  checkNodeVersion();
  checkDependencies();
  await checkDatabaseConnectivity();
  checkFilesStructure();
  checkBuildArtifacts();
  checkSSLCertificates();
  checkLogsDirectory();
  checkDatabaseBackup();
  checkScripts();
  checkDocumentation();

  // Summary
  console.log(`\n${COLORS.bold}📊 Summary${COLORS.reset}`);
  console.log(`  ${COLORS.green}✅ Passed${COLORS.reset}: ${checksPassed}`);
  console.log(`  ${COLORS.yellow}⚠️  Warned${COLORS.reset}: ${checksWarned}`);
  console.log(`  ${COLORS.red}❌ Failed${COLORS.reset}: ${checksFailed}`);

  // Decision
  console.log(`\n${COLORS.bold}🎯 Decision${COLORS.reset}`);
  
  if (checksFailed === 0) {
    if (checksWarned === 0) {
      console.log(`${COLORS.green}✅ All checks passed! Ready to deploy.${COLORS.reset}`);
      process.exit(0);
    } else {
      console.log(`${COLORS.yellow}⚠️  ${checksWarned} warning(s). Review before deploying.${COLORS.reset}`);
      process.exit(STRICT_MODE ? 1 : 0);
    }
  } else {
    console.log(`${COLORS.red}❌ ${checksFailed} critical failure(s). Do not deploy until fixed.${COLORS.reset}`);
    process.exit(2);
  }
}

// Run checks
await runAllChecks();
