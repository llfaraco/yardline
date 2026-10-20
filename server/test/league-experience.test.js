import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const source = file => fs.readFileSync(new URL('../../yardline-app/js/' + file, import.meta.url), 'utf8');
function fixture(snapshot, selected = 1) {
  const dom = new JSDOM('<div id="view-home"></div><div id="view-playbook"></div><div id="view-league"></div>', {runScripts:'outside-only'});
  const w = dom.window;
  w.eval(source('player-card-contract.js'));
  w.YL_SHELL_SNAPSHOT = snapshot;
  w.userRealRoster = selected === null ? null : {roster_id:selected};
  w.YL_PLAYER_CARDS = snapshot.playerCards || {};
  w.renderCanonicalPlayerCard = p => `<article>${p.name}</article>`;
  w.renderHomeView = () => {};
  w.eval(source('league-experience.js'));
  return dom;
}
const snapshot = () => ({league:{id:'internal',providerLeagueId:'external',season:'2026',name:'Liga'},state:{week:7},
  rosters:[{rosterId:1,teamName:'Meu time',starters:['a'],players:['a']},{rosterId:2,teamName:'Rival',starters:['b'],players:['b']}],
  matchups:[{week:7,season:'2026',rosterAId:2,rosterBId:1,scoreA:12.5,scoreB:0,players:[{player_id:'a',roster_id:1,points:null},{player_id:'b',roster_id:2,points:12.5}]}],
  playerCards:{a:{id:'a',name:'Atleta A',context:{leagueId:'external',season:'2026',week:7}},b:{id:'b',name:'Atleta B',context:{leagueId:'external',season:'2026',week:7}}}});

test('three pages share reversed matchup orientation and preserve a sourced zero', () => {
  const dom = fixture(snapshot()), d = dom.window.document;
  for (const page of ['home','playbook','league']) {
    const text = d.getElementById('view-'+page).textContent;
    assert.match(text,/Meu time/); assert.match(text,/Rival/); assert.match(text,/0\.00/); assert.match(text,/12\.50/);
    assert.doesNotMatch(text,/não identificado|Semana 6|não iniciado|indisponível/i);
  }
  assert.match(d.getElementById('view-playbook').textContent,/Atleta A/);
  assert.match(d.getElementById('view-league').textContent,/Atleta B/);
  dom.window.close();
});
test('unknown owner, wrong week and wrong season never select a demo or first roster', () => {
  for (const change of [s => s.matchups[0].week=6,s => s.matchups[0].season='2025']) {
    const s=snapshot();change(s);const dom=fixture(s);
    assert.doesNotMatch(dom.window.document.getElementById('view-league').textContent,/Rival|12\.50|0\.00/);
    dom.window.close();
  }
  const dom=fixture(snapshot(),null);
  assert.match(dom.window.document.getElementById('view-playbook').textContent,/selecione seu time/);
  assert.doesNotMatch(dom.window.document.body.textContent,/Rival|Atleta A|12\.50/);
  dom.window.close();
});
test('missing points are omitted and cards from another context are rejected', () => {
  const s=snapshot();s.matchups[0].scoreB=null;s.playerCards.a.context.week=6;
  const dom=fixture(s),d=dom.window.document;
  assert.doesNotMatch(d.getElementById('view-playbook').textContent,/0\.00|Atleta A|—/);
  assert.equal(d.querySelectorAll('#view-league .yl-matchup-row strong').length,1);
  dom.window.close();
});
test('changing the shared snapshot updates all page summaries together', () => {
  const dom=fixture(snapshot()),w=dom.window;
  w.YL_SHELL_SNAPSHOT.matchups[0].scoreB=23;
  w.renderHomeView();w.renderPlaybookView();w.renderLeagueView();
  for(const page of ['home','playbook','league']) assert.match(w.document.getElementById('view-'+page).textContent,/23\.00/);
  assert.equal(w.document.querySelectorAll('[data-league-summary]').length,1);
  dom.window.close();
});


test('real dossier DOM removes unavailable tools, bio and metrics', async () => {
  const dom=new JSDOM('<div id="player-modal"><div id="player-modal-content"></div></div>',{runScripts:'outside-only',url:'http://fixture.invalid'}),w=dom.window;
  w.document.addEventListener=()=>{};w.setInterval=()=>0;
  w.fetch=async()=>({ok:true,json:async()=>({rows:[],items:[],seasons:[],syncing:false})});
  for(const file of ['player-card-contract.js','data_and_views.js','engines.js']) vm.runInContext(source(file),dom.getInternalVMContext());
  const p=w.YardlinePlayerCard.createPlayerCard('test-player',{name:'Atleta Teste',position:'WR',team:'NE'},null,{season:'2026',week:7},[]);
  w.resolveNFLPlayer=()=>p;
  await w.openPlayerDossierModal('test-player');
  const content=w.document.getElementById('player-modal-content');
  assert.equal(content.querySelector('#tab-btn-sentiment'),null);
  assert.equal(content.querySelector('#tab-btn-news'),null);
  assert.equal(content.querySelector('#tab-btn-depth'),null);
  assert.equal(content.querySelector('.sleeper-bio').children.length,0);
  assert.equal(content.querySelectorAll('.fp-stat-box').length,0);
  assert.doesNotMatch(content.querySelector('#tab-sec-fullprofile').textContent,/—|não informad/i);
  assert.match(content.textContent,/Atleta Teste/);
  dom.window.close();
});
