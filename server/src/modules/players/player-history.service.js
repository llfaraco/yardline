import { db } from '../../db/database.js';
import { sleeperConnector } from '../sleeper/sleeper.connector.js';
import { buildPlayerHistory, parseJson, numberOrNull } from './player-card.service.js';

export function normalizeSeasonPayload(payload, playerId, season) {
  if (!payload || typeof payload !== 'object') throw new Error('Resposta de histórico inválida.');
  const records = Array.isArray(payload) ? payload : Object.values(payload);
  const weeks = new Map();
  for (const item of records) {
    // The observed API uses null for bye weeks / absent weekly records.
    if (item === null) continue;
    if (!item || typeof item !== 'object' || !item.stats || typeof item.stats !== 'object' || Array.isArray(item.stats)) {
      throw new Error('Formato de histórico não reconhecido.');
    }
    if ((item.player_id != null && String(item.player_id) !== String(playerId))
      || (item.season != null && String(item.season) !== String(season))
      || (item.season_type && item.season_type !== 'regular')) throw new Error('Histórico de outro jogador ou temporada.');
    const week = Number(item.week);
    if (!Number.isInteger(week) || week < 1 || week > 18) throw new Error('Semana inválida no histórico.');
    if (!Object.keys(item.stats).length || item.stats.gp === 0) continue;
    weeks.set(week, { week, stats: { ...item.stats, opponent: item.opponent ?? null,
      team: item.team ?? null, game_date: item.date ?? null } });
  }
  return [...weeks.values()].sort((a, b) => a.week - b.week);
}

export class PlayerHistoryService {
  constructor(database = db, connector = sleeperConnector, { currentSeason = new Date().getUTCFullYear(), concurrency = 3 } = {}) {
    this.db = database; this.connector = connector; this.currentSeason = Number(currentSeason);
    this.concurrency = concurrency; this.active = 0; this.queue = []; this.jobs = new Map();
  }
  seasonRange(player) {
    const catalog = parseJson(player.catalog_json, {});
    const rookie = Number(catalog.rookieYear ?? catalog.rookie_year);
    const experience = numberOrNull(catalog.yearsExp ?? catalog.years_exp);
    let start = this.currentSeason, rangeSource = 'persisted_only';
    if (Number.isInteger(rookie) && rookie >= 1960 && rookie <= this.currentSeason) { start = rookie; rangeSource = 'catalog_rookie_year'; }
    else if (experience !== null && experience >= 0 && experience <= 45) { start -= Math.floor(experience); rangeSource = 'catalog_experience_estimate'; }
    const stored = this.db.prepare('SELECT DISTINCT season FROM player_stats WHERE player_id=?').all(player.id).map(row => Number(row.season));
    const seasons = [...new Set([...Array.from({ length: Math.min(50, this.currentSeason - start + 1) }, (_, i) => this.currentSeason - i), ...stored])]
      .filter(year => Number.isInteger(year) && year >= 1960 && year <= this.currentSeason).sort((a, b) => b - a);
    return { seasons, rangeSource };
  }
  enqueue(task) {
    const result = new Promise((resolve, reject) => this.queue.push({ task, resolve, reject }));
    this.pump(); return result;
  }
  pump() {
    while (this.active < this.concurrency && this.queue.length) {
      const next = this.queue.shift(); this.active++;
      Promise.resolve().then(next.task).then(next.resolve, next.reject).finally(() => { this.active--; this.pump(); });
    }
  }
  refresh(player, seasons) {
    if (this.jobs.has(player.id)) return;
    const now = Date.now();
    const needed = seasons.filter(season => {
      const cache = this.db.prepare('SELECT * FROM player_history_sync WHERE player_id=? AND season=?').get(player.id, String(season));
      const ttl = cache?.status === 'failed' ? 300_000 : season === this.currentSeason ? 600_000 : 86_400_000;
      return !cache || now - Date.parse(cache.fetched_at) >= ttl;
    });
    if (!needed.length) return;
    if (this.jobs.size >= 12) throw Object.assign(new Error('Fila de históricos ocupada. Tente novamente em instantes.'), { statusCode: 429 });
    const job = Promise.all(needed.map(season => this.enqueue(async () => {
      const url = `https://api.sleeper.com/stats/nfl/player/${encodeURIComponent(player.id)}?season_type=regular&season=${season}&grouping=week`;
      let status = 'failed', error = null;
      try {
        const payload = await this.connector.getPlayerSeasonStats(player.id, season);
        const rows = normalizeSeasonPayload(payload, player.id, season);
        const capturedAt = new Date().toISOString();
        const insert = this.db.prepare(`INSERT INTO player_stats (id,player_id,season,week,stats_json,source,captured_at)
          VALUES (?,?,?,?,?,'sleeper',?) ON CONFLICT(player_id,season,week,source)
          DO UPDATE SET stats_json=excluded.stats_json,captured_at=excluded.captured_at`);
        this.db.transaction(() => {
          for (const row of rows) insert.run(`history_${player.id}_${season}_${row.week}`, player.id, String(season), row.week, JSON.stringify(row.stats), capturedAt);
        })();
        status = rows.length ? 'available' : 'empty';
      } catch (failure) { error = failure.message; }
      this.db.prepare(`INSERT INTO player_history_sync (player_id,season,status,source_url,fetched_at,error) VALUES (?,?,?,?,?,?)
        ON CONFLICT(player_id,season) DO UPDATE SET status=excluded.status,source_url=excluded.source_url,fetched_at=excluded.fetched_at,error=excluded.error`)
        .run(player.id, String(season), status, url, new Date().toISOString(), error);
    }))).finally(() => this.jobs.delete(player.id));
    this.jobs.set(player.id, job);
    // Keep background failures observable without unhandled promise rejections.
    job.catch(error => console.error('[PlayerHistory]', error.message));
  }
  async wait(playerId) { await this.jobs.get(playerId); }
  getCareer(player, { league = null, season = this.currentSeason, sync = true } = {}) {
    const range = this.seasonRange(player);
    if (!range.seasons.includes(Number(season))) range.seasons.push(Number(season));
    range.seasons.sort((a, b) => b - a);
    if (sync) this.refresh(player, range.seasons);
    const caches = this.db.prepare('SELECT * FROM player_history_sync WHERE player_id=?').all(player.id);
    const bySeason = new Map();
    const seasons = range.seasons.map(year => {
      const stored = this.db.prepare("SELECT week,stats_json,captured_at FROM player_stats WHERE player_id=? AND season=? AND source='sleeper' ORDER BY week").all(player.id, String(year));
      const raw = new Map(stored.map(row => [row.week, { ...parseJson(row.stats_json, {}), capturedAt: row.captured_at }]));
      const rows = buildPlayerHistory(this.db, { playerId: player.id, season: year, league }).map(row => {
        const stats = raw.get(row.week) || {};
        const points = league ? row.fpts : numberOrNull(stats.pts_ppr);
        return { ...row, season: String(year), stats, team: stats.team ?? null, date: stats.game_date ?? null,
          fpts: points, points, pointsFormat: league ? 'LEAGUE' : 'PPR',
          source: { ...row.source, points: points === null ? null : league ? row.source.points : 'sleeper_preset_ppr' } };
      });
      bySeason.set(year, rows);
      const observed = rows.filter(row => row.source.points === 'sleeper_matchups' || Object.keys(row.stats).some(key => key !== 'capturedAt'));
      const scored = observed.filter(row => row.fpts !== null);
      const totalPoints = scored.length ? Number(scored.reduce((sum, row) => sum + row.fpts, 0).toFixed(2)) : null;
      const cache = caches.find(row => Number(row.season) === year);
      return { season: String(year), teams: [...new Set(observed.map(row => row.team).filter(Boolean))],
        observedWeeks: observed.length, scoredWeeks: scored.length, totalPoints,
        pointsCoverage: scored.length === observed.length && observed.length ? 'observed_weeks' : 'partial',
        pointsPerGame: totalPoints === null ? null : Number((totalPoints / scored.length).toFixed(2)),
        status: cache?.status || (observed.length ? 'cached' : 'pending'), fetchedAt: cache?.fetched_at ?? null,
        pointsUnavailableReason: totalPoints === null ? observed.find(row => row.pointsUnavailableReason)?.pointsUnavailableReason || 'stats_unavailable' : null,
        sourceUrl: cache?.source_url ?? null };
    });
    const syncing = this.jobs.has(player.id);
    return { playerId: player.id, name: player.canonical_name, selectedSeason: String(season), seasons,
      rows: bySeason.get(Number(season)) || [], scoringFormat: league ? 'LEAGUE' : 'PPR',
      scoringLabel: league ? 'Regras atuais da liga aplicadas ao histórico' : 'PPR padrão Sleeper',
      rangeSource: range.rangeSource, syncing,
      status: syncing ? 'syncing' : seasons.some(row => row.status === 'failed' || row.status === 'pending') ? 'partial' : 'ready',
      resolvedSeasons: seasons.filter(row => ['available', 'empty'].includes(row.status)).length,
      source: { provider: 'Sleeper', seasonType: 'regular', contract: 'observed_undocumented_endpoint' } };
  }
}

export const playerHistoryService = new PlayerHistoryService();
