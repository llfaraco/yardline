import test from 'node:test';
import assert from 'node:assert/strict';
import { compareLeagueSnapshot } from '../src/modules/command-center/league-parity.js';
function fixture() {
  const references = {'sleeper.state':{week:7,season:'2026'},'sleeper.league':{league_id:'league',season:'2026',settings:{leg:6}},
    'sleeper.rosters':[{roster_id:1,owner_id:'owner',players:['p']}],
    'sleeper.matchups':[{matchup_id:1,roster_id:1,starters:['p'],points:0}]};
  const snapshot = {league:{providerLeagueId:'league',season:'2026'},state:{week:7},rosters:[{rosterId:1,ownerId:'owner',players:['p']}],
    matchups:[{matchupId:1,rosterAId:1,scoreA:0,players:[{roster_id:1,player_id:'p',is_starter:1}]}]};
  return {references,snapshot};
}
test('public parity distinguishes real zero, absent score and observed drift', () => {
  const {references,snapshot}=fixture();
  assert.equal(compareLeagueSnapshot(snapshot,references).status,'PASS');
  snapshot.matchups[0].scoreA=null;
  assert.equal(compareLeagueSnapshot(snapshot,references).status,'NOT_VERIFIABLE');
  snapshot.matchups[0].scoreA=7;
  assert.equal(compareLeagueSnapshot(snapshot,references).status,'FAIL');
  references['sleeper.matchups'][0].custom_points=7;
  assert.equal(compareLeagueSnapshot(snapshot,references).status,'PASS');
});
test('public parity catches owner, roster and starter mismatches', () => {
  const {references,snapshot}=fixture();
  snapshot.rosters[0].ownerId='another';snapshot.rosters[0].players=['other'];snapshot.matchups[0].players=[];
  const report=compareLeagueSnapshot(snapshot,references);
  assert.equal(report.status,'FAIL');assert.equal(report.issues.length,3);
});
test('missing reference and different week are not claimed as parity or product failure', () => {
  const {references,snapshot}=fixture();
  assert.equal(compareLeagueSnapshot(snapshot,{}).status,'NOT_VERIFIABLE');
  snapshot.state.week=6;
  assert.equal(compareLeagueSnapshot(snapshot,references).status,'NOT_VERIFIABLE');
});
