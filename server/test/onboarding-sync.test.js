import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../../yardline-app/js/data_and_views.js', import.meta.url), 'utf8').replaceAll('\r\n', '\n');
const stateCode = source.slice(source.indexOf('let currentOnboardingStep ='), source.indexOf('function renderOnboardingStep()'));
const flowStart = source.indexOf('async function generateFirstDiagnostic()');
const flowCode = source.slice(flowStart, source.indexOf('\n// ==========================================', flowStart));

// Explicit HTTP fixtures; execute the production functions without changing DOM/design.
const synced = () => Response.json({ success: true, status: 'SUCCESS', providerLeagueId: 'fixture-league', week: 7 });
const diagnostic = () => ({ status: 'READY', league: { id: 'fixture-league' }, week: 7, user: { roster: { rosterId: 1 } } });
function setup(responses) {
  const requests = [], toasts = [], renders = [], writes = [], navigation = [];
  let context;
  const previousSnapshot = { league: { id: 'previous-fixture' }, syncedAt: '2020-01-01T00:00:00Z' };
  const root = {
    YL_API_BASE: 'http://fixture.invalid/api', activeLeagueWeek: 7,
    YL_SHELL_SNAPSHOT: previousSnapshot, YL_REFRESH_STATUS: { status: 'synced' },
    localStorage: { getItem: () => null, setItem: (...args) => writes.push(args) },
    showToast: message => toasts.push(message),
    renderOnboardingStep: () => renders.push(vm.runInContext('currentOnboardingStep', context)),
    closeModal: id => navigation.push(id), openNavTab: id => navigation.push(id),
    fetch: async (...args) => {
      requests.push(args);
      const response = responses.shift();
      if (response instanceof Error) throw response;
      assert.ok(response, 'Unexpected request in onboarding fixture');
      return typeof response === 'function' ? response(...args) : response;
    }
  };
  root.window = root;
  context = vm.createContext(root);
  vm.runInContext(stateCode + '\n' + flowCode, context);
  vm.runInContext(`currentOnboardingStep = 3;
    Object.assign(onboardingData, { selectedLeagueId: 'fixture-league', selectedLeagueName: 'Explicit Fixture League',
      sleeperUsername: 'fixture-owner', diagnosticStatus: 'SUCCESS',
      diagnosticMatchup: { status: 'READY', oldFixture: true },
      diagnosticContext: { leagueId: 'previous-fixture', username: 'fixture-owner', week: 6 } });`, context);
  return { root, context, requests, toasts, renders, writes, navigation, previousSnapshot,
    state: () => vm.runInContext('({ step: currentOnboardingStep, data: onboardingData })', context) };
}
function assertIncomplete(h, status = 'ERROR') {
  assert.equal(h.state().step, 3);
  assert.equal(h.state().data.diagnosticMatchup, null);
  assert.equal(h.state().data.diagnosticContext, null);
  assert.equal(h.state().data.diagnosticStatus, status);
  assert.ok(h.state().data.diagnosticError);
  assert.ok(!h.renders.includes(4));
  assert.equal(h.root.YL_REFRESH_STATUS.status, 'stale');
  assert.equal(h.root.YL_SHELL_SNAPSHOT, h.previousSnapshot, 'old snapshot may be retained only as stale');
  h.root.completeOnboardingFlow();
  assert.equal(h.writes.length, 0);
  assert.equal(h.navigation.length, 0);
  assert.ok(h.toasts.every(message => !message.includes('conectada com sucesso')));
}

test('onboarding HTTP 400/503 stops before diagnostic and invalidates previous success', async () => {
  for (const status of [400, 503]) {
    const h = setup([Response.json({ success: false, status: 'ERROR' }, { status })]);
    await h.root.generateFirstDiagnostic();
    assertIncomplete(h);
    assert.equal(h.requests.length, 1);
    assert.ok(h.toasts.some(message => message.includes(`HTTP ${status}`)));
  }
});

test('onboarding PARTIAL is incomplete even with HTTP 200 and success true', async () => {
  const h = setup([Response.json({ success: true, status: 'PARTIAL' })]);
  await h.root.generateFirstDiagnostic();
  assertIncomplete(h, 'PARTIAL');
  assert.equal(h.requests.length, 1);
  assert.ok(h.toasts.some(message => message.includes('PARTIAL')));
});

test('onboarding diagnostic HTTP 503 or PARTIAL never reuses the previous diagnostic', async () => {
  for (const response of [Response.json({ status: 'ERROR' }, { status: 503 }), Response.json({ status: 'PARTIAL' })]) {
    const h = setup([synced(), response]);
    await h.root.generateFirstDiagnostic();
    assertIncomplete(h, response.status === 503 ? 'ERROR' : 'PARTIAL');
    assert.equal(h.requests.length, 2);
  }
});

test('onboarding publishes only the current legitimate diagnostic and advances on success', async () => {
  const h = setup([synced(), Response.json(diagnostic())]);
  await h.root.generateFirstDiagnostic();
  assert.equal(h.state().step, 4);
  assert.equal(h.state().data.diagnosticStatus, 'SUCCESS');
  assert.equal(h.state().data.diagnosticError, null);
  assert.equal(h.state().data.diagnosticMatchup.oldFixture, undefined);
  assert.equal(JSON.stringify(h.state().data.diagnosticMatchup), JSON.stringify(diagnostic()));
  assert.equal(JSON.parse(h.requests[0][1].body).week, 7);
  assert.deepEqual(h.renders, [4]);
  h.root.completeOnboardingFlow();
  assert.ok(h.writes.some(([key, value]) => key === 'yl_onboarded_completed' && value === 'true'));
  assert.ok(h.navigation.includes('playbook'));
});

test('onboarding network/invalid JSON/missing context fail explicitly without advancing', async () => {
  for (const response of [new Error('Explicit fixture network failure'), new Response('Invalid fixture JSON', { status: 503 })]) {
    const h = setup([response]);
    await h.root.generateFirstDiagnostic();
    assertIncomplete(h);
  }
  const h = setup([]);
  h.root.activeLeagueWeek = null;
  await h.root.generateFirstDiagnostic();
  assertIncomplete(h);
  assert.equal(h.requests.length, 0);
});

test('onboarding rejects a diagnostic from another league or week', async () => {
  for (const wrong of [{ ...diagnostic(), week: 6 }, { ...diagnostic(), league: { id: 'other-fixture' } }, { status: 'NO_MATCHUP' }]) {
    const h = setup([synced(), Response.json(wrong)]);
    await h.root.generateFirstDiagnostic();
    assertIncomplete(h);
  }
  for (const wrong of [{ providerLeagueId: 'other-fixture', week: 7 }, { providerLeagueId: 'fixture-league', week: 6 }]) {
    const h = setup([Response.json({ success: true, status: 'SUCCESS', ...wrong })]);
    await h.root.generateFirstDiagnostic();
    assertIncomplete(h);
    assert.equal(h.requests.length, 1);
  }
});

test('onboarding clears old diagnostic before awaiting HTTP and ignores superseded results', async () => {
  let resolve;
  const pending = new Promise(done => { resolve = done; });
  const h = setup([() => pending, Response.json({ status: 'PARTIAL', success: false })]);
  const first = h.root.generateFirstDiagnostic();
  assert.equal(h.state().data.diagnosticMatchup, null);
  assert.equal(h.state().data.diagnosticStatus, 'SYNCING');
  await h.root.generateFirstDiagnostic();
  resolve(synced());
  await first;
  assertIncomplete(h, 'PARTIAL');
  assert.equal(h.requests.length, 2);
});

test('changing onboarding league invalidates the previous completion state', () => {
  const h = setup([]);
  h.root.setOnboardingLeague('other-fixture', 'Other Explicit Fixture');
  assert.equal(h.state().data.diagnosticMatchup, null);
  assert.equal(h.state().data.diagnosticContext, null);
  assert.equal(h.state().data.diagnosticStatus, 'idle');
  h.root.completeOnboardingFlow();
  assert.equal(h.writes.length, 0);
  assert.equal(h.navigation.length, 0);
});
