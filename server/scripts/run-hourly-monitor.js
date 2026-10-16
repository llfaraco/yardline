#!/usr/bin/env node
/** Finite monitor by default. --continuous is an explicit runtime-owned service, NOT a persistent Manus agent. */
import { setTimeout as sleep } from 'node:timers/promises';
import { runMonitoringCycle } from '../src/modules/command-center/monitor-cycle.js';
import { orchestrationStore } from '../src/modules/command-center/orchestration-store.js';

const args = process.argv.slice(2);
const continuous = args.includes('--continuous');
const cycleIndex = args.indexOf('--cycle-id');
const cycleId = cycleIndex >= 0 ? args[cycleIndex + 1] : undefined;
if (cycleId && !/^cycle-[a-f0-9-]{36}$/.test(cycleId)) throw new Error('Invalid --cycle-id');
if (continuous && cycleId) throw new Error('--continuous cannot adopt API worker cycle');
const shutdown = new AbortController();
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => shutdown.abort());

let exitCode = 0;
do {
  const cycleStart = Date.now();
  console.log(`[Yardline monitor] ${continuous ? 'DECLARED SERVICE / polling' : 'ONE FINITE CYCLE'} started at ${new Date().toISOString()}`);
  try {
    const report = await runMonitoringCycle({ cycleId });
    console.log(JSON.stringify({ cycleId: report.cycleId, status: report.status, finishedAt: report.finishedAt, releaseGate: report.releaseGate, newBugs: report.newBugs, reopenedBugs: report.reopenedBugs, reportPath: `${orchestrationStore.runtimeDir}/reports/${report.cycleId}.json` }, null, 2));
    exitCode = report.status === 'FINISHED' ? report.releaseGate.status === 'RELEASE APROVADA' ? 0 : 2 : report.status === 'RUNNING' ? 0 : 1;
  } catch (error) { console.error(error); exitCode = 1; }
  if (!continuous || shutdown.signal.aborted) break;
  const waitMs = Math.max(0, orchestrationStore.config().cadenceMinutes * 60000 - (Date.now() - cycleStart));
  console.log(`[Yardline monitor service] Next hourly start in ${Math.round(waitMs / 1000)}s; runtime must remain online. SIGTERM stops service.`);
  try { await sleep(waitMs, undefined, { signal: shutdown.signal }); }
  catch { break; }
} while (!shutdown.signal.aborted);
process.exitCode = continuous ? 0 : exitCode;
