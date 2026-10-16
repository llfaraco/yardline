/**
 * YARDLINE NFL — CONTRATOS CANÔNICOS DE DADOS (DTOs)
 * 
 * Regra 4 de Governança: Contrato Primeiro.
 * Regra 5 de Governança: Separação de Proveniência (official, derived, cached, stale, unavailable, simulation).
 * 
 * Princípios de Integridade do Backend:
 * - null não vira 0;
 * - null não vira "Saudável";
 * - erro não vira sucesso;
 * - jogador desconhecido não recebe dados inventados;
 * - roster desconhecido não cai no roster 2;
 * - ID Sleeper não é usado como ID ESPN.
 */

// ========================================================
// 1. CONSTANTES DE STATUS & PROVENIÊNCIA
// ========================================================

export const DATA_STATUS = Object.freeze({
  OFFICIAL: 'official',
  DERIVED: 'derived',
  CACHED: 'cached',
  STALE: 'stale',
  UNAVAILABLE: 'unavailable',
  SIMULATION: 'simulation'
});

export const INJURY_STATUS = Object.freeze({
  ACTIVE: 'Active',
  QUESTIONABLE: 'Questionable',
  DOUBTFUL: 'Doubtful',
  OUT: 'Out',
  IR: 'IR',
  PUP: 'PUP',
  SUSPENDED: 'Suspended',
  UNKNOWN: 'Unknown'
});

export const SCORING_STATUS = Object.freeze({
  CALCULATED: 'calculated',
  UNSUPPORTED: 'unsupported',
  UNAVAILABLE: 'unavailable'
});

// ========================================================
// 2. DATA STATUS DTO (PROVENIÊNCIA)
// ========================================================

export function createDataStatusDTO({
  status = DATA_STATUS.UNAVAILABLE,
  source = 'unknown',
  syncedAt = null,
  isEstimate = false,
  confidence = 1.0,
  staleReason = null
} = {}) {
  const validStatus = Object.values(DATA_STATUS).includes(status) ? status : DATA_STATUS.UNAVAILABLE;
  return {
    status: validStatus,
    source: String(source || 'unknown'),
    syncedAt: syncedAt ? new Date(syncedAt).toISOString() : null,
    isEstimate: Boolean(isEstimate),
    confidence: typeof confidence === 'number' && !Number.isNaN(confidence) ? Number(confidence.toFixed(2)) : 1.0,
    staleReason: staleReason ? String(staleReason) : null
  };
}

// ========================================================
// 3. METRIC DTO
// ========================================================

export function createMetricDTO({
  projectedPoints = null,
  actualPoints = null,
  vorpValue = null,
  rosterPercentage = null,
  startPercentage = null,
  provenance = null
} = {}) {
  return {
    // null nunca vira 0: se não houver pontuação/projeção, preserva null estrito
    projectedPoints: projectedPoints != null && Number.isFinite(Number(projectedPoints)) 
      ? Number(Number(projectedPoints).toFixed(2)) 
      : null,
    actualPoints: actualPoints != null && Number.isFinite(Number(actualPoints)) 
      ? Number(Number(actualPoints).toFixed(2)) 
      : null,
    vorpValue: vorpValue != null && Number.isFinite(Number(vorpValue)) 
      ? Number(Number(vorpValue).toFixed(2)) 
      : null,
    rosterPercentage: rosterPercentage != null && Number.isFinite(Number(rosterPercentage)) 
      ? Number(Number(rosterPercentage).toFixed(1)) 
      : null,
    startPercentage: startPercentage != null && Number.isFinite(Number(startPercentage)) 
      ? Number(Number(startPercentage).toFixed(1)) 
      : null,
    provenance: provenance || createDataStatusDTO({ status: DATA_STATUS.DERIVED, source: 'yardline_vbd_model' })
  };
}

// ========================================================
// 4. SCORE BREAKDOWN DTO
// ========================================================

export function createScoreBreakdownDTO({
  points = null,
  status = SCORING_STATUS.CALCULATED,
  reason = null,
  breakdown = []
} = {}) {
  if (status === SCORING_STATUS.UNSUPPORTED || status === SCORING_STATUS.UNAVAILABLE) {
    return {
      points: null, // Nunca deve retornar zero silenciosamente
      status,
      reason: reason || 'Regra de pontuação não suportada ou sem estatísticas disponíveis',
      breakdown: []
    };
  }

  const validPoints = points != null && Number.isFinite(Number(points)) ? Number(Number(points).toFixed(2)) : null;

  return {
    points: validPoints,
    status: SCORING_STATUS.CALCULATED,
    reason: null,
    breakdown: Array.isArray(breakdown) ? breakdown.map(item => ({
      rule: String(item.rule || 'custom'),
      stat: Number(item.stat || 0),
      multiplier: Number(item.multiplier || 0),
      points: Number(Number(item.points || 0).toFixed(2))
    })) : []
  };
}

// ========================================================
// 5. PLAYER CARD DTO
// ========================================================

export function createPlayerCardDTO(raw = {}) {
  const id = raw.id != null ? String(raw.id) : null;
  if (!id) {
    throw new Error('[PlayerCardDTO] id canônico é obrigatório.');
  }

  const sleeperId = raw.sleeperId ? String(raw.sleeperId) : null;
  // Regra do Backend: ID Sleeper não ser usado como ID ESPN
  const espnId = (raw.espnId && String(raw.espnId) !== sleeperId) ? String(raw.espnId) : (raw.espnId ? String(raw.espnId) : null);

  // Regra do Backend: null não virar "Saudável"
  let injuryStatus = null;
  if (raw.injuryStatus != null && String(raw.injuryStatus).trim() !== '') {
    const s = String(raw.injuryStatus).trim();
    const sNorm = s.toLowerCase();
    if (sNorm === 'healthy' || sNorm === 'active' || sNorm === 'saudável') {
      injuryStatus = INJURY_STATUS.ACTIVE;
    } else if (sNorm === 'questionable' || sNorm === 'questionável') {
      injuryStatus = INJURY_STATUS.QUESTIONABLE;
    } else if (sNorm === 'doubtful' || sNorm === 'duvidoso') {
      injuryStatus = INJURY_STATUS.DOUBTFUL;
    } else if (sNorm === 'out' || sNorm === 'fora') {
      injuryStatus = INJURY_STATUS.OUT;
    } else if (sNorm === 'ir') {
      injuryStatus = INJURY_STATUS.IR;
    } else if (sNorm === 'pup') {
      injuryStatus = INJURY_STATUS.PUP;
    } else if (sNorm === 'suspended' || sNorm === 'suspenso') {
      injuryStatus = INJURY_STATUS.SUSPENDED;
    } else {
      injuryStatus = s;
    }
  } else {
    // null permanece null / Unknown, JAMAIS 'Saudável'
    injuryStatus = null;
  }

  // Foto oficial: usar ESPN CDN se espnId existir, senão time ou fallback neutro
  let photoUrl = raw.photoUrl || null;
  if (!photoUrl) {
    if (espnId) {
      photoUrl = `https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/${encodeURIComponent(espnId)}.png&w=350&h=254`;
    } else if (raw.team) {
      photoUrl = `https://a.espncdn.com/i/teamlogos/nfl/500/${encodeURIComponent(String(raw.team).toLowerCase())}.png`;
    } else {
      photoUrl = 'https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/default.png&w=350&h=254';
    }
  }

  return {
    id,
    sleeperId,
    espnId,
    name: String(raw.name || raw.canonical_name || `Jogador #${id}`),
    position: raw.position ? String(raw.position).toUpperCase() : null,
    team: raw.team ? String(raw.team).toUpperCase() : null,
    jersey: raw.jersey != null ? String(raw.jersey) : (raw.number != null ? `#${raw.number}` : null),
    injuryStatus,
    photoUrl,
    metrics: raw.metrics ? createMetricDTO(raw.metrics) : createMetricDTO(),
    provenance: raw.provenance ? createDataStatusDTO(raw.provenance) : createDataStatusDTO({
      status: DATA_STATUS.OFFICIAL,
      source: 'sleeper_catalog'
    })
  };
}

// ========================================================
// 6. ROSTER DTO
// ========================================================

export function createRosterDTO(raw = {}) {
  const rosterId = Number(raw.rosterId ?? raw.provider_roster_id);
  if (!Number.isFinite(rosterId) || rosterId <= 0) {
    throw new Error('[RosterDTO] rosterId numérico positivo é obrigatório.');
  }

  const parseArray = (val) => {
    if (Array.isArray(val)) return val.map(String);
    if (typeof val === 'string') {
      try { const parsed = JSON.parse(val); return Array.isArray(parsed) ? parsed.map(String) : []; }
      catch { return []; }
    }
    return [];
  };

  const parseObject = (val) => {
    if (val && typeof val === 'object' && !Array.isArray(val)) return val;
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch { return {}; }
    }
    return {};
  };

  return {
    rosterId,
    ownerId: raw.ownerId ? String(raw.ownerId) : null,
    owner: raw.owner || raw.displayName || raw.display_name || 'Manager',
    teamName: raw.teamName || raw.team_name || `Time #${rosterId}`,
    avatar: raw.avatar || null,
    starters: parseArray(raw.starters ?? raw.starters_json),
    players: parseArray(raw.players ?? raw.players_json),
    reserve: parseArray(raw.reserve ?? raw.reserve_json),
    taxi: parseArray(raw.taxi ?? raw.taxi_json),
    settings: parseObject(raw.settings ?? raw.settings_json),
    record: raw.record || (raw.wins != null && raw.losses != null ? `${raw.wins}-${raw.losses}` : null),
    fpts: raw.fpts != null && Number.isFinite(Number(raw.fpts)) ? Number(Number(raw.fpts).toFixed(2)) : null,
    fptsAgainst: raw.fptsAgainst != null && Number.isFinite(Number(raw.fptsAgainst)) ? Number(Number(raw.fptsAgainst).toFixed(2)) : null,
    provenance: raw.provenance ? createDataStatusDTO(raw.provenance) : createDataStatusDTO({
      status: DATA_STATUS.OFFICIAL,
      source: 'sleeper_rosters'
    })
  };
}

// ========================================================
// 7. MATCHUP DTO
// ========================================================

export function createMatchupDTO(raw = {}) {
  const matchupId = raw.matchupId != null ? Number(raw.matchupId) : (raw.provider_matchup_id != null ? Number(raw.provider_matchup_id) : null);
  const week = raw.week != null ? Number(raw.week) : null;

  return {
    id: raw.id ? String(raw.id) : (matchupId && week ? `matchup_${week}_${matchupId}` : null),
    matchupId,
    week,
    season: String(raw.season || '2026'),
    status: String(raw.status || 'scheduled'),
    rosterAId: Number(raw.rosterAId ?? raw.roster_a_id ?? 0) || null,
    rosterBId: Number(raw.rosterBId ?? raw.roster_b_id ?? 0) || null,
    scoreA: raw.scoreA != null && Number.isFinite(Number(raw.scoreA)) ? Number(Number(raw.scoreA).toFixed(2)) : (raw.score_a != null ? Number(Number(raw.score_a).toFixed(2)) : null),
    scoreB: raw.scoreB != null && Number.isFinite(Number(raw.scoreB)) ? Number(Number(raw.scoreB).toFixed(2)) : (raw.score_b != null ? Number(Number(raw.score_b).toFixed(2)) : null),
    customPoints: raw.customPoints || (typeof raw.custom_points_json === 'string' ? JSON.parse(raw.custom_points_json || '{}') : {}),
    players: Array.isArray(raw.players) ? raw.players : [],
    provenance: raw.provenance ? createDataStatusDTO(raw.provenance) : createDataStatusDTO({
      status: DATA_STATUS.OFFICIAL,
      source: 'sleeper_matchups'
    })
  };
}

// ========================================================
// 8. LEAGUE SHELL DTO
// ========================================================

export function createLeagueShellDTO({
  league,
  state = null,
  rosters = [],
  standings = [],
  matchups = [],
  transactions = [],
  tradedPicks = [],
  playerData = {},
  provenance = null
} = {}) {
  if (!league || (!league.id && !league.provider_league_id)) {
    throw new Error('[LeagueShellDTO] league canônica com id é obrigatória.');
  }

  const leagueId = String(league.id || league.provider_league_id);
  const providerLeagueId = String(league.provider_league_id || league.providerLeagueId || leagueId);

  return {
    dataStatus: provenance?.status || (league.last_synced_at ? DATA_STATUS.CACHED : DATA_STATUS.UNAVAILABLE),
    syncedAt: provenance?.syncedAt || league.last_synced_at || null,
    league: {
      id: leagueId,
      providerLeagueId,
      name: String(league.name || 'Liga NFL'),
      season: String(league.season || '2026'),
      status: String(league.status || 'in_season'),
      totalRosters: Number(league.totalRosters ?? league.total_rosters ?? rosters.length ?? 12),
      settings: typeof league.settings_json === 'string' ? JSON.parse(league.settings_json || '{}') : (league.settings || {}),
      scoringSettings: typeof league.scoring_settings_json === 'string' ? JSON.parse(league.scoring_settings_json || '{}') : (league.scoringSettings || {}),
      rosterPositions: typeof league.roster_positions_json === 'string' ? JSON.parse(league.roster_positions_json || '[]') : (league.rosterPositions || [])
    },
    state: state ? {
      season: String(state.season || league.season || '2026'),
      week: state.week != null ? Number(state.week) : null,
      displayWeek: state.display_week != null ? Number(state.display_week) : (state.week != null ? Number(state.week) : null),
      seasonType: String(state.season_type || state.seasonType || 'regular')
    } : null,
    rosters: Array.isArray(rosters) ? rosters.map(createRosterDTO) : [],
    standings: Array.isArray(standings) ? standings : [],
    matchups: Array.isArray(matchups) ? matchups.map(createMatchupDTO) : [],
    transactions: Array.isArray(transactions) ? transactions : [],
    tradedPicks: Array.isArray(tradedPicks) ? tradedPicks : [],
    playerData: playerData || {},
    provenance: provenance ? createDataStatusDTO(provenance) : createDataStatusDTO({
      status: league.last_synced_at ? DATA_STATUS.OFFICIAL : DATA_STATUS.UNAVAILABLE,
      source: 'sleeper_sync',
      syncedAt: league.last_synced_at
    })
  };
}
