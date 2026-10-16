import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../src/db/database.js';
import {
  newsService,
  normalizeCanonicalUrl,
  normalizeTitle,
  generateContentHash,
  resolveCanonicalPlayerId,
  getAllPlayerIdentityIds
} from '../src/modules/news/news.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('News & Deduplicação — Normalização de URL Canônica e Hashing', () => {
  const url1 = 'https://www.nfl.com/news/josh-allen-dominant-week-6?utm_source=twitter&utm_medium=social#comments';
  const url2 = 'https://www.nfl.com/news/josh-allen-dominant-week-6/';
  
  const norm1 = normalizeCanonicalUrl(url1);
  const norm2 = normalizeCanonicalUrl(url2);

  assert.equal(norm1, 'https://www.nfl.com/news/josh-allen-dominant-week-6');
  assert.equal(norm2, 'https://www.nfl.com/news/josh-allen-dominant-week-6');
  assert.equal(norm1, norm2);

  const title1 = '  ROUNDUP: Josh Allen comanda vitória espetacular   dos Bills  ';
  const title2 = 'Josh Allen comanda vitória espetacular dos Bills';

  const normTitle1 = normalizeTitle(title1);
  const normTitle2 = normalizeTitle(title2);

  assert.equal(normTitle1, normTitle2);

  const hash1 = generateContentHash(url1, title1);
  const hash2 = generateContentHash(url2, title2);
  assert.equal(hash1, hash2);
});

test('News & Deduplicação — Rejeição de Dados Incompletos (Zero Mock Rule)', () => {
  assert.throws(() => {
    newsService.ingestNewsItem({ source: '', canonicalUrl: 'https://nfl.com', title: 'Teste' });
  }, /fonte \(source\) é obrigatória/);

  assert.throws(() => {
    newsService.ingestNewsItem({ source: 'NFL.com', canonicalUrl: '', title: 'Teste' });
  }, /URL canônica \(canonicalUrl\) é obrigatória/);

  assert.throws(() => {
    newsService.ingestNewsItem({ source: 'NFL.com', canonicalUrl: 'https://nfl.com/noticia', title: '' });
  }, /título \(title\) é obrigatório/);
});

test('News & Deduplicação — Ingestão Idempotente e Deduplicação Canônica', () => {
  const uniqueUrl = `https://www.nfl.com/news/ceedee-lamb-breakout-${Date.now()}`;
  const title = 'CeeDee Lamb estabelece novo recorde de jardas recebidas';

  // 1ª Ingestão
  const res1 = newsService.ingestNewsItem({
    source: 'NFL.com',
    canonicalUrl: `${uniqueUrl}?utm_campaign=daily_recap`,
    title: `BREAKING: ${title}`,
    summary: 'Atuação história no AT&T Stadium',
    author: 'Jane Doe',
    publishedAt: new Date().toISOString()
  });

  assert.equal(res1.isDuplicate, false);
  assert.ok(res1.id);

  // 2ª Ingestão (com URL com trailing slash e sem tracking params)
  const res2 = newsService.ingestNewsItem({
    source: 'NFL.com',
    canonicalUrl: `${uniqueUrl}/`,
    title,
    summary: 'Atuação história no AT&T Stadium'
  });

  assert.equal(res2.isDuplicate, true);
  assert.equal(res2.id, res1.id);
});

test('News & Deduplicação — Resolução de Identidade e Crosswalk de Atletas', () => {
  // Garantir jogador e identidades no banco para o teste
  const testPlayerId = 'canon_test_4984';
  const sleeperId = 'slp_test_4984';
  const espnId = 'espn_test_3918298';

  db.prepare(`
    INSERT OR REPLACE INTO players (id, canonical_name, position, team, created_at, updated_at)
    VALUES (?, 'Josh Allen Canonical Test', 'QB', 'BUF', datetime('now'), datetime('now'))
  `).run(testPlayerId);

  db.prepare(`
    INSERT OR REPLACE INTO player_identities (id, player_id, provider, provider_player_id, raw_name, valid_from)
    VALUES (?, ?, 'sleeper', ?, 'Josh Allen', datetime('now'))
  `).run('ident_slp_' + testPlayerId, testPlayerId, sleeperId);

  db.prepare(`
    INSERT OR REPLACE INTO player_identities (id, player_id, provider, provider_player_id, raw_name, valid_from)
    VALUES (?, ?, 'espn', ?, 'Josh Allen', datetime('now'))
  `).run('ident_espn_' + testPlayerId, testPlayerId, espnId);

  // Testar resolução de IDs
  assert.equal(resolveCanonicalPlayerId(testPlayerId), testPlayerId);
  assert.equal(resolveCanonicalPlayerId(sleeperId), testPlayerId);
  assert.equal(resolveCanonicalPlayerId(espnId), testPlayerId);

  const allIdentities = getAllPlayerIdentityIds(sleeperId);
  assert.ok(allIdentities.includes(testPlayerId));
  assert.ok(allIdentities.includes(sleeperId));
  assert.ok(allIdentities.includes(espnId));

  // Ingerir notícia vinculada ao Sleeper ID
  const testUrl = `https://www.nfl.com/news/josh-allen-heroic-drive-${Date.now()}`;
  const newsRes = newsService.ingestNewsItem({
    source: 'NFL.com',
    canonicalUrl: testUrl,
    title: 'Josh Allen Canonical Test lidera campanha final com passe para touchdown',
    summary: 'Drive impecável de 80 jardas com 45 segundos restantes.',
    playerIds: [sleeperId]
  });

  assert.equal(newsRes.isDuplicate, false);

  // Consulta por ESPN ID deve encontrar a notícia graças ao crosswalk
  const newsByEspn = newsService.getPlayerNews(espnId);
  assert.ok(newsByEspn.length > 0);
  assert.equal(newsByEspn[0].canonical_url, testUrl);
  assert.ok(newsByEspn[0].provenance);
  assert.equal(newsByEspn[0].provenance.status, 'official');
});

test('News & Deduplicação — Filtros de Roster (Meu Time, Waivers, Adversário)', () => {
  const pid1 = 'roster_p1_' + Date.now();
  const pid2 = 'roster_p2_' + Date.now();

  db.prepare(`
    INSERT OR REPLACE INTO players (id, canonical_name, position, team, created_at, updated_at)
    VALUES (?, 'Roster Player One', 'WR', 'KC', datetime('now'), datetime('now')),
           (?, 'Roster Player Two', 'RB', 'SF', datetime('now'), datetime('now'))
  `).run(pid1, pid2);

  const url1 = `https://www.nfl.com/news/player1-story-${Date.now()}`;
  const url2 = `https://www.nfl.com/news/player2-story-${Date.now()}`;

  newsService.ingestNewsItem({
    source: 'NFL Official',
    canonicalUrl: url1,
    title: 'Roster Player One ultrapassa 100 jardas em Kansas City',
    summary: 'Desempenho explosivo',
    playerIds: [pid1]
  });

  newsService.ingestNewsItem({
    source: 'Yahoo Sports',
    canonicalUrl: url2,
    title: 'Roster Player Two confirmado como titular dos 49ers',
    summary: 'Volume de corridas garantido',
    playerIds: [pid2]
  });

  // Filtro por elenco que contém apenas pid1
  const feedMine = newsService.getNewsFeed({ rosterPlayerIds: [pid1] });
  assert.ok(feedMine.some(n => n.canonical_url === url1));
  assert.ok(!feedMine.some(n => n.canonical_url === url2));

  // Cada notícia retornada possui linkedPlayers estruturados
  const item = feedMine.find(n => n.canonical_url === url1);
  assert.ok(Array.isArray(item.linkedPlayers));
  assert.ok(item.linkedPlayers.some(p => p.id === pid1 && p.name === 'Roster Player One'));
});

test('News & Deduplicação — Sincronização do Worker Local (nfl-news.json)', () => {
  const workerJsonPath = path.resolve(__dirname, '../../news-worker/data/nfl-news.json');
  const syncResult = newsService.syncFromWorkerFile(workerJsonPath);
  assert.ok(syncResult.total >= 0);
  assert.ok(typeof syncResult.ingested === 'number');
  assert.ok(typeof syncResult.duplicates === 'number');
});
