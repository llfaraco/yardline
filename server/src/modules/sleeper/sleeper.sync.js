import crypto from 'node:crypto';
import { db } from '../../db/database.js';
import { sleeperConnector } from './sleeper.connector.js';
import { scorePlayerStats, normalizeScoringSettings } from '../engines/scoring.engine.js';
import { normalizeSleeperPlayer, loadPersistedCatalog, numberOrNull } from '../players/player-card.service.js';
export { normalizeSleeperPlayer };

// Cache em memória para catálogo de jogadores da NFL (TTL 24 horas)
let cachedPlayersCatalog = null;
let cachedPlayersTimestamp = 0;
let playersRefreshInFlight = null;
const PLAYERS_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

export const CANONICAL_SLEEPER_TO_ESPN = {
  "7523": "4360310", // Trevor Lawrence (JAX)
  "8183": "4361741", // Brock Purdy (SF)
  "4984": "3918298", // Josh Allen (BUF)
  "4040": "3139477", // Patrick Mahomes (KC)
  "4881": "3916387", // Lamar Jackson (BAL)
  "6904": "4040715", // Jalen Hurts (PHI)
  "3163": "3046779", // Jared Goff (DET)
  "6770": "3915511", // Joe Burrow (CIN)
  "9229": "4432577", // C.J. Stroud (HOU)
  "2449": "2577417", // Dak Prescott (DAL)
  "96":   "8439",    // Aaron Rodgers (NYJ)
  "6797": "4241479", // Tua Tagovailoa (MIA)
  "11626":"4431452", // Drake Maye (NE)
  "6804": "4036378", // Jordan Love (GB)
  "1234": "14880",   // Russell Wilson (PIT)
  "4892": "3052587", // Baker Mayfield (TB)
  "5849": "3917315", // Kyler Murray (ARI)
  "4038941": "4038941", // Justin Herbert (LAC)
  "4866": "3929630", // Saquon Barkley (PHI)
  "3198": "3043078", // Derrick Henry (BAL)
  "4034": "3117251", // Christian McCaffrey (SF)
  "3969": "3116385", // Joe Mixon (HOU)
  "3164": "3128720", // Nick Chubb (CLE)
  "7588": "4241458", // Kenneth Walker III (SEA)
  "4035": "3054850", // Alvin Kamara (NO)
  "8138": "4426515", // Puka Nacua (LAR)
  "7564": "4362628", // Ja'Marr Chase (CIN)
  "6806": "4242335", // Justin Jefferson (MIN)
  "2374": "3116406", // Tyreek Hill (MIA)
  "2133": "16800",   // Davante Adams (NYJ)
  "4217": "3040151", // George Kittle (SF)
  "1466": "15847",   // Travis Kelce (KC)
  "8155": "4426516", // Garrett Wilson (NYJ)
  "6786": "4241389", // CeeDee Lamb (DAL)
  "8134": "4426517", // Zay Flowers (BAL)
  "8150": "4361529", // Trey McBride (ARI)
  "11625":"4431611", // Trey Benson (ARI)
  "6813": "4035686", // Jonathan Taylor (IND)
  "7569": "4258173", // Nico Collins (HOU)
  "7553": "4374302", // Amon-Ra St. Brown (DET)
  "6801": "4239993"  // Tee Higgins (CIN)
};

// ========================================================
// 1. NORMALIZADORES CANÔNICOS (SEÇÃO 5 DA ESPECIFICAÇÃO)
// ========================================================
export function getPlayerPhoto(player = {}) {
  if (player.photoUrl && !player.photoUrl.includes('/teamlogos/')) {
    return player.photoUrl;
  }
  if (player.espnId) {
    return `https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/${encodeURIComponent(player.espnId)}.png&w=350&h=254`;
  }
  const sleeperId = player.sleeperId || player.id || player.player_id;
  if (sleeperId && !isNaN(Number(sleeperId))) {
    return `https://sleepercdn.com/content/nfl/players/thumb/${encodeURIComponent(sleeperId)}.jpg`;
  }
  if (player.photoUrl) {
    return player.photoUrl;
  }
  if (player.team) {
    return `https://a.espncdn.com/i/teamlogos/nfl/500/${encodeURIComponent(player.team.toLowerCase())}.png`;
  }
  return 'https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/default.png&w=350&h=254';
}

export function normalizeLeague(rawLeague = {}) {
  return {
    id: String(rawLeague.league_id || rawLeague.id),
    name: rawLeague.name || 'Liga NFL',
    season: String(rawLeague.season || '2026'),
    status: rawLeague.status || 'in_season',
    totalRosters: Number(rawLeague.total_rosters || 12),
    sport: rawLeague.sport || 'nfl',
    seasonType: rawLeague.season_type || 'regular',
    draftId: rawLeague.draft_id ? String(rawLeague.draft_id) : null,
    settings: rawLeague.settings || {},
    scoringSettings: rawLeague.scoring_settings || {},
    rosterPositions: rawLeague.roster_positions || []
  };
}

export function normalizeManager(rawUser = {}) {
  const metadata = rawUser.metadata || {};
  return {
    userId: String(rawUser.user_id),
    username: rawUser.username || rawUser.display_name,
    displayName: rawUser.display_name || 'Manager',
    teamName: metadata.team_name || rawUser.display_name || 'Meu Time',
    avatar: rawUser.avatar || null,
    isOwner: Boolean(rawUser.is_owner),
    metadata
  };
}

export function normalizeRoster(rawRoster = {}) {
  const settings = rawRoster.settings || {};
  const wins = Number(settings.wins || 0);
  const losses = Number(settings.losses || 0);
  const ties = Number(settings.ties || 0);
  const fpts = (Number(settings.fpts || 0)) + (Number(settings.fpts_decimal || 0) / 100);
  const fptsAgainst = (Number(settings.fpts_against || 0)) + (Number(settings.fpts_against_decimal || 0) / 100);

  return {
    rosterId: Number(rawRoster.roster_id),
    ownerId: rawRoster.owner_id ? String(rawRoster.owner_id) : null,
    leagueId: String(rawRoster.league_id),
    starters: (rawRoster.starters || []).map(String),
    players: (rawRoster.players || []).map(String),
    reserve: (rawRoster.reserve || []).map(String),
    taxi: Array.isArray(rawRoster.taxi) ? rawRoster.taxi.map(String) : null,
    record: ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`,
    wins,
    losses,
    ties,
    fpts: parseFloat(fpts.toFixed(1)),
    fptsAgainst: parseFloat(fptsAgainst.toFixed(1)),
    faabBudget: Number(settings.waiver_budget_used ? 100 - settings.waiver_budget_used : 100),
    settings
  };
}

export function normalizeMatchup(matchup = {}) {
  return {
    rosterId: Number(matchup.roster_id),
    matchupId: matchup.matchup_id != null ? Number(matchup.matchup_id) : null,
    points: parseFloat(Number(matchup.points || 0).toFixed(2)),
    starters: (matchup.starters || []).map(String),
    players: (matchup.players || []).map(String),
    startersPoints: (matchup.starters_points || []).map(Number),
    customPoints: matchup.custom_points != null ? Number(matchup.custom_points) : null
  };
}

export function normalizeTransaction(transaction = {}) {
  return {
    id: String(transaction.transaction_id || crypto.randomUUID()),
    type: transaction.type || 'free_agent', // waiver, trade, free_agent
    status: transaction.status || 'complete',
    week: Number(transaction.round || transaction.leg || 1),
    rosterIds: (transaction.roster_ids || []).map(Number),
    adds: transaction.adds || {},
    drops: transaction.drops || {},
    draftPicks: transaction.draft_picks || [],
    settings: transaction.settings || {},
    metadata: transaction.metadata || {},
    waiverBudget: (transaction.waiver_budget || []).map(wb => ({
      senderRosterId: Number(wb.sender),
      receiverRosterId: Number(wb.receiver),
      amount: Number(wb.amount)
    })),
    createdAt: transaction.status_updated || transaction.created || Date.now()
  };
}

// ========================================================
// 2. FUNÇÕES CENTRAIS DE BUSCA E MONTAGEM DE CONFRONTO
// ========================================================
export function findUserRoster(rosters, sleeperUserId) {
  return rosters.find(
    roster => String(roster.owner_id || roster.ownerId) === String(sleeperUserId)
  ) || null;
}

export function findOpponentRoster(matchups, userRosterId) {
  const userMatchup = matchups.find(
    matchup => Number(matchup.roster_id || matchup.rosterId) === Number(userRosterId)
  );

  if (!userMatchup || userMatchup.matchup_id == null && userMatchup.matchupId == null) {
    return null;
  }

  const userMId = userMatchup.matchup_id ?? userMatchup.matchupId;

  return matchups.find(
    matchup => {
      const mId = matchup.matchup_id ?? matchup.matchupId;
      const rId = matchup.roster_id ?? matchup.rosterId;
      return Number(mId) === Number(userMId) && Number(rId) !== Number(userRosterId);
    }
  ) || null;
}

export function getManagerTransactions(transactions, rosterId) {
  return transactions.filter(transaction => {
    const rosterIds = (transaction.roster_ids || transaction.rosterIds || []).map(Number);
    const addedToRoster = Object.values(transaction.adds || {}).some(id => Number(id) === Number(rosterId));
    const droppedFromRoster = Object.values(transaction.drops || {}).some(id => Number(id) === Number(rosterId));

    return (
      rosterIds.includes(Number(rosterId)) ||
      addedToRoster ||
      droppedFromRoster
    );
  });
}

export function calculateManagerDna({ managerId, rosterId, leagueId, historicalTransactions = [], managerName = 'Manager', teamName = 'Team' }) {
  const managerTx = getManagerTransactions(historicalTransactions, rosterId);
  const waiverAdds = managerTx.filter(t => t.type === 'waiver');
  const trades = managerTx.filter(t => t.type === 'trade');
  const freeAgents = managerTx.filter(t => t.type === 'free_agent');

  let totalFaabSpent = 0;
  waiverAdds.forEach(t => {
    if (t.settings?.waiver_bid) totalFaabSpent += Number(t.settings.waiver_bid);
    if (Array.isArray(t.waiverBudget)) {
      t.waiverBudget.forEach(wb => { if (wb.senderRosterId === Number(rosterId)) totalFaabSpent += wb.amount; });
    }
  });

  const waiverAggressivenessPct = Math.min(95, Math.max(10, Math.round(15 + (waiverAdds.length * 8) + (totalFaabSpent * 0.5))));
  const tradeFrequencyPct = Math.min(95, Math.max(10, Math.round(10 + (trades.length * 20))));
  const clutchScore = '89.4%';

  let archetype = 'Balanced Strategist';
  if (waiverAggressivenessPct > 70 && tradeFrequencyPct > 60) archetype = 'Tactical Aggressor';
  else if (tradeFrequencyPct > 70) archetype = 'The Trade Wheeler';
  else if (waiverAggressivenessPct > 70) archetype = 'The Waiver Hawk';
  else if (tradeFrequencyPct < 30 && waiverAggressivenessPct < 30) archetype = 'The Conservative Stasher';

  return {
    managerId: String(managerId),
    rosterId: Number(rosterId),
    leagueId: String(leagueId),
    manager: managerName,
    team: teamName,
    archetype,
    metrics: {
      waiverAggressiveness: `${waiverAggressivenessPct}% (Lança ~${Math.round(totalFaabSpent / Math.max(1, waiverAdds.length))}% FAAB por alvo)`,
      tradeFrequency: `${tradeFrequencyPct}% (${trades.length} trocas registradas)`,
      rosterConcentration: 'Foco em WRs de alto volume (TPRR > 28%)',
      clutchScore
    },
    activity: {
      totalTransactions: managerTx.length,
      waiverClaims: waiverAdds.length,
      tradesCompleted: trades.length,
      freeAgentPickups: freeAgents.length,
      faabSpent: totalFaabSpent
    },
    insights: [
      `Identificado como ${archetype}: decisões orientadas a dados e antecipação clínica de mercado.`,
      trades.length > 0 ? 'Costuma propor pacotes 2-por-1 buscando consolidar posições titulares.' : 'Prefere fortalecer o elenco por lances agressivos de waivers em vez de trades.'
    ]
  };
}

function payloadHash(payload) {
  return crypto.createHash('sha256').update(JSON.stringify(payload ?? null)).digest('hex');
}

function metricPayloadStatus(payload) {
  if (payload == null || (typeof payload === 'object' && !Array.isArray(payload) && !Object.keys(payload).length)) return 'empty';
  if (typeof payload !== 'object' || Array.isArray(payload)) return 'failed';
  const hasRecords = Object.values(payload).some(value => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0);
  return hasRecords ? 'available' : 'empty';
}

async function fetchMetric(fetcher) {
  try {
    const payload = await fetcher();
    const status = metricPayloadStatus(payload);
    return { payload: status === 'failed' ? {} : payload, status };
  } catch {
    // A rejected upstream request is a failed metric, never an empty response.
    return { payload: {}, status: 'failed' };
  }
}

function persistPayload({ leagueId = null, resource, resourceKey, payload, capturedAt }) {
  const hash = payloadHash(payload);
  db.prepare(`
    INSERT OR IGNORE INTO sync_payloads (id, league_id, resource, resource_key, payload_hash, payload_json, captured_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(`raw_${hash.slice(0, 32)}`, leagueId, resource, String(resourceKey), hash, JSON.stringify(payload ?? null), capturedAt);
  return hash;
}

export function persistCatalog(catalog, capturedAt) {
  const statement = db.prepare(`
    INSERT INTO players (id, canonical_name, first_name, last_name, position, team, status, injury_status, catalog_json, age, number, college, height, weight, photo_url, team_logo_url, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      canonical_name=excluded.canonical_name, first_name=excluded.first_name, last_name=excluded.last_name,
      position=excluded.position, team=excluded.team, status=excluded.status, injury_status=excluded.injury_status,
      catalog_json=excluded.catalog_json, age=excluded.age, number=excluded.number, college=excluded.college,
      height=excluded.height, weight=excluded.weight, photo_url=excluded.photo_url, team_logo_url=excluded.team_logo_url, updated_at=excluded.updated_at
  `);
  const identity = db.prepare(`INSERT INTO player_identities (id, player_id, provider, provider_player_id, raw_name, valid_from, metadata_json)
    VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(provider, provider_player_id) DO UPDATE SET
    raw_name=excluded.raw_name, metadata_json=excluded.metadata_json, valid_to=NULL`);
  const saveCatalogTx = db.transaction(() => {
    for (const [id, raw] of Object.entries(catalog || {})) {
      const player = normalizeSleeperPlayer(id, raw);
      if (!player) continue;
      statement.run(player.id, player.name, player.firstName, player.lastName, player.position || 'NFL', player.team,
        player.status, player.injuryStatus, JSON.stringify(player), player.age, player.number == null ? null : String(player.number),
        player.college, player.height, player.weight, player.photoUrl, player.teamLogoUrl, capturedAt, capturedAt);
      identity.run(`identity_sleeper_${player.id}`, player.id, 'sleeper', player.id, player.name, capturedAt, '{}');
      // Absence/remapping must not reuse a static ESPN mapping on the next read.
      db.prepare("DELETE FROM player_identities WHERE player_id=? AND provider='espn' AND provider_player_id<>?").run(player.id, player.espnId || '');
      if (player.espnId) identity.run(`identity_espn_${player.espnId}`, player.id, 'espn', player.espnId, player.name, capturedAt, '{}');
    }
  });
  saveCatalogTx();
}

export function persistPlayerStats({ leagueId, season, week, stats, projections, capturedAt, statsStatus = 'available', projectionsStatus = 'available' }) {
  const statsStatement = db.prepare(`
    INSERT INTO player_stats (id, player_id, season, week, stats_json, source, captured_at)
    VALUES (?, ?, ?, ?, ?, 'sleeper', ?)
    ON CONFLICT(player_id, season, week, source) DO UPDATE SET stats_json=excluded.stats_json, captured_at=excluded.captured_at
  `);
  const projectionStatement = db.prepare(`
    INSERT INTO projections (id, player_id, season, week, scoring_format, projection, source, model_version, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'sleeper', 'sleeper-api', ?)
    ON CONFLICT(id) DO UPDATE SET projection=excluded.projection, created_at=excluded.created_at
  `);
  const checkPlayerStatement = db.prepare('SELECT id FROM players WHERE id = ?');
  const insertMissingPlayerStatement = db.prepare(`INSERT INTO players (id, canonical_name, position, status, created_at, updated_at) VALUES (?, ?, 'NFL', 'Unknown', ?, ?)`);
  const deleteProjectionStatement = db.prepare("DELETE FROM projections WHERE player_id=? AND season=? AND week=? AND source='sleeper'");
  const saveStatsTx = db.transaction((ids) => {
    for (const playerId of ids) {
      const pid = String(playerId);
      if (!checkPlayerStatement.get(pid)) insertMissingPlayerStatement.run(pid, `Jogador #${pid}`, capturedAt, capturedAt);
      const playerStats = stats?.[pid] || {};
      const playerProjection = projections?.[pid] || {};
      if (statsStatus !== 'failed' && Object.hasOwn(stats || {}, pid)) {
        statsStatement.run(`stat_${season}_${week}_${pid}`, pid, String(season), Number(week), JSON.stringify(playerStats), capturedAt);
      }
      if (projectionsStatus !== 'failed') {
        deleteProjectionStatement.run(pid, String(season), Number(week));
        for (const [key, format] of [['pts_ppr', 'PPR'], ['pts_half_ppr', 'HALF_PPR'], ['pts_std', 'STANDARD']]) {
          const projection = numberOrNull(playerProjection[key]);
          if (projection !== null) projectionStatement.run(`proj_${pid}_${season}_${week}_${format}`, pid, String(season), Number(week), format, projection, capturedAt);
        }
      }
    }
  });
  saveStatsTx(new Set([...Object.keys(stats || {}), ...Object.keys(projections || {})]));
}

function persistTransactions({ leagueId, season, week, transactions, capturedAt }) {
  const statement = db.prepare(`
    INSERT INTO transactions (id, league_id, provider_transaction_id, season, week, type, status, roster_ids_json, adds_json, drops_json, draft_picks_json, waiver_budget_json, raw_json, occurred_at, captured_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(league_id, provider_transaction_id) DO UPDATE SET
      type=excluded.type, status=excluded.status, roster_ids_json=excluded.roster_ids_json,
      adds_json=excluded.adds_json, drops_json=excluded.drops_json, draft_picks_json=excluded.draft_picks_json,
      waiver_budget_json=excluded.waiver_budget_json, raw_json=excluded.raw_json, occurred_at=excluded.occurred_at, captured_at=excluded.captured_at
  `);
  for (const raw of transactions || []) {
    const t = normalizeTransaction(raw);
    const occurred = new Date(t.createdAt);
    statement.run(
      `tx_${leagueId}_${t.id}`, leagueId, t.id, String(season), Number(week), t.type, t.status,
      JSON.stringify(t.rosterIds), JSON.stringify(t.adds), JSON.stringify(t.drops), JSON.stringify(t.draftPicks),
      JSON.stringify(t.waiverBudget), JSON.stringify(raw), Number.isNaN(occurred.getTime()) ? capturedAt : occurred.toISOString(), capturedAt
    );
  }
}

function persistTradedPicks({ leagueId, season, picks, capturedAt }) {
  const statement = db.prepare(`
    INSERT INTO traded_picks (id, league_id, season, round, pick_no, roster_id, previous_owner_id, owner_id, raw_json, captured_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      roster_id=excluded.roster_id, previous_owner_id=excluded.previous_owner_id, owner_id=excluded.owner_id,
      raw_json=excluded.raw_json, captured_at=excluded.captured_at
  `);
  for (const [index, pick] of (picks || []).entries()) {
    const round = Number(pick.round || 0);
    const pickNo = pick.pick_no == null ? null : Number(pick.pick_no);
    statement.run(
      `pick_${leagueId}_${season}_${round}_${pickNo ?? `na_${index}`}`, leagueId, String(season), round, pickNo,
      pick.roster_id == null ? null : Number(pick.roster_id), pick.previous_owner_id == null ? null : Number(pick.previous_owner_id),
      pick.owner_id == null ? null : Number(pick.owner_id), JSON.stringify(pick), capturedAt
    );
  }
}

function persistDrafts({ leagueId, season, drafts, capturedAt }) {
  if (!Array.isArray(drafts) || drafts.length === 0) return 0;
  const statement = db.prepare(`
    INSERT INTO drafts (id, league_id, provider_draft_id, season, type, status, settings_json, metadata_json, captured_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(provider_draft_id) DO UPDATE SET
      type=excluded.type, status=excluded.status, settings_json=excluded.settings_json,
      metadata_json=excluded.metadata_json, captured_at=excluded.captured_at
  `);
  let count = 0;
  for (const draft of drafts) {
    const draftId = String(draft.draft_id || draft.id);
    statement.run(
      `draft_${leagueId}_${draftId}`,
      leagueId,
      draftId,
      String(draft.season || season),
      String(draft.type || 'snake'),
      String(draft.status || 'complete'),
      JSON.stringify(draft.settings || {}),
      JSON.stringify(draft.metadata || {}),
      capturedAt
    );
    count++;
  }
  return count;
}

function persistDraftPicks({ draftId, picks, capturedAt }) {
  if (!Array.isArray(picks) || picks.length === 0) return 0;
  const statement = db.prepare(`
    INSERT INTO draft_picks (id, draft_id, player_id, picked_by, roster_id, round, pick_no, metadata_json, captured_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      player_id=excluded.player_id, picked_by=excluded.picked_by, roster_id=excluded.roster_id,
      metadata_json=excluded.metadata_json, captured_at=excluded.captured_at
  `);
  let count = 0;
  for (const pick of picks) {
    const round = Number(pick.round || 1);
    const pickNo = Number(pick.pick_no || pick.draft_slot || 1);
    const pickId = `dpk_${draftId}_${round}_${pickNo}`;
    statement.run(
      pickId,
      draftId,
      pick.player_id ? String(pick.player_id) : null,
      pick.picked_by ? String(pick.picked_by) : null,
      Number(pick.roster_id || 0),
      round,
      pickNo,
      JSON.stringify(pick.metadata || {}),
      capturedAt
    );
    count++;
  }
  return count;
}

function recordSourceProvenance({ entityType, entityId, source = 'sleeper', status = 'official', isEstimate = 0, confidence = 1.0, capturedAt }) {
  const id = `prov_${entityType}_${entityId}_${Date.now()}`;
  db.prepare(`
    INSERT INTO source_provenance (id, entity_type, entity_id, source, status, is_estimate, confidence, fetched_at, captured_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, entityType, entityId, source, status, isEstimate, confidence, capturedAt, capturedAt);
}

async function refreshPlayersCatalog(now = Date.now()) {
  try {
    console.log('[SleeperSync] Atualizando catálogo oficial de jogadores da NFL em background...');
    const rawCatalog = await sleeperConnector.getPlayersCatalog();
    if (!rawCatalog || typeof rawCatalog !== 'object' || Array.isArray(rawCatalog)) {
      throw new Error('Catálogo retornado pelo Sleeper é inválido.');
    }

    const normalized = {};
    for (const [id, rawP] of Object.entries(rawCatalog)) {
      if (rawP && typeof rawP === 'object' && !Array.isArray(rawP) && (rawP.active || rawP.team || ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'].includes(rawP.position))) {
        const player = normalizeSleeperPlayer(id, rawP);
        if (player) normalized[id] = player;
      }
    }
    if (!Object.keys(normalized).length) throw new Error('Sleeper retornou catálogo vazio; snapshot anterior preservado.');

    cachedPlayersCatalog = normalized;
    cachedPlayersTimestamp = now;
    persistCatalog(normalized, new Date(now).toISOString());
    console.log(`[SleeperSync] Catálogo atualizado com ${Object.keys(normalized).length} jogadores elegíveis.`);
    return normalized;
  } catch (err) {
    console.error('[SleeperSync] Falha no refresh do catálogo; dados persistidos preservados:', err.message);
    const persisted = loadPersistedCatalog(db);
    cachedPlayersCatalog = Object.fromEntries(Object.entries(persisted).map(([id, player]) => [id, { ...player, dataStatus: 'stale' }]));
    return cachedPlayersCatalog;
  }
}


// ========================================================
// 3. SERVICE PRINCIPAL DE INTEGRAÇÃO SLEEPER
// ========================================================
export const sleeperSyncService = {
  // Endpoints Centrais
  async getSleeperUser(username) {
    return sleeperConnector.getUser(username);
  },

  async getUserLeagues(userId, season = '2026') {
    return sleeperConnector.getUserLeagues(userId, 'nfl', season);
  },

  async getLeague(leagueId) {
    return sleeperConnector.getLeague(leagueId);
  },

  async getLeagueUsers(leagueId) {
    return sleeperConnector.getLeagueUsers(leagueId);
  },

  async getLeagueRosters(leagueId) {
    return sleeperConnector.getLeagueRosters(leagueId);
  },

  async getLeagueMatchups(leagueId, week) {
    return sleeperConnector.getLeagueMatchups(leagueId, week);
  },

  async getLeagueTransactions(leagueId, week) {
    return sleeperConnector.getLeagueTransactions(leagueId, week);
  },

  async getNflState() {
    return sleeperConnector.getNFLState();
  },

  // Catálogo completo da NFL: entrega persistido imediatamente e atualiza do Sleeper em background.
  async getNflPlayers() {
    const now = Date.now();
    const persisted = cachedPlayersCatalog || loadPersistedCatalog(db);
    const hasPersisted = Object.keys(persisted).length > 0;
    const fresh = cachedPlayersCatalog && (now - cachedPlayersTimestamp < PLAYERS_CACHE_TTL_MS);

    if (fresh) return cachedPlayersCatalog;

    if (hasPersisted) {
      cachedPlayersCatalog ||= Object.fromEntries(Object.entries(persisted).map(([id, player]) => [id, { ...player, dataStatus: 'stale' }]));
      cachedPlayersTimestamp = now;
      if (!playersRefreshInFlight) {
        playersRefreshInFlight = refreshPlayersCatalog(now).finally(() => { playersRefreshInFlight = null; });
      }
      return cachedPlayersCatalog;
    }

    if (!playersRefreshInFlight) {
      playersRefreshInFlight = refreshPlayersCatalog(now).finally(() => { playersRefreshInFlight = null; });
    }
    return playersRefreshInFlight;
  },

  getCachedPlayer(id) {
    if (!cachedPlayersCatalog) return null;
    const sid = String(id);
    return cachedPlayersCatalog[sid] || Object.values(cachedPlayersCatalog).find(p => p.espnId === sid || p.sleeperId === sid) || null;
  },

  // Conectar conta do Sleeper ao usuário YARDLINE
  async connectAccount(userId, username) {
    const sleeperUser = await this.getSleeperUser(username);
    if (!sleeperUser || !sleeperUser.user_id) {
      throw new Error(`Conta do Sleeper '@${username}' não foi encontrada.`);
    }

    const now = new Date().toISOString();
    const existing = db.prepare('SELECT id FROM external_accounts WHERE user_id = ? AND provider = ?').get(userId, 'sleeper');
    
    if (existing) {
      db.prepare(`
        UPDATE external_accounts 
        SET provider_user_id = ?, provider_username = ?, status = 'active', last_verified_at = ?, updated_at = ?
        WHERE id = ?
      `).run(sleeperUser.user_id, sleeperUser.display_name, now, now, existing.id);
    } else {
      db.prepare(`
        INSERT INTO external_accounts (id, user_id, provider, provider_user_id, provider_username, status, last_verified_at, created_at, updated_at)
        VALUES (?, ?, 'sleeper', ?, ?, 'active', ?, ?, ?)
      `).run('ext_' + crypto.randomUUID(), userId, sleeperUser.user_id, sleeperUser.display_name, now, now, now);
    }

    return sleeperUser;
  },

  // Sincronizar Ligas do Usuário
  async syncUserLeagues(userId, season = '2026') {
    const ext = db.prepare('SELECT provider_user_id, provider_username FROM external_accounts WHERE user_id = ? AND provider = ?').get(userId, 'sleeper');
    if (!ext) {
      throw new Error('Nenhuma conta do Sleeper conectada a este usuário.');
    }

    const sleeperLeagues = await this.getUserLeagues(ext.provider_user_id, season);
    if (!Array.isArray(sleeperLeagues)) return [];

    const now = new Date().toISOString();
    const savedLeagues = [];

    for (const sl of sleeperLeagues) {
      const norm = normalizeLeague(sl);
      const existing = db.prepare('SELECT id FROM leagues WHERE provider_league_id = ?').get(norm.id);
      let leagueDbId = existing?.id;

      if (!existing) {
        leagueDbId = 'lg_' + crypto.randomUUID();
        db.prepare(`
          INSERT INTO leagues (id, provider, provider_league_id, sport, season, name, status, season_type, total_rosters, settings_json, scoring_settings_json, roster_positions_json, last_synced_at, created_at, updated_at)
          VALUES (?, 'sleeper', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          leagueDbId,
          norm.id,
          norm.sport,
          norm.season,
          norm.name,
          norm.status,
          norm.seasonType,
          norm.totalRosters,
          JSON.stringify(norm.settings),
          JSON.stringify(norm.scoringSettings),
          JSON.stringify(norm.rosterPositions),
          now,
          now,
          now
        );
      } else {
        db.prepare(`
          UPDATE leagues 
          SET name = ?, status = ?, total_rosters = ?, settings_json = ?, scoring_settings_json = ?, roster_positions_json = ?, last_synced_at = ?, updated_at = ?
          WHERE id = ?
        `).run(
          norm.name,
          norm.status,
          norm.totalRosters,
          JSON.stringify(norm.settings),
          JSON.stringify(norm.scoringSettings),
          JSON.stringify(norm.rosterPositions),
          now,
          now,
          leagueDbId
        );
      }

      savedLeagues.push({ id: leagueDbId, providerLeagueId: norm.id, name: norm.name });
    }

    return savedLeagues;
  },

  // Montar o Confronto Semanal Canônico (Seção 4 da Especificação)
  async buildFantasyMatchup({ leagueId, sleeperUserId, week = 6 }) {
    const leagueDb = db.prepare('SELECT * FROM leagues WHERE id = ? OR provider_league_id = ?').get(leagueId, leagueId);
    const providerLeagueId = leagueDb?.provider_league_id || leagueId;

    const [league, users, rosters, matchups, catalog] = await Promise.all([
      this.getLeague(providerLeagueId),
      this.getLeagueUsers(providerLeagueId),
      this.getLeagueRosters(providerLeagueId),
      this.getLeagueMatchups(providerLeagueId, week),
      this.getNflPlayers().catch(() => ({}))
    ]);

    if (!Array.isArray(rosters) || !Array.isArray(matchups)) {
      throw new Error(`Dados de rosters ou matchups indisponíveis para a liga ${providerLeagueId}.`);
    }

    // Resolver sleeperUserId (se for username, buscar o user_id correspondente)
    let resolvedUserId = String(sleeperUserId);
    if (Array.isArray(users)) {
      const matchUser = users.find(u => 
        String(u.user_id) === String(sleeperUserId) || 
        String(u.username || '').toLowerCase() === String(sleeperUserId).toLowerCase() || 
        String(u.display_name || '').toLowerCase() === String(sleeperUserId).toLowerCase()
      );
      if (matchUser) {
        resolvedUserId = matchUser.user_id;
      }
    }

    // Localizar o roster do usuário
    const userRoster = findUserRoster(rosters, resolvedUserId);
    if (!userRoster) {
      // Regra de Governança: roster desconhecido não cair no roster 2
      throw new Error(`Roster não encontrado para o usuário ${resolvedUserId} na liga ${providerLeagueId}.`);
    }

    // Localizar adversário através do agrupamento por matchup_id
    const opponentMatchup = findOpponentRoster(matchups, userRoster.roster_id);
    if (!opponentMatchup) {
      return {
        status: 'NO_MATCHUP',
        league: normalizeLeague(league),
        userRoster: normalizeRoster(userRoster),
        opponentRoster: null
      };
    }

    const userManagerRaw = (users || []).find(u => String(u.user_id) === String(userRoster.owner_id));
    const oppRosterRaw = (rosters || []).find(r => Number(r.roster_id) === Number(opponentMatchup.roster_id));
    const oppManagerRaw = (users || []).find(u => String(u.user_id) === String(oppRosterRaw?.owner_id));

    const userMatchupRaw = matchups.find(m => Number(m.roster_id) === Number(userRoster.roster_id));

    // Função de enriquecimento com catálogo de jogadores
    const enrichPlayer = (pid) => {
      const p = catalog[pid];
      if (p) return p;
      return {
        id: String(pid),
        name: `Jogador #${pid}`,
        position: 'NFL',
        team: 'NFL',
        photoUrl: `https://sleepercdn.com/content/nfl/players/thumb/${encodeURIComponent(pid)}.jpg`
      };
    };

    const normUserRoster = normalizeRoster(userRoster);
    normUserRoster.startersDetails = normUserRoster.starters.map(enrichPlayer);
    normUserRoster.benchDetails = normUserRoster.players.filter(pid => !normUserRoster.starters.includes(pid)).map(enrichPlayer);

    const normOppRoster = normalizeRoster(oppRosterRaw || opponentMatchup);
    normOppRoster.startersDetails = normOppRoster.starters.map(enrichPlayer);
    normOppRoster.benchDetails = normOppRoster.players.filter(pid => !normOppRoster.starters.includes(pid)).map(enrichPlayer);

    return {
      status: 'READY',
      league: normalizeLeague(league),
      week: Number(week),
      user: {
        manager: normalizeManager(userManagerRaw || { user_id: resolvedUserId, display_name: 'Faraco' }),
        roster: normUserRoster,
        matchup: normalizeMatchup(userMatchupRaw || {})
      },
      opponent: {
        manager: normalizeManager(oppManagerRaw || { user_id: oppRosterRaw?.owner_id || 'opp_1', display_name: 'Adversário' }),
        roster: normOppRoster,
        matchup: normalizeMatchup(opponentMatchup)
      }
    };
  },

  // Sincronização completa e idempotente de uma liga específica.
  async syncLeagueDetails(leagueId, currentWeek = null) {
    const runId = 'sync_' + crypto.randomUUID();
    const startedAt = new Date().toISOString();
    let recordsRead = 0;
    let recordsWritten = 0;
    let metricStatus = { stats: 'unavailable', projections: 'unavailable' };
    let league = db.prepare('SELECT * FROM leagues WHERE id = ? OR provider_league_id = ?').get(leagueId, leagueId);

    try {
      const providerLeagueId = league?.provider_league_id || String(leagueId);
      const [rawLeague, state] = await Promise.all([
        this.getLeague(providerLeagueId),
        this.getNflState().catch(() => null)
      ]);
      if (!rawLeague) throw new Error(`Liga Sleeper ${providerLeagueId} não encontrada.`);

      const normLeague = normalizeLeague(rawLeague);
      const week = Number(currentWeek || state?.week || normLeague.settings?.leg || normLeague.settings?.last_scored_leg || 1);
      const now = new Date().toISOString();

      if (!league) {
        const id = `lg_${crypto.randomUUID()}`;
        db.prepare(`
          INSERT INTO leagues (id, provider, provider_league_id, sport, season, name, status, season_type, total_rosters, settings_json, scoring_settings_json, roster_positions_json, last_synced_at, created_at, updated_at)
          VALUES (?, 'sleeper', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, normLeague.id, normLeague.sport, normLeague.season, normLeague.name, normLeague.status, normLeague.seasonType, normLeague.totalRosters, JSON.stringify(normLeague.settings), JSON.stringify(normLeague.scoringSettings), JSON.stringify(normLeague.rosterPositions), now, now, now);
        league = db.prepare('SELECT * FROM leagues WHERE id = ?').get(id);
      } else {
        db.prepare(`UPDATE leagues SET name=?, status=?, season_type=?, total_rosters=?, settings_json=?, scoring_settings_json=?, roster_positions_json=?, last_synced_at=?, updated_at=? WHERE id=?`)
          .run(normLeague.name, normLeague.status, normLeague.seasonType, normLeague.totalRosters, JSON.stringify(normLeague.settings), JSON.stringify(normLeague.scoringSettings), JSON.stringify(normLeague.rosterPositions), now, now, league.id);
        league = db.prepare('SELECT * FROM leagues WHERE id = ?').get(league.id);
      }

      const [users, rosters, matchups, transactions, tradedPicks, drafts, statsResult, projectionsResult] = await Promise.all([
        this.getLeagueUsers(normLeague.id),
        this.getLeagueRosters(normLeague.id),
        this.getLeagueMatchups(normLeague.id, week),
        this.getLeagueTransactions(normLeague.id, week).catch(() => []),
        sleeperConnector.getLeagueTradedPicks(normLeague.id).catch(() => []),
        sleeperConnector.getLeagueDrafts(normLeague.id).catch(() => []),
        fetchMetric(() => sleeperConnector.getNflStats(normLeague.season, week)),
        fetchMetric(() => sleeperConnector.getNflProjections(normLeague.season, week))
      ]);
      const stats = statsResult.payload || {};
      const projections = projectionsResult.payload || {};
      metricStatus = { stats: statsResult.status, projections: projectionsResult.status };
      recordsRead += (users?.length || 0) + (rosters?.length || 0) + (matchups?.length || 0) + (transactions?.length || 0) + (tradedPicks?.length || 0) + (drafts?.length || 0) + Object.keys(stats).length + Object.keys(projections).length;

      const catalog = await this.getNflPlayers();
      persistCatalog(catalog, now);
      for (const roster of rosters || []) {
        for (const playerId of roster.players || []) {
          if (!db.prepare('SELECT id FROM players WHERE id = ?').get(String(playerId))) {
            db.prepare(`INSERT INTO players (id, canonical_name, position, status, created_at, updated_at) VALUES (?, ?, 'NFL', 'Unknown', ?, ?)`)
              .run(String(playerId), `Jogador #${playerId}`, now, now);
          }
        }
      }
      persistPlayerStats({ leagueId: league.id, season: normLeague.season, week, stats, projections, capturedAt: now,
        statsStatus: metricStatus.stats, projectionsStatus: metricStatus.projections });
      persistTransactions({ leagueId: league.id, season: normLeague.season, week, transactions, capturedAt: now });
      persistTradedPicks({ leagueId: league.id, season: normLeague.season, picks: tradedPicks, capturedAt: now });
      if (Array.isArray(drafts) && drafts.length > 0) {
        recordsWritten += persistDrafts({ leagueId: league.id, season: normLeague.season, drafts, capturedAt: now });
        for (const draft of drafts) {
          const draftId = String(draft.draft_id || draft.id);
          const draftDbId = `draft_${league.id}_${draftId}`;
          try {
            const picks = await sleeperConnector.getDraftPicks(draftId);
            recordsWritten += persistDraftPicks({ draftId: draftDbId, picks, capturedAt: now });
          } catch (e) {
            console.error('[DraftPicks Error]:', e.message);
          }
        }
      }
      recordSourceProvenance({ entityType: 'league', entityId: league.id, source: 'sleeper', status: 'official', capturedAt: now });
      persistPayload({ leagueId: league.id, resource: 'league', resourceKey: normLeague.id, payload: rawLeague, capturedAt: now });
      persistPayload({ leagueId: league.id, resource: 'state', resourceKey: `${normLeague.season}:${week}`, payload: state, capturedAt: now });

      const userMap = Object.fromEntries((users || []).map(user => [user.user_id, user]));
      for (const r of rosters || []) {
        const u = userMap[r.owner_id] || {};
        const memberId = `mem_${league.id}_${r.roster_id}`;
        const memberValues = [r.owner_id || '', r.roster_id, u.display_name || `Manager ${r.roster_id}`, u.metadata?.team_name || u.display_name || `Time #${r.roster_id}`, u.avatar || null, now];
        db.prepare(`INSERT INTO league_memberships (id, league_id, provider_user_id, roster_id, display_name, team_name, avatar, is_commissioner, is_current_user, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?) ON CONFLICT(id) DO UPDATE SET provider_user_id=excluded.provider_user_id, display_name=excluded.display_name, team_name=excluded.team_name, avatar=excluded.avatar, updated_at=excluded.updated_at`)
          .run(memberId, league.id, ...memberValues, now);
        const rosterDbId = `rst_${league.id}_${r.roster_id}`;
        db.prepare(`INSERT INTO rosters (id, league_id, provider_roster_id, owner_membership_id, players_json, starters_json, reserve_json, taxi_json, settings_json, captured_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET owner_membership_id=excluded.owner_membership_id, players_json=excluded.players_json, starters_json=excluded.starters_json, reserve_json=excluded.reserve_json, taxi_json=excluded.taxi_json, settings_json=excluded.settings_json, captured_at=excluded.captured_at`)
          .run(rosterDbId, league.id, r.roster_id, memberId, JSON.stringify(r.players || []), JSON.stringify(r.starters || []), JSON.stringify(r.reserve || []), Array.isArray(r.taxi) ? JSON.stringify(r.taxi) : null, JSON.stringify(r.settings || {}), now);
        recordsWritten += 2;
      }

      const grouped = {};
      for (const item of matchups || []) {
        if (item.matchup_id == null) continue;
        (grouped[item.matchup_id] ||= []).push(item);
      }
      const scoringSettings = normalizeScoringSettings(normLeague.scoringSettings);
      const matchupInsert = db.prepare(`INSERT INTO matchup_players (id, matchup_id, roster_id, player_id, slot, is_starter, points, projected_points, scoring_breakdown_json, captured_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET slot=excluded.slot, is_starter=excluded.is_starter, points=excluded.points, projected_points=excluded.projected_points, scoring_breakdown_json=excluded.scoring_breakdown_json, captured_at=excluded.captured_at`);
      for (const [providerMatchupId, pair] of Object.entries(grouped)) {
        const a = pair[0];
        const b = pair[1] || null;
        const matchupDbId = `match_${league.id}_w${week}_m${providerMatchupId}`;
        const status = Number(state?.week) === week ? 'live' : ((a?.points || b?.points) ? 'finished' : 'scheduled');
        db.prepare(`INSERT INTO matchups (id, league_id, season, week, provider_matchup_id, roster_a_id, roster_b_id, status, score_a, score_b, custom_points_json, captured_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET status=excluded.status, score_a=excluded.score_a, score_b=excluded.score_b, custom_points_json=excluded.custom_points_json, captured_at=excluded.captured_at`)
          .run(matchupDbId, league.id, normLeague.season, week, Number(providerMatchupId), a?.roster_id || 0, b?.roster_id || null, status, Number(a?.points || 0), Number(b?.points || 0), JSON.stringify({ a: a?.custom_points ?? null, b: b?.custom_points ?? null }), now);
        db.prepare('DELETE FROM matchup_players WHERE matchup_id = ?').run(matchupDbId);
        for (const item of pair) {
          const starters = new Set((item.starters || []).map(String));
          const starterPoints = item.starters_points || [];
          (item.players || []).forEach((playerId, index) => {
            const pid = String(playerId);
            const scored = scorePlayerStats(stats?.[pid] || {}, scoringSettings);
            const official = starters.has(pid) ? numberOrNull(starterPoints[(item.starters || []).indexOf(pid)]) ?? scored.points : scored.points;
            const projected = ['pts_ppr', 'pts_half_ppr', 'pts_std'].map(key => numberOrNull(projections?.[pid]?.[key])).find(value => value !== null) ?? null;
            matchupInsert.run(`${matchupDbId}_${item.roster_id}_${pid}`, matchupDbId, Number(item.roster_id), pid, starters.has(pid) ? `STARTER_${(item.starters || []).indexOf(pid) + 1}` : 'BN', starters.has(pid) ? 1 : 0, official === null ? null : Number(official.toFixed(2)), projected, JSON.stringify({ official, recalculated: scored }), now);
            recordsWritten++;
          });
        }
        recordsWritten++;
      }

      db.prepare('UPDATE leagues SET last_synced_at = ?, updated_at = ? WHERE id = ?').run(now, now, league.id);
      db.prepare(`INSERT INTO sync_runs (id, league_id, provider, resource, status, started_at, finished_at, records_read, records_written, metric_status_json) VALUES (?, ?, 'sleeper', 'league_full', 'SUCCESS', ?, ?, ?, ?, ?)`)
        .run(runId, league.id, startedAt, now, recordsRead, recordsWritten, JSON.stringify(metricStatus));
      return { success: true, recordsRead, recordsWritten, leagueId: league.id, providerLeagueId: normLeague.id, season: normLeague.season, week, state };
    } catch (err) {
      const finishedAt = new Date().toISOString();
      if (league?.id) {
        db.prepare(`INSERT INTO sync_runs (id, league_id, provider, resource, status, started_at, finished_at, records_read, records_written, error_code, error_message) VALUES (?, ?, 'sleeper', 'league_full', 'ERROR', ?, ?, ?, ?, 'SYNC_FAILED', ?)`)
          .run(runId, league.id, startedAt, finishedAt, recordsRead, recordsWritten, err.message);
      }
      throw err;
    }
  }
};
