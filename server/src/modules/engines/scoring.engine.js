// ========================================================
// YARDLINE - SCORING ENGINE
// Converte estatísticas Sleeper em pontos explicáveis.
// ========================================================
import contract from '../../../../yardline-app/js/player-card-contract.js';
const { numberOrNull } = contract;

const STAT_ALIASES = {
  passYards: ['pass_yd', 'pass_yds', 'passing_yards'],
  passTd: ['pass_td', 'pass_tds', 'passing_touchdowns'],
  interceptions: ['pass_int', 'interceptions'],
  passTwoPt: ['pass_2pt', 'pass_2pt_conv'],
  rushYards: ['rush_yd', 'rush_yds', 'rushing_yards'],
  rushTd: ['rush_td', 'rush_tds', 'rushing_touchdowns'],
  rushTwoPt: ['rush_2pt', 'rush_2pt_conv'],
  receptions: ['rec', 'receptions', 'rec_cnt'],
  receivingYards: ['rec_yd', 'rec_yds', 'receiving_yards'],
  receivingTd: ['rec_td', 'rec_tds', 'receiving_touchdowns'],
  receivingTwoPt: ['rec_2pt', 'rec_2pt_conv'],
  fumblesLost: ['fum_lost', 'fumbles_lost'],
  sacks: ['def_sack', 'sacks'],
  defensiveInterceptions: ['def_int', 'def_interception', 'def_interceptions'],
  forcedFumbles: ['def_ff', 'forced_fumbles'],
  fumbleRecoveries: ['def_fumble_rec', 'fumble_recoveries'],
  defensiveTouchdowns: ['def_td', 'def_tds', 'defensive_touchdowns'],
  tackles: ['def_tackle', 'tackles', 'total_tackles'],
  soloTackles: ['def_tackle_solo', 'tackles_solo', 'solo_tackles'],
  assists: ['def_tackle_assist', 'tackle_assists', 'assists'],
  passesDefended: ['def_pass_def', 'passes_defended', 'pass_defended'],
  qbHits: ['def_qb_hit', 'qb_hits'],
  safeties: ['def_safety', 'safeties'],
  blockedKicks: ['def_block_kick', 'blocked_kicks'],
  extraPointsMade: ['extra_pt', 'extra_points_made', 'xpm'],
  fieldGoalsMade: ['fgm', 'field_goals_made'],
  fieldGoalsMissed: ['fgmiss', 'field_goals_missed'],
  defensePointsAllowed: ['def_pts_allow', 'points_allowed'],
  kickReturnTd: ['kr_td', 'kick_return_td'],
  puntReturnTd: ['pr_td', 'punt_return_td']
};

// Sleeper's granular scoring counters are already normalized in raw stats:
// idp_* are individual defense; unprefixed defense keys belong to D/ST.
const DIRECT_SCORING_KEYS = [
  'sack', 'int', 'ff', 'fum_rec', 'safe', 'blk_kick', 'fum_rec_td', 'def_st_td',
  'def_st_fum_rec', 'def_st_ff', 'st_td', 'st_ff', 'st_fum_rec', 'st_tkl_solo',
  'idp_sack', 'idp_int', 'idp_ff', 'idp_fum_rec', 'idp_def_td', 'idp_safe',
  'idp_blk_kick', 'idp_tkl', 'idp_tkl_loss', 'idp_tkl_solo', 'idp_tkl_ast', 'idp_pass_def', 'idp_qb_hit',
  'fgm_0_19', 'fgm_20_29', 'fgm_30_39', 'fgm_40_49', 'fgm_50_59', 'fgm_60p',
  'fgmiss_0_19', 'fgmiss_20_29', 'fgmiss_30_39', 'fgmiss_40_49', 'fgmiss_50_59', 'fgmiss_60p',
  'pts_allow_0', 'pts_allow_1_6', 'pts_allow_7_13', 'pts_allow_14_20', 'pts_allow_21_27', 'pts_allow_28_34', 'pts_allow_35p',
  'xpm', 'xpmiss', 'pass_sack', 'pass_int_td', 'fum', 'kr_yd', 'pr_yd',
  'pass_fd', 'rush_fd', 'rec_fd', 'bonus_fd_te', 'bonus_fd_wr', 'bonus_fd_rb', 'bonus_fd_qb',
  'bonus_rec_te', 'bonus_rec_wr', 'bonus_rec_rb'
];

// Cards fail closed rather than claiming a complete custom-league score.
export const SUPPORTED_SCORING_KEYS = new Set([
  'pass_yd', 'pass_td', 'pass_int', 'pass_2pt', 'rush_yd', 'rush_td', 'rush_2pt',
  'rec', 'rec_yd', 'rec_td', 'rec_2pt', 'fum_lost', 'def_sack', 'def_int', 'def_ff',
  'def_fumble_rec', 'def_td', 'def_tackle', 'def_tackle_solo', 'def_tackle_assist',
  'def_pass_def', 'def_qb_hit', 'def_safety', 'def_block_kick', 'extra_pt', 'fgm',
  'fgmiss', 'kr_td', 'pr_td', 'bonus_pass_yd_300', 'bonus_rush_yd_100', 'bonus_rec_yd_100',
  ...DIRECT_SCORING_KEYS
]);

function firstNumber(stats, aliases) {
  for (const key of aliases) {
    const value = numberOrNull(stats?.[key]);
    if (value !== null) return value;
  }
  return 0;
}

function setting(settings, key, fallback = 0) {
  return numberOrNull(settings?.[key]) ?? fallback;
}

function bonus(stats, settings, statAliases, threshold, settingKey) {
  const value = firstNumber(stats, statAliases);
  return value >= threshold ? setting(settings, settingKey) : 0;
}

function addBreakdown(breakdown, key, stat, multiplier) {
  const points = Number((stat * multiplier).toFixed(4));
  if (stat !== 0 && points !== 0) {
    breakdown.push({
      rule: key,
      key,
      stat,
      multiplier,
      points: Number(points.toFixed(2))
    });
  }
  return points;
}

export function scoringUnavailableReason(scoringSettings) {
  if (!scoringSettings || typeof scoringSettings !== 'object' || Array.isArray(scoringSettings) || !Object.keys(scoringSettings).length) return 'scoring_unavailable';
  const entries = Object.entries(scoringSettings);
  const invalid = entries.filter(([, value]) => numberOrNull(value) === null).map(([key]) => key).sort();
  if (invalid.length) return `invalid_scoring:${invalid.join(',')}`;
  const unsupported = entries.filter(([key, value]) => numberOrNull(value) !== 0 && !SUPPORTED_SCORING_KEYS.has(key)).map(([key]) => key).sort();
  return unsupported.length ? `unsupported_scoring:${unsupported.join(',')}` : null;
}

export function scorePlayerStats(stats = {}, scoringSettings = {}) {
  const unavailableReason = scoringUnavailableReason(scoringSettings)
    || (!stats || typeof stats !== 'object' || Array.isArray(stats) || !Object.keys(stats).length ? 'stats_unavailable'
      : ![...Object.values(STAT_ALIASES).flat(), ...DIRECT_SCORING_KEYS].some(key => numberOrNull(stats[key]) !== null) ? 'scorable_stats_unavailable' : null);
  if (unavailableReason) {
    const unsupported = unavailableReason.startsWith('unsupported_scoring:');
    return { points: null, status: unsupported ? 'unsupported' : 'unavailable',
      reason: unsupported ? unavailableReason.slice('unsupported_scoring:'.length) : unavailableReason,
      unavailableReason, breakdown: [], stats, scoringSettings };
  }
  const breakdown = [];
  let total = 0;
  const add = (key, aliases, settingKey) => {
    const stat = firstNumber(stats, aliases);
    total += addBreakdown(breakdown, key, stat, setting(scoringSettings, settingKey));
  };

  add('pass_yards', STAT_ALIASES.passYards, 'pass_yd');
  add('pass_td', STAT_ALIASES.passTd, 'pass_td');
  add('pass_int', STAT_ALIASES.interceptions, 'pass_int');
  add('pass_2pt', STAT_ALIASES.passTwoPt, 'pass_2pt');
  add('rush_yards', STAT_ALIASES.rushYards, 'rush_yd');
  add('rush_td', STAT_ALIASES.rushTd, 'rush_td');
  add('rush_2pt', STAT_ALIASES.rushTwoPt, 'rush_2pt');
  add('receptions', STAT_ALIASES.receptions, 'rec');
  add('receiving_yards', STAT_ALIASES.receivingYards, 'rec_yd');
  add('receiving_td', STAT_ALIASES.receivingTd, 'rec_td');
  add('receiving_2pt', STAT_ALIASES.receivingTwoPt, 'rec_2pt');
  add('fumbles_lost', STAT_ALIASES.fumblesLost, 'fum_lost');
  add('sacks', STAT_ALIASES.sacks, 'def_sack');
  add('def_interceptions', STAT_ALIASES.defensiveInterceptions, 'def_int');
  add('forced_fumbles', STAT_ALIASES.forcedFumbles, 'def_ff');
  add('fumble_recoveries', STAT_ALIASES.fumbleRecoveries, 'def_fumble_rec');
  add('defensive_td', STAT_ALIASES.defensiveTouchdowns, 'def_td');
  add('tackles', STAT_ALIASES.tackles, 'def_tackle');
  add('solo_tackles', STAT_ALIASES.soloTackles, 'def_tackle_solo');
  add('tackle_assists', STAT_ALIASES.assists, 'def_tackle_assist');
  add('passes_defended', STAT_ALIASES.passesDefended, 'def_pass_def');
  add('qb_hits', STAT_ALIASES.qbHits, 'def_qb_hit');
  add('safeties', STAT_ALIASES.safeties, 'def_safety');
  add('blocked_kicks', STAT_ALIASES.blockedKicks, 'def_block_kick');
  add('extra_points_made', STAT_ALIASES.extraPointsMade, 'extra_pt');
  add('field_goals_made', STAT_ALIASES.fieldGoalsMade, 'fgm');
  add('field_goals_missed', STAT_ALIASES.fieldGoalsMissed, 'fgmiss');
  add('kick_return_td', STAT_ALIASES.kickReturnTd, 'kr_td');
  add('punt_return_td', STAT_ALIASES.puntReturnTd, 'pr_td');

  total += bonus(stats, scoringSettings, STAT_ALIASES.passYards, 300, 'bonus_pass_yd_300');
  total += bonus(stats, scoringSettings, STAT_ALIASES.rushYards, 100, 'bonus_rush_yd_100');
  total += bonus(stats, scoringSettings, STAT_ALIASES.receivingYards, 100, 'bonus_rec_yd_100');
  for (const key of DIRECT_SCORING_KEYS) {
    total += addBreakdown(breakdown, key, numberOrNull(stats[key]) ?? 0, setting(scoringSettings, key));
  }

  return {
    points: Number(total.toFixed(2)),
    reason: null,
    status: 'calculated',
    breakdown,
    stats: { ...stats },
    scoringSettings: { ...scoringSettings }
  };
}

export function scoreRoster({ playerIds = [], starters = [], statsByPlayer = {}, scoringSettings = {} }) {
  const starterSet = new Set(starters.map(String));
  const players = playerIds.map((playerId, index) => {
    const id = String(playerId);
    const scored = scorePlayerStats(statsByPlayer[id] || {}, scoringSettings);
    return { playerId: id, slot: starterSet.has(id) ? `STARTER_${index + 1}` : 'BN', isStarter: starterSet.has(id), ...scored };
  });
  const active = players.filter(p => p.isStarter);
  const reason = scoringUnavailableReason(scoringSettings) || active.find(p => p.points === null)?.reason
    || (starters.some(id => !players.some(p => p.playerId === String(id))) ? 'starter_stats_unavailable' : null);
  const startersScore = active.reduce((sum, p) => sum + p.points, 0);
  return { points: reason ? null : Number(startersScore.toFixed(2)), reason, players };
}

export function normalizeScoringSettings(raw = {}) {
  return Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, numberOrNull(value)]));
}
