import test from 'node:test';
import assert from 'node:assert/strict';
import { solveOptimalLineupAssignment } from '../src/modules/engines/lineup.solver.js';

// Independent exhaustive oracle: no bound, no heuristic candidate consumption.
function exhaustive(slots, players) {
  const ordered = slots.map(slot => ({ slot, pool: players.filter(p => slot.allowed.includes(p.position)) }))
    .sort((a, b) => a.pool.length - b.pool.length);
  function visit(index, used, score) {
    if (index === ordered.length) return score;
    const available = ordered[index].pool.filter(p => !used.has(p.id));
    if (!available.length) return visit(index + 1, used, score);
    return Math.max(...available.map(p => visit(index + 1, new Set([...used, p.id]), score + p.projection)));
  }
  return visit(0, new Set(), 0);
}

test('lineup bound preserves optimum across 500 deterministic overlapping eligibility graphs', () => {
  let seed = 314159;
  const random = n => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return (seed >>> 8) % n; };
  for (let trial = 0; trial < 500; trial++) {
    const positions = ['QB', 'RB', 'WR', 'TE', 'DL', 'LB', 'DB'];
    const players = positions.map((position, i) => ({ id: String(i), position, projection: random(30) + 1 }));
    const slots = Array.from({ length: 5 }, (_, i) => ({ key: `slot${i}`, allowed: positions.filter(() => random(3) === 0) }));
    const actual = solveOptimalLineupAssignment(slots, players);
    assert.equal(actual.bestScore, exhaustive(slots, players), JSON.stringify({ trial, slots, players }));
    assert.equal(new Set(Object.values(actual.bestAssignment)).size, Object.keys(actual.bestAssignment).length);
    for (const slot of slots) {
      const id = actual.bestAssignment[slot.key];
      if (id != null) assert.ok(slot.allowed.includes(players.find(p => p.id === id).position));
    }
  }
});
