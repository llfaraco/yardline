import test from 'node:test';
import assert from 'node:assert/strict';
import { seedTestDatabase } from './helpers/database-fixtures.js';
import { playersService } from '../src/modules/players/players.service.js';

seedTestDatabase();
for (const availability of ['my_roster', 'opponent', 'rostered']) {
  test(`empty ${availability} filter must not return the full catalog`, () => {
    const result = playersService.searchPlayers({ availability, leagueId: 'missing-league' });
    assert.equal(result.total, 0);
    assert.deepEqual(result.players, []);
  });
}
