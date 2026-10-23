import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import { createLeagueRefresh } from '../src/modules/sleeper/league-refresh.js';
test('backend coalesces parallel refreshes, reuses short automatic cache, and manual sync stays fresh',async()=>{
 let now=0,calls=0,resolve;
 const refresh=createLeagueRefresh(()=>{calls++;return new Promise(r=>resolve=r);},{now:()=>now});
 const a=refresh('league',7,{coreOnly:true,automatic:true});
 const b=refresh('league',7,{coreOnly:true,automatic:true});
 assert.equal(a,b);await Promise.resolve();assert.equal(calls,1);
 resolve({success:true,status:'SUCCESS',week:7});await a;
 assert.equal((await refresh('league',7,{coreOnly:true,automatic:true})).reused,true);
 const manual=refresh('league',7,{coreOnly:true});await Promise.resolve();assert.equal(calls,2);resolve({success:true,status:'SUCCESS',week:7});await manual;
 now=31000;const fresh=refresh('league',7,{coreOnly:true,automatic:true});await Promise.resolve();assert.equal(calls,3);resolve({success:true,status:'SUCCESS',week:7});await fresh;
});
test('failed refresh is evicted so a recovered provider can be retried',async()=>{
 let calls=0;const refresh=createLeagueRefresh(async()=>{if(++calls===1)throw Error('upstream offline');return {ok:true};});
 await assert.rejects(refresh('league'),/offline/);assert.equal((await refresh('league')).ok,true);
});
function browser(refresh,{visible=()=>true,online=()=>true}={}){
 const timers=new Map(),statuses=[];let id=0;
 const root={setTimeout,clearTimeout};const c=vm.createContext(root);
 vm.runInContext(fs.readFileSync(new URL('../../yardline-app/js/league-auto-refresh.js',import.meta.url),'utf8'),c);
 const controller=root.YardlineAutoRefresh.create({refresh,visible,online,status:s=>statuses.push(s),schedule:(fn,delay)=>{timers.set(++id,{fn,delay});return id;},cancel:id=>timers.delete(id)});
 return {controller,timers,statuses};
}
test('automatic loop does not overlap and backs off on failure while preserving the last snapshot',async()=>{
 let calls=0,resolve;
 const {controller,timers,statuses}=browser(()=>{calls++;return new Promise(r=>resolve=r);});
 controller.start();const a=controller.tick(),b=controller.tick();assert.equal(a,b);
 await Promise.resolve();assert.equal(calls,1);resolve({syncedAt:'2026-10-20T18:00:00Z'});await a;
 assert.equal(statuses.at(-1).status,'synced');assert.equal([...timers.values()].at(-1).delay,60000);
 controller.stop();assert.equal(timers.size,0);
 const failed=browser(async()=>{throw Error('network');});failed.controller.start();await failed.controller.tick();
 assert.equal(failed.statuses.at(-1).status,'stale');assert.equal([...failed.timers.values()].at(-1).delay,120000);failed.controller.stop();
});
test('hidden or offline browser does not call the provider',async()=>{
 let calls=0;
 for(const options of [{visible:()=>false},{online:()=>false}]){
  const {controller}=browser(async()=>calls++,options);controller.start();await controller.tick();controller.stop();
 }
 assert.equal(calls,0);
});
