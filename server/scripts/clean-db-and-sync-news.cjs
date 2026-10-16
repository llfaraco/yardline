const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const dbPath = path.resolve(__dirname, '../src/db/yardline.db');
const db = new DatabaseSync(dbPath);

console.log('--- Cleaning test mock data from yardline.db ---');

// 1. Remove fake news player links and fake news items
db.exec(`
  DELETE FROM news_player_links WHERE news_id IN (
    SELECT id FROM news_items WHERE title LIKE '%Roster Player%' OR title LIKE '%Canonical Test%'
  );
  DELETE FROM news_items WHERE title LIKE '%Roster Player%' OR title LIKE '%Canonical Test%';
  DELETE FROM players WHERE canonical_name LIKE '%Roster Player%' OR id LIKE 'roster_p%';
`);

console.log('Removed test mock news and test mock players.');

// 2. Read news from news-worker/data/nfl-news.json
const workerJsonPath = path.resolve(__dirname, '../../news-worker/data/nfl-news.json');
if (fs.existsSync(workerJsonPath)) {
  const raw = JSON.parse(fs.readFileSync(workerJsonPath, 'utf8'));
  const items = raw.items || [];
  console.log(`Found ${items.length} real news items in nfl-news.json`);

  const crypto = require('crypto');
  let inserted = 0;

  for (const item of items) {
    const canonicalUrl = item.sourceUrl || item.canonicalUrl;
    const title = item.title;
    if (!canonicalUrl || !title) continue;

    const normUrl = canonicalUrl.trim().split('#')[0].split('?')[0].replace(/\/+$/, '').toLowerCase();
    const normTitle = title.trim().toLowerCase();
    const hash = crypto.createHash('sha256').update(`${normUrl}::${normTitle}`).digest('hex');

    // Check if exists
    const exists = db.prepare('SELECT id FROM news_items WHERE content_hash = ?').get(hash);
    if (!exists) {
      const id = 'news_' + crypto.randomUUID();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO news_items (
          id, source, source_article_id, canonical_url, title, summary, author,
          published_at, ingested_at, image_url, category, status, content_hash
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        item.source || 'NFL.com',
        item.id || null,
        canonicalUrl,
        title,
        item.summary || '',
        item.author || 'NFL Editorial',
        item.publishedAt || item.fetchedAt || now,
        now,
        item.heroImg || item.imageUrl || null,
        item.section || 'general',
        'published',
        hash
      );

      // Auto detect mentioned players
      const textToSearch = (title + ' ' + (item.summary || '')).toLowerCase();
      const topPlayers = db.prepare(`
        SELECT id, canonical_name FROM players WHERE status = 'Active' AND length(canonical_name) > 4
      `).all();

      for (const p of topPlayers) {
        if (textToSearch.includes(p.canonical_name.toLowerCase())) {
          db.prepare(`
            INSERT OR IGNORE INTO news_player_links (id, news_id, player_id, relevance_score, linked_by)
            VALUES (?, ?, ?, ?, ?)
          `).run('npl_' + crypto.randomUUID(), id, p.id, 1, 'text_detect');
        }
      }
      inserted++;
    }
  }
  console.log(`Successfully ingested ${inserted} real articles into yardline.db`);
}

const count = db.prepare('SELECT count(*) as c FROM news_items').get();
console.log(`Total real news items now in database: ${count.c}`);
