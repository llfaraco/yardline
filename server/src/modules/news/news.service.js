import crypto from 'node:crypto';
import { db } from '../../db/database.js';

export const newsService = {
  // Ingerir e normalizar notícia com garantia de fonte e deduplicação
  ingestNewsItem({ source, sourceArticleId, canonicalUrl, title, summary, author, publishedAt, imageUrl, category = 'general', playerIds = [] }) {
    if (!source || !canonicalUrl || !title) {
      throw new Error('Notícia inválida: fonte, URL canônica e título são obrigatórios.');
    }

    const contentHash = crypto.createHash('sha256').update(canonicalUrl + title).digest('hex');
    const existing = db.prepare('SELECT id FROM news_items WHERE content_hash = ?').get(contentHash);
    
    if (existing) {
      return { id: existing.id, isDuplicate: true };
    }

    const newsId = 'news_' + crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO news_items (id, source, source_article_id, canonical_url, title, summary, author, published_at, ingested_at, image_url, category, status, content_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?)
    `).run(
      newsId,
      source,
      sourceArticleId || null,
      canonicalUrl,
      title,
      summary || '',
      author || null,
      publishedAt || now,
      now,
      imageUrl || null,
      category,
      contentHash
    );

    // Vincular aos atletas mencionados (validando existência no catálogo)
    if (Array.isArray(playerIds) && playerIds.length > 0) {
      const checkPlayer = db.prepare('SELECT id FROM players WHERE id = ?');
      const insertLink = db.prepare(`
        INSERT INTO news_player_links (id, news_id, player_id, relevance_score, linked_by)
        VALUES (?, ?, ?, 1.0, 'ingest_tag')
      `);
      for (const pid of playerIds) {
        if (checkPlayer.get(String(pid))) {
          insertLink.run('npl_' + crypto.randomUUID(), newsId, String(pid));
        }
      }
    }

    return { id: newsId, isDuplicate: false };
  },

  // Obter feed de notícias com paginação e filtros reais
  getNewsFeed({ category, limit = 20, offset = 0 } = {}) {
    let sql = "SELECT * FROM news_items WHERE status = 'published'";
    const params = [];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    sql += ' ORDER BY published_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return db.prepare(sql).all(...params);
  },

  // Obter notícias vinculadas a um jogador canônico
  getPlayerNews(playerId, limit = 10) {
    return db.prepare(`
      SELECT n.*, l.relevance_score
      FROM news_items n
      JOIN news_player_links l ON n.id = l.news_id
      WHERE l.player_id = ? AND n.status = 'published'
      ORDER BY n.published_at DESC LIMIT ?
    `).all(String(playerId), limit);
  }
};
