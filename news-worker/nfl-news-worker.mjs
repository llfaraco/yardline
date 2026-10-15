#!/usr/bin/env node
/**
 * YARDLINE — coletor oficial NFL.com/news
 *
 * Uso local:
 *   node news-worker/nfl-news-worker.mjs
 *
 * O processo mantém um pequeno servidor HTTP:
 *   GET /health
 *   GET /api/news
 *   GET /api/news?player=Brock%20Purdy
 *
 * Em produção, este processo deve rodar em um worker/backend persistente.
 */
import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';

const PORT = Number(process.env.NFL_NEWS_PORT || 8787);
const POLL_MS = Number(process.env.NFL_NEWS_POLL_MS || 5 * 60 * 1000);
const SOURCE_URL = 'https://www.nfl.com/news';
const currentDir = typeof fileURLToPath === 'function' ? dirname(fileURLToPath(import.meta.url)) : dirname(new URL(import.meta.url).pathname);
const DATA_DIR = process.env.NFL_NEWS_DATA_DIR || join(currentDir, 'data');
const STORE_FILE = join(DATA_DIR, 'nfl-news.json');
const MAX_ITEMS = 500;

mkdirSync(DATA_DIR, { recursive: true });

function loadStore() {
  if (!existsSync(STORE_FILE)) return { source: SOURCE_URL, updatedAt: null, items: [] };
  try { return JSON.parse(readFileSync(STORE_FILE, 'utf8')); }
  catch { return { source: SOURCE_URL, updatedAt: null, items: [] }; }
}

let store = loadStore();
let lastError = null;
let lastPollAt = null;
let polling = false;

function cleanText(value = '') {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function decodeHtml(value = '') {
  return value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function articleTitle(innerHtml) {
  const heading = innerHtml.match(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/i)?.[1];
  const paragraphs = [...innerHtml.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(m => cleanText(decodeHtml(m[1]))).filter(Boolean);
  let title = cleanText(decodeHtml(heading || paragraphs[0] || innerHtml));
  title = title.replace(/^(NEWS|ANALYSIS|VIDEO)\s+/i, '').replace(/\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4}$/i, '');
  return title;
}

function articleImage(innerHtml) {
  const src = innerHtml.match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i)?.[1];
  if (!src || src.startsWith('data:')) return '';
  return decodeHtml(src);
}

function absoluteUrl(href) {
  try { return new URL(href, SOURCE_URL).toString().split('#')[0]; }
  catch { return null; }
}

function parseArticles(html) {
  const found = new Map();
  // NFL.com renders article links server-side. Capture all article links and
  // let the canonical URL be the dedupe key. This avoids depending on CSS class names.
  const re = /<a\b[^>]*href=["']([^"']*\/news\/[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = re.exec(html))) {
    const url = absoluteUrl(decodeHtml(match[1]));
    const title = articleTitle(match[2]);
    if (!url || !title || title.length < 12 || /^(read more|watch|video)$/i.test(title)) continue;
    if (!found.has(url)) found.set(url, {
      id: Buffer.from(url).toString('base64url'),
      source: 'NFL.com',
      sourceUrl: url,
      title,
      summary: cleanText(decodeHtml([...match[2].matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(x => x[1])[1] || '')),
      heroImg: articleImage(match[2]),
      section: 'latest',
      publishedAt: null,
      fetchedAt: new Date().toISOString(),
      playerIds: [],
      teamCodes: []
    });
  }
  return [...found.values()];
}

function persist() {
  const tmp = `${STORE_FILE}.tmp`;
  writeFileSync(tmp, JSON.stringify(store, null, 2));
  renameSync(tmp, STORE_FILE);
}

async function poll() {
  if (polling) return;
  polling = true;
  lastPollAt = new Date().toISOString();
  try {
    const response = await fetch(SOURCE_URL, {
      headers: { 'user-agent': 'YARDLINE-NewsMonitor/1.0 (+official NFL.com links only)' }
    });
    if (!response.ok) throw new Error(`NFL.com respondeu HTTP ${response.status}`);
    const html = await response.text();
    // A página mistura headline stack, ALL NEWS e analysis. Os primeiros
    // itens são o bloco editorial mais recente; não importar o arquivo inteiro.
    const incoming = parseArticles(html).slice(0, 40);
    const byUrl = new Map([...(store.items || []), ...incoming].map(item => [item.sourceUrl, item]));
    store = {
      source: SOURCE_URL,
      updatedAt: new Date().toISOString(),
      items: [...byUrl.values()].sort((a, b) => String(b.fetchedAt).localeCompare(String(a.fetchedAt))).slice(0, MAX_ITEMS)
    };
    persist();
    lastError = null;
    console.log(`[NFL NEWS] ${incoming.length} links encontrados; ${store.items.length} itens armazenados`);
  } catch (error) {
    lastError = String(error?.message || error);
    console.error(`[NFL NEWS] ${lastError}`);
  } finally {
    polling = false;
  }
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': '*'
  });
  res.end(JSON.stringify(payload));
}

const server = createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  if (url.pathname === '/health') {
    return sendJson(res, 200, { ok: !lastError, source: SOURCE_URL, lastPollAt, updatedAt: store.updatedAt, items: store.items.length, error: lastError });
  }
  if (url.pathname === '/api/news') {
    const q = (url.searchParams.get('q') || '').toLowerCase();
    const player = (url.searchParams.get('player') || '').toLowerCase();
    const items = store.items.filter(item => !q && !player || `${item.title} ${item.summary}`.toLowerCase().includes(q || player));
    return sendJson(res, 200, { source: SOURCE_URL, updatedAt: store.updatedAt, items });
  }
  res.writeHead(404); res.end('Not found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[NFL NEWS] monitor ativo em http://0.0.0.0:${PORT}`);
  poll();
  setInterval(poll, POLL_MS);
});
