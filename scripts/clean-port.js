#!/usr/bin/env node
// Cross-platform helper to kill any process listening on a given port

const { execSync } = require('node:child_process');

const portArg = process.argv[2];
const port = Number(portArg || process.env.PORT || 4000);

if (!Number.isInteger(port) || port <= 0) {
  console.error('[clean-port] Invalid port provided.');
  process.exit(1);
}

const isWindows = process.platform === 'win32';

try {
  if (isWindows) {
    const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
    const pids = Array.from(
      new Set(
        output
          .split(/\r?\n/)
          .map((line) => line.trim().split(/\s+/).pop())
          .filter((pid) => pid && /^\d+$/.test(pid))
      )
    );

    pids.forEach((pid) => {
      execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
    });
  } else {
    const output = execSync(`lsof -ti tcp:${port}`, { encoding: 'utf8' });
    const pids = output
      .split(/\r?\n/)
      .map((pid) => pid.trim())
      .filter((pid) => pid);

    if (pids.length) {
      execSync(`kill -9 ${pids.join(' ')}`, { stdio: 'ignore' });
    }
  }

  console.log(`[clean-port] Cleared processes on port ${port}.`);
} catch (err) {
  // If nothing is listening, netstat/lsof may throw; treat as no-op
  console.log(`[clean-port] No process found on port ${port}.`);
}
