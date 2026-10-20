import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
function setup(){
  const dom=new JSDOM('<div id="content"><div class="sleeper-bio"><span><b>IDADE</b>26</span></div><div class="sleeper-dossier__identity"><small>Seu elenco</small></div></div>',{runScripts:'outside-only'});
  const w=dom.window;
  for(const file of ['player-card-contract.js','player-dossier-presentation.js'])vm.runInContext(fs.readFileSync(new URL('../../yardline-app/js/'+file,import.meta.url),'utf8'),dom.getInternalVMContext());
  const player=w.YardlinePlayerCard.createPlayerCard('8183',{name:'Brock Purdy',team:'SF',position:'QB',number:13,age:26},
    {totalPoints:143.6,pointsPerGame:20.5,observedWeeks:7,source:{points:'sleeper_matchups'}},{season:'2026',week:7,scoringFormat:'LEAGUE'},[]);
  return {dom,w,player,content:w.document.getElementById('content')};
}
test('game log separates passing and rushing attempts and preserves real zeros',()=>{
  const {dom,w}=setup();
  const html=w.YardlineDossierPresentation.logs([{week:1,opp:'LAR',fpts:23.15,stats:{pass_cmp:25,pass_att:34,pass_yd:205,pass_td:3,pass_int:1,rush_att:5,rush_yd:29,rush_td:0}}]);
  const node=w.document.createElement('div');node.innerHTML=html;
  assert.equal(node.querySelector('[data-stat="pass_att"]').textContent,'34');
  assert.equal(node.querySelector('[data-stat="rush_att"]').textContent,'5');
  assert.equal(node.querySelector('[data-stat="rush_td"]').textContent,'0');
  assert.match(node.textContent,/Passe/);assert.match(node.textContent,/Corrida/);
  assert.match(node.querySelector('.yl-points-col:last-of-type')?.textContent||node.textContent,/23,15/);
  assert.equal(node.querySelectorAll('td:empty').length,0);dom.window.close();
});
test('profile has distinct portrait, typography sections, actual metrics and career coverage',()=>{
  const {dom,w,player,content}=setup();
  w.YardlineDossierPresentation.render(content,player,2026,[{week:1,opp:'LAR',fpts:23.15,stats:{pass_att:34,rush_att:5}}],
    {seasons:[{season:'2026',scoredWeeks:7,observedWeeks:7,totalPoints:143.6,pointsPerGame:20.5,teams:['SF'],pointsCoverage:'observed_weeks'},{season:'2023',scoredWeeks:16,observedWeeks:17,totalPoints:308.4,pointsPerGame:19.3,teams:['SF'],pointsCoverage:'partial'}]},[{id:'8183',name:'Brock Purdy',order:1}],[]);
  assert.equal(content.querySelector('h1').textContent,'Brock Purdy');
  assert.ok(content.querySelector('.yl-profile-portrait img'));
  assert.equal(content.querySelector('.yl-profile-hero').style.getPropertyValue('--yl-team-primary'),'#AA0000');
  assert.match(content.querySelector('.yl-profile-eyebrow').textContent,/QB · SF · #13/);
  assert.match(content.querySelector('.yl-profile-metrics').textContent,/143,6/);
  assert.match(content.querySelector('#tab-sec-seasonstats').textContent,/Parcial · 16 de 17/);
  assert.ok(content.querySelector('#yl-dossier-season option[value="2023"]'));
  assert.equal(content.querySelector('#tab-btn-news'),null);
  assert.doesNotMatch(content.textContent,/DROP \/ SWAP|COACH AI|—/);
  dom.window.close();
});
test('partial stats stay available in record details without empty numeric cells',()=>{
  const {dom,w}=setup();
  const node=w.document.createElement('div');node.innerHTML=w.YardlineDossierPresentation.logs([{week:1,fpts:10,stats:{pass_att:34}},{week:2,fpts:0,stats:{rush_att:2}}]);
  assert.equal(node.querySelector('[data-stat="pass_att"]'),null);
  assert.match(node.textContent,/Tentativas de passe/);assert.match(node.textContent,/34/);
  assert.equal(node.querySelectorAll('td:empty').length,0);
  const toggle=node.querySelector('.yl-record-toggle');
  assert.equal(toggle.getAttribute('aria-expanded'),'false');
  w.document.body.append(node);
  w.Function(toggle.getAttribute('onclick')).call(toggle);
  assert.equal(toggle.getAttribute('aria-expanded'),'true');
  assert.equal(w.document.getElementById(toggle.getAttribute('aria-controls')).hidden,false);
  dom.window.close();
});
