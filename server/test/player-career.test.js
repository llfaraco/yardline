import test from 'node:test';
import assert from 'node:assert/strict';
import { seedTestDatabase } from './helpers/database-fixtures.js';
import { db } from '../src/db/database.js';
import { PlayerHistoryService, normalizeSeasonPayload } from '../src/modules/players/player-history.service.js';
import { scorePlayerStats } from '../src/modules/engines/scoring.engine.js';

seedTestDatabase();
function player() {
  db.exec('DELETE FROM player_history_sync; DELETE FROM player_stats;');
  db.prepare('UPDATE players SET catalog_json=? WHERE id=?').run(JSON.stringify({ rookieYear: 2024, yearsExp: 1 }), '4984');
  return db.prepare('SELECT * FROM players WHERE id=?').get('4984');
}
const payload = (season, extra = {}) => ({ 1: { player_id: '4984', season: String(season), season_type: 'regular', week: 1,
  team: season === 2024 ? 'BUF' : 'NYJ', opponent: 'NE', date: `${season}-09-08`,
  stats: { gp: 1, pass_yd: 100, pass_td: 1, pts_ppr: 8, ...extra } } });
const league = { season_type: 'regular', scoring_settings_json: JSON.stringify({ pass_yd: .05, pass_td: 4 }) };

test('career imports every catalog season once, preserves year boundaries and scores per league', async () => {
  const p = player(), calls = [];
  const service = new PlayerHistoryService(db, { async getPlayerSeasonStats(id, season) { calls.push([id, season]); return payload(season); } }, { currentSeason: 2025 });
  assert.equal(service.getCareer(p, { league, season: 2024 }).syncing, true);
  service.getCareer(p, { league }); // Duplicate clicks share the same job.
  await service.wait(p.id);
  const result = service.getCareer(p, { league, season: 2024 });
  assert.equal(result.syncing, false);
  assert.equal(calls.length, 2);
  assert.deepEqual(result.seasons.map(row => row.season), ['2025', '2024']);
  assert.deepEqual(result.seasons.map(row => row.totalPoints), [9, 9]);
  assert.equal(result.rows[0].season, '2024');
  assert.equal(result.rows[0].stats.opponent, 'NE');
  assert.deepEqual(result.seasons[1].teams, ['BUF']);
  assert.equal(service.getCareer(p, { season: 2024 }).seasons[0].totalPoints, 8);
  const differentRules = { ...league, scoring_settings_json: JSON.stringify({ pass_yd: .1, pass_td: 6 }) };
  assert.equal(service.getCareer(p, { league: differentRules }).seasons[0].totalPoints, 16);
  assert.equal(calls.length, 2, 'changing scoring does not re-fetch raw stats');
});

test('observed zero stays zero, empty years stay null, unsupported scoring stays unavailable', async () => {
  const p = player();
  const service = new PlayerHistoryService(db, { async getPlayerSeasonStats(id, season) { return season === 2024 ? payload(season, { pass_yd: 0, pass_td: 0, pts_ppr: 0 }) : {}; } }, { currentSeason: 2025 });
  service.getCareer(p); await service.wait(p.id);
  const result = service.getCareer(p, { league });
  assert.equal(result.seasons[0].status, 'empty'); assert.equal(result.seasons[0].totalPoints, null);
  assert.equal(result.seasons[1].totalPoints, 0);
  const unsupported = service.getCareer(p, { league: { ...league, scoring_settings_json: '{"unknown_bonus":1}' } });
  assert.equal(unsupported.seasons[1].totalPoints, null);
  assert.match(unsupported.seasons[1].pointsUnavailableReason, /unsupported_scoring/);
});

test('malformed history never overwrites valid cache; failed refresh is visible and backed off', async () => {
  const p = player();
  const service = new PlayerHistoryService(db, { async getPlayerSeasonStats(id, season) { return payload(season); } }, { currentSeason: 2025 });
  service.getCareer(p); await service.wait(p.id);
  db.prepare('UPDATE player_history_sync SET fetched_at=?').run('2000-01-01T00:00:00.000Z');
  let calls = 0;
  service.connector = { async getPlayerSeasonStats() { calls++; return { broken: true }; } };
  service.getCareer(p); await service.wait(p.id);
  const result = service.getCareer(p);
  assert.equal(result.status, 'partial'); assert.ok(result.seasons.every(row => row.status === 'failed'));
  assert.equal(db.prepare('SELECT count(*) n FROM player_stats').get().n, 2);
  assert.equal(calls, 2);
});

test('history normalizer rejects cross-player/season payloads and excludes explicit non-game weeks', () => {
  assert.throws(() => normalizeSeasonPayload(payload(2024), 'other', 2024));
  assert.throws(() => normalizeSeasonPayload(payload(2024), '4984', 2025));
  assert.deepEqual(normalizeSeasonPayload(payload(2024, { gp: 0 }), '4984', 2024), []);
  assert.equal(normalizeSeasonPayload({ ...payload(2024), 2: null }, '4984', 2024).length, 1);
});

test('Sleeper granular scoring separates D/ST interceptions from QB interceptions and supports IDP/TE', () => {
  assert.equal(scorePlayerStats({ pass_yd: 232, pass_td: 2, rush_yd: 39, rush_td: 2, fum_lost: 1, pass_sack: 2 },
    { pass_yd: .05, pass_td: 4, rush_yd: .1, rush_td: 6, fum_lost: -2, pass_sack: -1 }).points, 31.5);
  assert.equal(scorePlayerStats({ idp_tkl_solo: 5, idp_tkl_ast: 2, idp_ff: 1 },
    { idp_tkl_solo: 1, idp_tkl_ast: .5, idp_ff: 4, ff: 1 }).points, 10);
  assert.equal(scorePlayerStats({ rec: 4, rec_yd: 40, bonus_fd_te: 1 }, { rec: 1, rec_yd: .1, bonus_fd_te: .5 }).points, 8.5);
  assert.equal(scorePlayerStats({ int: 2 }, { int: 2, pass_int: -2 }).points, 4);
});
