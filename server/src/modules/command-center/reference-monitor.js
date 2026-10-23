import { compareLeagueSnapshot } from './league-parity.js';
import crypto from 'node:crypto';
import { JSDOM } from 'jsdom';
import { isoNow } from './orchestration-store.js';

export function validateReferenceURL(value, config) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') || !config.allowedReferenceHosts.includes(url.hostname)) throw new Error('Reference URL outside HTTPS public allowlist');
  return url;
}
async function boundedText(response, maxBytes) {
  const reader = response.body?.getReader();
  if (!reader) return '';
  const chunks = []; let bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      bytes += value.length;
      if (bytes > maxBytes) throw new Error(`Reference response exceeds ${maxBytes} bytes`);
      chunks.push(Buffer.from(value));
    }
  } finally { await reader.cancel().catch(() => {}); }
  return Buffer.concat(chunks).toString('utf8');
}
export async function observeReference(target, config, { fetchImpl = fetch, variables = {}, now = Date.now } = {}) {
  const start = now();
  const check = { id: target.id, agentId: target.agentId, url: target.url, method: 'GET', checkedAt: isoNow(), status: 'NOT_VERIFIABLE', observationType: 'NOT_VERIFIABLE', httpStatus: null, latencyMs: null, error: null, freshness: { fetchedAt: null, publishedAt: null, lastModified: null, ageMinutes: null, status: 'UNKNOWN' }, evidence: null, limitations: 'Polling read-only público; HTML/HTTP não verifica login, fluxos privados, interação ou viewport mobile.' };
  if (!target.url) {
    check.error = 'Não há endpoint público documentado de stats gerais na documentação Sleeper; não inventar rota privada. Pontos de matchups são verificados separadamente.';
    check.evidence = { source: 'https://docs.sleeper.com/', reason: check.error }; return { check, data: null };
  }
  let response;
  try {
    check.url = target.url.replace(/\{(\w+)\}/g, (_, key) => {
      if (!/^\d+$/.test(String(variables[key] || ''))) throw new Error(`Dependency ${key} unavailable; do not infer week/league/draft`);
      return variables[key];
    });
    let url = validateReferenceURL(check.url, config);
    for (let redirects = 0; redirects <= 3; redirects++) {
      response = await fetchImpl(url.href, { method: 'GET', redirect: 'manual', headers: { Accept: target.kind === 'json' ? 'application/json' : 'text/html', 'User-Agent': 'Yardline-ReadOnly-Reference-Monitor/1.0' }, signal: AbortSignal.timeout(config.referenceTimeoutMs || 10000) });
      if (![301, 302, 303, 307, 308].includes(response.status)) break;
      await response.body?.cancel();
      if (redirects === 3) throw new Error('Redirect limit exceeded');
      url = validateReferenceURL(new URL(response.headers.get('location'), url).href, config);
    }
    check.finalUrl = url.href; check.httpStatus = response.status;
    if (!response.ok) {
      await response.body?.cancel();
      check.status = response.status >= 500 ? 'FAIL' : 'NOT_VERIFIABLE';
      check.observationType = 'OBSERVED';
      check.error = `HTTP ${response.status}; conteúdo/fluxo público não verificável (sem bypass/login)`;
      return { check, data: null };
    }
    const body = await boundedText(response, target.id === 'sleeper.players' ? 40 * 1024 * 1024 : 4 * 1024 * 1024);
    const digest = crypto.createHash('sha256').update(body).digest('hex');
    const fetchedAt = isoNow();
    const lastModified = response.headers.get('last-modified');
    check.freshness = { fetchedAt, publishedAt: null, lastModified, ageMinutes: null, status: 'FETCHED_NOW_PUBLICATION_UNKNOWN', httpDate: response.headers.get('date') };
    if (target.kind === 'json') {
      const data = JSON.parse(body);
      const arrayKinds = ['rosters', 'matchups', 'transactions', 'drafts', 'picks'];
      const count = Array.isArray(data) ? data.length : data && typeof data === 'object' ? Object.keys(data).length : 0;
      let invalid = !data || typeof data !== 'object' || (!count && target.emptyPolicy === 'fail');
      if (arrayKinds.includes(target.expected) && !Array.isArray(data)) invalid = true;
      if (target.expected === 'league' && String(data?.league_id) !== String(variables.leagueId)) invalid = true;
      if (target.expected === 'players' && (Array.isArray(data) || !Object.values(data || {}).every(p => p && typeof p === 'object' && p.player_id))) invalid = true;
      if (target.expected === 'rosters' && !data.every?.(r => r.roster_id && Array.isArray(r.players) && Array.isArray(r.starters))) invalid = true;
      if (target.expected === 'state' && !Number.isInteger(data?.week)) invalid = true;
      check.evidence = { sha256: digest, bytes: Buffer.byteLength(body), recordCount: count, emptyCatalog: !count, emptyPolicy: target.emptyPolicy, integrity: invalid ? 'FAIL' : 'PASS', scope: 'Public API response only; no fabricated values or local parity claim' };
      check.status = invalid ? 'FAIL' : 'PASS'; check.observationType = 'OBSERVED';
      if (invalid) check.error = count ? 'JSON schema/integrity mismatch' : 'Required catálogo vazio: não confundir com transport failure';
      return { check, data: invalid ? null : data };
    }
    // Parse inert HTML only: never run reference scripts or retrieve assets.
    const dom = new JSDOM(body, { url: url.href });
    try {
      const doc = dom.window.document;
      const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute('href');
      const times = [...doc.querySelectorAll('time[datetime], meta[property="article:published_time"], meta[property="article:modified_time"]')].map(e => e.getAttribute('datetime') || e.getAttribute('content')).filter(t => Number.isFinite(Date.parse(t)));
      const publishedAt = times.sort((a, b) => Date.parse(b) - Date.parse(a))[0] || null;
      check.freshness.publishedAt = publishedAt;
      check.freshness.ageMinutes = publishedAt ? Math.round((now() - Date.parse(publishedAt)) / 60000) : null;
      check.freshness.status = publishedAt ? (check.freshness.ageMinutes < 0 ? 'CLOCK_SKEW' : check.freshness.ageMinutes > 1440 ? 'OLD_PUBLIC_TIMESTAMP' : 'PUBLIC_TIMESTAMP_OBSERVED') : 'PUBLICATION_NOT_VERIFIABLE';
      const links = [...doc.querySelectorAll('a[href]')].map(a => ({ title: a.textContent.trim().replace(/\s+/g, ' ').slice(0, 160), url: new URL(a.getAttribute('href'), url).href })).filter(a => a.title.length > 25 && /^https?:/.test(a.url) && /\/(news\/[^/]|article|20\d\d\/|[^/]+\.html)/i.test(a.url)).slice(0, 60);
      const keys = links.map(a => a.url.split('?')[0]);
      const text = doc.body?.textContent || '';
      const challenge = /verify you are human|captcha|access denied|just a moment|enable javascript and cookies/i.test(doc.title + ' ' + text.slice(0, 1500));
      const tables = doc.querySelectorAll('table').length;
      let useful = text.trim().length > 200;
      if (/fantasypros\.(rankings|projections)/.test(target.id)) useful &&= tables > 0;
      if (['yahoo.news', 'nfl.news'].includes(target.id)) useful &&= links.length > 0;
      check.evidence = { sha256: digest, bytes: Buffer.byteLength(body), title: doc.title, canonicalUrl: canonical ? new URL(canonical, url).href : null, tables, formControls: doc.querySelectorAll('input,select,button').length, visibleArticleLinks: links.slice(0, 12), duplicateCanonicalLinks: keys.length - new Set(keys).size, imagesDeclared: doc.querySelectorAll('img').length, mediaVerification: 'NOT_VERIFIABLE: assets not fetched; no full visual parity claim', interactiveUX: 'NOT_VERIFIABLE: no reference scripts/login executed', scope: 'Public inert HTML metadata, not licensed ranking ingestion' };
      check.status = challenge || !useful ? 'NOT_VERIFIABLE' : 'PASS';
      check.observationType = challenge || !useful ? 'NOT_VERIFIABLE' : 'OBSERVED';
      if (challenge || !useful) check.error = challenge ? 'Public route gated/anti-bot; no bypass' : 'HTML estático não expõe conteúdo suficiente; requer viewport/rendering ou rota pública verificável';
      return { check, data: null };
    } finally { dom.window.close(); }
  } catch (error) {
    check.error = error.message;
    check.status = response?.ok ? 'FAIL' : 'NOT_VERIFIABLE';
    check.observationType = response?.ok ? 'OBSERVED' : 'NOT_VERIFIABLE';
    return { check, data: null };
  } finally {
    check.latencyMs = Math.max(0, now() - start);
    check.evidence ||= { reason: check.error, httpStatus: check.httpStatus, url: check.url };
  }
}

export async function runReferenceChecks(config, { fetchImpl, previousReport } = {}) {
  const results = []; const data = {};
  const variables = { leagueId: config.leagueId };
  const observe = async target => {
    const old = previousReport?.referenceChecks?.find(r => r.id === target.id);
    if (target.cadenceMinutes > config.cadenceMinutes && old?.status === 'PASS' && Date.now() - Date.parse(old.checkedAt) < target.cadenceMinutes * 60000) {
      results.push({ ...old, reused: true, observationType: 'INFERRED', freshness: { ...old.freshness, status: 'CACHED_WITHIN_DECLARED_CADENCE' }, limitations: 'Não foi GET neste ciclo; catálogo Sleeper limitado a uma coleta diária conforme docs.' }); return;
    }
    const observed = await observeReference(target, config, { fetchImpl, variables });
    results.push(observed.check); data[target.id] = observed.data;
    if (target.id === 'sleeper.league') {
      const state = data['sleeper.state'];
      variables.week = String(state?.season) === String(observed.data?.season) ? Number(state?.week) || null : Number(observed.data?.settings?.leg) || null;
    }
    if (target.id === 'sleeper.drafts') variables.draftId = observed.data?.[0]?.draft_id || null;
  };
  // Dependency order prevents guessing league week/draft ID from current NFL state.
  for (const id of ['sleeper.state', 'sleeper.league', 'sleeper.drafts']) await observe(config.referenceTargets.find(t => t.id === id));
  const queue = config.referenceTargets.filter(t => !['sleeper.state', 'sleeper.league', 'sleeper.drafts'].includes(t.id));
  await Promise.all(Array.from({ length: Math.min(config.referenceConcurrency, queue.length) }, async () => { while (queue.length) await observe(queue.shift()); }));
  if (process.env.API_URL) {
    const check = {id:'sleeper.local-parity',agentId:'agent_sleeper_ref',checkedAt:isoNow(),status:'NOT_VERIFIABLE',observationType:'NOT_VERIFIABLE',limitations:'Comparação pontual de dados públicos; não valida aparência, interação ou latência zero.'};
    try {
      const base = new URL(process.env.API_URL);
      if (!['http:','https:'].includes(base.protocol) || !['localhost','127.0.0.1','[::1]'].includes(base.hostname) || base.username || base.password) throw new Error('Parity requires explicit loopback API_URL');
      if (!variables.week) throw new Error('Semana pública indisponível');
      const url = new URL('/api/leagues/' + encodeURIComponent(config.leagueId) + '/shell?week=' + variables.week,base);
      const response = await (fetchImpl || fetch)(url,{method:'GET',redirect:'error',signal:AbortSignal.timeout(10000)});
      if (!response.ok) throw new Error('Local snapshot HTTP ' + response.status);
      const snapshot = JSON.parse(await boundedText(response,40*1024*1024));
      Object.assign(check,compareLeagueSnapshot(snapshot,data));
      check.evidence = {week:variables.week,season:snapshot.league?.season,syncedAt:snapshot.syncedAt,issues:check.issues,unavailable:check.unavailable};
      check.observationType='OBSERVED';
    } catch(error) {check.error=error.message;}
    results.push(check);
  }
  return { checks: results, data, editorialComparison: { observationType: 'INFERRED', comparedSources: ['NFL', 'Yahoo'], sharedCanonicalUrls: results.filter(r => ['nfl.news', 'yahoo.news'].includes(r.id)).flatMap(r => r.evidence?.visibleArticleLinks || []).map(a => a.url), limitation: 'URLs/títulos públicos são pistas de cobertura, não equivalência editorial nem deduplicação semântica confirmada; revisão Team Leader/News exigida.' } };
}
