// Public Sleeper responses are compared with the same-week local snapshot.
export function compareLeagueSnapshot(snapshot, references) {
  const issues = [], unavailable = [];
  const number = value => value === null || value === undefined || value === '' || !Number.isFinite(Number(value)) ? null : Number(value);
  const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
  const ids = values => [...new Set((values || []).map(String))].sort();
  const league = references['sleeper.league'], rosters = references['sleeper.rosters'], matchups = references['sleeper.matchups'];
  if (!snapshot?.league || !league || !Array.isArray(rosters) || !Array.isArray(matchups)) return {status:'NOT_VERIFIABLE',issues:[],unavailable:['Dados públicos ou snapshot ausentes']};
  const state = references['sleeper.state'];
  const expectedWeek = String(state?.season) === String(league.season) ? number(state.week) : number(league.settings?.leg);
  if (expectedWeek === null || number(snapshot.state?.week) !== expectedWeek) return {status:'NOT_VERIFIABLE',issues:[],unavailable:['Snapshot e fonte precisam usar a mesma semana']};
  if (String(snapshot.league.providerLeagueId ?? snapshot.league.provider_league_id) !== String(league.league_id) || String(snapshot.league.season) !== String(league.season)) issues.push('Liga/temporada divergente');
  for (const raw of rosters) {
    const local = snapshot.rosters?.find(r => number(r.rosterId ?? r.roster_id) === number(raw.roster_id));
    if (!local) {issues.push(`Elenco ${raw.roster_id} ausente`);continue;}
    if (String(local.ownerId ?? local.owner_id) !== String(raw.owner_id)) issues.push(`Owner divergente no elenco ${raw.roster_id}`);
    if (!same(ids(local.players),ids(raw.players))) issues.push(`Jogadores divergentes no elenco ${raw.roster_id}`);
  }
  for (const raw of matchups.filter(m => m.matchup_id != null)) {
    const local = snapshot.matchups?.find(m => number(m.matchupId ?? m.provider_matchup_id) === number(raw.matchup_id));
    if (!local) {issues.push(`Confronto ${raw.matchup_id} ausente`);continue;}
    const a = number(local.rosterAId ?? local.roster_a_id), b = number(local.rosterBId ?? local.roster_b_id);
    if (![a,b].includes(number(raw.roster_id))) {issues.push(`Elenco ${raw.roster_id} fora do confronto ${raw.matchup_id}`);continue;}
    const score = number(raw.custom_points) ?? number(raw.points);
    const stored = number(a === number(raw.roster_id) ? local.scoreA ?? local.score_a : local.scoreB ?? local.score_b);
    if (score === null || stored === null) unavailable.push(`Placar do elenco ${raw.roster_id}`);
    else if (Math.abs(score-stored)>0.011) issues.push(`Placar divergente no elenco ${raw.roster_id}`);
    const rows = (local.players || []).filter(p => number(p.roster_id ?? p.rosterId) === number(raw.roster_id));
    const starters = rows.filter(p => p.is_starter === 1 || p.is_starter === true || p.isStarter === true).map(p => p.player_id ?? p.playerId);
    if (!same(ids(starters),ids(raw.starters).filter(id => id !== '0'))) issues.push(`Titulares divergentes no elenco ${raw.roster_id}`);
  }
  return {status:issues.length?'FAIL':unavailable.length?'NOT_VERIFIABLE':'PASS',issues,unavailable};
}
