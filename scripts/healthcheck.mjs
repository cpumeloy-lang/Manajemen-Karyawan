#!/usr/bin/env node
/**
 * Production Health Check
 *
 * Usage:
 *   node scripts/healthcheck.mjs
 *   node scripts/healthcheck.mjs --url=https://hrms.your-domain.com
 *
 * Exit codes:
 *   0 = all checks passed
 *   1 = one or more checks failed
 */

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);

const BASE_URL = args.url || process.env.HEALTHCHECK_URL || 'http://localhost:3000';
const TIMEOUT_MS = Number(args.timeout || 10_000);

const checks = [
  { name: 'Health endpoint', path: '/api/health', expectStatus: 200, expectJson: true },
  { name: 'SPA index', path: '/', expectStatus: 200 },
];

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m',
};

async function check(name, path, expectStatus, expectJson) {
  const url = `${BASE_URL}${path}`;
  const start = Date.now();

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    const duration = Date.now() - start;
    const status = res.status;

    if (status !== expectStatus) {
      return { name, ok: false, msg: `HTTP ${status} (expected ${expectStatus})`, duration };
    }

    if (expectJson) {
      const body = await res.json();
      if (body.status !== 'healthy') {
        return { name, ok: false, msg: `status=${body.status}`, duration };
      }
      return { name, ok: true, msg: `uptime ${Math.round(body.uptime)}s`, duration };
    }

    return { name, ok: true, msg: 'OK', duration };
  } catch (err) {
    return { name, ok: false, msg: err.message, duration: Date.now() - start };
  }
}

console.log(`\n🏥 HRMS Pro Health Check — ${BASE_URL}\n`);

const results = await Promise.all(checks.map((c) => check(c.name, c.path, c.expectStatus, c.expectJson)));

let allOk = true;
for (const r of results) {
  const icon = r.ok ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
  const time = `${r.duration}ms`.padStart(7);
  console.log(`  ${icon} ${r.name.padEnd(20)} ${time}  ${r.msg}`);
  if (!r.ok) allOk = false;
}

console.log();
if (allOk) {
  console.log(`${colors.green}All checks passed${colors.reset}\n`);
  process.exit(0);
} else {
  console.log(`${colors.red}One or more checks FAILED${colors.reset}\n`);
  process.exit(1);
}
