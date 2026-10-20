/* All three league pages read one snapshot. Never fall back to demo rosters. */
(function (root) {
  'use strict';
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num = v => root.YardlinePlayerCard.numberOrNull(v);
  const id = r => num(r?.rosterId ?? r?.roster_id);
  function select(snapshot = {}, rosterId = null) {
    const rosters = snapshot.rosters || [], week = num(snapshot.state?.week);
    const roster = rosterId == null ? null : rosters.find(r => id(r) === num(rosterId)) || null;
    const matchup = roster && (snapshot.matchups || []).find(m => num(m.week) === week
      && String(m.season) === String(snapshot.league?.season)
      && [num(m.rosterAId ?? m.roster_a_id), num(m.rosterBId ?? m.roster_b_id)].includes(id(roster)));
    const isA = matchup && num(matchup.rosterAId ?? matchup.roster_a_id) === id(roster);
    const opponentId = matchup ? num(isA ? matchup.rosterBId ?? matchup.roster_b_id : matchup.rosterAId ?? matchup.roster_a_id) : null;
    const opponent = rosters.find(r => opponentId !== null && id(r) === opponentId) || null;
    const standing = r => (snapshot.standings || []).find(s => id(s) === id(r));
    const name = r => r ? standing(r)?.teamName || r.teamName || r.ownerName || `Time #${id(r)}` : '';
    return { snapshot, roster, opponent, matchup: matchup || null, week, name,
      myScore: matchup ? num(isA ? matchup.scoreA ?? matchup.score_a : matchup.scoreB ?? matchup.score_b) : null,
      oppScore: matchup ? num(isA ? matchup.scoreB ?? matchup.score_b : matchup.scoreA ?? matchup.score_a) : null };
  }
  function lineup(s, roster) {
    const rows = (s.matchup?.players || []).filter(p => num(p.roster_id ?? p.rosterId) === id(roster));
    const known = rows.length && rows.every(p => p.is_starter != null || p.isStarter != null);
    if (!known) return (roster?.starters || []).map(String);
    return rows.filter(p => p.is_starter === 1 || p.is_starter === true || p.isStarter === true)
      .sort((a,b) => Number(String(a.slot).replace('STARTER_','')) - Number(String(b.slot).replace('STARTER_','')))
      .map(p => String(p.player_id ?? p.playerId));
  }
  function player(s, playerId) {
    const p = (s.snapshot.playerCards || root.YL_PLAYER_CARDS)?.[String(playerId)];
    return p && String(p.context?.leagueId) === String(s.snapshot.league?.providerLeagueId ?? s.snapshot.league?.provider_league_id ?? s.snapshot.league?.id)
      && String(p.context?.season) === String(s.snapshot.league?.season) && num(p.context?.week) === s.week ? p : null;
  }
  root.YardlineLeagueExperience = { select, lineup, player };
  if (typeof document === 'undefined') return;
  function context() {
    const selected = typeof userRealRoster !== 'undefined' ? userRealRoster : null;
    return select(root.YL_SHELL_SNAPSHOT, id(selected));
  }
  const refresh = '<button class="btn-yl btn-primary" onclick="syncRealSleeperLeagueLive().catch(e=>showToast(e.message))">Atualizar Sleeper</button>';
  function header(s, title) {
    const details = [s.snapshot.league?.name, s.snapshot.league?.season, s.week !== null ? `Semana ${s.week}` : null].filter(Boolean);
    return `<div class="yl-card" style="padding:24px;margin-bottom:20px"><div class="yl-card-header yl-league-header"><div><h2>${esc(title)}</h2><p>${details.map(esc).join(' · ')}</p></div>${refresh}</div>${s.snapshot.dataStatus === 'stale' || s.snapshot.provenance?.status === 'stale' ? '<p role="status">Exibindo a última atualização salva. Atualize para consultar a Sleeper.</p>' : ''}</div>`;
  }
  function summary(s) {
    if (!s.roster) return '<div class="yl-card" style="padding:24px"><p>Conecte sua conta Sleeper e selecione seu time para acompanhar a rodada.</p><button class="btn-yl btn-primary" onclick="openLeagueSwitcherModal()">Selecionar liga e time</button></div>';
    if (!s.opponent || !s.matchup) return '';
    const score = s.myScore !== null && s.oppScore !== null ? `<div class="yl-dashboard-compare"><strong>${s.myScore.toFixed(2)}</strong><span>×</span><strong>${s.oppScore.toFixed(2)}</strong></div><small>Pontos da rodada · Sleeper</small>` : '';
    return `<article class="yl-card" style="padding:24px;margin-bottom:20px"><span class="badge badge-navy">CONFRONTO DA SEMANA ${esc(s.week)}</span><h3 style="margin:14px 0">${esc(s.name(s.roster))} <span style="font-weight:400">×</span> ${esc(s.name(s.opponent))}</h3>${score}</article>`;
  }
  function cards(s, roster, title, ids) {
    const html = ids.map(playerId => {
      const p = player(s, playerId); if (!p) return '';
      const index = lineup(s, roster).indexOf(String(playerId));
      const slot = title === 'Titulares' && index >= 0 ? s.snapshot.league?.rosterPositions?.[index] : title === 'Banco' ? 'BN' : title === 'Taxi' ? 'TAXI' : '';
      return typeof renderCanonicalPlayerCard === 'function' ? renderCanonicalPlayerCard(p, slot) : '';
    }).join('');
    return html ? `<section style="margin:24px 0"><h3>${esc(title)}</h3><div class="yl-dashboard-player-grid">${html}</div></section>` : '';
  }
  root.renderPlaybookView = function () {
    const el = document.getElementById('view-playbook'); if (!el) return;
    const s = context(), groups = root.YardlinePlayerCard.rosterGroups(s.roster);
    groups.starters = lineup(s, s.roster);
    groups.bench = (s.roster?.players || []).map(String).filter(id => !groups.starters.includes(id) && !groups.reserve.includes(id) && !groups.taxi.includes(id));
    el.innerHTML = header(s, 'Meu Playbook') + summary(s)
      + cards(s, s.roster, 'Titulares', groups.starters) + cards(s, s.roster, 'Banco', groups.bench)
      + cards(s, s.roster, 'Reserva', groups.reserve) + cards(s, s.roster, 'Taxi', groups.taxi);
  };
  root.renderLeagueView = root.renderAuditLeagueView = function () {
    const el = document.getElementById('view-league'); if (!el) return;
    const s = context();
    function team(roster) {
      if (!roster) return '';
      const rows = (s.matchup?.players || []).filter(p => num(p.roster_id ?? p.rosterId) === id(roster));
      const html = lineup(s, roster).map(playerId => {
        const p = player(s, playerId);
        if (!p) return '';
        const row = rows.find(r => String(r.player_id ?? r.playerId) === String(playerId));
        const points = num(row?.points);
        return `<button class="yl-matchup-row" style="width:100%;text-align:left;background:none;border:0;cursor:pointer" onclick="openPlayerDossierModal('${esc(p.id)}')"><img src="${esc(p.photoUrl)}" alt="" onerror="this.hidden=true"><b>${esc(p.name)}</b><span>${[p.position,p.team].filter(Boolean).map(esc).join(' · ')}</span>${points !== null ? `<strong class="mono">${points.toFixed(2)} <small>pts</small></strong>` : ''}</button>`;
      }).join('');
      return html ? `<section class="yl-card" style="padding:20px"><h3>${esc(s.name(roster))}</h3>${html}</section>` : '';
    }
    el.innerHTML = header(s, 'Confronto da semana') + summary(s)
      + (s.matchup && s.opponent ? `<div class="yl-matchup-shell">${team(s.roster)}${team(s.opponent)}</div>` : '');
  };
  root.getActiveRosterPlayerIds = () => new Set(root.YardlinePlayerCard.rosterGroups(context().roster).starters.concat(context().roster?.players || [], context().roster?.reserve || [], context().roster?.taxi || []).map(String));
  root.getOpponentRosterPlayerIds = () => new Set((context().opponent?.players || []).map(String));
  const previousHome = root.renderHomeView;
  root.renderHomeView = function () {
    if (typeof previousHome === 'function') previousHome();
    const el = document.getElementById('view-home'); if (!el) return;
    el.querySelector?.('[data-league-summary]')?.remove();
    const s = context();
    el.insertAdjacentHTML?.('afterbegin', `<div data-league-summary>${summary(s)}</div>`);
  };
  root.renderPlaybookView(); root.renderLeagueView(); root.renderHomeView();
})(typeof window !== 'undefined' ? window : globalThis);
