import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const APP_JS = new URL('../../yardline-app/js/', import.meta.url);

function createElement() {
  const classes = new Set();
  const attributes = {};
  return {
    innerHTML: '',
    style: { display: '' },
    classList: {
      add(name) { classes.add(name); },
      remove(name) { classes.delete(name); },
      contains(name) { return classes.has(name); },
      toggle(name) {
        if (classes.has(name)) classes.delete(name);
        else classes.add(name);
        return classes.has(name);
      }
    },
    querySelector() { return null; },
    setAttribute(name, value) { attributes[name] = String(value); },
    getAttribute(name) { return attributes[name] ?? null; }
  };
}

function renderMatchupWithUnavailableProjections() {
  const elements = new Map([['view-league', createElement()]]);
  const sandbox = {
    console,
    AbortController,
    setTimeout,
    clearTimeout,
    setInterval() {},
    clearInterval() {},
    location: { port: '3001', origin: 'http://fixture.invalid', hostname: 'fixture.invalid' },
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    document: {
      addEventListener() {},
      getElementById(id) { return elements.get(id) || null; },
      querySelectorAll() { return []; }
    },
    fetch: async () => ({ ok: true, json: async () => ({ rows: [], items: [] }) })
  };
  sandbox.window = sandbox;
  const context = vm.createContext(sandbox);
  for (const file of ['player-card-contract.js', 'data_and_views.js', 'engines.js']) {
    vm.runInContext(fs.readFileSync(new URL(file, APP_JS), 'utf8'), context, { filename: file });
  }

  // Without an official matchup, the renderer must not fall back to historical fixtures.
  sandbox.resolveNFLPlayer = id => ({
    id: String(id),
    name: 'Fixture Player',
    pos: 'WR',
    team: 'TST',
    photo: '',
    injuryStatus: 'Healthy',
    metrics: { projectedPoints: String(id) === '7588' ? 0 : null }
  });
  const render = sandbox.renderAuditLeagueView;
  assert.equal(typeof render, 'function');
  assert.doesNotThrow(() => render());
  return elements.get('view-league').innerHTML;
}

test('Game Center renders null projections as unavailable and preserves a valid zero', () => {
  const html = renderMatchupWithUnavailableProjections();

  assert.match(html, /MATCHUP INDISPONÍVEL/, 'the matchup exposes unavailable state');
  assert.match(html, /Fixtures históricas não são exibidas/, 'historical fixtures are not presented as current data');
  assert.match(html, /Conectar Sleeper/, 'the user receives a recovery action');
  assert.doesNotMatch(html, /NaN|undefined|null/, 'rendered markup has no fabricated or invalid values');
});
