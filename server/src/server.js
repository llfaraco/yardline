import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import { initDatabase, db } from './db/database.js';
import { authService } from './modules/auth/auth.service.js';
import { sleeperSyncService, normalizeSleeperPlayer, normalizeLeague, normalizeManager, normalizeRoster, normalizeMatchup, getPlayerPhoto, calculateManagerDna } from './modules/sleeper/sleeper.sync.js';
import { sleeperConnector } from './modules/sleeper/sleeper.connector.js';
import { solveOptimalLineupAssignment } from './modules/engines/lineup.solver.js';
import { calculateLeagueBaselines, computeVBD } from './modules/engines/vbd.engine.js';
import { scorePlayerStats, normalizeScoringSettings } from './modules/engines/scoring.engine.js';
import { billingService } from './modules/billing/billing.service.js';
import { newsService } from './modules/news/news.service.js';
import {
  DATA_STATUS,
  INJURY_STATUS,
  createDataStatusDTO,
  createMetricDTO,
  createPlayerCardDTO,
  createRosterDTO,
  createMatchupDTO,
  createLeagueShellDTO
} from './contracts/dtos.js';

// Inicializar banco de dados
initDatabase();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Correlation ID & Logger Middleware
app.use((req, res, next) => {
  req.correlationId = req.headers['x-correlation-id'] || 'req_' + crypto.randomUUID().slice(0, 8);
  res.setHeader('X-Correlation-Id', req.correlationId);
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[API] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms) [${req.correlationId}]`);
  });
  next();
});

// Auth Guard Middleware
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const user = authService.validateToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Não autorizado. Faça login para continuar.' });
  }
  req.user = user;
  next();
}

// ==========================================
// 1. ROTAS DE AUTENTICAÇÃO (/api/auth)
// ==========================================
app.post('/api/auth/register', (req, res) => {
  try {
    const { email, password, displayName, timezone } = req.body;
    if (!email || !password || !displayName) {
      return res.status(400).json({ error: 'E-mail, senha e nome de exibição são obrigatórios.' });
    }
    const session = authService.register({ email, password, displayName, timezone });
    res.status(201).json(session);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }
    const session = authService.login({ email, password });
    res.json(session);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  const sub = billingService.getUserSubscription(req.user.id);
  const ext = db.prepare('SELECT provider_user_id, provider_username, status FROM external_accounts WHERE user_id = ?').all(req.user.id);
  res.json({
    user: req.user,
    subscription: sub,
    connectedAccounts: ext
  });
});

app.post('/api/auth/logout', (req, res) => {
  const token = req.headers.authorization?.slice(7);
  authService.logout(token);
  res.json({ success: true });
});

// ==========================================
// 2. INTEGRAÇÃO SLEEPER (/api/integrations/sleeper & /api/state)
// ==========================================
// Estado Atual da NFL
app.get('/api/state/nfl', async (req, res) => {
  try {
    const state = await sleeperSyncService.getNflState();
    res.json(state || { season: String(new Date().getUTCFullYear()), week: null, display_week: null, season_type: 'regular', data_status: 'unavailable' });
  } catch (err) {
    res.json({ season: String(new Date().getUTCFullYear()), week: null, display_week: null, season_type: 'regular', data_status: 'unavailable' });
  }
});

// Buscar Usuário do Sleeper por Username
app.get('/api/integrations/sleeper/user/:username', async (req, res) => {
  try {
    const user = await sleeperSyncService.getSleeperUser(req.params.username);
    if (!user) return res.status(404).json({ error: 'Usuário Sleeper não encontrado.' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Buscar Ligas do Usuário do Sleeper na Temporada
app.get('/api/integrations/sleeper/user/:userId/leagues/:season', async (req, res) => {
  try {
    const leagues = await sleeperSyncService.getUserLeagues(req.params.userId, req.params.season || '2026');
    res.json(Array.isArray(leagues) ? leagues.map(normalizeLeague) : []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sincronizar Liga Escolhida
app.post('/api/integrations/sleeper/sync-league', async (req, res) => {
  try {
    const { leagueId, week = null } = req.body;
    if (!leagueId) return res.status(400).json({ error: 'leagueId é obrigatório.' });
    const result = await sleeperSyncService.syncLeagueDetails(leagueId, week == null ? null : parseInt(week, 10));
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Catálogo Canônico de Jogadores da NFL (24h Cache)
app.get('/api/players/catalog', async (req, res) => {
  try {
    const catalog = await sleeperSyncService.getNflPlayers();
    res.json(catalog);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DTO Canônico: Ficha individual do jogador
app.get('/api/players/:playerId', (req, res) => {
  try {
    const { playerId } = req.params;
    let player = db.prepare('SELECT * FROM players WHERE id = ?').get(playerId);
    if (!player) {
      const crosswalk = db.prepare('SELECT player_id FROM player_identities WHERE provider_player_id = ?').get(playerId);
      if (crosswalk) {
        player = db.prepare('SELECT * FROM players WHERE id = ?').get(crosswalk.player_id);
      }
    }

    if (!player) {
      return res.status(404).json({
        error: 'Jogador não encontrado no catálogo canônico.',
        dataStatus: DATA_STATUS.UNAVAILABLE
      });
    }

    const identities = db.prepare('SELECT provider, provider_player_id FROM player_identities WHERE player_id = ?').all(player.id);
    const sleeperIdentity = identities.find(i => i.provider === 'sleeper');
    const espnIdentity = identities.find(i => i.provider === 'espn');

    const latestProjection = db.prepare('SELECT projection FROM projections WHERE player_id = ? ORDER BY season DESC, week DESC, created_at DESC LIMIT 1').get(player.id);

    const card = createPlayerCardDTO({
      id: player.id,
      sleeperId: sleeperIdentity?.provider_player_id || (player.id.length <= 6 ? player.id : null),
      espnId: espnIdentity?.provider_player_id || null,
      name: player.canonical_name,
      position: player.position,
      team: player.team,
      jersey: player.number,
      injuryStatus: player.status !== 'Active' ? player.status : null,
      photoUrl: player.photo_url,
      metrics: createMetricDTO({
        projectedPoints: latestProjection?.projection != null ? Number(latestProjection.projection) : null,
        provenance: createDataStatusDTO({
          status: latestProjection ? DATA_STATUS.OFFICIAL : DATA_STATUS.UNAVAILABLE,
          source: 'projections_db'
        })
      }),
      provenance: createDataStatusDTO({
        status: DATA_STATUS.OFFICIAL,
        source: 'canonical_players_db',
        syncedAt: player.updated_at
      })
    });

    res.json(card);
  } catch (err) {
    res.status(500).json({ error: err.message, dataStatus: DATA_STATUS.UNAVAILABLE });
  }
});

// Histórico de pontuação e estatísticas do jogador
app.get('/api/players/:playerId/history', (req, res) => {
  try {
    const { playerId } = req.params;
    let player = db.prepare('SELECT id, canonical_name FROM players WHERE id = ?').get(playerId);
    if (!player) {
      const crosswalk = db.prepare('SELECT player_id FROM player_identities WHERE provider_player_id = ?').get(playerId);
      if (crosswalk) {
        player = db.prepare('SELECT id, canonical_name FROM players WHERE id = ?').get(crosswalk.player_id);
      }
    }

    if (!player) {
      return res.status(404).json({
        error: 'Jogador não encontrado.',
        dataStatus: DATA_STATUS.UNAVAILABLE
      });
    }

    const { season } = req.query;
    const statsRows = season
      ? db.prepare('SELECT season, week, stats_json, source, captured_at FROM player_stats WHERE player_id = ? AND season = ? ORDER BY week ASC').all(player.id, String(season))
      : db.prepare('SELECT season, week, stats_json, source, captured_at FROM player_stats WHERE player_id = ? ORDER BY season DESC, week ASC').all(player.id);

    const history = statsRows.map(row => {
      let stats = {};
      try { stats = JSON.parse(row.stats_json || '{}'); } catch {}
      const explicitPoints = stats.pts_ppr ?? stats.pts_half_ppr ?? stats.pts_std;
      return {
        season: row.season,
        week: Number(row.week),
        opp: stats.opponent || stats.opp || null,
        proj: stats.proj != null ? Number(stats.proj) : null,
        points: explicitPoints != null ? Number(Number(explicitPoints).toFixed(2)) : null,
        stats,
        provenance: createDataStatusDTO({
          status: DATA_STATUS.OFFICIAL,
          source: row.source || 'sleeper_stats',
          syncedAt: row.captured_at
        })
      };
    });

    res.json({
      playerId: player.id,
      name: player.canonical_name,
      totalGames: history.length,
      history,
      rows: history
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.post('/api/integrations/sleeper/connect', requireAuth, async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Nome de usuário do Sleeper é obrigatório.' });

    const sleeperUser = await sleeperSyncService.connectAccount(req.user.id, username);
    const leagues = await sleeperSyncService.syncUserLeagues(req.user.id);
    res.json({ success: true, sleeperUser, leaguesCount: leagues.length, leagues });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/integrations/sleeper/sync', requireAuth, async (req, res) => {
  try {
    const { leagueId, week = null } = req.body;
    if (!leagueId) return res.status(400).json({ error: 'leagueId é obrigatório.' });

    const result = await sleeperSyncService.syncLeagueDetails(leagueId, week == null ? null : parseInt(week, 10));
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. ROTAS DE LIGAS (/api/leagues)
// ==========================================
app.get('/api/leagues', requireAuth, (req, res) => {
  const leagues = db.prepare('SELECT * FROM leagues ORDER BY updated_at DESC').all();
  res.json(leagues.map(l => ({
    ...l,
    settings: JSON.parse(l.settings_json || '{}'),
    scoringSettings: JSON.parse(l.scoring_settings_json || '{}'),
    rosterPositions: JSON.parse(l.roster_positions_json || '[]')
  })));
});

app.get('/api/leagues/:leagueId', (req, res) => {
  const league = db.prepare('SELECT * FROM leagues WHERE id = ? OR provider_league_id = ?').get(req.params.leagueId, req.params.leagueId);
  if (!league) return res.status(404).json({ error: 'Liga não encontrada.' });

  const rosters = db.prepare('SELECT * FROM rosters WHERE league_id = ?').all(league.id);
  const memberships = db.prepare('SELECT * FROM league_memberships WHERE league_id = ?').all(league.id);

  res.json({
    ...league,
    settings: JSON.parse(league.settings_json || '{}'),
    scoringSettings: JSON.parse(league.scoring_settings_json || '{}'),
    rosterPositions: JSON.parse(league.roster_positions_json || '[]'),
    rostersCount: rosters.length,
    members: memberships
  });
});

// Snapshot canônico para o LeagueShell: uma única fonte para todas as telas.
app.get('/api/leagues/:leagueId/shell', (req, res) => {
  const league = db.prepare('SELECT * FROM leagues WHERE id = ? OR provider_league_id = ?').get(req.params.leagueId, req.params.leagueId);
  if (!league) return res.status(404).json({ error: 'Liga não encontrada.' });
  const parse = (value, fallback) => { try { return JSON.parse(value ?? ''); } catch { return fallback; } };
  const latestState = db.prepare(`SELECT payload_json FROM sync_payloads WHERE league_id = ? AND resource = 'state' ORDER BY captured_at DESC LIMIT 1`).get(league.id);
  const state = parse(latestState?.payload_json, null);
  const settings = parse(league.settings_json, {});
  const week = Number(req.query.week || state?.week || settings.leg || 1);
  const rosters = db.prepare(`SELECT r.*, m.display_name, m.team_name, m.avatar FROM rosters r LEFT JOIN league_memberships m ON r.owner_membership_id=m.id WHERE r.league_id=? ORDER BY r.provider_roster_id`).all(league.id);
  const rawMatchups = db.prepare('SELECT * FROM matchups WHERE league_id = ? AND week = ? ORDER BY provider_matchup_id').all(league.id, week);
  const matchups = rawMatchups.map(matchup => ({
    ...matchup,
    customPoints: parse(matchup.custom_points_json, {}),
    players: db.prepare(`SELECT mp.*, p.canonical_name AS name, p.position, p.team, p.photo_url AS photoUrl FROM matchup_players mp LEFT JOIN players p ON p.id=mp.player_id WHERE mp.matchup_id=? ORDER BY mp.roster_id, mp.is_starter DESC, mp.slot`).all(matchup.id).map(player => ({ ...player, scoringBreakdown: parse(player.scoring_breakdown_json, {}) }))
  }));
  const standings = rosters.map(r => {
    const s = parse(r.settings_json, {});
    const fpts = Number(s.fpts || 0) + Number(s.fpts_decimal || 0) / 100;
    const fptsAgainst = Number(s.fpts_against || 0) + Number(s.fpts_against_decimal || 0) / 100;
    return { rosterId: r.provider_roster_id, teamName: r.team_name || `Time #${r.provider_roster_id}`, manager: r.display_name || 'Manager', wins: Number(s.wins || 0), losses: Number(s.losses || 0), ties: Number(s.ties || 0), fpts: Number(fpts.toFixed(2)), fptsAgainst: Number(fptsAgainst.toFixed(2)), record: `${s.wins || 0}-${s.losses || 0}${s.ties ? `-${s.ties}` : ''}` };
  }).sort((a, b) => b.wins - a.wins || b.fpts - a.fpts).map((team, index) => ({ ...team, rank: index + 1 }));
  const transactions = db.prepare('SELECT * FROM transactions WHERE league_id = ? AND week = ? ORDER BY occurred_at DESC').all(league.id, week).map(t => ({ ...t, rosterIds: parse(t.roster_ids_json, []), adds: parse(t.adds_json, {}), drops: parse(t.drops_json, {}), draftPicks: parse(t.draft_picks_json, []), waiverBudget: parse(t.waiver_budget_json, []), raw: parse(t.raw_json, {}) }));
  const tradedPicks = db.prepare('SELECT * FROM traded_picks WHERE league_id = ? ORDER BY season, round, pick_no').all(league.id).map(p => ({ ...p, raw: parse(p.raw_json, {}) }));
  const playerData = {};
  const scoringSettings = normalizeScoringSettings(parse(league.scoring_settings_json, {}));
  const statsRows = db.prepare('SELECT player_id, week, stats_json FROM player_stats WHERE season = ? ORDER BY week').all(String(league.season));
  for (const row of statsRows) {
    const pid = String(row.player_id);
    const stats = parse(row.stats_json, {});
    const hasStats = Object.keys(stats).length > 0;
    const explicitPoints = stats.pts_ppr ?? stats.pts_half_ppr ?? stats.pts_std;
    const points = Number(explicitPoints ?? (hasStats ? scorePlayerStats(stats, scoringSettings).points : NaN));
    const current = playerData[pid] || { totalPts: 0, games: 0, currentPoints: null };
    if (Number.isFinite(points)) { current.totalPts += points; current.games += 1; if (Number(row.week) === week) current.currentPoints = points; }
    playerData[pid] = current;
  }
  for (const [pid, data] of Object.entries(playerData)) data.avgPpr = data.games ? Number((data.totalPts / data.games).toFixed(2)) : null;
  const projectionRows = db.prepare('SELECT player_id, projection FROM projections WHERE season = ? AND week = ? ORDER BY created_at DESC').all(String(league.season), week);
  for (const row of projectionRows) if (playerData[String(row.player_id)]?.projectedPoints == null) playerData[String(row.player_id)].projectedPoints = Number(row.projection);
  const shellDto = createLeagueShellDTO({
    league: {
      id: league.id,
      providerLeagueId: league.provider_league_id,
      name: league.name,
      season: league.season,
      status: league.status,
      settings,
      scoringSettings: parse(league.scoring_settings_json, {}),
      rosterPositions: parse(league.roster_positions_json, [])
    },
    state: { ...(state || {}), week },
    rosters: rosters.map(r => ({
      rosterId: r.provider_roster_id,
      owner: r.display_name,
      teamName: r.team_name,
      avatar: r.avatar,
      players: parse(r.players_json, []),
      starters: parse(r.starters_json, []),
      reserve: parse(r.reserve_json, []),
      settings: parse(r.settings_json, {})
    })),
    standings,
    matchups,
    transactions,
    tradedPicks,
    playerData,
    provenance: createDataStatusDTO({
      status: league.last_synced_at ? DATA_STATUS.OFFICIAL : DATA_STATUS.UNAVAILABLE,
      source: 'sleeper_sync',
      syncedAt: league.last_synced_at
    })
  });
  res.json(shellDto);
});

app.get('/api/leagues/:leagueId/rosters', (req, res) => {
  const league = db.prepare('SELECT id FROM leagues WHERE id = ? OR provider_league_id = ?').get(req.params.leagueId, req.params.leagueId);
  if (!league) return res.status(404).json({ error: 'Liga não encontrada.' });

  const rosters = db.prepare(`
    SELECT r.*, m.display_name, m.team_name, m.avatar
    FROM rosters r
    LEFT JOIN league_memberships m ON r.owner_membership_id = m.id
    WHERE r.league_id = ?
  `).all(league.id);

  res.json(rosters.map(r => ({
    ...r,
    players: JSON.parse(r.players_json || '[]'),
    starters: JSON.parse(r.starters_json || '[]'),
    reserve: JSON.parse(r.reserve_json || '[]'),
    settings: JSON.parse(r.settings_json || '{}')
  })));
});

app.get('/api/leagues/:leagueId/matchups', (req, res) => {
  const week = parseInt(req.query.week || '6', 10);
  const league = db.prepare('SELECT id FROM leagues WHERE id = ? OR provider_league_id = ?').get(req.params.leagueId, req.params.leagueId);
  if (!league) return res.status(404).json({ error: 'Liga não encontrada.' });

  const matchups = db.prepare('SELECT * FROM matchups WHERE league_id = ? AND week = ?').all(league.id, week);
  res.json(matchups);
});

// Standings Oficiais da Liga
app.get('/api/leagues/:leagueId/standings', (req, res) => {
  const league = db.prepare('SELECT id FROM leagues WHERE id = ? OR provider_league_id = ?').get(req.params.leagueId, req.params.leagueId);
  if (!league) return res.status(404).json({ error: 'Liga não encontrada.' });

  const rosters = db.prepare(`
    SELECT r.*, m.display_name, m.team_name, m.avatar
    FROM rosters r
    LEFT JOIN league_memberships m ON r.owner_membership_id = m.id
    WHERE r.league_id = ?
  `).all(league.id);

  const standings = rosters.map(r => {
    const s = JSON.parse(r.settings_json || '{}');
    const wins = s.wins || 0;
    const losses = s.losses || 0;
    const ties = s.ties || 0;
    const fpts = (s.fpts || 0) + ((s.fpts_decimal || 0) / 100);
    const fptsAgainst = (s.fpts_against || 0) + ((s.fpts_against_decimal || 0) / 100);

    return {
      rosterId: r.provider_roster_id,
      teamName: r.team_name || `Time #${r.provider_roster_id}`,
      manager: r.display_name ? `@${r.display_name}` : 'Manager',
      avatar: r.avatar,
      record: ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`,
      wins, losses, ties,
      fpts: parseFloat(fpts.toFixed(1)),
      fptsAgainst: parseFloat(fptsAgainst.toFixed(1)),
      diff: parseFloat((fpts - fptsAgainst).toFixed(1))
    };
  });

  standings.sort((a, b) => b.wins - a.wins || b.fpts - a.fpts);
  standings.forEach((tm, idx) => { tm.rank = idx + 1; });

  res.json(standings);
});

// Detalhes do Confronto Semanal (Modo Fantasy Lado a Lado)
app.get('/api/leagues/:leagueId/matchup-details', (req, res) => {
  const week = parseInt(req.query.week || '6', 10);
  const rosterId = parseInt(req.query.rosterId || '2', 10);
  const league = db.prepare('SELECT id, season FROM leagues WHERE id = ? OR provider_league_id = ?').get(req.params.leagueId, req.params.leagueId);
  if (!league) return res.status(404).json({ error: 'Liga não encontrada.' });

  const matchup = db.prepare(`
    SELECT * FROM matchups 
    WHERE league_id = ? AND week = ? AND (roster_a_id = ? OR roster_b_id = ?)
  `).get(league.id, week, rosterId, rosterId);

  if (!matchup) {
    return res.json({ message: 'Confronto não encontrado para a semana selecionada.' });
  }

  const isRosterA = (matchup.roster_a_id === rosterId);
  const oppRosterId = isRosterA ? matchup.roster_b_id : matchup.roster_a_id;

  const myRoster = db.prepare(`
    SELECT r.*, m.display_name, m.team_name FROM rosters r
    LEFT JOIN league_memberships m ON r.owner_membership_id = m.id
    WHERE r.league_id = ? AND r.provider_roster_id = ?
  `).get(league.id, rosterId);

  const oppRoster = db.prepare(`
    SELECT r.*, m.display_name, m.team_name FROM rosters r
    LEFT JOIN league_memberships m ON r.owner_membership_id = m.id
    WHERE r.league_id = ? AND r.provider_roster_id = ?
  `).get(league.id, oppRosterId);

  res.json({
    week,
    season: league.season,
    myTeam: {
      rosterId,
      name: myRoster?.team_name || 'Gengar My Balls',
      manager: myRoster?.display_name ? '@' + myRoster.display_name : '@Faraco',
      score: isRosterA ? matchup.score_a : matchup.score_b,
      starters: JSON.parse(myRoster?.starters_json || '[]'),
      bench: JSON.parse(myRoster?.players_json || '[]').filter(pid => !new Set(JSON.parse(myRoster?.starters_json || '[]').map(String)).has(String(pid)))
    },
    oppTeam: {
      rosterId: oppRosterId,
      name: oppRoster?.team_name || 'Curitiba Red Fox',
      manager: oppRoster?.display_name ? '@' + oppRoster.display_name : '@neyllon',
      score: isRosterA ? matchup.score_b : matchup.score_a,
      starters: JSON.parse(oppRoster?.starters_json || '[]'),
      bench: JSON.parse(oppRoster?.players_json || '[]').filter(pid => !new Set(JSON.parse(oppRoster?.starters_json || '[]').map(String)).has(String(pid)))
    }
  });
});

// Confronto Semanal Canônico (Seção 4: buildFantasyMatchup por matchup_id)
app.get('/api/leagues/:leagueId/matchups/current', async (req, res) => {
  try {
    const { sleeperUserId = 'Faraco', week = 6 } = req.query;
    const matchup = await sleeperSyncService.buildFantasyMatchup({
      leagueId: req.params.leagueId,
      sleeperUserId: String(sleeperUserId),
      week: parseInt(week, 10)
    });
    res.json(matchup);
  } catch (err) {
    console.error('[buildFantasyMatchup Error]:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Command Center Tático, derivado do snapshot persistido.
app.get('/api/command-center', (req, res) => {
  const leagueId = req.query.leagueId || '1369770282776006656';
  const rosterId = parseInt(req.query.rosterId || '2', 10);
  const league = db.prepare('SELECT * FROM leagues WHERE id = ? OR provider_league_id = ?').get(leagueId, leagueId);
  const stateRow = league && db.prepare(`SELECT payload_json FROM sync_payloads WHERE league_id=? AND resource='state' ORDER BY captured_at DESC LIMIT 1`).get(league.id);
  let state = {}; try { state = JSON.parse(stateRow?.payload_json || '{}'); } catch {}
  const roster = league && db.prepare('SELECT settings_json FROM rosters WHERE league_id=? AND provider_roster_id=?').get(league.id, rosterId);
  let rosterSettings = {}; try { rosterSettings = JSON.parse(roster?.settings_json || '{}'); } catch {}
  const fpts = Number(rosterSettings.fpts || 0) + Number(rosterSettings.fpts_decimal || 0) / 100;

  res.json({
    leagueName: league?.name || null,
    currentWeek: Number(state.week || league?.settings_json && JSON.parse(league.settings_json || '{}').leg || 0),
    activeRosterId: rosterId,
    efficiencyPercent: null,
    pointsFor: Number(fpts.toFixed(2)),
    alerts: []
  });
});

// Waivers por Diferença de Conjuntos
app.get('/api/waivers', (req, res) => {
  const leagueId = req.query.leagueId || '1369770282776006656';
  const league = db.prepare('SELECT id FROM leagues WHERE id = ? OR provider_league_id = ?').get(leagueId, leagueId);
  
  const allKnownPlayers = db.prepare('SELECT * FROM players').all();
  let rosteredPlayerIds = new Set();

  if (league) {
    const rosters = db.prepare('SELECT players_json FROM rosters WHERE league_id = ?').all(league.id);
    for (const r of rosters) {
      const pids = JSON.parse(r.players_json || '[]');
      pids.forEach(id => rosteredPlayerIds.add(String(id)));
    }
  }

  const freeAgents = allKnownPlayers.filter(p => !rosteredPlayerIds.has(String(p.id)));
  res.json(freeAgents);
});

// Rankings Posicionais com VBD
app.get('/api/rankings', (req, res) => {
  const pos = req.query.pos?.toUpperCase();
  let sql = `SELECT p.*, pr.projection AS current_projection FROM players p LEFT JOIN projections pr ON pr.id = (SELECT p2.id FROM projections p2 WHERE p2.player_id = p.id ORDER BY p2.season DESC, p2.week DESC, p2.created_at DESC LIMIT 1)`;
  const params = [];
  if (pos && pos !== 'ALL') {
    sql += ' WHERE p.position = ?';
    params.push(pos);
  }
  sql += ' LIMIT 50';
  const list = db.prepare(sql).all(...params);
  res.json(list.map((p, idx) => ({
    rank: idx + 1,
    ...p,
    proj: p.current_projection == null ? null : Number(p.current_projection),
    vbd: null,
    confidence: p.current_projection == null ? 'unavailable' : 'sleeper'
  })));
});

// Manager DNA
app.get('/api/manager-dna', (req, res) => {
  res.json({
    manager: 'Faraco',
    team: 'Gengar My Balls',
    archetype: 'Tactical Aggressor',
    metrics: {
      waiverAggressiveness: 'Alta (22% FAAB médio)',
      tradeFrequency: 'Moderada (3 ofertas / mês)',
      rosterConcentration: 'Foco em WRs de alto volume (TPRR > 28%)',
      clutchScore: '89.4%'
    },
    insights: [
      'Costuma identificar lesões nas primeiras 24h e antecipar backups no Waiver.',
      'Maximiza o teto posicional com o solver ótimo semanal.'
    ]
  });
});

// Manager DNA Individual por Roster / Manager (Seção 8 da Especificação)
app.get('/api/leagues/:leagueId/manager-dna/:rosterId', async (req, res) => {
  try {
    const { leagueId, rosterId } = req.params;
    const rId = parseInt(rosterId, 10);
    const league = db.prepare('SELECT id, provider_league_id FROM leagues WHERE id = ? OR provider_league_id = ?').get(leagueId, leagueId);
    const providerLeagueId = league?.provider_league_id || leagueId;

    const roster = db.prepare(`
      SELECT r.*, m.display_name, m.team_name, m.provider_user_id
      FROM rosters r
      LEFT JOIN league_memberships m ON r.owner_membership_id = m.id
      WHERE (r.league_id = ? OR r.league_id = ?) AND r.provider_roster_id = ?
    `).get(league?.id || leagueId, leagueId, rId);

    const transactions = league?.id
      ? db.prepare('SELECT roster_ids_json AS roster_ids, adds_json AS adds, drops_json AS drops, type, waiver_budget_json AS waiver_budget, raw_json FROM transactions WHERE league_id = ? ORDER BY occurred_at DESC').all(league.id).map(t => ({ ...t, roster_ids: JSON.parse(t.roster_ids || '[]'), adds: JSON.parse(t.adds || '{}'), drops: JSON.parse(t.drops || '{}'), waiver_budget: JSON.parse(t.waiver_budget || '[]'), settings: JSON.parse(t.raw_json || '{}').settings || {} }))
      : [];
    const dna = calculateManagerDna({
      managerId: roster?.provider_user_id || `mgr_${rId}`,
      rosterId: rId,
      leagueId: providerLeagueId,
      historicalTransactions: Array.isArray(transactions) ? transactions : [],
      managerName: roster?.display_name ? '@' + roster.display_name : `Manager #${rId}`,
      teamName: roster?.team_name || `Time #${rId}`
    });

    res.json(dna);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Draft Center
app.get('/api/drafts', (req, res) => {
  res.json({
    season: '2026',
    type: 'Snake',
    totalRounds: 16,
    myPick: 2,
    adpLeaders: [
      { pick: 1, name: 'Christian McCaffrey', pos: 'RB', team: 'SF', adp: '1.01' },
      { pick: 2, name: 'CeeDee Lamb', pos: 'WR', team: 'DAL', adp: '1.02' },
      { pick: 3, name: 'Ja\'Marr Chase', pos: 'WR', team: 'CIN', adp: '1.03' },
      { pick: 4, name: 'Justin Jefferson', pos: 'WR', team: 'MIN', adp: '1.04' }
    ]
  });
});

// ==========================================
// 4. INTELIGÊNCIA & MOTORES (/api/lineups & /api/command-center)
// ==========================================
app.post('/api/lineups/simulate', (req, res) => {
  try {
    const { slots, playerPool } = req.body;
    if (!Array.isArray(slots) || !Array.isArray(playerPool)) {
      return res.status(400).json({ error: 'slots e playerPool devem ser arrays.' });
    }
    const result = solveOptimalLineupAssignment(slots, playerPool);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. NOTÍCIAS (/api/news)
// ==========================================
app.get('/api/news', (req, res) => {
  const { category, limit = 20, offset = 0 } = req.query;
  const news = newsService.getNewsFeed({ category, limit: parseInt(limit, 10), offset: parseInt(offset, 10) });
  res.json(news);
});

app.get('/api/players/:playerId/history', (req, res) => {
  const season = String(req.query.season || new Date().getUTCFullYear());
  const rows = db.prepare(`SELECT s.week, s.stats_json, p.projection FROM player_stats s LEFT JOIN projections p ON p.player_id=s.player_id AND p.season=s.season AND p.week=s.week WHERE s.player_id=? AND s.season=? ORDER BY s.week`).all(String(req.params.playerId), season).map(row => {
    let stats = {}; try { stats = JSON.parse(row.stats_json || '{}'); } catch {}
    return { week: row.week, opp: stats.opponent || '—', proj: row.projection == null ? null : Number(row.projection), fpts: stats.pts_ppr ?? stats.pts_half_ppr ?? stats.pts_std ?? null, snap: stats.off_pct ?? stats.snap_pct ?? null, att: stats.rush_att ?? stats.pass_att ?? stats.rec_tgt ?? null, cmp: stats.pass_cmp ?? null, yd: stats.pass_yd ?? stats.rush_yd ?? stats.rec_yd ?? null, td: stats.pass_td ?? stats.rush_td ?? stats.rec_td ?? null, int: stats.pass_int ?? null };
  });
  res.json({ playerId: String(req.params.playerId), season, rows, dataStatus: rows.length ? 'synced' : 'not_synced' });
});

app.get('/api/leagues/:leagueId/messages', (req, res) => {
  const league = db.prepare('SELECT id FROM leagues WHERE id=? OR provider_league_id=?').get(req.params.leagueId, req.params.leagueId);
  if (!league) return res.status(404).json({ error: 'Liga não encontrada.' });
  const limit = Math.min(Number(req.query.limit || 100), 200);
  const messages = db.prepare('SELECT id, provider_user_id AS providerUserId, author, initials, message AS text, created_at AS createdAt FROM league_messages WHERE league_id=? ORDER BY created_at DESC LIMIT ?').all(league.id, limit).reverse();
  res.json({ messages });
});

app.post('/api/leagues/:leagueId/messages', (req, res) => {
  const league = db.prepare('SELECT id FROM leagues WHERE id=? OR provider_league_id=?').get(req.params.leagueId, req.params.leagueId);
  if (!league) return res.status(404).json({ error: 'Liga não encontrada.' });
  const message = String(req.body?.message || '').trim().slice(0, 2000);
  if (!message) return res.status(400).json({ error: 'message é obrigatório.' });
  const author = String(req.body?.author || 'Faraco').trim().slice(0, 120) || 'Faraco';
  const initials = String(req.body?.initials || author.slice(0, 2)).trim().slice(0, 4).toUpperCase();
  const createdAt = new Date().toISOString();
  const id = `msg_${crypto.randomUUID()}`;
  db.prepare('INSERT INTO league_messages (id, league_id, provider_user_id, author, initials, message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, league.id, req.body?.providerUserId || null, author, initials, message, createdAt);
  res.status(201).json({ id, providerUserId: req.body?.providerUserId || null, author, initials, text: message, createdAt });
});

app.get('/api/players/:playerId/news', (req, res) => {
  const news = newsService.getPlayerNews(req.params.playerId);
  res.json(news);
});

// ==========================================
// 6. PAGAMENTOS & ASSINATURAS (/api/billing & /api/webhooks)
// ==========================================
app.get('/api/plans', (req, res) => {
  res.json(billingService.getPlans());
});

app.post('/api/billing/checkout', requireAuth, async (req, res) => {
  try {
    const { planCode, method = 'PIX' } = req.body;
    const session = await billingService.createCheckoutSession(req.user.id, planCode, method);
    res.json(session);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/webhooks/payment/:provider', async (req, res) => {
  try {
    const signature = req.headers['x-yardline-signature'] || req.headers['x-signature'] || 'sandbox_test_signature';
    const result = await billingService.handlePaymentWebhook(req.body, signature);
    res.json(result);
  } catch (err) {
    console.error('[Billing Webhook Error]:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    version: '1.0.0',
    platform: 'YARDLINE NFL Production Core',
    timestamp: new Date().toISOString()
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 [YARDLINE API] Servidor de produção ativo na porta ${PORT}`);
  console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
});
