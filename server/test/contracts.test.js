import { test } from 'node:test';
import assert from 'node:assert';
import {
  DATA_STATUS,
  INJURY_STATUS,
  SCORING_STATUS,
  createDataStatusDTO,
  createMetricDTO,
  createScoreBreakdownDTO,
  createPlayerCardDTO,
  createRosterDTO,
  createMatchupDTO,
  createLeagueShellDTO
} from '../src/contracts/dtos.js';
import { db, initDatabase } from '../src/db/database.js';

test('Contratos DTO — DataStatusDTO valida status canônicos e proveniência', () => {
  const official = createDataStatusDTO({
    status: DATA_STATUS.OFFICIAL,
    source: 'sleeper_api',
    syncedAt: '2026-10-15T18:00:00Z',
    isEstimate: false,
    confidence: 1.0
  });

  assert.strictEqual(official.status, 'official');
  assert.strictEqual(official.source, 'sleeper_api');
  assert.strictEqual(official.isEstimate, false);
  assert.strictEqual(official.confidence, 1.0);

  // Status inválido cai com segurança para 'unavailable'
  const invalid = createDataStatusDTO({ status: 'invalid_status' });
  assert.strictEqual(invalid.status, 'unavailable');
});

test('Contratos DTO — Integridade estrita: null nunca vira 0 nas métricas', () => {
  const metricNull = createMetricDTO({
    projectedPoints: null,
    actualPoints: null,
    vorpValue: null
  });

  // Garantia Backend: null não virar 0
  assert.strictEqual(metricNull.projectedPoints, null, 'projectedPoints deve ser null');
  assert.strictEqual(metricNull.actualPoints, null, 'actualPoints deve ser null');
  assert.strictEqual(metricNull.vorpValue, null, 'vorpValue deve ser null');

  // Valores numéricos reais devem ser arredondados corretamente
  const metricReal = createMetricDTO({
    projectedPoints: 18.456,
    actualPoints: 21.0
  });
  assert.strictEqual(metricReal.projectedPoints, 18.46);
  assert.strictEqual(metricReal.actualPoints, 21.0);
});

test('Contratos DTO — Integridade estrita: null nunca vira "Saudável" no PlayerCardDTO', () => {
  // Jogador com lesão null não pode ser mascarado como "Saudável"
  const playerNull = createPlayerCardDTO({
    id: '1234',
    name: 'Atleta Sem Status',
    injuryStatus: null
  });
  assert.strictEqual(playerNull.injuryStatus, null, 'injuryStatus deve permanecer null quando não informado');

  // Jogador com status explícito Questionável
  const playerQ = createPlayerCardDTO({
    id: '5678',
    name: 'Atleta Questionável',
    injuryStatus: 'Questionable'
  });
  assert.strictEqual(playerQ.injuryStatus, INJURY_STATUS.QUESTIONABLE);

  // Jogador com status explícito Saudável/Active
  const playerActive = createPlayerCardDTO({
    id: '9999',
    name: 'Atleta Ativo',
    injuryStatus: 'Active'
  });
  assert.strictEqual(playerActive.injuryStatus, INJURY_STATUS.ACTIVE);
});

test('Contratos DTO — Integridade de Identidade: ID Sleeper não é usado como ID ESPN', () => {
  const player = createPlayerCardDTO({
    id: '4881',
    sleeperId: '4881',
    espnId: '3918298', // ID real ESPN de Josh Allen
    name: 'Josh Allen'
  });

  assert.strictEqual(player.sleeperId, '4881');
  assert.strictEqual(player.espnId, '3918298');
  assert.notStrictEqual(player.sleeperId, player.espnId, 'Sleeper ID e ESPN ID devem ser mantidos estritamente distintos');

  // Foto gerada usa o espnId legítimo
  assert.match(player.photoUrl, /3918298/);
});

test('Contratos DTO — Score Breakdown: regras não suportadas retornam status unsupported e points null', () => {
  const unsupported = createScoreBreakdownDTO({
    status: SCORING_STATUS.UNSUPPORTED,
    reason: 'bonus_pass_cmp_25'
  });

  // Garantia Backend: Nunca deve retornar zero silenciosamente
  assert.strictEqual(unsupported.points, null);
  assert.strictEqual(unsupported.status, 'unsupported');
  assert.strictEqual(unsupported.reason, 'bonus_pass_cmp_25');

  const calculated = createScoreBreakdownDTO({
    points: 18.4,
    status: SCORING_STATUS.CALCULATED,
    breakdown: [
      { rule: 'rec_yd', stat: 84, multiplier: 0.1, points: 8.4 },
      { rule: 'rec_td', stat: 1, multiplier: 6.0, points: 6.0 },
      { rule: 'rec', stat: 4, multiplier: 1.0, points: 4.0 }
    ]
  });

  assert.strictEqual(calculated.points, 18.4);
  assert.strictEqual(calculated.status, 'calculated');
  assert.strictEqual(calculated.breakdown.length, 3);
  assert.strictEqual(calculated.breakdown[0].points, 8.4);
});

test('Contratos DTO — RosterDTO e LeagueShellDTO garantem estrutura e integridade', () => {
  const roster = createRosterDTO({
    rosterId: 2,
    owner: 'Faraco',
    teamName: 'Gengar My Balls',
    starters: ['4881', '3918298'],
    players: ['4881', '3918298', '9999'],
    fpts: 142.8
  });

  assert.strictEqual(roster.rosterId, 2);
  assert.strictEqual(roster.owner, 'Faraco');
  assert.strictEqual(roster.starters.length, 2);
  assert.strictEqual(roster.fpts, 142.8);

  const shell = createLeagueShellDTO({
    league: {
      id: '1369770282776006656',
      name: 'Neilo Pistola League',
      season: '2026',
      status: 'in_season',
      totalRosters: 16
    },
    state: {
      season: '2026',
      week: 6,
      seasonType: 'regular'
    },
    rosters: [roster]
  });

  assert.strictEqual(shell.league.id, '1369770282776006656');
  assert.strictEqual(shell.state.week, 6);
  assert.strictEqual(shell.rosters.length, 1);
  assert.strictEqual(shell.rosters[0].teamName, 'Gengar My Balls');
});

test('Database Schema — Tabelas drafts, draft_picks e source_provenance existem no SQLite', () => {
  initDatabase();

  const draftsCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='drafts'").get();
  assert.ok(draftsCheck, 'Tabela drafts deve existir no banco de dados');

  const draftPicksCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='draft_picks'").get();
  assert.ok(draftPicksCheck, 'Tabela draft_picks deve existir no banco de dados');

  const provenanceCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='source_provenance'").get();
  assert.ok(provenanceCheck, 'Tabela source_provenance deve existir no banco de dados');
});
