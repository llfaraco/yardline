import { spawn } from 'node:child_process';

const intervalMs = Number(process.env.MONITOR_INTERVAL_MS || 60 * 60 * 1000);
let stopping = false;
let child = null;
let timer = null;

function runCycle() {
  if (stopping) return;
  const env = { ...process.env, APP_URL: process.env.APP_URL || 'http://127.0.0.1:8080', API_URL: process.env.API_URL || 'http://127.0.0.1:3001' };
  console.log(`[Yardline monitor daemon] cycle starting: ${new Date().toISOString()}`);
  child = spawn(process.execPath, ['scripts/run-hourly-monitor.js'], { cwd: process.cwd(), env, stdio: 'inherit' });
  child.on('exit', (code, signal) => {
    child = null;
    console.log(`[Yardline monitor daemon] cycle finished code=${code ?? 'null'} signal=${signal || 'none'}`);
    if (!stopping) timer = setTimeout(runCycle, intervalMs);
  });
}

function stop(signal) {
  if (stopping) return;
  stopping = true;
  if (timer) clearTimeout(timer);
  if (child) child.kill('SIGTERM');
  console.log(`[Yardline monitor daemon] stopped by ${signal}`);
}

process.on('SIGINT', () => stop('SIGINT'));
process.on('SIGTERM', () => stop('SIGTERM'));
runCycle();
