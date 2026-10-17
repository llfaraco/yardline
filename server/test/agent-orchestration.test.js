import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { EventEmitter } from 'node:events';
import express from 'express';
import jsdom from 'jsdom';
import { OrchestrationStore, loadOrchestration, computeReleaseGate, isFresh, isoNow, CONFIG_PATH, REPO_ROOT } from '../src/modules/command-center/orchestration-store.js';
import { observeReference, validateReferenceURL } from '../src/modules/command-center/reference-monitor.js';
import { runMonitoringCycle, startMonitoringCycle } from '../src/modules/command-center/monitor-cycle.js';
import { currentCommit, codeHash } from '../src/modules/command-center/code-state.js';
import { CommandCenterService } from '../src/modules/command-center/command-center.service.js';
import { createCommandCenterRouter } from '../src/modules/command-center/command-center.routes.js';
import { localURL } from '../src/modules/command-center/local-qa.js';
import { createAgentStatusDTO, createIntegrationStatusDTO, createQATestDTO } from '../src/modules/command-center/command-center.dtos.js';

const config = loadOrchestration();
const cycle = () => `cycle-${crypto.randomUUID()}`;
const pause = () => new Promise(resolve => setTimeout(resolve, 5));
function isolated(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'yardline-orchestration-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return new OrchestrationStore({ dataDir: dir });
}
function bug(checkId = 'qa.test-fixture') {
  return { sourceAgent: 'agent_qa_senior', targetAgent: 'Antigravity / Team Leader + QA', priority: 'P1', checkId, title: 'Explicit test fixture: assertion failed', observed: 'Failing test-only assertion', expected: 'Passing exact assertion', reproduction: ['Run this isolated regression test'], evidence: [{ fixture: true, official: false }], affectedFiles: ['server/test/agent-orchestration.test.js'], proposedNextStep: 'Review test fixture only; never production data' };
}
function passingReport(checkId, id = cycle()) {
  const now = isoNow(); const commit = currentCommit(); const hash = codeHash();
  return { cycleId: id, fixture: true, status: 'FINISHED', currentCommit: commit, finishedCommit: commit, workingTreeHash: hash, finishedWorkingTreeHash: hash, startedAt: now, finishedAt: now, qaResults: [{ id: checkId, status: 'PASS', evidence: { fixture: true, official: false }, testedAt: now }], referenceChecks: [{ id: 'fixture.reference', status: 'PASS', evidence: { fixture: true }, checkedAt: now }], agentRuns: [], approvals: { seniorQA: 'TEST_ONLY', teamLeader: 'TEST_ONLY' } };
}

test('Orchestration has exactly 15 canonical continuously active agents with cadence and complete policy', () => {
  assert.equal(config.agents.length, 15);
  assert.equal(new Set(config.agents.map(a => a.id)).size, 15);
  for (const agent of config.agents) {
    assert.ok(['WORKING', 'WAITING_DEPENDENCY', 'NEEDS_REVIEW'].includes(agent.status));
    assert.equal(agent.cadenceMinutes, 60);
    for (const field of ['mission', 'monitorTargets', 'allowedActions', 'evidenceRequired', 'handoffTo', 'writePolicy', 'stopConditions', 'reopenRules', 'nextAction']) assert.ok(agent[field]?.length, `${agent.id}: ${field}`);
    assert.equal(agent.handoffTo, 'Manus Team Leader');
    assert.match(agent.writePolicy, /Sem edição de código/);
  }
  assert.equal(config.coordinator.name, 'Team Leader Manus');
  assert.match(config.coordinator.mission, /implementar somente após autorização operacional/);
});
test('Continuous references and QA are never COMPLETED; invalid policy is rejected', t => {
  for (const id of ['agent_sleeper_ref', 'agent_fantasypros_ref', 'agent_nfl_news', 'agent_yahoo_news', 'agent_qa_senior']) assert.notEqual(config.agents.find(a => a.id === id).status, 'COMPLETED');
  const store = isolated(t); const file = path.join(store.dataDir, 'invalid.json');
  const copy = structuredClone(config); copy.agents[1].status = 'COMPLETED'; fs.writeFileSync(file, JSON.stringify(copy));
  assert.throws(() => loadOrchestration(file), /Invalid continuous/);
});
test('Handoff deduplicates each cycle and reopens after transient PASS without auto-resolving', t => {
  const store = isolated(t); const first = cycle();
  assert.equal(store.upsertHandoff(bug(), first).action, 'NEW');
  assert.equal(store.upsertHandoff(bug(), first).action, 'EXISTING');
  assert.equal(store.upsertHandoff(bug(), cycle()).action, 'EXISTING');
  assert.equal(store.handoffs().length, 1);
  assert.equal(store.handoffs()[0].occurrences, 2);
  store.markPassingChecks(['qa.test-fixture'], cycle());
  assert.equal(store.handoffs()[0].status, 'OPEN');
  const reopened = store.upsertHandoff(bug(), cycle());
  assert.equal(reopened.action, 'REOPENED'); assert.equal(reopened.handoff.reopenedCount, 1);
  assert.equal(store.handoffs().length, 1);
  assert.equal(fs.statSync(store.handoffFile).mode & 0o777, 0o600);
});
test('VERIFIED requires fresh passing exact-check evidence; recurrence reopens same ID', async t => {
  const store = isolated(t); const initial = store.upsertHandoff(bug(), cycle()).handoff;
  assert.throws(() => store.transition(initial.id, { status: 'VERIFIED', actor: 'test operator' }), /Invalid handoff transition/);
  store.transition(initial.id, { status: 'ACKNOWLEDGED', actor: 'test operator' });
  store.transition(initial.id, { status: 'IN_PROGRESS', actor: 'test operator' });
  await pause(); const wrong = passingReport('qa.other'); store.saveReport(wrong);
  assert.throws(() => store.transition(initial.id, { status: 'VERIFIED', actor: 'test operator', evidence: [{ fixture: true }], verificationCycleId: wrong.cycleId }), /fresh passing evidence/);
  await pause(); const pass = passingReport('qa.test-fixture'); store.saveReport(pass);
  const verified = store.transition(initial.id, { status: 'VERIFIED', actor: 'test operator', evidence: [{ fixture: true, official: false }], verificationCycleId: pass.cycleId });
  assert.equal(verified.status, 'VERIFIED');
  const reopened = store.upsertHandoff(bug(), cycle()); assert.equal(reopened.action, 'REOPENED'); assert.equal(reopened.handoff.id, initial.id); assert.equal(reopened.handoff.status, 'OPEN');
});
test('Aggregate modal and dossier handoffs are retracted only when every granular check passes', t => {
  const store = isolated(t); const cycleId = cycle();
  const modal = { ...bug('qa.modal.all'), evidence: [{ modalId: 'aggregate-modal', ariaModal: false }] };
  const dossier = { ...bug('qa.dossier'), evidence: [{ tabs: [], hydrated: false, modalOpen: false }] };
  store.upsertHandoff(modal, cycleId); store.upsertHandoff(dossier, cycleId);
  const tabs = ['latest-news', 'game-logs', 'season-stats', 'outlook', 'news-analysis', 'depth-chart', 'leagues', 'full-profile'].map(tab => ({ id: `qa.dossier.tab.${tab}`, status: 'PASS', evidence: { hydrated: true, modalOpen: true }, testedAt: isoNow() }));
  const checks = [
    ...['player-modal', 'article-reader-modal', 'onboarding-modal', 'lineup-swap-modal', 'waiver-modal', 'checkout-modal', 'manager-dna-modal', 'start-sit-modal'].map(id => ({ id: `qa.modal.${id}`, status: 'PASS', evidence: { closedAriaRemoved: true }, testedAt: isoNow() })),
    ...tabs,
    { id: 'qa.dossier.observed.sentiment', status: 'PASS', evidence: { observed: true }, testedAt: isoNow() },
  ];
  const corrections = store.reconcileHarnessFalsePositives(checks, cycleId);
  assert.equal(corrections.length, 2);
  assert.ok(store.handoffs().every(row => row.status === 'RETRACTED'));
  assert.ok(store.handoffs().every(row => row.retraction.actor.includes('NOT product verification')));
});
test('External network failure is NOT_VERIFIABLE with evidence, never invented HTTP/PASS', async () => {
  let options;
  const { check } = await observeReference(config.referenceTargets.find(t => t.id === 'fantasypros.rankings'), config, { fetchImpl: async (_url, opts) => { options = opts; throw new Error('test-only network denied'); } });
  assert.equal(options.method, 'GET'); assert.equal(options.redirect, 'manual');
  assert.equal(check.status, 'NOT_VERIFIABLE'); assert.equal(check.httpStatus, null); assert.equal(check.observationType, 'NOT_VERIFIABLE');
  assert.match(check.error, /network denied/); assert.ok(check.evidence); assert.ok(check.checkedAt); assert.ok(check.latencyMs >= 0);
});
test('Observed HTTP 503 fails with evidence while HTTP 403 remains NOT_VERIFIABLE', async () => {
  const target = config.referenceTargets.find(t => t.id === 'nfl.news');
  const server = await observeReference(target, config, { fetchImpl: async () => new Response('Unavailable', { status: 503 }) });
  assert.equal(server.check.status, 'FAIL'); assert.equal(server.check.observationType, 'OBSERVED'); assert.equal(server.check.httpStatus, 503); assert.ok(server.check.evidence);
  const gate = await observeReference(target, config, { fetchImpl: async () => new Response('Blocked', { status: 403 }) });
  assert.equal(gate.check.status, 'NOT_VERIFIABLE'); assert.equal(gate.check.httpStatus, 403);
});
test('Empty official transactions are observable, but empty/malformed required player catalog fails', async () => {
  const json = value => async () => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });
  const tx = await observeReference(config.referenceTargets.find(t => t.id === 'sleeper.transactions'), config, { fetchImpl: json([]), variables: { leagueId: config.leagueId, week: 6 } });
  assert.equal(tx.check.status, 'PASS'); assert.equal(tx.check.evidence.recordCount, 0); assert.equal(tx.check.evidence.emptyCatalog, true);
  const players = await observeReference(config.referenceTargets.find(t => t.id === 'sleeper.players'), config, { fetchImpl: json({}) });
  assert.equal(players.check.status, 'FAIL'); assert.equal(players.check.evidence.emptyCatalog, true); assert.match(players.check.error, /catálogo vazio/);
});
test('Unknown week/stats stay NOT_VERIFIABLE; no invented route, redirect bypass or mutation', async () => {
  let called = false;
  const matchups = await observeReference(config.referenceTargets.find(t => t.id === 'sleeper.matchups'), config, { fetchImpl: async () => { called = true; } });
  assert.equal(matchups.check.status, 'NOT_VERIFIABLE'); assert.equal(called, false);
  const stats = await observeReference(config.referenceTargets.find(t => t.id === 'sleeper.stats'), config);
  assert.equal(stats.check.status, 'NOT_VERIFIABLE'); assert.match(stats.check.error, /Não há endpoint público documentado/);
  assert.throws(() => validateReferenceURL('http://127.0.0.1:3001/', config), /allowlist/);
  let requests = 0;
  const redirect = await observeReference(config.referenceTargets[0], config, { fetchImpl: async () => { requests++; return new Response('', { status: 302, headers: { location: 'https://private.invalid/login' } }); } });
  assert.equal(requests, 1); assert.equal(redirect.check.status, 'NOT_VERIFIABLE'); assert.match(redirect.check.error, /allowlist/);
  assert.throws(() => localURL('https://www.nfl.com/'), /loopback/);
});
test('Real cycle orchestration converts scoped failures to deduplicated handoffs and reports all required fields', async t => {
  const store = isolated(t);
  const adapters = { store, referenceRunner: async () => ({ checks: [{ id: 'nfl.news', agentId: 'agent_nfl_news', url: 'https://www.nfl.com/news/', status: 'NOT_VERIFIABLE', observationType: 'NOT_VERIFIABLE', checkedAt: isoNow(), error: 'Explicit test fixture transport failure', evidence: { fixture: true, official: false } }] }), smokeRunner: async () => [{ id: 'qa.modal.test-fixture', title: 'Fixture modal check', status: 'FAIL', severity: 'P1', testedAt: isoNow(), evidence: { fixture: true, official: false }, observedResult: 'Test-only failure' }], unitRunner: async () => ({ id: 'qa.unit', status: 'PASS', testedAt: isoNow(), evidence: { fixture: true, official: false } }) };
  const report = await runMonitoringCycle(adapters);
  for (const field of ['cycleId', 'currentCommit', 'startedAt', 'finishedAt', 'agentRuns', 'referenceChecks', 'qaResults', 'newBugs', 'reopenedBugs', 'releaseGate', 'nextActions']) assert.ok(report[field] != null, field);
  assert.equal(report.status, 'FINISHED'); assert.equal(report.agentRuns.length, 15); assert.equal(report.newBugs.length, 2); assert.equal(report.releaseGate.status, 'RELEASE BLOQUEADA');
  const second = await runMonitoringCycle(adapters); assert.equal(second.newBugs.length, 0); assert.equal(store.handoffs().length, 2);
  assert.equal(store.latest().cycleId, second.cycleId);
});
test('POST sync registers a real safe worker launch, returns cycleId and single-flights without blocking', async t => {
  const store = isolated(t); const worker = new EventEmitter(); worker.kill = () => {};
  let invocation;
  const service = new CommandCenterService(store, args => startMonitoringCycle({ ...args, launch: (...call) => { invocation = call; return worker; } }));
  const app = express(); app.use(express.json()); app.use('/api/command-center', createCommandCenterRouter(service));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  t.after(() => { worker.emit('close', 1); server.close(); });
  const url = `http://127.0.0.1:${server.address().port}/api/command-center`;
  const response = await fetch(`${url}/sync`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ command: 'never execute this', url: 'https://private.invalid' }) });
  assert.equal(response.status, 202); const body = await response.json(); assert.match(body.cycleId, /^cycle-/); assert.equal(body.status, 'QUEUED'); assert.ok(body.ok); assert.ok(body.dashboard); assert.ok(body.syncedAt);
  assert.equal(invocation[0], process.execPath); assert.match(invocation[1][0], /run-hourly-monitor\.js$/); assert.equal(invocation[2].shell, false); assert.ok(!invocation.flat().join(' ').includes('never execute this'));
  const second = await (await fetch(`${url}/sync`, { method: 'POST' })).json(); assert.equal(second.cycleId, body.cycleId); assert.equal(second.accepted, false);
  assert.equal((await (await fetch(`${url}/orchestration`)).json()).agents.length, 15);
  assert.deepEqual(await (await fetch(`${url}/handoffs`)).json(), []);
  const denied = await fetch(`${url}/handoffs/anything`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'VERIFIED' }) }); assert.equal(denied.status, 403);
});
test('Release gate blocks every non-VERIFIED P0/P1; stale and changed-code evidence never PASS', t => {
  const store = isolated(t); const pass = passingReport('qa.unit');
  assert.equal(computeReleaseGate(pass, []).status, 'RELEASE APROVADA');
  for (const priority of ['P0', 'P1']) for (const status of ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS']) assert.equal(computeReleaseGate(pass, [{ id: 'test', priority, status }]).status, 'RELEASE BLOQUEADA');
  const old = { ...pass, finishedAt: '2000-01-01T00:00:00Z' }; assert.equal(isFresh(old), false); store.saveReport(old);
  const service = new CommandCenterService(store); assert.equal(service.getDashboard().liveState, 'STALE'); assert.ok(service.getQATests().every(q => q.status !== 'PASS')); assert.equal(service.getReleaseStatus().status, 'RELEASE BLOQUEADA');
  const changed = { ...pass, finishedWorkingTreeHash: 'explicit-test-mismatching-source-hash' }; store.saveReport(changed); assert.equal(service.getDashboard().liveState, 'STALE');
  assert.equal(computeReleaseGate(changed, []).status, 'RELEASE BLOQUEADA');
});
test('No official-looking mock timestamps/build/services or authentication defaults are manufactured', t => {
  const store = isolated(t); const service = new CommandCenterService(store);
  const dashboard = service.getDashboard(); assert.equal(dashboard.liveState, 'STALE'); assert.equal(dashboard.qaSummary.pass, 0); assert.equal(dashboard.lastSyncSleeper, null); assert.equal(dashboard.services.githubSync.status, 'NOT_VERIFIABLE');
  assert.equal(createAgentStatusDTO({ id: 'test', name: 'test', role: 'test' }).updatedAt, null);
  const qa = createQATestDTO({ id: 'test', title: 'test', area: 'test' }); assert.equal(qa.testedAt, null); assert.match(qa.authState, /Sem login/);
  const integration = createIntegrationStatusDTO(); assert.equal(integration.statusCode, null); assert.equal(integration.status, 'NOT_VERIFIABLE');
  assert.ok(service.getExternalReferences().every(r => r.observationType === 'NOT_VERIFIABLE'));
});
test('Command Center renders telemetry/handoffs safely and cannot inject external evidence into inline handlers', t => {
  const { JSDOM } = jsdom; const store = isolated(t); const service = new CommandCenterService(store);
  const dom = new JSDOM('<div id="cc-view-container"></div><div id="cc-modal-overlay"></div><div id="cc-modal-container"></div>', { url: 'http://127.0.0.1:3001/agent-command-center/', runScripts: 'outside-only' });
  t.after(() => dom.window.close());
  dom.window.eval(fs.readFileSync(path.join(REPO_ROOT, 'yardline-app/agent-command-center/js/cc-store.js'), 'utf8'));
  dom.window.eval(fs.readFileSync(path.join(REPO_ROOT, 'yardline-app/agent-command-center/js/cc-views.js'), 'utf8'));
  Object.assign(dom.window.ccStore, { dashboard: service.getDashboard(), agents: service.getAgents(), qaTests: service.getQATests(), bugs: service.getBugs(), references: service.getExternalReferences(), contracts: service.getContractsAndArchitecture(), release: service.getReleaseStatus(), orchestration: service.getOrchestration(), handoffs: [{ ...bug(), id: 'handoff-test', title: '\'\"><img src=x onerror=alert(1)>', status: 'OPEN', reopenedCount: 1, updatedAt: isoNow() }] });
  for (const tab of ['dashboard','agents','qa','bugs','references','activity','contracts','release','handoffs']) { dom.window.ccStore.setTab(tab); dom.window.renderCommandCenter(); }
  const html = dom.window.document.getElementById('cc-view-container').innerHTML;
  assert.ok(html.includes('&lt;img')); assert.equal(dom.window.document.querySelector('img'), null); assert.match(html, /Antigravity/);
  assert.ok(!html.includes('JSON.stringify'));
});
