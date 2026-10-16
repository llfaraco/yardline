import { seedTestDatabase } from './helpers/database-fixtures.js';
import { test } from 'node:test';
import assert from 'node:assert';
import {
  createMatchupDTO,
  createRosterDTO,
  DATA_STATUS
} from '../src/contracts/dtos.js';
import { db, initDatabase } from '../src/db/database.js';
import { scoreRoster } from '../src/modules/engines/scoring.engine.js';
seedTestDatabase({ league: true });


test('Matchup & Lineup — 16 Times e 8 Confrontos na Semana 6', () => {
  initDatabase();
  const league = db.prepare('SELECT id, total_rosters, roster_positions_json FROM leagues WHERE provider_league_id = ?').get('1369770282776006656');
  assert.ok(league, 'Liga 1369770282776006656 deve existir no SQLite');
  assert.strictEqual(league.total_rosters, 16, 'Liga deve possuir exatamente 16 times');

  const rosterPositions = JSON.parse(league.roster_positions_json || '[]');
  const starterPositions = rosterPositions.slice(0, 19);
  assert.strictEqual(starterPositions.length, 19, 'Liga deve possuir exatamente 19 slots titulares');
  assert.strictEqual(starterPositions[0], 'QB');
  assert.strictEqual(starterPositions[1], 'RB');
  assert.strictEqual(starterPositions[9], 'K');
  assert.strictEqual(starterPositions[18], 'DB');

  const matchupsW6 = db.prepare('SELECT * FROM matchups WHERE league_id = ? AND week = 6').all(league.id);
  assert.strictEqual(matchupsW6.length, 8, 'Liga de 16 times deve possuir exatamente 8 confrontos na Semana 6');
});

test('Matchup & Lineup — Confronto #7 (Gengar My Balls vs Curitiba Red Fox) possui 19 titulares', () => {
  initDatabase();
  const league = db.prepare('SELECT id FROM leagues WHERE provider_league_id = ?').get('1369770282776006656');

  const r1 = db.prepare('SELECT starters_json, players_json FROM rosters WHERE league_id = ? AND provider_roster_id = 1').get(league.id);
  const r2 = db.prepare('SELECT starters_json, players_json FROM rosters WHERE league_id = ? AND provider_roster_id = 2').get(league.id);

  assert.ok(r1, 'Roster 1 (Curitiba Red Fox) deve existir');
  assert.ok(r2, 'Roster 2 (Gengar My Balls) deve existir');

  const starters1 = JSON.parse(r1.starters_json || '[]');
  const starters2 = JSON.parse(r2.starters_json || '[]');

  assert.strictEqual(starters1.length, 19, 'Curitiba Red Fox deve escalar exatamente 19 titulares');
  assert.strictEqual(starters2.length, 19, 'Gengar My Balls deve escalar exatamente 19 titulares');

  // Isolamento de banco: titulares são subconjunto de players
  const players1 = new Set(JSON.parse(r1.players_json || '[]'));
  const players2 = new Set(JSON.parse(r2.players_json || '[]'));

  starters1.forEach(pId => {
    if (pId) assert.ok(players1.has(pId), `Titular ${pId} deve pertencer ao elenco do Roster 1`);
  });
  starters2.forEach(pId => {
    if (pId) assert.ok(players2.has(pId), `Titular ${pId} deve pertencer ao elenco do Roster 2`);
  });
});

test('Matchup & Lineup — Regra de Isolamento: Pontos do banco nunca somam no placar do confronto', () => {
  // Simulação de confronto de 19 titulares + 10 reservas
  const starterIds = Array.from({ length: 19 }, (_, i) => `s_${i + 1}`);
  const benchIds = Array.from({ length: 10 }, (_, i) => `b_${i + 1}`);

  const stats = {};
  // Cada titular produz 5 pontos (19 * 5 = 95 pontos)
  starterIds.forEach(id => { stats[id] = { rec: 5 }; });
  // Cada reserva produz 100 pontos (10 * 100 = 1000 pontos)
  benchIds.forEach(id => { stats[id] = { rec: 100 }; });

  const result = scoreRoster({
    playerIds: [...starterIds, ...benchIds],
    starters: starterIds,
    statsByPlayer: stats,
    scoringSettings: { rec: 1.0 }
  });

  // O placar final DEVE ser 95.0, os 1000 pontos do banco DEVEM ser completamente ignorados
  assert.strictEqual(result.points, 95.0, 'Pontuação total deve considerar apenas os 19 titulares');
  assert.strictEqual(result.players.filter(p => p.isStarter).length, 19, 'Exatamente 19 atletas devem ser marcados como isStarter: true');
  assert.strictEqual(result.players.filter(p => !p.isStarter).length, 10, 'Exatamente 10 atletas devem ser marcados como isStarter: false');
});

test('Matchup & Lineup — createMatchupDTO valida estrutura e proveniência canônica', () => {
  const dto = createMatchupDTO({
    matchupId: 7,
    week: 6,
    season: '2026',
    homeRosterId: 2,
    homeScore: 0.0,
    awayRosterId: 1,
    awayScore: 25.1,
    status: 'live',
    provenance: {
      status: DATA_STATUS.OFFICIAL,
      source: 'sleeper_api'
    }
  });

  assert.strictEqual(dto.matchupId, 7);
  assert.strictEqual(dto.week, 6);
  assert.strictEqual(dto.homeRosterId, 2);
  assert.strictEqual(dto.homeScore, 0.0);
  assert.strictEqual(dto.awayRosterId, 1);
  assert.strictEqual(dto.awayScore, 25.1);
  assert.strictEqual(dto.status, 'live');
  assert.strictEqual(dto.provenance.status, 'official');
});
