/* PLAYER CARD v1: the only catalog/card contract. No demo or heuristic enrichment. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.YardlinePlayerCard = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const numberOrNull = value => {
    if (typeof value !== 'number' && typeof value !== 'string') return null;
    if (typeof value === 'string' && !value.trim()) return null;
    try {
      const number = Number(value);
      return Number.isFinite(number) ? number : null;
    } catch {
      return null;
    }
  };
  const ids = values => Array.isArray(values) ? [...new Set(values.map(String).filter(id => id && id !== '0'))] : [];
  const text = value => value == null || value === '' ? null : String(value);
  const pick = (raw, camel, snake) => Object.hasOwn(raw, camel) ? raw[camel] : raw[snake];

  function normalizeSleeperPlayer(playerId, raw = {}) {
    const id = text(playerId ?? raw.sleeperId ?? raw.player_id ?? raw.id);
    if (!id || id === '0') return null;
    const firstName = text(pick(raw, 'firstName', 'first_name'));
    const lastName = text(pick(raw, 'lastName', 'last_name'));
    const espnId = text(pick(raw, 'espnId', 'espn_id'));
    const team = text(raw.team);
    const position = text(raw.position ?? raw.pos);
    const teamLogo = team ? `https://a.espncdn.com/i/teamlogos/nfl/500/${encodeURIComponent(team.toLowerCase())}.png` : null;
    // Regenerate from verified identities, never a persisted/legacy photoUrl.
    const photoUrl = espnId
      ? `https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/${encodeURIComponent(espnId)}.png&w=350&h=254`
      : `https://sleepercdn.com/content/nfl/players/thumb/${encodeURIComponent(id)}.jpg`;
    return {
      contractVersion: 1, id, sleeperId: id, espnId,
      identity: { sleeper: id, espn: espnId },
      name: text(raw.full_name) || text(raw.name) || [firstName, lastName].filter(Boolean).join(' ') || `Jogador #${id}`,
      firstName, lastName, position, fantasyPositions: ids(pick(raw, 'fantasyPositions', 'fantasy_positions') ?? (position ? [position] : [])),
      team, status: text(raw.status), active: typeof raw.active === 'boolean' ? raw.active : raw.status === 'Active' ? true : null,
      injuryStatus: text(pick(raw, 'injuryStatus', 'injury_status')),
      number: numberOrNull(raw.number), age: numberOrNull(raw.age), college: text(raw.college),
      height: text(raw.height), weight: text(raw.weight), yearsExp: numberOrNull(pick(raw, 'yearsExp', 'years_exp')),
      depthChartOrder: numberOrNull(pick(raw, 'depthChartOrder', 'depth_chart_order')),
      depthChartPosition: text(pick(raw, 'depthChartPosition', 'depth_chart_position')),
      searchRank: numberOrNull(pick(raw, 'searchRank', 'search_rank')), photoUrl, teamLogoUrl: teamLogo,
      source: { catalog: raw.source?.catalog === null ? null : 'sleeper', points: null, projection: null },
      dataStatus: raw.dataStatus === 'stale' ? 'stale' : 'partial',
      context: { leagueId: null, season: null, week: null, seasonType: null, scoringFormat: null, projectionFormat: null },
      taxi: null, rosterContext: [],
      metrics: { projectedPoints: null, points: null, pointsPerGame: null, totalPoints: null, observedWeeks: null, ylIndex: null, floor: null, ceiling: null }
    };
  }

  function createPlayerCard(playerId, catalog, data = null, context = {}, rosters = []) {
    const player = normalizeSleeperPlayer(playerId, catalog);
    if (!player) return null;
    const sourced = data || {};
    const metrics = { ...player.metrics };
    if (sourced.source?.points) {
      metrics.points = numberOrNull(sourced.points);
      metrics.pointsPerGame = numberOrNull(sourced.pointsPerGame);
      metrics.totalPoints = numberOrNull(sourced.totalPoints);
      metrics.observedWeeks = numberOrNull(sourced.observedWeeks);
    }
    if (sourced.source?.projection) metrics.projectedPoints = numberOrNull(sourced.projectedPoints);
    const rosterContext = rosters.filter(roster => ids([...(roster.players || []), ...(roster.starters || []), ...(roster.reserve || []), ...(roster.taxi || [])]).includes(player.id))
      .map(roster => ({ rosterId: roster.rosterId ?? roster.roster_id, ownerId: roster.ownerId ?? roster.owner_id ?? null,
        starter: ids(roster.starters).includes(player.id), reserve: ids(roster.reserve).includes(player.id),
        taxi: Array.isArray(roster.taxi) ? ids(roster.taxi).includes(player.id) : null }));
    const taxiKnown = rosters.length > 0 && rosters.every(roster => Array.isArray(roster.taxi));
    const taxi = rosterContext.some(roster => roster.taxi === true) ? true
      : rosterContext.length && rosterContext.every(roster => roster.taxi === false) ? false
      : taxiKnown ? false : null;
    return {
      ...player, metrics, rosterContext,
      taxi,
      source: { catalog: player.source.catalog, points: sourced.source?.points || null, projection: sourced.source?.projection || null },
      dataStatus: context.dataStatus === 'stale' || player.dataStatus === 'stale' ? 'stale'
        : !player.source.catalog ? 'unavailable' : metrics.points !== null && metrics.projectedPoints !== null ? 'available' : 'partial',
      context: { ...player.context, ...context, projectionFormat: sourced.projectionFormat || null,
        pointsWindow: 'season_through_selected_week', ppgDenominator: 'observed_stat_weeks',
        observedWeeks: metrics.observedWeeks,
        pointsUnavailableReason: context.metricAvailability?.stats?.status === 'failed' ? 'stats_fetch_failed'
          : sourced.pointsUnavailableReason
          || (context.seasonType && context.seasonType !== 'regular' ? `season_type_unreconciled:${context.seasonType}` : null)
          || (!sourced.source?.points ? 'stats_unavailable' : null),
        projectionUnavailableReason: sourced.projectionUnavailableReason
          || (context.seasonType && context.seasonType !== 'regular' ? `season_type_unreconciled:${context.seasonType}` : null)
          || (context.metricAvailability?.projections?.status === 'failed' ? 'projections_fetch_failed' : null)
          || (!sourced.source?.projection ? 'projection_unavailable' : null),
        unavailableStatWeeks: sourced.unavailableStatWeeks || [] },
      // Read-only compatibility aliases; active renderers use metrics directly.
      pos: player.position, teamName: player.team, teamLogo: player.teamLogoUrl, photo: player.photoUrl, exp: player.yearsExp,
      proj: metrics.projectedPoints, avgPpr: metrics.pointsPerGame, totalPts: metrics.totalPoints, ylIndex: metrics.ylIndex, points: metrics.points
    };
  }

  function selectUserRoster(rosters, { ownerId = null } = {}) {
    // Display names and roster selection are not proof of ownership.
    if (!Array.isArray(rosters) || !['string', 'number'].includes(typeof ownerId) || !String(ownerId).trim() || String(ownerId) === '0') return null;
    const matches = rosters.filter(roster => String(roster.ownerId ?? roster.owner_id ?? '') === String(ownerId));
    return matches.length === 1 ? matches[0] : null;
  }

  function rosterGroups(roster) {
    const starters = ids(roster?.starters), reserve = ids(roster?.reserve), taxi = ids(roster?.taxi);
    const excluded = new Set([...starters, ...reserve, ...taxi]);
    return { starters, reserve, taxi, bench: ids(roster?.players).filter(id => !excluded.has(id)) };
  }

  function provenance(player) {
    const c = player.context || {}, s = player.source || {};
    return `Catálogo: ${s.catalog || 'indisponível'} · pontos: ${s.points || 'indisponíveis'} (${c.scoringFormat || '—'})${c.pointsUnavailableReason ? ` · motivo: ${c.pointsUnavailableReason}` : ''} · projeção: ${s.projection || 'indisponível'} (${c.projectionFormat || '—'})${c.projectionUnavailableReason ? ` · motivo: ${c.projectionUnavailableReason}` : ''} · ${c.season || '—'}/${c.seasonType || '—'} · semana ${c.week ?? '—'} · ${player.dataStatus} · total parcial / PPG por ${player.metrics?.observedWeeks ?? '—'} semana(s) observada(s)`;
  }
  return Object.freeze({ normalizeSleeperPlayer, createPlayerCard, numberOrNull, selectUserRoster, rosterGroups, provenance });
});
