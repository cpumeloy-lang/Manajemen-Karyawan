#!/usr/bin/env node
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const children = [];
let shuttingDown = false;

function start(name, args) {
  const child = spawn(process.execPath, args, {
    stdio: 'inherit',
    shell: false,
    cwd: projectRoot,
  });

  child.on('exit', (code, signal) => {
    if (shuttingDown) return;

    if (code !== 0) {
      shuttingDown = true;
      for (const other of children) {
        if (other !== child && !other.killed) {
          other.kill('SIGTERM');
        }
      }
      process.exit(code ?? 1);
    }
  });

  children.push(child);
  return child;
}

function shutdown(signal = 'SIGTERM') {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill(signal);
    }
  }

  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start('backend', ['local-server.js']);
start('frontend', [path.join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js'), '--host', '0.0.0.0']);
