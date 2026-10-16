import crypto from 'node:crypto';
import fs from 'node:fs';
import { db } from '../../db/database.js';
import { DATA_STATUS, createDataStatusDTO } from '../../contracts/dtos.js';

let _cachedPlayers = null;

export function normalizeCanonicalUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  try {
    const parsed = new URL(rawUrl.trim());
    parsed.hash = '';
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'ref', 'fbclid', 'gclid', 'msclkid', 'mc_cid', 'mc_eid', '_ga'
    ];
    for (const p of trackingParams) {
      parsed.searchParams.delete(p);
    }
    parsed.searchParams.sort();
    let clean = parsed.toString();
    if (parsed.pathname.length > 1 && clean.endsWith('/')) {
      clean = clean.slice(0, -1);
    }
    return clean;
  } catch {
    return rawUrl.trim().split('#')[0].split('?')[0].replace(/\/+$/, '');
  }
}

export function normalizeTitle(title) {
  if (!title || typeof title !== 'string') return '';
  return title
    .replace(/<[^>]*>/g, ' ')
    .trim()
    .replace(/^(NEWS|ANALYSIS|VIDEO|BREAKING|REPORT|ROUNDUP):\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function generateContentHash(canonicalUrl, title) {
  const normUrl = normalizeCanonicalUrl(canonicalUrl).toLowerCase();
  const normTitle = normalizeTitle(title).toLowerCase();
  return crypto.createHash('sha256').update(`${normUrl}::${normTitle}`).digest('hex');
}

export function resolveCanonicalPlayerId(idOrName) {
  if (!idOrName) return null;
  const str = String(idOrName).trim();
  if (!str) return null;

  // 1. Direct ID match in players table
  const direct = db.prepare('SELECT id FROM players WHERE id = ?').get(str);
  if (direct) return String(direct.id);

  // 2. Lookup in player_identities table (provider_player_id)
  const identity = db.prepare('SELECT player_id FROM player_identities WHERE provider_player_id = ?').get(str);
  if (identity) return String(identity.player_id);

  // 3. Match by canonical_name (case-insensitive)
  if (str.length >= 3 && isNaN(Number(str))) {
    const byName = db.prepare('SELECT id FROM players WHERE lower(canonical_name) = lower(?) LIMIT 1').get(str);
    if (byName) return String(byName.id);
  }

  return null;
}

export function getAllPlayerIdentityIds(playerId) {
  if (!playerId) return [];
  const strId = String(playerId).trim();
  const canonicalId = resolveCanonicalPlayerId(strId) || strId;
  const ids = new Set([canonicalId, strId]);

  try {
    const rows = db.prepare('SELECT provider_player_id FROM player_identities WHERE player_id = ?').all(canonicalId);
    for (const r of rows) {
      if (r.provider_player_id) ids.add(String(r.provider_player_id));
    }

    const cross = db.prepare('SELECT player_id FROM player_identities WHERE provider_player_id = ?').get(strId);
    if (cross && cross.player_id) {
      ids.add(String(cross.player_id));
      const sisterRows = db.prepare('SELECT provider_player_id FROM player_identities WHERE player_id = ?').all(cross.player_id);
      for (const r of sisterRows) {
        if (r.provider_player_id) ids.add(String(r.provider_player_id));
      }
    }
  } catch {}

  return [...ids];
}

export function detectPlayersInText(text) {
  if (!text || typeof text !== 'string') return [];
  const clean = text.toLowerCase();
  const detected = [];

  if (!_cachedPlayers) {
    try {
      _cachedPlayers = db.prepare(`
        SELECT id, canonical_name FROM players 
        WHERE length(canonical_name) > 4 AND canonical_name IS NOT NULL AND team IS NOT NULL
      `).all();
    } catch {
      _cachedPlayers = [];
    }
  }

  for (const p of _cachedPlayers) {
    const nameLower = p.canonical_name.toLowerCase();
    const regex = new RegExp(`\\b${nameLower.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}\\b`, 'i');
    if (regex.test(clean)) {
      detected.push(String(p.id));
    }
  }
  return detected;
}

export const newsService = {
  // Ingerir e normalizar notícia com garantia de fonte e deduplicação
  ingestNewsItem({
    source,
    sourceArticleId = null,
    canonicalUrl,
    title,
    summary = '',
    author = null,
    publishedAt = null,
    imageUrl = null,
    category = 'general',
    playerIds = [],
    autoDetectPlayers = true
  }) {
    if (!source || typeof source !== 'string' || !source.trim()) {
      throw new Error('Notícia inválida: fonte (source) é obrigatória.');
    }
    if (!canonicalUrl || typeof canonicalUrl !== 'string' || !canonicalUrl.trim()) {
      throw new Error('Notícia inválida: URL canônica (canonicalUrl) é obrigatória.');
    }
    if (!title || typeof title !== 'string' || !title.trim()) {
      throw new Error('Notícia inválida: título (title) é obrigatório.');
    }

    const normUrl = normalizeCanonicalUrl(canonicalUrl);
    const normTitle = normalizeTitle(title);
    const contentHash = generateContentHash(normUrl, normTitle);

    // Deduplicação estrita por content_hash ou canonical_url normalizada
    const existing = db.prepare('SELECT id, canonical_url, title FROM news_items WHERE content_hash = ? OR canonical_url = ?').get(contentHash, normUrl);
    if (existing) {
      return { id: existing.id, isDuplicate: true };
    }

    const newsId = 'news_' + crypto.randomUUID();
    const now = new Date().toISOString();
    let pubDate = now;
    if (publishedAt) {
      try { pubDate = new Date(publishedAt).toISOString(); } catch { pubDate = now; }
    }

    db.prepare(`
      INSERT INTO news_items (
        id, source, source_article_id, canonical_url, title, summary, 
        author, published_at, ingested_at, image_url, category, status, content_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?)
    `).run(
      newsId,
      source.trim(),
      sourceArticleId || null,
      normUrl,
      normTitle,
      summary ? summary.trim() : '',
      author ? author.trim() : null,
      pubDate,
      now,
      imageUrl ? imageUrl.trim() : null,
      category || 'general',
      contentHash
    );

    // Vincular aos atletas mencionados
    const targetPlayerIds = new Set();

    if (Array.isArray(playerIds) && playerIds.length > 0) {
      for (const pid of playerIds) {
        const canonical = resolveCanonicalPlayerId(pid);
        if (canonical) targetPlayerIds.add(canonical);
      }
    }

    if (autoDetectPlayers) {
      const fullText = `${normTitle} ${summary || ''}`;
      const detected = detectPlayersInText(fullText);
      for (const cid of detected) {
        targetPlayerIds.add(cid);
      }
    }

    const insertLink = db.prepare(`
      INSERT OR IGNORE INTO news_player_links (id, news_id, player_id, relevance_score, linked_by)
      VALUES (?, ?, ?, 1.0, 'canonical_tag')
    `);

    for (const pid of targetPlayerIds) {
      insertLink.run('npl_' + crypto.randomUUID(), newsId, pid);
    }

    return {
      id: newsId,
      isDuplicate: false,
      linkedPlayersCount: targetPlayerIds.size,
      linkedPlayerIds: [...targetPlayerIds]
    };
  },

  // Obter feed de notícias com paginação, filtros e metadados de atletas
  getNewsFeed({
    category = null,
    source = null,
    playerId = null,
    rosterPlayerIds = null,
    limit = 20,
    offset = 0,
    includeAthletes = true
  } = {}) {
    let sql = "SELECT DISTINCT n.* FROM news_items n";
    const conditions = ["n.status = 'published'"];
    const params = [];

    if (playerId) {
      const allIds = getAllPlayerIdentityIds(playerId);
      if (allIds.length > 0) {
        const placeholders = allIds.map(() => '?').join(',');
        sql += ` JOIN news_player_links l ON n.id = l.news_id AND l.player_id IN (${placeholders})`;
        params.push(...allIds);
      }
    } else if (Array.isArray(rosterPlayerIds) && rosterPlayerIds.length > 0) {
      const resolvedIds = new Set();
      for (const rid of rosterPlayerIds) {
        getAllPlayerIdentityIds(rid).forEach(id => resolvedIds.add(id));
      }
      const allIds = [...resolvedIds];
      if (allIds.length > 0) {
        const placeholders = allIds.map(() => '?').join(',');
        sql += ` JOIN news_player_links l ON n.id = l.news_id AND l.player_id IN (${placeholders})`;
        params.push(...allIds);
      }
    }

    if (category && category !== 'ALL') {
      conditions.push('n.category = ?');
      params.push(category);
    }

    if (source && source !== 'ALL') {
      conditions.push('n.source = ?');
      params.push(source);
    }

    sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY n.published_at DESC LIMIT ? OFFSET ?';
    params.push(Math.min(limit, 100), Math.max(0, offset));

    const rows = db.prepare(sql).all(...params);

    if (!includeAthletes) {
      return rows;
    }

    const getLinksStmt = db.prepare(`
      SELECT p.id, p.canonical_name AS name, p.position, p.team, p.photo_url AS photoUrl, p.status AS injuryStatus,
             (SELECT provider_player_id FROM player_identities WHERE player_id = p.id AND provider = 'sleeper' LIMIT 1) AS sleeperId,
             (SELECT provider_player_id FROM player_identities WHERE player_id = p.id AND provider = 'espn' LIMIT 1) AS espnId
      FROM news_player_links l
      JOIN players p ON l.player_id = p.id
      WHERE l.news_id = ?
    `);

    return rows.map(item => {
      const linkedPlayers = getLinksStmt.all(item.id);
      return {
        ...item,
        linkedPlayers: linkedPlayers.map(p => ({
          id: p.id,
          name: p.name,
          position: p.position,
          team: p.team,
          photoUrl: p.photoUrl,
          injuryStatus: p.injuryStatus,
          sleeperId: p.sleeperId || (p.id.length <= 6 ? p.id : null),
          espnId: p.espnId || null
        })),
        provenance: createDataStatusDTO({
          status: DATA_STATUS.OFFICIAL,
          source: item.source,
          syncedAt: item.ingested_at
        })
      };
    });
  },

  // Obter notícias vinculadas a um jogador canônico
  getPlayerNews(playerId, limit = 10) {
    if (!playerId) return [];
    const allIds = getAllPlayerIdentityIds(playerId);
    if (allIds.length === 0) return [];

    const placeholders = allIds.map(() => '?').join(',');
    const sql = `
      SELECT DISTINCT n.*, l.relevance_score
      FROM news_items n
      JOIN news_player_links l ON n.id = l.news_id
      WHERE l.player_id IN (${placeholders}) AND n.status = 'published'
      ORDER BY n.published_at DESC
      LIMIT ?
    `;

    const rows = db.prepare(sql).all(...allIds, limit);

    const getLinksStmt = db.prepare(`
      SELECT p.id, p.canonical_name AS name, p.position, p.team, p.photo_url AS photoUrl, p.status AS injuryStatus,
             (SELECT provider_player_id FROM player_identities WHERE player_id = p.id AND provider = 'sleeper' LIMIT 1) AS sleeperId,
             (SELECT provider_player_id FROM player_identities WHERE player_id = p.id AND provider = 'espn' LIMIT 1) AS espnId
      FROM news_player_links l
      JOIN players p ON l.player_id = p.id
      WHERE l.news_id = ?
    `);

    return rows.map(item => ({
      ...item,
      linkedPlayers: getLinksStmt.all(item.id),
      provenance: createDataStatusDTO({
        status: DATA_STATUS.OFFICIAL,
        source: item.source,
        syncedAt: item.ingested_at
      })
    }));
  },

  // Sincronizar notícias coletadas pelo worker local (nfl-news.json)
  syncFromWorkerFile(filePath) {
    if (!fs.existsSync(filePath)) {
      return { total: 0, ingested: 0, duplicates: 0, error: 'Arquivo do worker não encontrado.' };
    }
    try {
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const items = raw.items || [];
      let ingested = 0;
      let duplicates = 0;

      for (const item of items) {
        try {
          const res = this.ingestNewsItem({
            source: item.source || 'NFL.com',
            sourceArticleId: item.id || null,
            canonicalUrl: item.sourceUrl || item.canonicalUrl,
            title: item.title,
            summary: item.summary || '',
            author: item.author || 'NFL Editorial',
            publishedAt: item.publishedAt || item.fetchedAt,
            imageUrl: item.heroImg || item.imageUrl,
            category: item.section || 'latest',
            playerIds: item.playerIds || [],
            autoDetectPlayers: true
          });
          if (res.isDuplicate) duplicates++;
          else ingested++;
        } catch {
          // Ignorar se faltar campo obrigatório
        }
      }
      return { total: items.length, ingested, duplicates };
    } catch (err) {
      return { total: 0, ingested: 0, duplicates: 0, error: err.message };
    }
  }
};
