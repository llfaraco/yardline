import test from 'node:test';
import assert from 'node:assert/strict';
// Keep standalone runs isolated from the persistent database, too.
process.env.DATABASE_PATH = ':memory:';
const { db, initDatabase } = await import('../src/db/database.js');
const { sleeperSyncService: sync } = await import('../src/modules/sleeper/sleeper.sync.js');
const { sleeperConnector: connector } = await import('../src/modules/sleeper/sleeper.connector.js');
const { authService } = await import('../src/modules/auth/auth.service.js');
const { app } = await import('../src/server.js');
import { runLocalSmoke } from '../src/modules/command-center/local-qa.js';
import { createLeagueRefresh } from '../src/modules/sleeper/league-refresh.js';

const getNflPlayers = sync.getNflPlayers;

initDatabase();

// Explicit test-only upstream fixtures. No network or production database.
function upstream(t) {
  const state = { season: '2026', points: 10, name: 'Fixture' };
  t.mock.method(sync, 'getLeague', async id => ({ league_id: id, season: state.season, name: state.name,
    total_rosters: 1, settings: { leg: 1 }, scoring_settings: {}, roster_positions: [] }));
  t.mock.method(sync, 'getNflState', async () => ({ season: state.season, week: 1 }));
  t.mock.method(sync, 'getLeagueUsers', async () => []);
  t.mock.method(sync, 'getLeagueRosters', async () => [{ roster_id: 1, owner_id: 'fixture', players: [], starters: [] }]);
  t.mock.method(sync, 'getLeagueMatchups', async () => [{ roster_id: 1, matchup_id: 1, points: state.points, players: [] }]);
  t.mock.method(sync, 'getLeagueTransactions', async () => []);
  for (const method of ['getLeagueTradedPicks', 'getLeagueDrafts']) t.mock.method(connector, method, async () => []);
  for (const method of ['getNflStats', 'getNflProjections']) t.mock.method(connector, method, async () => ({}));
  t.mock.method(sync, 'getNflPlayers', async () => ({ catalog: {}, capturedAt: null }));
  return state;
}
const league = id => db.prepare('SELECT * FROM leagues WHERE provider_league_id=?').get(id);

async function contextFixture(t, id) {
  // Historical and contextual records are explicit test fixtures, not upstream data.
  const timestamp = '2026-10-01T00:00:00.000Z';
  db.prepare(`INSERT INTO leagues (id,provider_league_id,season,name,total_rosters,last_synced_at,created_at,updated_at)
    VALUES (?,?,'2026','Explicit context fixture',1,?,?,?)`).run(id, id, timestamp, timestamp, timestamp);
  const http = app.listen(0, '127.0.0.1');
  await new Promise(resolve => http.once('listening', resolve));
  t.after(() => new Promise(resolve => http.close(resolve)));
  const base = `http://127.0.0.1:${http.address().port}/api/leagues/${id}`;
  let sequence = 0;
  return {
    base,
    shell: async week => {
      const response = await fetch(`${base}/shell?week=${week}`);
      assert.equal(response.status, 200);
      return response.json();
    },
    record(status, context, finishedAt) {
      db.prepare(`INSERT INTO sync_runs (id,league_id,provider,resource,status,started_at,finished_at,error_message,metric_status_json)
        VALUES (?,?,'sleeper','league_full',?,?,?,?,?)`).run(`fixture_${id}_${++sequence}`, id, status, finishedAt, finishedAt,
        status === 'SUCCESS' ? null : `Explicit fixture ${status} ${context?.season}:${context?.week}`,
        JSON.stringify(context ? { context } : {}));
    }
  };
}

test('context selection ignores unscoped history even without a current run or with a newer historical timestamp', async t => {
  const fixture = await contextFixture(t, 'context-history');
  fixture.record('ERROR', null, '2026-09-02T00:00:00Z');
  let shell = await fixture.shell(7);
  assert.equal(shell.syncStatus, null);
  assert.notEqual(shell.dataStatus, 'stale');
  assert.equal(shell.syncError, null);
  fixture.record('SUCCESS', { season: '2026', week: 7 }, '2026-09-01T00:00:00Z');
  fixture.record('PARTIAL', null, '2026-09-03T00:00:00Z');
  shell = await fixture.shell(7);
  assert.equal(shell.syncStatus, 'SUCCESS');
  assert.equal(shell.dataStatus, 'synced');
});

test('context selection applies ERROR only to its exact season and week', async t => {
  const fixture = await contextFixture(t, 'context-error');
  fixture.record('ERROR', { season: '2026', week: 7 }, '2026-09-01T00:00:00Z');
  fixture.record('SUCCESS', { season: '2026', week: 8 }, '2026-09-02T00:00:00Z');
  fixture.record('SUCCESS', null, '2026-09-03T00:00:00Z');
  let shell = await fixture.shell(7);
  assert.equal(shell.syncStatus, 'ERROR');
  assert.equal(shell.dataStatus, 'stale');
  assert.match(shell.syncError, /2026:7/);
  shell = await fixture.shell(8);
  assert.equal(shell.syncStatus, 'SUCCESS');
  assert.equal(shell.dataStatus, 'synced');
  db.prepare('UPDATE leagues SET season=? WHERE id=?').run('2025', 'context-error');
  shell = await fixture.shell(7);
  assert.equal(shell.syncStatus, null);
  assert.notEqual(shell.dataStatus, 'stale');
});

test('context selection keeps PARTIAL stale and diagnostic blocked only for the matching shell', async t => {
  const fixture = await contextFixture(t, 'context-partial');
  fixture.record('PARTIAL', { season: '2026', week: 7 }, '2026-09-01T00:00:00Z');
  fixture.record('SUCCESS', { season: '2026', week: 8 }, '2026-09-02T00:00:00Z');
  fixture.record('ERROR', { season: '2025', week: 7 }, '2026-09-03T00:00:00Z');
  fixture.record('SUCCESS', null, '2026-09-04T00:00:00Z');
  const shell = await fixture.shell(7);
  assert.equal(shell.syncStatus, 'PARTIAL');
  assert.equal(shell.dataStatus, 'stale');
  assert.equal(shell.provenance.status, 'stale');
  assert.match(shell.syncError, /PARTIAL 2026:7/);
  assert.equal((await fixture.shell(8)).dataStatus, 'synced');
  const response = await fetch(`${fixture.base}/matchups/current?sleeperUserId=fixture&week=7`);
  assert.equal(response.status, 503);
  assert.equal((await response.json()).status, 'PARTIAL');
});

test('late write failure rolls back snapshot and timestamp, records ERROR, then recovers', async t => {
  const fixture = upstream(t);
  await sync.syncLeagueDetails('atomic-existing', 1);
  const before = league('atomic-existing');
  db.prepare('UPDATE leagues SET last_synced_at=? WHERE id=?').run('2020-01-01T00:00:00Z', before.id);
  fixture.name = 'Changed fixture'; fixture.points = 99;
  db.exec(`CREATE TEMP TRIGGER fail_atomic_run BEFORE INSERT ON sync_runs
    WHEN NEW.status='SUCCESS' BEGIN SELECT RAISE(ABORT, 'fixture late write failure'); END;`);
  try {
    await assert.rejects(sync.syncLeagueDetails('atomic-existing', 1), /fixture late write failure/);
    assert.equal(league('atomic-existing').last_synced_at, '2020-01-01T00:00:00Z');
    assert.equal(league('atomic-existing').name, before.name);
    assert.equal(db.prepare('SELECT score_a FROM matchups WHERE league_id=?').get(before.id).score_a, 10);
    assert.equal(db.prepare("SELECT records_written FROM sync_runs WHERE league_id=? AND status='ERROR'").get(before.id).records_written, 0);
    await assert.rejects(sync.syncLeagueDetails('atomic-new', 1), /fixture late write failure/);
    assert.equal(league('atomic-new'), undefined);
  } finally { db.exec('DROP TRIGGER fail_atomic_run'); }
  const result = await sync.syncLeagueDetails('atomic-existing', 1);
  assert.equal(result.status, 'SUCCESS');
  const run = db.prepare("SELECT finished_at FROM sync_runs WHERE league_id=? AND status='SUCCESS' ORDER BY rowid DESC").get(before.id);
  assert.equal(league('atomic-existing').last_synced_at, run.finished_at);
  assert.notEqual(run.finished_at, '2020-01-01T00:00:00Z');
});

test('upstream failure preserves timestamp; metric failure is explicit PARTIAL without advancing freshness', async t => {
  upstream(t);
  await sync.syncLeagueDetails('atomic-partial', 1);
  const before = league('atomic-partial');
  t.mock.method(sync, 'getLeagueTransactions', async () => { throw Error('fixture collection failed'); });
  await assert.rejects(sync.syncLeagueDetails('atomic-partial', 1), /collection failed/);
  assert.equal(league('atomic-partial').last_synced_at, before.last_synced_at);
  t.mock.method(sync, 'getLeagueTransactions', async () => []);
  t.mock.method(connector, 'getNflStats', async () => { throw Error('fixture metric failed'); });
  const result = await sync.syncLeagueDetails('atomic-partial', 1);
  assert.equal(result.status, 'PARTIAL');
  assert.equal(result.success, false);
  assert.ok(result.error);
  assert.equal(league('atomic-partial').last_synced_at, before.last_synced_at);
  assert.equal(JSON.parse(db.prepare("SELECT metric_status_json FROM sync_runs WHERE league_id=? AND status='PARTIAL'").get(before.id).metric_status_json).stats, 'failed');
});

test('catalog writes roll back with the snapshot and memory/TTL publish only after commit', async t => {
  upstream(t);
  t.mock.method(sync, 'getNflPlayers', getNflPlayers);
  let catalogName = 'Fixture Catalog Before';
  const catalogFetch = t.mock.method(connector, 'getPlayersCatalog', async () => ({
    'fixture-atomic-player': { player_id: 'fixture-atomic-player', full_name: catalogName, first_name: 'Fixture', last_name: catalogName, position: 'QB', team: 'BUF', active: true }
  }));
  await sync.syncLeagueDetails('atomic-catalog', 1);
  const before = league('atomic-catalog');
  const playerBefore = db.prepare('SELECT * FROM players WHERE id=?').get('fixture-atomic-player');
  const cachedBefore = sync.getCachedPlayer('fixture-atomic-player');
  const future = Date.now() + 25 * 60 * 60 * 1000;
  t.mock.method(Date, 'now', () => future);
  catalogName = 'Fixture Catalog After';
  let stagedWrites = 0;
  const originalPrepare = db.prepare.bind(db);
  // Observe that the updated catalog really was written before the late failure.
  t.mock.method(db, 'prepare', sql => {
    if (sql.includes('INSERT INTO sync_runs')) {
      const current = originalPrepare('SELECT catalog_json FROM players WHERE id=?').get('fixture-atomic-player');
      if (current?.catalog_json.includes(catalogName)) stagedWrites++;
    }
    return originalPrepare(sql);
  });
  db.exec(`CREATE TEMP TRIGGER fail_catalog_sync BEFORE INSERT ON sync_runs
    WHEN NEW.status='SUCCESS' AND NEW.league_id='${before.id}'
    BEGIN SELECT RAISE(ABORT, 'fixture failure after catalog write'); END;`);
  try {
    await assert.rejects(sync.syncLeagueDetails('atomic-catalog', 1), /after catalog write/);
    assert.ok(stagedWrites > 0);
    assert.deepEqual(db.prepare('SELECT * FROM players WHERE id=?').get('fixture-atomic-player'), playerBefore);
    assert.equal(sync.getCachedPlayer('fixture-atomic-player'), cachedBefore);
    assert.equal(league('atomic-catalog').last_synced_at, before.last_synced_at);
    const calls = catalogFetch.mock.callCount();
    await sync.getNflPlayers({ deferPersistence: true });
    assert.equal(catalogFetch.mock.callCount(), calls + 1, 'failed sync must not advance cache TTL');
    assert.equal(sync.getCachedPlayer('fixture-atomic-player'), cachedBefore);
  } finally { db.exec('DROP TRIGGER fail_catalog_sync'); }
  assert.equal((await sync.syncLeagueDetails('atomic-catalog', 1)).status, 'SUCCESS');
  assert.equal(sync.getCachedPlayer('fixture-atomic-player').name, catalogName);
});

test('HTTP, shell and diagnostic consumers propagate PARTIAL/ERROR and isolate leagues and weeks', async t => {
  upstream(t);
  const http = app.listen(0, '127.0.0.1');
  await new Promise(resolve => http.once('listening', resolve));
  t.after(() => new Promise(resolve => http.close(resolve)));
  const base = `http://127.0.0.1:${http.address().port}`;
  const { token } = authService.register({ email: 'atomic-http@example.test', password: 'Fixture-password', displayName: 'Fixture' });
  const post = (id, week = 1, path = 'sync-league') => fetch(`${base}/api/integrations/sleeper/${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ leagueId: id, week })
  });
  for (const id of ['atomic-http-a', 'atomic-http-b']) {
    const response = await post(id);
    assert.equal(response.status, 200);
    assert.deepEqual(Object.fromEntries(Object.entries(await response.json()).filter(([key]) => ['status', 'success'].includes(key))), { status: 'SUCCESS', success: true });
  }
  const aBefore = league('atomic-http-a').last_synced_at;
  const bBefore = league('atomic-http-b').last_synced_at;
  t.mock.method(connector, 'getNflStats', async () => { throw Error('fixture metric outage'); });
  for (const path of ['sync-league', 'sync']) {
    const response = await post('atomic-http-a', 2, path);
    assert.equal(response.status, 503);
    const result = await response.json();
    assert.equal(result.status, 'PARTIAL'); assert.equal(result.success, false); assert.ok(result.error);
  }
  const shell = await (await fetch(`${base}/api/leagues/atomic-http-a/shell?week=2`)).json();
  assert.equal(shell.syncStatus, 'PARTIAL'); assert.equal(shell.dataStatus, 'stale');
  assert.equal(shell.provenance.status, 'stale'); assert.ok(shell.syncError);
  assert.equal(shell.syncedAt, aBefore);
  const week1 = await (await fetch(`${base}/api/leagues/atomic-http-a/shell?week=1`)).json();
  assert.equal(week1.syncStatus, 'SUCCESS'); assert.equal(week1.dataStatus, 'synced');
  const b = await (await fetch(`${base}/api/leagues/atomic-http-b/shell?week=1`)).json();
  assert.equal(b.syncStatus, 'SUCCESS'); assert.equal(b.syncedAt, bBefore);
  t.mock.method(sync, 'buildFantasyMatchup', async () => { throw Error('incomplete diagnostic must not run'); });
  const diagnostic = await fetch(`${base}/api/leagues/atomic-http-a/matchups/current?sleeperUserId=fixture&week=2`);
  assert.equal(diagnostic.status, 503);
  assert.equal((await diagnostic.json()).status, 'PARTIAL');
  t.mock.method(sync, 'getLeagueRosters', async () => { throw Error('fixture mandatory failure'); });
  for (const path of ['sync-league', 'sync']) {
    const response = await post('atomic-http-a', 2, path);
    assert.equal(response.status, 500);
    const result = await response.json();
    assert.equal(result.status, 'ERROR'); assert.equal(result.success, false);
  }
  assert.equal(league('atomic-http-a').last_synced_at, aBefore);
});

test('QA never passes PARTIAL even with HTTP 200 and a misleading success flag', async () => {
  for (const status of ['SUCCESS', 'PARTIAL', 'ERROR']) {
    const checks = await runLocalSmoke({ leagueId: 'explicit-fixture' }, {
      allowLocalSync: true, fetchImpl: async url => {
        if (String(url).endsWith('/api/health')) return Response.json({ status: 'ONLINE' });
        if (String(url).includes('/sync-league')) return Response.json({ status, success: true });
        return new Response('Explicit unavailable fixture', { status: 503 });
      }
    });
    assert.equal(checks.find(row => row.id === 'qa.sync').status, status === 'SUCCESS' ? 'PASS' : 'FAIL');
  }
});

test('refresh caches only explicit SUCCESS; PARTIAL/ERROR are retried without affecting other leagues', async () => {
  let status = 'SUCCESS'; const calls = [];
  const refresh = createLeagueRefresh(async id => { calls.push(id); return { status, success: status === 'SUCCESS' }; });
  const options = { coreOnly: true, automatic: true };
  await refresh('cache-b', 1, options);
  for (const value of ['PARTIAL', 'ERROR']) {
    status = value;
    assert.equal((await refresh('cache-a', 1, options)).status, value);
    assert.equal((await refresh('cache-a', 1, options)).reused, undefined);
    assert.equal((await refresh('cache-b', 1, options)).status, 'SUCCESS');
    assert.equal((await refresh('cache-b', 1, options)).reused, true);
  }
  assert.equal(calls.filter(id => id === 'cache-a').length, 4);
});

test('league and week snapshots stay isolated and season drift is rejected', async t => {
  const fixture = upstream(t);
  await Promise.all([sync.syncLeagueDetails('atomic-a', 1), sync.syncLeagueDetails('atomic-b', 1)]);
  const a = league('atomic-a'), b = league('atomic-b');
  fixture.points = 20;
  await sync.syncLeagueDetails('atomic-a', 2);
  assert.equal(db.prepare('SELECT score_a FROM matchups WHERE league_id=? AND week=1').get(a.id).score_a, 10);
  assert.equal(db.prepare('SELECT score_a FROM matchups WHERE league_id=? AND week=2').get(a.id).score_a, 20);
  assert.equal(db.prepare('SELECT score_a FROM matchups WHERE league_id=? AND week=1').get(b.id).score_a, 10);
  assert.equal(league('atomic-b').last_synced_at, b.last_synced_at);
  fixture.season = '2027';
  await assert.rejects(sync.syncLeagueDetails('atomic-a', 1), /Temporada/);
  assert.equal(league('atomic-a').season, '2026');
  assert.equal(db.prepare("SELECT count(*) AS n FROM sync_payloads WHERE resource='state' AND league_id IN (?, ?)").get(a.id, b.id).n, 3);
});

test('league discovery never marks an incomplete snapshot as synced', async t => {
  upstream(t);
  const { user } = authService.register({ email: 'atomic-discovery@example.test', password: 'Fixture-password', displayName: 'Fixture' });
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO external_accounts (id,user_id,provider,provider_user_id,provider_username,status,created_at,updated_at)
    VALUES (?,?,'sleeper',?,'fixture-owner','active',?,?)`).run('atomic-account', user.id, 'fixture-owner', now, now);
  t.mock.method(sync, 'getUserLeagues', async () => [{ league_id: 'atomic-discovery', season: '2026', name: 'Fixture', total_rosters: 1 }]);
  await sync.syncUserLeagues(user.id, '2026');
  assert.equal(league('atomic-discovery').last_synced_at, null);
  await sync.syncLeagueDetails('atomic-discovery', 1);
  const before = league('atomic-discovery').last_synced_at;
  await sync.syncUserLeagues(user.id, '2026');
  assert.equal(league('atomic-discovery').last_synced_at, before);
});
