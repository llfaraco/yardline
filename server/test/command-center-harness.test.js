import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import jsdom from 'jsdom';
import express from 'express';
import { runModalQA, runDossierQA, classifyConsoleEvents, runLocalSmoke } from '../src/modules/command-center/local-qa.js';
import { OrchestrationStore, REPO_ROOT, loadOrchestration, isActiveHandoff, isoNow } from '../src/modules/command-center/orchestration-store.js';
import { CommandCenterService } from '../src/modules/command-center/command-center.service.js';
import { createCommandCenterRouter } from '../src/modules/command-center/command-center.routes.js';

const { JSDOM } = jsdom;
const contract = loadOrchestration().dossierContract;
const cycle = () => `cycle-${crypto.randomUUID()}`;
const modalSource = fs.readFileSync(path.join(REPO_ROOT, 'yardline-app/js/data_and_views.js'), 'utf8');
const realModalCode = modalSource.slice(modalSource.indexOf('let _ylLastFocusedElement'), modalSource.indexOf('// 0. TOP NFL LIVE SCORE TICKER'));
function modalDOM(t) {
  const dom = new JSDOM('<button id="fixture-opener">Explicit test fixture opener</button><div class="yl-modal-overlay" id="player-modal" onclick="if(event.target===this)closeModal(\'player-modal\')"><div class="yl-modal-card" id="player-modal-content"></div></div>', { url: 'http://127.0.0.1:8080/', runScripts: 'dangerously' });
  dom.window.eval(realModalCode); t.after(() => dom.window.close()); return dom;
}
function dossierFixture(t, { delay = 0, hydrate = true, tabs = ['Game Logs', 'Consensus Sentiment (Coach AI)', 'Season Stats', 'Latest News & Analysis', 'Depth Chart'] } = {}) {
  const dom = modalDOM(t); const w = dom.window; const d = w.document;
  w.YL_PLAYER_CARDS = {}; w.fixtureOpened = 0;
  const opener = d.getElementById('fixture-opener');
  opener.setAttribute('onclick', 'openPlayerDossierModal("explicit-test-fixture")');
  w.openPlayerDossierModal = () => {
    w.fixtureOpened++;
    w.openModal('player-modal');
    if (!hydrate) { d.getElementById('player-modal-content').textContent = 'Jogador ainda não foi carregado no catálogo oficial.'; return; }
    const content = d.getElementById('player-modal-content'); content.innerHTML = '<div class="sleeper-dossier__identity"><h1>Explicit Fixture Athlete (not production)</h1></div>';
    for (const [i, label] of tabs.entries()) {
      const tab = d.createElement('button'); tab.textContent = label; tab.id = `fixture-tab-${i}`; tab.className = 'sleeper-tab-btn'; tab.setAttribute('aria-controls', `fixture-pane-${i}`);
      const pane = d.createElement('section'); pane.id = `fixture-pane-${i}`; pane.hidden = true; pane.textContent = 'Explicit test fixture data; never official';
      tab.onclick = () => { content.querySelectorAll('button').forEach(el => el.classList.remove('active')); content.querySelectorAll('section').forEach(el => el.hidden = true); tab.classList.add('active'); pane.hidden = false; };
      content.append(tab, pane);
    }
  };
  w.setTimeout(() => { w.YL_PLAYER_CARDS['explicit-test-fixture'] = { id: 'explicit-test-fixture', sleeperId: 'explicit-test-fixture', name: 'Explicit Fixture Athlete (not production)', fixture: true, official: false }; }, delay);
  return dom;
}
function isolated(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'yardline-harness-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true })); return new OrchestrationStore({ dataDir: dir });
}
function oldHandoff(checkId, evidence) {
  return { checkId, sourceAgent: 'agent_qa_senior', targetAgent: 'Antigravity / Team Leader + QA', title: `FAIL: ${checkId}`, priority: 'P1', observed: 'Explicit legacy QA test fixture, not real production', expected: 'Fresh exact-check evidence', reproduction: ['Run fixture regression'], evidence: [{ fixture: true, official: false, ...evidence }], affectedFiles: ['server/test/command-center-harness.test.js'], proposedNextStep: 'Review explicit fixture' };
}
const oldAria = { modalId: 'player-modal', open: true, x: true, reopen: true, escape: true, backdrop: true, focusRestored: true, roleDialog: true, ariaModal: false };

test('Harness samples aria-modal while open and accepts real closeModal cleanup', async t => {
  const dom = modalDOM(t);
  const check = await runModalQA(dom.window, 'player-modal');
  assert.equal(check.status, 'PASS'); assert.equal(check.evidence.ariaModal, true);
  assert.equal(check.evidence.closedAriaRemoved, true);
  assert.equal(dom.window.document.getElementById('player-modal').hasAttribute('aria-modal'), false);
});
test('Harness still FAILs a real missing open-state aria-modal, not masked by cleanup fix', async t => {
  const dom = modalDOM(t); const open = dom.window.openModal;
  dom.window.openModal = id => { open(id); dom.window.document.getElementById(id).removeAttribute('aria-modal'); };
  const check = await runModalQA(dom.window, 'player-modal');
  assert.equal(check.status, 'FAIL'); assert.equal(check.evidence.ariaModal, false);
});
test('Dossier waits for DOM canonical identity and clicks actual opener; exercises all five observed tabs', async t => {
  const dom = dossierFixture(t, { delay: 80 });
  const checks = await runDossierQA(dom.window, contract, { timeoutMs: 500 });
  assert.equal(dom.window.fixtureOpened, 1);
  const summary = checks.find(c => c.id === 'qa.dossier');
  assert.equal(summary.evidence.modalOpen, true); assert.equal(summary.evidence.hydrated, true);
  assert.equal(summary.evidence.observedTabs.length, 5);
  assert.equal(summary.evidence.actualInteractions.length, 5);
  assert.ok(summary.evidence.actualInteractions.every(c => c.selected && c.paneVisible));
  assert.equal(checks.find(c => c.id === 'qa.dossier.tab.latest-news').status, 'PASS');
  assert.equal(checks.find(c => c.id === 'qa.dossier.tab.news-analysis').status, 'PASS');
  assert.equal(checks.find(c => c.id === 'qa.dossier.observed.sentiment').status, 'PASS');
  assert.deepEqual(checks.filter(c => c.status === 'FAIL').map(c => c.id), ['qa.dossier.tab.outlook', 'qa.dossier.tab.leagues', 'qa.dossier.tab.full-profile']);
  assert.ok(checks.filter(c => c.status === 'FAIL').every(c => c.evidence.hydrated && c.evidence.modalOpen));
});
test('Missing catalog/opener never turns into eight missing-tab FAILs', async t => {
  const dom = modalDOM(t); dom.window.YL_PLAYER_CARDS = {};
  const checks = await runDossierQA(dom.window, contract, { timeoutMs: 80 });
  assert.equal(checks.length, 1); assert.equal(checks[0].id, 'qa.dossier'); assert.equal(checks[0].status, 'BLOCKED');
  assert.equal(checks[0].evidence.hydrated, false);
});
test('Open but unhydrated modal stays BLOCKED without missing-tab declarations', async t => {
  const dom = dossierFixture(t, { hydrate: false });
  const checks = await runDossierQA(dom.window, contract, { timeoutMs: 100 });
  assert.equal(checks.length, 1); assert.equal(checks[0].status, 'BLOCKED');
  assert.equal(checks[0].evidence.modalOpen, true); assert.equal(checks[0].evidence.hydrated, false);
});
test('Intentional font/resource denial is NOT_VERIFIABLE; real TypeError remains FAIL with stack/logs', () => {
  const denied = [{ method: 'GET', url: 'https://fonts.example.invalid/font.css', intentional: true }];
  const events = [{ kind: 'jsdomError', type: 'resource-loading', url: denied[0].url, message: 'Could not load link' }, { kind: 'console', level: 'log', message: 'Boot log retained' }];
  const env = classifyConsoleEvents(events, denied);
  assert.equal(env.status, 'NOT_VERIFIABLE'); assert.equal(env.productErrors.length, 0); assert.equal(env.logs.length, 2);
  const real = classifyConsoleEvents([...events, { kind: 'jsdomError', type: 'unhandled-exception', causeName: 'TypeError', message: "Cannot read properties of null (reading 'proj')", stack: 'Explicit test fixture stack' }], denied);
  assert.equal(real.status, 'FAIL'); assert.equal(real.productErrors.length, 1); assert.equal(real.productErrors[0].stack, 'Explicit test fixture stack');
  assert.equal(classifyConsoleEvents([{ kind: 'console', level: 'error', causeName: 'QABoundaryError', message: 'QA sandbox blocked non-local GET/mutation' }]).status, 'NOT_VERIFIABLE');
  assert.equal(classifyConsoleEvents([{ kind: 'jsdomError', type: 'resource-loading', url: 'http://127.0.0.1:8080/missing-product.js', message: 'Could not load script' }]).status, 'FAIL');
  assert.equal(classifyConsoleEvents([{ kind: 'jsdomError', type: 'unhandled-exception', causeName: 'TypeError', message: 'QA sandbox blocked non-local GET/mutation: real null reference, not a boundary error' }]).status, 'FAIL');
  assert.equal(classifyConsoleEvents([{ kind: 'jsdomError', type: 'unhandled-exception', causeName: 'ReferenceError', message: 'Could not parse CSS: real undefined variable' }]).status, 'FAIL');
});
test('Reconciliation retracts only exact old aria/empty-tabs claims; keeps real failures and evidence, reopens exact ID', t => {
  const store = isolated(t); const first = cycle();
  const aria = store.upsertHandoff(oldHandoff('qa.modal.player-modal', oldAria), first).handoff;
  store.upsertHandoff(oldHandoff('qa.modal.real-bug', { ...oldAria, modalId: 'real-bug', x: false }), first);
  store.upsertHandoff(oldHandoff('qa.console', { errors: ["TypeError: null proj"] }), first);
  const tab = store.upsertHandoff(oldHandoff('qa.dossier.tab.game-logs', { tabs: [] }), first).handoff;
  store.upsertHandoff(oldHandoff('qa.dossier.tab.outlook', { tabs: [] }), first);
  const current = { openedVia: 'card/opener', modalOpen: true, hydrated: true, observedTabs: ['Game Logs'] };
  const checks = [{ id: 'qa.modal.player-modal', status: 'PASS', evidence: { ariaModal: true, closedAriaRemoved: true, semanticsCaptured: 'immediately after openModal, before close' } }, { id: 'qa.modal.real-bug', status: 'PASS', evidence: { ariaModal: true, closedAriaRemoved: true, semanticsCaptured: 'immediately after openModal, before close' } }, { id: 'qa.dossier.tab.game-logs', status: 'PASS', evidence: { ...current, canonicalContextObserved: true } }, { id: 'qa.dossier.tab.outlook', status: 'FAIL', evidence: { ...current, canonicalContextObserved: false } }, { id: 'qa.dossier', status: 'NOT_VERIFIABLE', evidence: current }];
  const corrections = store.reconcileHarnessFalsePositives(checks, cycle());
  assert.equal(corrections.length, 3);
  assert.equal(store.handoffs().find(h => h.id === aria.id).status, 'RETRACTED');
  assert.equal(store.handoffs().find(h => h.id === tab.id).status, 'RETRACTED');
  assert.ok(store.handoffs().filter(isActiveHandoff).some(h => h.checkId === 'qa.modal.real-bug'));
  assert.ok(store.handoffs().filter(isActiveHandoff).some(h => h.checkId === 'qa.console'));
  assert.equal(store.handoffs().find(h => h.checkId === 'qa.dossier.tab.outlook').status, 'OPEN');
  assert.equal(store.handoffs().find(h => h.id === aria.id).reviewHistory[0].previous.evidence[0].ariaModal, false);
  const repeat = store.reconcileHarnessFalsePositives(checks, cycle()); assert.equal(repeat.length, 0);
  const reopened = store.upsertHandoff(oldHandoff('qa.modal.player-modal', { ...oldAria, x: false }), cycle());
  assert.equal(reopened.action, 'REOPENED'); assert.equal(reopened.handoff.id, aria.id); assert.equal(reopened.handoff.reopenedCount, 1);
  assert.throws(() => store.transition(tab.id, { status: 'VERIFIED', actor: 'Explicit fixture operator' }), /Invalid handoff transition/);
});
test('Unobservable dossier retracts old unsupported absence claims but does not auto-verify product', t => {
  const store = isolated(t); const original = store.upsertHandoff(oldHandoff('qa.dossier.tab.latest-news', { tabs: [] }), cycle()).handoff;
  const corrections = store.reconcileHarnessFalsePositives([{ id: 'qa.dossier', status: 'BLOCKED', evidence: { openedVia: 'card/opener', hydrated: false, modalOpen: false, observedTabs: [] } }], cycle());
  assert.equal(corrections.length, 1); assert.equal(store.handoffs()[0].status, 'RETRACTED'); assert.equal(store.handoffs()[0].id, original.id);
  assert.equal(store.handoffs()[0].verification, undefined);
});
test('Versioned dossier references/API and UI carry explicit Team Leader handoff and NOT_VERIFIABLE limits', async t => {
  const store = isolated(t); const service = new CommandCenterService(store);
  const references = service.getOrchestration().playerDossierReference;
  assert.equal(references.audit.path, 'docs/fantasypros-bijan-yardline-audit.md');
  assert.equal(references.audit.status, references.audit.available ? 'VERSIONED_REFERENCE' : 'NOT_VERIFIABLE');
  assert.equal(references.handoff.available, true);
  assert.equal(service.getContractsAndArchitecture().dossierContract.requiredTabs.length, 8);
  const app = express(); app.use('/api/command-center', createCommandCenterRouter(service));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve)); t.after(() => server.close());
  const url = `http://127.0.0.1:${server.address().port}/api/command-center/player-dossier`;
  assert.equal((await fetch(`${url}/runtime`)).status, 404);
  const response = await fetch(`${url}/handoff`); assert.equal(response.status, 200); assert.match(response.headers.get('content-type'), /text\/markdown/);
  assert.match(await response.text(), /Team Leader → Antigravity/);
  const dom = new JSDOM('<div id="cc-view-container"></div>', { url: 'http://127.0.0.1:3001/agent-command-center/', runScripts: 'outside-only' }); t.after(() => dom.window.close());
  for (const file of ['cc-store.js', 'cc-views.js']) dom.window.eval(fs.readFileSync(path.join(REPO_ROOT, 'yardline-app/agent-command-center/js', file), 'utf8'));
  dom.window.ccStore.orchestration = service.getOrchestration(); dom.window.ccStore.setTab('handoffs'); dom.window.renderCommandCenter();
  const html = dom.window.document.getElementById('cc-view-container').innerHTML;
  assert.match(html, /Bijan Robinson/); assert.match(html, /OBSERVED \/ INFERRED \/ NOT_VERIFIABLE/); assert.match(html, /RETRACTED/);
  assert.ok(dom.window.document.querySelector('a[href$="/player-dossier/handoff"]'));
});
test('Resource policy records blocked non-local resources/mutations without performing them', async () => {
  const attempted = [];
  const html = '<div id="player-modal"></div><script>fetch("https://third-party.invalid/mutation", {method:"POST"}).catch(error=>console.error(error)); fetch("http://localhost:3001/private", {method:"POST"}).catch(error=>console.error(error)); console.log("Explicit fixture log, not official data");</script>';
  const rows = await runLocalSmoke(loadOrchestration(), { domTimeoutMs: 1, allowLocalSync: false, fetchImpl: async (url, options) => {
    attempted.push({ url: String(url), method: options?.method });
    return new Response(String(url).includes('/index.html') ? html : JSON.stringify({ status: 'ONLINE', players: [] }), { headers: { 'content-type': 'application/json' } });
  } });
  assert.ok(attempted.every(r => r.method === 'GET'));
  assert.ok(attempted.every(r => new URL(r.url).hostname === '127.0.0.1'));
  const consoleCheck = rows.find(r => r.id === 'qa.console'); assert.equal(consoleCheck.status, 'NOT_VERIFIABLE');
  assert.equal(consoleCheck.evidence.deniedRequests.length, 2); assert.ok(consoleCheck.evidence.logs.some(r => r.message.includes('Explicit fixture log')));
  assert.equal(rows.filter(r => r.id.startsWith('qa.dossier.tab.')).length, 0);
});
