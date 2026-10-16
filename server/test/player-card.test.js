import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { once } from 'node:events';

// Dynamic imports ensure standalone runs never touch the tracked production DB.
process.env.DATABASE_PATH = ':memory:';
const { db, initDatabase } = await import('../src/db/database.js');
const service = await import('../src/modules/players/player-card.service.js');
const { persistCatalog, persistPlayerStats, sleeperSyncService } = await import('../src/modules/sleeper/sleeper.sync.js');
const { sleeperConnector } = await import('../src/modules/sleeper/sleeper.connector.js');
const { app } = await import('../src/server.js');
const contract = (await import('../../yardline-app/js/player-card-contract.js')).default;
const fixture = JSON.parse(fs.readFileSync(new URL('./fixtures/sleeper-player-card.json', import.meta.url), 'utf8'));
const capturedAt = '2025-09-10T00:00:00.000Z';
const scoringSettings = { pass_yd: 0.04, pass_td: 4, rush_yd: 0.1, rush_td: 6 };
const params = { season: fixture.season, week: fixture.week, scoringSettings };
const nativeFetch = globalThis.fetch;
let httpServer;
after(() => { httpServer?.close(); db.close(); });
function reset() {
  db.exec('DELETE FROM leagues; DELETE FROM players; DELETE FROM player_stats; DELETE FROM projections; DELETE FROM player_identities; DELETE FROM sync_runs; DELETE FROM sync_payloads;');
  persistCatalog(fixture.players, capturedAt);
}
function seedData(stats = fixture.stats, projections = fixture.projections, extra = {}) {
  persistPlayerStats({ ...params, leagueId: 'fixture-league', stats, projections, capturedAt, ...extra });
  const catalog = service.loadPersistedCatalog(db);
  return { catalog, data: service.buildPlayerData(db, { ...params, catalog }) };
}
function seedLeague(seasonType = 'regular') {
  db.prepare(`INSERT INTO leagues (id, provider_league_id, season, name, season_type, total_rosters,
    settings_json, scoring_settings_json, last_synced_at, created_at, updated_at)
    VALUES ('fixture-league', 'fixture-league', ?, 'Fixture League', ?, 2, '{"leg":1}', ?, ?, ?, ?)`)
    .run(fixture.season, seasonType, JSON.stringify(scoringSettings), capturedAt, capturedAt, capturedAt);
  const roster = fixture.roster;
  db.prepare(`INSERT INTO league_memberships (id, league_id, provider_user_id, roster_id, display_name, team_name, created_at, updated_at)
    VALUES ('fixture-member', 'fixture-league', 'fixture-owner', 1, 'Fixture Manager', 'Fixture Team', ?, ?)`)
    .run(capturedAt, capturedAt);
  db.prepare(`INSERT INTO rosters (id, league_id, provider_roster_id, owner_membership_id, players_json, starters_json, reserve_json, taxi_json, captured_at)
    VALUES ('fixture-roster', 'fixture-league', 1, 'fixture-member', ?, ?, ?, ?, ?)`)
    .run(JSON.stringify(roster.players), JSON.stringify(roster.starters), JSON.stringify(roster.reserve), JSON.stringify(roster.taxi), capturedAt);
}
async function request(path) {
  if (!httpServer) { httpServer = app.listen(0, '127.0.0.1'); await once(httpServer, 'listening'); }
  return nativeFetch(`http://127.0.0.1:${httpServer.address().port}${path}`);
}
function frontend(cards, snapshot = null) {
  const elements = new Map();
  const element = () => {
    const classes = new Set();
    const attributes = {};
    return {
      innerHTML: '', style: { display: '' },
      classList: {
        add(name) { classes.add(name); }, remove(name) { classes.delete(name); },
        contains(name) { return classes.has(name); }, toggle(name) { if (classes.has(name)) classes.delete(name); else classes.add(name); return classes.has(name); }
      },
      querySelector() { return null; },
      setAttribute(name, value) { attributes[name] = String(value); },
      getAttribute(name) { return attributes[name] ?? null; }
    };
  };
  const sandbox = { console, AbortController, setTimeout, clearTimeout, setInterval() {}, clearInterval() {},
    location: { port: '3001', origin: 'http://fixture.invalid', hostname: 'fixture.invalid' },
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    document: { addEventListener() {}, getElementById(id) { return elements.get(id) || null; }, querySelectorAll() { return []; } },
    fetch: async () => ({ ok: true, json: async () => ({ rows: [], items: [] }) }) };
  sandbox.window = sandbox;
  const context = vm.createContext(sandbox);
  for (const file of ['player-card-contract.js', 'data_and_views.js', 'engines.js']) {
    vm.runInContext(fs.readFileSync(new URL(`../../yardline-app/js/${file}`, import.meta.url), 'utf8'), context, { filename: file });
  }
  sandbox.YL_PLAYER_CARDS = cards;
  sandbox.YL_CANONICAL = { players: cards };
  sandbox.YL_SHELL_SNAPSHOT = snapshot;
  for (const id of ['view-players', 'view-playbook', 'player-modal', 'player-modal-content', 'article-reader-modal', 'onboarding-modal', 'lineup-swap-modal', 'waiver-modal', 'checkout-modal', 'manager-dna-modal']) elements.set(id, element());
  return { context, sandbox, elements };
}

test('numberOrNull rejects containers, booleans and blank strings but preserves sourced zero', () => {
  for (const input of [null, undefined, '', ' ', '\t\n', [], [0], [3], {}, { valueOf: () => 0 }, true, false, NaN, Infinity]) {
    assert.equal(contract.numberOrNull(input), null, `Rejected input: ${String(input)}`);
  }
  for (const input of [0, '0', 20.6, '20.6']) assert.equal(contract.numberOrNull(input), Number(input));
});

test('persisted catalog preserves injury_status, ESPN identities and canonical photos without legacy leakage', () => {
  reset();
  const catalog = service.loadPersistedCatalog(db);
  assert.equal(catalog['13281'].injuryStatus, 'IR');
  assert.equal(catalog['4984'].espnId, '3918298');
  assert.match(catalog['4984'].photoUrl, /3918298/);
  persistCatalog({ '4984': { ...catalog['4984'], espnId: null, photoUrl: catalog['4984'].photoUrl } }, capturedAt);
  const updated = service.loadPersistedCatalog(db)['4984'];
  assert.equal(updated.espnId, null);
  assert.equal(updated.photoUrl, 'https://sleepercdn.com/content/nfl/players/thumb/4984.jpg');
  assert.equal(db.prepare("SELECT count(*) n FROM player_identities WHERE player_id='4984' AND provider='espn'").get().n, 0);
  assert.equal(contract.normalizeSleeperPlayer('4744', { ...fixture.players['4744'], photoUrl: 'https://legacy.invalid/wrong.jpg' }).photoUrl,
    'https://sleepercdn.com/content/nfl/players/thumb/4744.jpg');
});

test('taxi remains known in the owning roster even when unrelated rosters are unknown', () => {
  reset();
  const catalog = service.loadPersistedCatalog(db);
  const other = { roster_id: 2, players: ['4984'], taxi: null };
  const card = contract.createPlayerCard('13281', catalog['13281'], null, {}, [fixture.roster, other]);
  assert.equal(card.taxi, true);
  assert.equal(card.rosterContext[0].taxi, true);
  assert.equal(contract.createPlayerCard('12508', catalog['12508'], null, {}, [fixture.roster, other]).taxi, false);
  assert.equal(contract.createPlayerCard('4984', catalog['4984'], null, {}, [fixture.roster, other]).taxi, null);
  assert.equal(contract.createPlayerCard('4744', catalog['4744'], null, {}, [fixture.roster, other]).taxi, null);
  assert.deepEqual(contract.rosterGroups(fixture.roster).taxi, ['13281', '13405']);
  assert.ok(!contract.rosterGroups(fixture.roster).bench.includes('13281'));
});

test('owner requires unique reliable owner ID, never display-name/roster-2/first-roster fallback', () => {
  const rosters = [fixture.roster, { roster_id: 2, owner_id: 'another-owner', ownerName: 'Fixture Manager' }];
  assert.equal(contract.selectUserRoster(rosters, {}), null);
  assert.equal(contract.selectUserRoster(rosters, { username: 'Fixture Manager' }), null);
  assert.equal(contract.selectUserRoster(rosters, { rosterId: 2 }), null);
  assert.equal(contract.selectUserRoster(rosters, { ownerId: 'missing' }), null);
  assert.strictEqual(contract.selectUserRoster(rosters, { ownerId: 'fixture-owner' }), fixture.roster);
  assert.equal(contract.selectUserRoster([fixture.roster, { ...fixture.roster }], { ownerId: 'fixture-owner' }), null);
});

test('projection-only and absent playerData allocate no fabricated points', () => {
  reset();
  const { catalog, data } = seedData();
  assert.equal(data['3294'].projectedPoints, fixture.projections['3294'].pts_ppr);
  assert.equal(data['3294'].points, null);
  assert.equal(data['3294'].totalPoints, null);
  const cards = service.buildPlayerCards(catalog, data, { season: fixture.season, week: 1 }, [fixture.roster]);
  assert.equal(cards['3294'].metrics.projectedPoints, 20.6);
  assert.equal(cards['4217'].metrics.pointsPerGame, null);
  assert.equal(service.buildPlayerCards(catalog, undefined, {}, [])['4984'].metrics.totalPoints, null);
});

test('empty/malformed v1 metrics stay unavailable while observed numeric zero remains real', () => {
  reset();
  let { data } = seedData(fixture.emptyStats, fixture.emptyProjections);
  assert.equal(data['4984']?.totalPoints ?? null, null);
  assert.equal(data['4984']?.projectedPoints ?? null, null);
  assert.equal(db.prepare("SELECT count(*) n FROM projections WHERE player_id='4984'").get().n, 0);
  seedData({}, { '4984': { pts_ppr: [], pts_half_ppr: ' ', pts_std: {} } });
  assert.equal(db.prepare("SELECT count(*) n FROM projections WHERE player_id='4984'").get().n, 0);
  ({ data } = seedData({ '4984': { pass_yd: 0 } }, { '4984': { pts_ppr: 0 } }));
  assert.equal(data['4984'].totalPoints, 0);
  assert.equal(data['4984'].observedWeeks, 1);
  assert.equal(data['4984'].projectedPoints, 0);
});

test('unsupported/invalid scoring explains unavailability in service, DTO and history, not zero', () => {
  reset();
  const { catalog } = seedData();
  const scoring = { pass_yd: 0.04, bonus_pass_cmp_25: 1 };
  const result = service.pointsFromStats(fixture.stats['4984'], scoring);
  assert.deepEqual(result, { points: null, reason: 'unsupported_scoring:bonus_pass_cmp_25' });
  assert.equal(service.pointsFromStats({ pass_yd: 0 }, { pass_yd: [] }).reason, 'invalid_scoring:pass_yd');
  const data = service.buildPlayerData(db, { ...params, scoringSettings: scoring, catalog });
  const card = service.buildPlayerCards(catalog, data, {}, [])['4984'];
  assert.equal(card.metrics.totalPoints, null);
  assert.equal(card.context.pointsUnavailableReason, result.reason);
  const rows = service.buildPlayerHistory(db, { playerId: '4984', season: fixture.season, league: { scoring_settings_json: JSON.stringify(scoring), season_type: 'regular' } });
  assert.equal(rows[0].fpts, null);
  assert.equal(rows[0].pointsUnavailableReason, result.reason);
});

test('idempotent upserts and projection dedupe yield identical shell/history metrics', async () => {
  reset(); seedLeague();
  seedData(); seedData();
  assert.equal(db.prepare('SELECT count(*) n FROM player_stats').get().n, 1);
  assert.equal(db.prepare('SELECT count(*) n FROM projections').get().n, 3);
  db.prepare(`INSERT INTO projections (id, player_id, season, week, scoring_format, projection, source, created_at)
    VALUES ('old-duplicate', '3294', '2025', 1, 'PPR', 99, 'sleeper', '2020-01-01')`).run();
  const response = await request('/api/leagues/fixture-league/shell?week=1');
  assert.equal(response.status, 200);
  const shell = await response.json();
  assert.equal(shell.rosters[0].ownerId, 'fixture-owner');
  assert.equal(shell.playerCards['13281'].taxi, true);
  const history = await (await request('/api/players/3294/history?season=2025&leagueId=fixture-league')).json();
  assert.equal(history.rows.length, 1);
  assert.equal(history.rows[0].proj, shell.playerCards['3294'].metrics.projectedPoints);
  const statsHistory = await (await request('/api/players/4984/history?season=2025&leagueId=fixture-league')).json();
  assert.equal(statsHistory.rows[0].fpts, shell.playerCards['4984'].metrics.points);
  assert.equal((await request('/api/leagues/fixture-league/shell?week=0')).status, 400);
  return shell;
});

test('nonregular season_type cannot silently relabel regular v1 production', () => {
  reset(); seedLeague('post');
  const { catalog } = seedData();
  const data = service.buildPlayerData(db, { ...params, seasonType: 'post', catalog });
  const cards = service.buildPlayerCards(catalog, data, { seasonType: 'post' }, []);
  assert.equal(cards['4984'].metrics.points, null);
  assert.equal(cards['3294'].metrics.projectedPoints, null);
  assert.equal(cards['4984'].context.pointsUnavailableReason, 'season_type_unreconciled:post');
});

test('actual frontend card and final dossier consume the exact same DTO without static enrichment', async () => {
  reset();
  const { catalog, data } = seedData();
  const cards = service.buildPlayerCards(catalog, data, { season: '2025', week: 1 }, [fixture.roster]);
  const { sandbox, context, elements } = frontend(cards);
  const seen = [];
  const resolver = sandbox.resolveNFLPlayer;
  sandbox.resolveNFLPlayer = id => { const dto = resolver(id); seen.push(dto); return dto; };
  sandbox.renderPlayersView();
  const cardHtml = elements.get('view-players').innerHTML;
  assert.match(cardHtml, /yl-player-card-v2/);
  await sandbox.openPlayerDossierModal('13281');
  const dossierHtml = elements.get('player-modal-content').innerHTML;
  assert.match(dossierHtml, /sleeper-dossier__hero/);
  assert.match(cardHtml, /IR · TAXI/);
  assert.match(dossierHtml, /IR · TAXI/);
  assert.ok(seen.includes(cards['13281']));
  assert.ok(seen.filter(p => p?.id === '13281').every(p => p === cards['13281']));
  assert.ok(cardHtml.includes(cards['13281'].photoUrl));
  assert.ok(dossierHtml.includes(cards['13281'].photoUrl));
  await sandbox.openPlayerDossierModal('3294');
  assert.match(elements.get('player-modal-content').innerHTML, /20\.6/);
  assert.equal(vm.runInContext('selectedActiveRosterId', context), null);
  sandbox.renderPlaybookView();
  assert.match(elements.get('view-playbook').innerHTML, /Owner não identificado/i);
});

test('mocked sync preserves season_type and distinguishes empty metrics from upstream failure', async t => {
  reset();
  const league = { league_id: 'fixture-league', name: 'Fixture League', season: '2025', season_type: 'regular', total_rosters: 1,
    scoring_settings: scoringSettings, settings: { leg: 1 }, roster_positions: ['QB', 'BN'] };
  t.mock.method(sleeperConnector, 'getLeague', async () => league);
  t.mock.method(sleeperConnector, 'getNFLState', async () => ({ season: '2025', week: 1, season_type: 'regular' }));
  t.mock.method(sleeperConnector, 'getLeagueUsers', async () => []);
  t.mock.method(sleeperConnector, 'getLeagueRosters', async () => [fixture.roster]);
  t.mock.method(sleeperConnector, 'getLeagueMatchups', async () => []);
  t.mock.method(sleeperConnector, 'getLeagueTransactions', async () => []);
  t.mock.method(sleeperConnector, 'getLeagueTradedPicks', async () => []);
  t.mock.method(sleeperSyncService, 'getNflPlayers', async () => Object.fromEntries(Object.entries(fixture.players).map(([id, raw]) => [id, contract.normalizeSleeperPlayer(id, raw)])));
  t.mock.method(sleeperConnector, 'getNflStats', async () => fixture.emptyStats);
  t.mock.method(sleeperConnector, 'getNflProjections', async () => fixture.emptyProjections);
  await sleeperSyncService.syncLeagueDetails('fixture-league', 1);
  let shell = await (await request('/api/leagues/fixture-league/shell?week=1')).json();
  assert.equal(shell.playerCards['4984'].metrics.points, null);
  assert.equal(shell.cardContext.metricAvailability.stats.status, 'empty');
  t.mock.method(sleeperConnector, 'getNflStats', async () => { throw new Error('fixture upstream failure'); });
  await sleeperSyncService.syncLeagueDetails('fixture-league', 1);
  shell = await (await request('/api/leagues/fixture-league/shell?week=1')).json();
  assert.equal(shell.cardContext.metricAvailability.stats.status, 'failed');
  assert.equal(shell.playerCards['4984'].context.pointsUnavailableReason, 'stats_fetch_failed');
  league.season_type = 'post';
  await sleeperSyncService.syncLeagueDetails('fixture-league', 1);
  assert.equal(db.prepare("SELECT season_type FROM leagues WHERE id=? OR provider_league_id=?").get('fixture-league', 'fixture-league').season_type, 'post');
});


test('empty catalog response preserves the valid persisted catalog', async t => {
  reset();
  t.mock.method(sleeperConnector, 'getPlayersCatalog', async () => ({}));
  const result = await sleeperSyncService.getNflPlayers();
  assert.ok(Object.keys(result).length >= Object.keys(fixture.players).length);
  assert.equal(result['4984'].id, '4984');
  assert.equal(service.loadPersistedCatalog(db)['4984'].id, '4984');
});

test('renderPlaybookView tolerates a partial DOM without querySelectorAll', () => {
  reset();
  const { catalog, data } = seedData();
  const { sandbox } = frontend(service.buildPlayerCards(catalog, data, { season: fixture.season, week: 1 }, [fixture.roster]));
  assert.doesNotThrow(() => sandbox.renderPlaybookView());
});

test('closeModal globally closes every supported modal by class and inline style', () => {
  reset();
  const { catalog, data } = seedData();
  const { sandbox, elements } = frontend(service.buildPlayerCards(catalog, data, { season: fixture.season, week: 1 }, [fixture.roster]));
  for (const id of ['player-modal', 'article-reader-modal', 'onboarding-modal', 'lineup-swap-modal', 'waiver-modal', 'checkout-modal', 'manager-dna-modal']) {
    const modal = elements.get(id);
    modal.classList.add('open');
    modal.style.display = 'flex';
    assert.equal(sandbox.closeModal(id), true);
    assert.equal(modal.classList.contains('open'), false, id);
    assert.equal(modal.style.display, 'none', id);
    assert.equal(modal.getAttribute('aria-hidden'), 'true', id);
  }
});

test('catalog sync button delegates to the canonical syncLiveSleeperApiPlayers entry point', async () => {
  const source = fs.readFileSync(new URL('../../yardline-app/js/data_and_views.js', import.meta.url), 'utf8');
  assert.match(source, /onclick="syncLiveSleeperApiPlayers\(\)/);
  assert.doesNotMatch(source, /onclick="syncRealSleeperLeagueLive\(\);showToast/);
  const { sandbox } = frontend({});
  let calls = 0;
  sandbox.syncRealSleeperLeagueLive = async () => { calls += 1; return { success: true }; };
  await sandbox.syncLiveSleeperApiPlayers();
  assert.equal(calls, 1);
});
