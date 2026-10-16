const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('server/src/db/yardline.db');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables.map(t => t.name));

const news = db.prepare("SELECT id, title, source, canonical_url FROM news_items ORDER BY ingested_at DESC LIMIT 10").all();
console.log('News rows count:', news.length);
console.log('Sample news:', news.slice(0, 5));

const links = db.prepare("SELECT * FROM news_player_links LIMIT 10").all();
console.log('Sample links:', links);
