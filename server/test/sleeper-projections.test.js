import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSleeperProjections } from '../src/modules/sleeper/sleeper-projections.js';
test('Sleeper projection rows require correct season, week, category and regular NFL context',()=>{
 const row={category:'proj',sport:'nfl',season_type:'regular',season:'2026',week:7,player_id:'8183',stats:{pass_yd:250,rush_yd:20}};
 assert.deepEqual(normalizeSleeperProjections([row,{...row,player_id:'bad-year',season:'2025'},{...row,player_id:'bad-week',week:6},{...row,player_id:'post',season_type:'post'},{...row,player_id:'stats',category:'stat'}],2026,7),{'8183':row.stats});
 assert.throws(()=>normalizeSleeperProjections({},2026,7),/inválida/);
 assert.deepEqual(normalizeSleeperProjections([],2026,7),{});
});
