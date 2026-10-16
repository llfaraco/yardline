#!/usr/bin/env node
import { orchestrationStore, isActiveHandoff } from '../src/modules/command-center/orchestration-store.js';
const [action = 'list', id, actor = 'Antigravity / Team Leader', verificationCycleId] = process.argv.slice(2);
if (action === 'list') console.log(JSON.stringify(id === '--all' ? orchestrationStore.handoffs() : orchestrationStore.handoffs().filter(isActiveHandoff), null, 2));
else {
  const statuses = { ack: 'ACKNOWLEDGED', start: 'IN_PROGRESS', verify: 'VERIFIED' };
  if (!statuses[action] || !id) throw new Error('Usage: npm run handoff -- list [--all] | ack ID ACTOR | start ID ACTOR | verify ID ACTOR CYCLE_ID');
  const result = orchestrationStore.transition(id, { status: statuses[action], actor, verificationCycleId, evidence: action === 'verify' ? [{ cycleId: verificationCycleId, source: 'Current exact-check passing report reviewed by operator' }] : undefined });
  console.log(JSON.stringify(result, null, 2));
}
