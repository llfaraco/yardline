import test from 'node:test';
import assert from 'node:assert/strict';
import { scorePlayerStats, scoreRoster } from '../src/modules/engines/scoring.engine.js';

test('Scoring PPR calcula produção ofensiva com breakdown', () => {
  const result = scorePlayerStats({ rec: 5, rec_yd: 80, rec_td: 1, rush_yd: 10 }, {
    rec: 1, rec_yd: 0.1, rec_td: 6, rush_yd: 0.1
  });
  assert.equal(result.points, 20);
  assert.deepEqual(new Set(result.breakdown.map(item => item.key)), new Set(['rush_yards', 'receptions', 'receiving_yards', 'receiving_td']));
  assert.equal(result.breakdown.reduce((sum, item) => sum + item.points, 0), 20);
});

test('Scoring de roster soma apenas titulares', () => {
  const result = scoreRoster({
    playerIds: ['a', 'b'],
    starters: ['a'],
    statsByPlayer: { a: { rec: 4, rec_yd: 40 }, b: { rec: 10, rec_yd: 100, rec_td: 2 } },
    scoringSettings: { rec: 1, rec_yd: 0.1, rec_td: 6 }
  });
  assert.equal(result.points, 8);
  assert.equal(result.players.find(player => player.playerId === 'b').points, 32);
  assert.equal(result.players.find(player => player.playerId === 'b').isStarter, false);
});

test('Scoring Engine — Estatísticas vazias retornam status unavailable e points null', () => {
  const result = scorePlayerStats({}, { rec: 1, rec_yd: 0.1 });
  assert.equal(result.points, null, 'Pontuação deve ser null quando stats estiverem ausentes');
  assert.equal(result.status, 'unavailable');
  assert.equal(result.breakdown.length, 0);
});

test('Scoring Engine — Regra não suportada com multiplicador ativo retorna status unsupported', () => {
  const result = scorePlayerStats(
    { rec: 5, rec_yd: 50 },
    { rec: 1, rec_yd: 0.1, bonus_pass_cmp_25: 3.0 }
  );
  assert.equal(result.points, null, 'Nunca deve retornar zero silenciosamente quando regra for unsupported');
  assert.equal(result.status, 'unsupported');
  assert.equal(result.reason, 'bonus_pass_cmp_25');
});
