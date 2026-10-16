import fs from 'node:fs';
import { db, initDatabase } from '../../src/db/database.js';

const capturedAt = '2026-10-16T00:00:00.000Z';
const fixture = JSON.parse(fs.readFileSync(new URL('../fixtures/sleeper-player-card.json', import.meta.url), 'utf8'));
const snapshot = JSON.parse(fs.readFileSync(new URL('../../../sleeper-snapshot.json', import.meta.url), 'utf8'));
const teams = ['ARI','ATL','BAL','BUF','CAR','CHI','CIN','CLE','DAL','DEN','DET','GB','HOU','IND','JAX','KC','LAC','LAR','LV','MIA','MIN','NE','NO','NYG','NYJ','PHI','PIT','SEA','SF','TB','TEN','WAS'];

// Test-only records. Never seed a production catalog to satisfy test expectations.
export function seedTestDatabase({ largeCatalog = false, league = false } = {}) {
  if (process.env.DATABASE_PATH !== ':memory:') throw new Error('Test fixtures require DATABASE_PATH=:memory:.');
  initDatabase();
  const insert = db.prepare(`INSERT OR IGNORE INTO players (id, canonical_name, position, team, status, injury_status, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'Active', ?, ?, ?)`);
  db.transaction(() => {
    for (const [id, player] of Object.entries(fixture.players)) {
      insert.run(id, player.full_name || [player.first_name, player.last_name].filter(Boolean).join(' '), player.position, player.team, player.injury_status || null, capturedAt, capturedAt);
    }
    insert.run('4040', 'Patrick Mahomes', 'QB', 'KC', null, capturedAt, capturedAt);
    const count = largeCatalog ? 10001 : teams.length;
    for (let index = 0; index < count; index++) {
      insert.run(`test_catalog_${index}`, `Fixture Athlete ${String(index).padStart(5, '0')}`, index % 2 ? 'WR' : 'QB', teams[index % teams.length], null, capturedAt, capturedAt);
    }
  })();
  if (!league) return;
  const rawLeague = snapshot.league;
  const leagueId = 'test_league_16';
  db.prepare(`INSERT OR IGNORE INTO leagues (id, provider_league_id, season, name, total_rosters, roster_positions_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(leagueId, rawLeague.league_id, rawLeague.season, rawLeague.name, rawLeague.total_rosters, JSON.stringify(rawLeague.roster_positions), capturedAt, capturedAt);
  const rosterStatement = db.prepare(`INSERT OR IGNORE INTO rosters (id, league_id, provider_roster_id, players_json, starters_json, reserve_json, taxi_json, captured_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const roster of snapshot.rosters) {
    rosterStatement.run(`test_roster_${roster.roster_id}`, leagueId, roster.roster_id, JSON.stringify(roster.players || []), JSON.stringify(roster.starters || []), JSON.stringify(roster.reserve || []), JSON.stringify(roster.taxi || []), capturedAt);
  }
  // Snapshot's matchup grouping is intentionally independent of production database state.
  const matchupStatement = db.prepare(`INSERT OR IGNORE INTO matchups (id, league_id, season, week, provider_matchup_id, roster_a_id, roster_b_id, captured_at)
    VALUES (?, ?, ?, 6, ?, ?, ?, ?)`);
  for (let index = 0; index < 8; index++) {
    matchupStatement.run(`test_matchup_${index + 1}`, leagueId, rawLeague.season, index + 1, index * 2 + 1, index * 2 + 2, capturedAt);
  }
}
