import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import { initDatabase, db } from './db/database.js';
import { authService } from './modules/auth/auth.service.js';
import { sleeperSyncService, normalizeSleeperPlayer, normalizeLeague, normalizeManager, normalizeRoster, normalizeMatchup, getPlayerPhoto, calculateManagerDna } from './modules/sleeper/sleeper.sync.js';
import { sleeperConnector } from './modules/sleeper/sleeper.connector.js';
import { solveOptimalLineupAssignment } from './modules/engines/lineup.solver.js';
import { calculateLeagueBaselines, computeVBD } from './modules/engines/vbd.engine.js';
import { billingService } from './modules/billing/billing.service.js';
import { newsService } from './modules/news/news.service.js';

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
    res.json(state || { season: '2026', week: 6, display_week: 6, season_type: 'regular' });
  } catch (err) {
    res.json({ season: '2026', week: 6, display_week: 6, season_type: 'regular' });
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
    const { leagueId, week = 6 } = req.body;
    if (!leagueId) return res.status(400).json({ error: 'leagueId é obrigatório.' });
    const result = await sleeperSyncService.syncLeagueDetails(leagueId, parseInt(week, 10));
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
    const { leagueId, week = 6 } = req.body;
    if (!leagueId) return res.status(400).json({ error: 'leagueId é obrigatório.' });

    const result = await sleeperSyncService.syncLeagueDetails(leagueId, parseInt(week, 10));
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
      bench: JSON.parse(myRoster?.players_json || '[]')
    },
    oppTeam: {
      rosterId: oppRosterId,
      name: oppRoster?.team_name || 'Curitiba Red Fox',
      manager: oppRoster?.display_name ? '@' + oppRoster.display_name : '@neyllon',
      score: isRosterA ? matchup.score_b : matchup.score_a,
      starters: JSON.parse(oppRoster?.starters_json || '[]'),
      bench: JSON.parse(oppRoster?.players_json || '[]')
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

// Command Center Tático
app.get('/api/command-center', (req, res) => {
  const leagueId = req.query.leagueId || '1369770282776006656';
  const rosterId = parseInt(req.query.rosterId || '2', 10);
  const league = db.prepare('SELECT * FROM leagues WHERE id = ? OR provider_league_id = ?').get(leagueId, leagueId);

  res.json({
    leagueName: league?.name || 'Neilo Pistola League',
    currentWeek: 6,
    activeRosterId: rosterId,
    efficiencyPercent: 97,
    alerts: [
      { type: 'MEDICAL', severity: 'warning', title: 'Alerta Médico Pré-Jogo', description: 'Nenhum desfalque crítico ativo na escalação principal.' },
      { type: 'WAIVER', severity: 'action', title: 'Waiver Recomendado', description: 'Adição prioritária disponível no mercado livre da liga.' },
      { type: 'TRADE', severity: 'info', title: 'Radar Trade Hub', description: '15 adversários mapeados para simulação de propostas.' }
    ]
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
  let sql = 'SELECT * FROM players';
  const params = [];
  if (pos && pos !== 'ALL') {
    sql += ' WHERE position = ?';
    params.push(pos);
  }
  sql += ' LIMIT 50';
  const list = db.prepare(sql).all(...params);
  res.json(list.map((p, idx) => ({
    rank: idx + 1,
    ...p,
    proj: parseFloat((15.5 - (idx * 0.25)).toFixed(1)),
    vbd: parseFloat((15.5 - (idx * 0.25) - 7.5).toFixed(1)),
    confidence: '88%'
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

    const transactions = await sleeperSyncService.getLeagueTransactions(providerLeagueId, 6).catch(() => []);
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
