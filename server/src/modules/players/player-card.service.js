import contract from '../../../../yardline-app/js/player-card-contract.js';
import { scorePlayerStats, scoringUnavailableReason, SUPPORTED_SCORING_KEYS } from '../engines/scoring.engine.js';

const observedWeekPoints = Symbol('observedWeekPoints');

export const { normalizeSleeperPlayer, createPlayerCard, numberOrNull } = contract;
export const parseJson = (value, fallback) => { try { return JSON.parse(value ?? ''); } catch { return fallback; } };

export function loadPersistedCatalog(database) {
  const catalog = {};
  const espnIds = new Map(database.prepare("SELECT player_id, provider_player_id FROM player_identities WHERE provider='espn' AND valid_to IS NULL").all().map(row => [row.player_id, row.provider_player_id]));
  for (const row of database.prepare('SELECT * FROM players').all()) {
    const stored = parseJson(row.catalog_json, {});
    const player = normalizeSleeperPlayer(row.id, { ...stored, name: row.canonical_name, position: row.position,
      team: row.team, status: row.status, injuryStatus: row.injury_status, espnId: espnIds.get(row.id) || null,
      photoUrl: stored.photoUrl, source: { catalog: row.catalog_json ? 'sleeper' : null } });
    if (player) catalog[row.id] = player;
  }
  return catalog;
}

export function pointsFromStats(stats, scoringSettings) {
  if (!stats || typeof stats !== 'object' || Array.isArray(stats) || !Object.keys(stats).length) return { points: null, reason: 'stats_unavailable' };
  const scoringReason = scoringUnavailableReason(scoringSettings);
  if (scoringReason) return { points: null, reason: scoringReason };
  // Metadata / preset fantasy totals alone do not establish custom-league production.
  if (!Object.keys(stats).some(key => SUPPORTED_SCORING_KEYS.has(key) && numberOrNull(stats[key]) !== null)) return { points: null, reason: 'scorable_stats_unavailable' };
  return { points: scorePlayerStats(stats, scoringSettings).points, reason: null };
}

export function buildPlayerData(database, { season, week, seasonType = 'regular', scoringSettings = {}, catalog = {} }) {
  const data = {};
  if (seasonType && seasonType !== 'regular') return data;
  const rows = database.prepare("SELECT player_id, week, stats_json, captured_at FROM player_stats WHERE season=? AND week<=? AND source='sleeper' ORDER BY week, captured_at DESC").all(String(season), week);
  const seen = new Set();
  for (const row of rows) {
    const id = String(row.player_id), key = `${id}:${row.week}`;
    if (!catalog[id] || seen.has(key)) continue;
    seen.add(key);
    const result = pointsFromStats(parseJson(row.stats_json, {}), scoringSettings);
    const current = data[id] || { points: null, totalPoints: null, observedWeeks: 0, pointsPerGame: null,
      projectedPoints: null, projectionFormat: null, pointsUnavailableReason: null, source: { points: null, projection: null } };
    if (result.points === null) {
      current.pointsUnavailableReason ||= result.reason;
      data[id] = current;
      continue; // Empty rows must not create fictitious zero totals/games.
    }
    current[observedWeekPoints] ||= new Map();
    current[observedWeekPoints].set(Number(row.week), result.points);
    current.source.points = 'yardline:derived:sleeper-stats';
    current.totalPoints = Number(((current.totalPoints ?? 0) + result.points).toFixed(2));
    current.observedWeeks += 1;
    if (Number(row.week) === Number(week)) current.points = result.points;
    current.pointsPerGame = Number((current.totalPoints / current.observedWeeks).toFixed(2));
    data[id] = current;
  }
  for (const row of database.prepare('SELECT player_id,stats_json FROM player_projection_stats WHERE season=? AND week=?').all(String(season),week)) {
    const id=String(row.player_id), result=pointsFromStats(parseJson(row.stats_json,{}),scoringSettings);
    if(!catalog[id] || result.points===null) continue;
    data[id] ||= {points:null,totalPoints:null,observedWeeks:null,pointsPerGame:null,source:{points:null,projection:null}};
    Object.assign(data[id],{projectedPoints:result.points,projectionFormat:'LEAGUE'});
    data[id].source.projection='sleeper:league_scoring';
  }
  const projections = database.prepare("SELECT player_id, projection, scoring_format, source FROM projections WHERE season=? AND week=? AND source='sleeper' ORDER BY created_at DESC, CASE scoring_format WHEN 'PPR' THEN 0 WHEN 'HALF_PPR' THEN 1 ELSE 2 END").all(String(season), week);
  for (const row of projections) {
    const id = String(row.player_id), points = numberOrNull(row.projection);
    if (!catalog[id] || points === null || !['PPR', 'HALF_PPR', 'STANDARD'].includes(row.scoring_format) || data[id]?.source?.projection) continue;
    // Projection-only is real data, allocated explicitly, never a write through an optional chain.
    data[id] ||= { points: null, totalPoints: null, observedWeeks: null, pointsPerGame: null, source: { points: null, projection: null } };
    Object.assign(data[id], { projectedPoints: points, projectionFormat: row.scoring_format });
    data[id].source.projection = row.source;
  }
  return data;
}

// O Sleeper pode disponibilizar o placar do matchup antes do box score bruto.
// Para cards e dossiês, a pontuação da liga é a fonte oficial nesse intervalo.
export function mergeOfficialMatchupData(database, { leagueId, season, week, playerData = {}, catalog = {} }) {
  const rows = database.prepare(`
    SELECT mp.player_id, m.week, mp.points, mp.projected_points, mp.scoring_breakdown_json
    FROM matchup_players mp
    JOIN matchups m ON m.id = mp.matchup_id
    WHERE m.league_id=? AND m.season=? AND m.week<=?
    ORDER BY m.week, mp.captured_at DESC
  `).all(leagueId, String(season), Number(week));
  const byPlayer = new Map();
  for (const row of rows) {
    const id = String(row.player_id), points = numberOrNull(row.points);
    if (!catalog[id] || points === null) continue;
    const current = byPlayer.get(id) || new Map();
    if (!current.has(Number(row.week))) current.set(Number(row.week), { points, projectedPoints: parseJson(row.scoring_breakdown_json,{}).projectionFormat === 'LEAGUE' ? numberOrNull(row.projected_points) : null, projectionFormat: parseJson(row.scoring_breakdown_json,{}).projectionFormat });
    byPlayer.set(id, current);
  }
  for (const [id, weeks] of byPlayer) {
    const mergedWeeks = new Map(playerData[id]?.[observedWeekPoints] || []);
    for (const [week, row] of weeks) mergedWeeks.set(week, row.points);
    const observed = [...mergedWeeks.values()];
    const totalPoints = Number(observed.reduce((sum, points) => sum + points, 0).toFixed(2));
    const currentWeek = weeks.get(Number(week));
    const existing = playerData[id] || { points: null, totalPoints: null, observedWeeks: null, pointsPerGame: null, projectedPoints: null, projectionFormat: null, source: { points: null, projection: null } };
    playerData[id] = {
      ...existing,
      points: currentWeek?.points ?? existing.points ?? null,
      totalPoints,
      observedWeeks: observed.length,
      pointsPerGame: Number((totalPoints / observed.length).toFixed(2)),
      projectedPoints: currentWeek?.projectedPoints ?? existing.projectedPoints ?? null,
      projectionFormat: currentWeek?.projectedPoints != null ? currentWeek.projectionFormat : existing.projectionFormat || null,
      source: { ...(existing.source || {}), points: 'sleeper_matchups', projection: currentWeek?.projectedPoints !== null && currentWeek?.projectedPoints !== undefined ? 'sleeper_matchups' : (existing.source?.projection || null) }
    };
  }
  return playerData;
}

export function leagueCardContext(league, week, dataStatus = null) {
  return { leagueId: league.provider_league_id, season: String(league.season), week,
    seasonType: league.season_type || null, scoringFormat: 'LEAGUE',
    scoringSettings: parseJson(league.scoring_settings_json, {}), dataStatus };
}

export function buildPlayerCards(catalog, playerData = {}, context = {}, rosters = []) {
  return Object.fromEntries(Object.entries(catalog || {}).map(([id, player]) => [id, createPlayerCard(id, player, playerData[id], context, rosters)]));
}

export function buildPlayerHistory(database, { playerId, season, league = null }) {
  const stats = database.prepare("SELECT week, stats_json FROM player_stats WHERE player_id=? AND season=? AND source='sleeper' ORDER BY week").all(String(playerId), String(season));
  const projections = database.prepare("SELECT week, projection, scoring_format FROM projections WHERE player_id=? AND season=? AND source='sleeper' ORDER BY created_at DESC").all(String(playerId), String(season));
  const rawProjections = database.prepare('SELECT week,stats_json FROM player_projection_stats WHERE player_id=? AND season=?').all(String(playerId),String(season));
  const official = league?.id ? database.prepare(`SELECT m.week, mp.points FROM matchup_players mp JOIN matchups m ON m.id=mp.matchup_id WHERE m.league_id=? AND m.season=? AND mp.player_id=? ORDER BY mp.captured_at DESC`).all(league.id, String(season), String(playerId)) : [];
  const weeks = new Set([...stats.map(row => row.week), ...projections.map(row => row.week), ...official.map(row => row.week), ...rawProjections.map(row => row.week)]);
  const scoring = league ? parseJson(league.scoring_settings_json, {}) : null;
  return [...weeks].sort((a, b) => a - b).map(week => {
    const raw = parseJson(stats.find(row => row.week === week)?.stats_json, {});
    const projection = projections.find(row => row.week === week && row.scoring_format === 'PPR') || projections.find(row => row.week === week);
    const rawProjection = rawProjections.find(row=>Number(row.week)===Number(week));
    const leagueProjection = scoring && rawProjection ? pointsFromStats(parseJson(rawProjection.stats_json,{}),scoring).points : null;
    const scoringResult = scoring ? pointsFromStats(raw, scoring) : { points: null, reason: 'scoring_unavailable' };
    const seasonTypeReason = league?.season_type && league.season_type !== 'regular' ? `season_type_unreconciled:${league.season_type}` : null;
    const officialPoints = numberOrNull(official.find(row => Number(row.week) === Number(week) && numberOrNull(row.points) !== null)?.points);
    const points = seasonTypeReason ? null : officialPoints ?? scoringResult.points;
    return { week, opp: raw.opponent || null, proj: leagueProjection ?? numberOrNull(projection?.projection), projectionFormat: leagueProjection!==null ? 'LEAGUE' : projection?.scoring_format || null,
      fpts: points, pointsUnavailableReason: points !== null ? null : seasonTypeReason || scoringResult.reason, pointsFormat: league ? 'LEAGUE' : null, source: { points: points === null ? null : officialPoints !== null ? 'sleeper_matchups' : 'yardline:derived:sleeper-stats', projection: leagueProjection!==null ? 'sleeper:league_scoring' : projection ? 'sleeper' : null },
      snap: numberOrNull(raw.off_pct ?? raw.snap_pct), att: numberOrNull(raw.rush_att ?? raw.pass_att ?? raw.rec_tgt), cmp: numberOrNull(raw.pass_cmp),
      yd: numberOrNull(raw.pass_yd ?? raw.rush_yd ?? raw.rec_yd), td: numberOrNull(raw.pass_td ?? raw.rush_td ?? raw.rec_td), int: numberOrNull(raw.pass_int) };
  });
}
