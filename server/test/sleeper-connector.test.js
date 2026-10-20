import test from 'node:test';
import assert from 'node:assert/strict';
import { SleeperConnector } from '../src/modules/sleeper/sleeper.connector.js';

test('exhausted 429 and 5xx reject and open the circuit after five failed requests', async t => {
  for (const status of [429, 500, 503]) {
    const connector = new SleeperConnector();
    t.mock.method(globalThis, 'fetch', async () => new Response('{}', { status }));
    for (let i = 0; i < 5; i++) await assert.rejects(connector.request('/state/nfl', { maxRetries: 1 }), new RegExp(String(status)));
    await assert.rejects(connector.request('/state/nfl'), /Circuit breaker/);
    t.mock.restoreAll();
  }
});

test('timeout includes JSON body consumption and 404 still returns null', async t => {
  const connector = new SleeperConnector();
  t.mock.method(globalThis, 'fetch', async (_url, { signal }) => ({
    ok: true,
    json: () => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('body timeout')), { once: true }))
  }));
  await assert.rejects(connector.request('/state/nfl', { maxRetries: 1, timeoutMs: 5 }), /body timeout/);
  t.mock.restoreAll();
  t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 404 }));
  assert.equal(await connector.request('/missing'), null);
});
