import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/server.js';

test('API não fabrica contexto de matchup quando semana ou usuário estão ausentes', async t => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const response = await fetch(`${base}/api/leagues/league-test/matchups/current`);
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /não há fallback de contexto/);
});

test('Command Center não escolhe liga ou roster implícitos', async t => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const response = await fetch(`${base}/api/command-center`);
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /não há fallback de contexto/);
});

test('Filtros de notícias não fabricam liga, roster ou semana', async t => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const filter of ['my_roster', 'opponent', 'waivers']) {
    const response = await fetch(`${base}/api/news?filter=${filter}`);
    assert.equal(response.status, 400, filter);
  }
});
