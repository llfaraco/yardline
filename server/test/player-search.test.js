import test from 'node:test';
import assert from 'node:assert/strict';
import { playersService } from '../src/modules/players/players.service.js';
import { DATA_STATUS } from '../src/contracts/dtos.js';

test('Player Search — Busca textual por nome do atleta', () => {
  const result = playersService.searchPlayers({ q: 'Josh Allen', limit: 10 });
  assert.ok(result.total >= 1, 'Deve encontrar pelo menos 1 atleta chamado Josh Allen');
  assert.ok(result.players.some(p => p.name === 'Josh Allen' && p.pos === 'QB'), 'Deve conter Josh Allen como QB');
  assert.strictEqual(result.provenance.status, DATA_STATUS.OFFICIAL);
});

test('Player Search — Filtro estrito por posição (QB)', () => {
  const result = playersService.searchPlayers({ position: 'QB', limit: 20 });
  assert.ok(result.players.length > 0);
  for (const p of result.players) {
    assert.strictEqual(p.pos, 'QB', `Jogador ${p.name} deve ser QB, recebido ${p.pos}`);
  }
});

test('Player Search — Filtro estrito por franquia NFL (BUF)', () => {
  const result = playersService.searchPlayers({ team: 'BUF', limit: 50 });
  assert.ok(result.players.length > 0);
  for (const p of result.players) {
    assert.strictEqual(p.team, 'BUF', `Jogador ${p.name} deve pertencer ao BUF, recebido ${p.team}`);
  }
});

test('Player Search — Paginação determinística (page e limit)', () => {
  const page1 = playersService.searchPlayers({ limit: 5, page: 1 });
  const page2 = playersService.searchPlayers({ limit: 5, page: 2 });

  assert.strictEqual(page1.players.length, 5);
  assert.strictEqual(page2.players.length, 5);
  assert.notStrictEqual(page1.players[0].id, page2.players[0].id, 'Primeiro jogador da página 1 não pode ser o mesmo da página 2');
  assert.strictEqual(page1.totalPages, page2.totalPages);
});

test('Player Search — Regra Zero Mock: null nunca vira "Saudável"', () => {
  const result = playersService.searchPlayers({ q: 'Patrick Mahomes' });
  assert.ok(result.players.length >= 1);
  const mahomes = result.players.find(p => p.name === 'Patrick Mahomes');
  assert.ok(mahomes);
  // Jogador ativo sem lesão declarada deve ter injuryStatus null, NUNCA 'Saudável'
  assert.notStrictEqual(mahomes.injuryStatus, 'Saudável', 'injuryStatus não pode ser mockado para Saudável');
  assert.strictEqual(mahomes.injuryStatus, null);
});

test('Player Search — Filtro de disponibilidade na liga fantasy (waivers vs my_roster)', () => {
  const waivers = playersService.searchPlayers({ availability: 'waivers', limit: 20 });
  const mine = playersService.searchPlayers({ availability: 'my_roster', limit: 50 });

  assert.ok(waivers.players.length > 0);
  assert.ok(mine.players.length > 0);

  // Nenhum jogador do meu time pode estar no waiver
  const myIds = new Set(mine.players.map(p => p.id));
  for (const w of waivers.players) {
    assert.strictEqual(myIds.has(w.id), false, `Atleta ${w.name} (#${w.id}) do meu time não pode constar no waiver`);
  }
});

test('Player Search — Resolução individual por ID canônico', () => {
  const allen = playersService.getPlayerById('4984');
  assert.ok(allen);
  assert.strictEqual(allen.name, 'Josh Allen');
  assert.strictEqual(allen.pos, 'QB');
  assert.strictEqual(allen.team, 'BUF');
  assert.strictEqual(allen.provenance.status, DATA_STATUS.OFFICIAL);
});

test('Player Search — Listagem de 32 franquias com contagem de atletas', () => {
  const teams = playersService.getActiveTeams();
  assert.ok(teams.length >= 30, 'Deve listar as franquias ativas da NFL');
  const buf = teams.find(t => t.code === 'BUF');
  assert.ok(buf);
  assert.ok(buf.count > 0);
});
