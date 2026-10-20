import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import jsdom from 'jsdom';
import { REPO_ROOT, isoNow } from './orchestration-store.js';

const { JSDOM, VirtualConsole, requestInterceptor } = jsdom;

export function localURL(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || url.username || url.password) throw new Error('Local QA requires a loopback URL; never POST to external references');
  return url;
}
function result(id, title, status, observed, evidence, extras = {}) {
  return { id, title, area: 'Local QA', priority: 'P1', severity: 'P1', status, observedResult: observed, expectedResult: 'Comportamento real verificável sem dados inventados', evidence, steps: [title], viewport: 'JSDOM — sem layout/viewport real', authState: 'Sem login; dados públicos locais', testedAt: isoNow(), sourceAgent: 'agent_qa_senior', ...extras };
}
export async function runUnitQA(logFile, timeoutMs = 120000) {
  fs.mkdirSync(path.dirname(logFile), { recursive: true, mode: 0o700 });
  return new Promise(resolve => {
    const output = fs.openSync(logFile, 'w', 0o600);
    const command = process.execPath;
    const child = spawn(command, ['scripts/test.js'], { cwd: path.join(REPO_ROOT, 'server'), env: { ...process.env, DATABASE_PATH: ':memory:', MONITOR_CHILD: '1' }, stdio: ['ignore', output, output], shell: false });
    let timedOut = false; let settled = false;
    const finish = (status, observed, evidence) => { if (settled) return; settled = true; clearTimeout(timer); fs.closeSync(output); resolve(result('qa.unit', 'npm test — regressões reais em SQLite isolado', status, observed, evidence, { viewport: 'Node test runner (não E2E visual)', priority: 'P0', severity: 'P0', command: 'DATABASE_PATH=:memory: npm test', affectedFiles: ['server/test', 'server/src'] })); };
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGTERM'); setTimeout(() => child.kill('SIGKILL'), 2000).unref(); }, timeoutMs);
    child.on('error', error => finish('BLOCKED', error.message, { command: 'npm test', logFile, error: error.message }));
    child.on('close', (code, signal) => finish(timedOut ? 'BLOCKED' : code === 0 ? 'PASS' : 'FAIL', timedOut ? 'Test suite exceeded time budget' : `exitCode=${code}; signal=${signal || 'none'}`, { command: 'npm test', logFile, exitCode: code, signal, timedOut, tail: fs.readFileSync(logFile, 'utf8').slice(-4000), fixturePolicy: 'Unit fixtures only, never official production data' }));
  });
}
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(predicate, timeoutMs, intervalMs = 100) {
  const deadline = Date.now() + timeoutMs;
  while (true) {
    const value = predicate(); if (value) return value;
    const remaining = deadline - Date.now(); if (remaining <= 0) return null;
    await wait(Math.min(intervalMs, remaining));
  }
}

export async function runModalQA(window, modalId) {
  const doc = window.document; const modal = doc.getElementById(modalId);
  const evidence = { modalId, exists: !!modal, engine: 'JSDOM actual local scripts', noForcedFallback: true, semanticsCaptured: 'immediately after openModal, before close' };
  try {
    if (!modal || typeof window.openModal !== 'function' || typeof window.closeModal !== 'function') throw new Error('Modal/open/close function unavailable');
    const prior = [...doc.querySelectorAll('button')].find(b => !b.closest('.yl-modal-overlay'));
    prior?.focus();
    window.openModal(modalId);
    // closeModal correctly removes aria-modal. Never inspect the CLOSED state for open semantics.
    evidence.roleDialog = modal.getAttribute('role') === 'dialog';
    evidence.ariaModal = modal.getAttribute('aria-modal') === 'true';
    await wait(60); evidence.open = modal.classList.contains('open');
    const button = modal.querySelector('button[onclick*="closeModal"], .yl-modal-close-btn, [data-modal-close]');
    if (button) button.click();
    await wait(20);
    evidence.x = !!button && !modal.classList.contains('open');
    evidence.closedAriaRemoved = !modal.hasAttribute('aria-modal');
    window.openModal(modalId); await wait(60); evidence.reopen = modal.classList.contains('open');
    doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await wait(20); evidence.escape = !modal.classList.contains('open');
    window.openModal(modalId); await wait(60); modal.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await wait(20); evidence.backdrop = !modal.classList.contains('open');
    evidence.focusRestored = !!prior && doc.activeElement === prior;
    const ok = ['open', 'x', 'reopen', 'escape', 'backdrop', 'focusRestored', 'roleDialog', 'ariaModal', 'closedAriaRemoved'].every(k => evidence[k]);
    return result(`qa.modal.${modalId}`, `Modal ${modalId}: X/ESC/backdrop/reopen`, ok ? 'PASS' : 'FAIL', JSON.stringify(evidence), evidence, { affectedFiles: ['yardline-app/index.html', 'yardline-app/js/data_and_views.js'] });
  } catch (error) {
    return result(`qa.modal.${modalId}`, `Modal ${modalId}`, 'BLOCKED', error.message, { ...evidence, error: error.message });
  } finally { window.closeModal?.(modalId); }
}

export const DOSSIER_TAB_ALIASES = {
  'Latest News': /latest news|^news$|últimas notícias|^notícias$/i,
  'Game Logs': /game logs|histórico de jogos/i,
  'Season Stats': /season stats|estatísticas da temporada/i,
  'Outlook': /outlook|perspectiva/i,
  'News & Analysis': /news.*analysis|notícias.*análise/i,
  'Depth Chart': /depth chart|^depth$|hierarquia/i,
  'Leagues': /leagues|ligas/i,
  'Full Profile': /full profile|perfil completo/i
};
const tabCheckId = label => `qa.dossier.tab.${label.replace(/\W+/g, '-').toLowerCase()}`;
const dossierTabs = modal => [...modal.querySelectorAll('button.sleeper-tab-btn, [role="tab"], .dossier-tab')];

export async function runDossierQA(window, contract, { preferredPlayerId, timeoutMs = 15000 } = {}) {
  const doc = window.document; const results = [];
  const evidence = { openedVia: 'card/opener', noDirectFunctionCall: true, modalOpen: false, hydrated: false, observedTabs: [], expectedTabs: contract.requiredTabs, contract, engine: 'JSDOM: real DOM clicks, NOT visual/content completeness' };
  const blocked = reason => [result('qa.dossier', 'Contrato de dossier profundo', 'BLOCKED', reason, { ...evidence, reason }, { issueType: 'ENVIRONMENT_OR_DEPENDENCY' })];
  // Drive the existing navigation and card. Do not inject an API id into a still-empty DOM catalog.
  const nav = doc.querySelector('.fp-rail-item[data-tab="teams"], [onclick*="openNavTab(\'teams\')"]');
  nav?.click();
  let selected;
  const findReadyOpener = () => {
    const openers = [...doc.querySelectorAll('[onclick*="openPlayerDossierModal"]')].filter(el => !el.closest('.yl-modal-overlay') && !el.closest('[hidden]') && (!el.closest('.view-section') || el.closest('.view-section').classList.contains('active')));
    openers.sort((a, b) => Number(b.getAttribute('onclick')?.includes(`'${preferredPlayerId}'`)) - Number(a.getAttribute('onclick')?.includes(`'${preferredPlayerId}'`)));
    for (const opener of openers) {
      const id = opener.getAttribute('onclick')?.match(/openPlayerDossierModal\(['"]([^'"]+)['"]\)/)?.[1];
      const player = id && window.YL_PLAYER_CARDS?.[id];
      if (player?.name && String(player.sleeperId || player.id) === id) { selected = { opener, player, id }; return selected; }
    }
    return null;
  };
  if (!await waitFor(findReadyOpener, timeoutMs)) {
    evidence.catalogCount = Object.keys(window.YL_PLAYER_CARDS || {}).length;
    evidence.hasNavigation = !!nav;
    return blocked('Card/opener e identidade canônica do DOM não prontos. Ausência de abas NÃO foi observada.');
  }
  evidence.playerId = selected.id; evidence.playerName = selected.player.name;
  evidence.opener = { tag: selected.opener.tagName, className: selected.opener.className, text: selected.opener.textContent.trim().slice(0, 200) };
  const modal = doc.getElementById('player-modal');
  if (!modal) return blocked('Shell player-modal indisponível; nenhuma ausência de abas observável.');
  window.closeModal?.('player-modal');
  selected.opener.click();
  if (!await waitFor(() => modal.classList.contains('open'), timeoutMs)) return blocked('Clique no opener não produziu modal aberto; verificar dependências/exceções, não declarar abas ausentes.');
  evidence.modalOpen = true;
  if (!await waitFor(() => {
    const identity = modal.querySelector('.sleeper-dossier__identity h1, [data-player-name]');
    return modal.classList.contains('open') && identity?.textContent.trim() === selected.player.name && dossierTabs(modal).length && !/Jogador ainda não foi carregado/.test(modal.textContent);
  }, timeoutMs)) {
    evidence.contentSample = modal.textContent.trim().slice(0, 500);
    window.closeModal?.('player-modal');
    return blocked('Modal abriu, mas identidade/abas não hidrataram. Catálogo/ambiente incompleto; ausência de todas as abas não comprovada.');
  }
  evidence.hydrated = true;
  // Initial render may precede history/news. Observe its settled state without requiring data that do not exist.
  evidence.dataSettled = !!await waitFor(() => !/Carregando histórico persistido/.test(modal.textContent), timeoutMs);
  evidence.loadingOrErrorState = /Carregando|consulta ao histórico falhou|Não foi possível carregar/.test(modal.textContent);
  evidence.modalOpen = modal.classList.contains('open');
  if (!evidence.modalOpen) return blocked('Modal fechou antes da interação das abas; fluxo não verificável.');
  evidence.observedTabs = dossierTabs(modal).map(t => t.textContent.trim());
  const interactions = [];
  for (const tab of dossierTabs(modal)) {
    tab.click(); await wait(100);
    const current = tab.id ? doc.getElementById(tab.id) : tab;
    const paneKey = (current?.getAttribute('onclick') || '').match(/YL_SWITCH_DOSSIER_TAB\(['"]([^'"]+)['"]/);
    const paneId = current?.getAttribute('aria-controls') || (paneKey && `tab-sec-${paneKey[1]}`);
    const pane = paneId ? doc.getElementById(paneId) : null;
    interactions.push({ label: tab.textContent.trim(), tabId: tab.id || null, selected: !!current && (current.classList.contains('active') || current.getAttribute('aria-selected') === 'true'), paneVisible: !!pane && pane.style.display !== 'none' && !pane.hidden && modal.contains(pane), paneId: pane?.id || null });
  }
  evidence.actualInteractions = interactions;
  for (const label of contract.requiredTabs) {
    const pattern = DOSSIER_TAB_ALIASES[label];
    const matched = pattern && interactions.find(t => pattern.test(t.label));
    const observed = { ...evidence, label, matchedTab: matched?.label || null, canonicalContextObserved: !!matched };
    if (!matched) {
      results.push(result(tabCheckId(label), `Dossier: ${label}`, 'FAIL', 'Contexto/aba canônica obrigatória não observado no modal ABERTO e HIDRATADO; gap real do contrato, não oito abas presumidas ausentes.', observed, { issueType: 'OBSERVED_CONTRACT_GAP', affectedFiles: ['yardline-app/js/engines.js', 'yardline-app/js/data_and_views.js'] }));
    } else {
      // A combined Latest News & Analysis tab is an explicit equivalent for both contexts, not two invented tabs.
      const ok = matched.selected && matched.paneVisible;
      results.push(result(tabCheckId(label), `Dossier: ${label}`, ok ? 'PASS' : 'NOT_VERIFIABLE', ok ? 'Aba observada: clique real selecionou e expôs pane (conteúdo/proveniência/visual não homologados).' : 'Aba existe; seleção/pane correspondente não observável.', { ...observed, ...matched, combinedContext: /news.*analysis/i.test(matched.label) }));
    }
  }
  const sentiment = interactions.find(t => /sentiment|coach ai/i.test(t.label));
  if (sentiment) results.push(result('qa.dossier.observed.sentiment', 'Dossier: Consensus Sentiment / Coach AI observado', sentiment.selected && sentiment.paneVisible ? 'PASS' : 'NOT_VERIFIABLE', 'Somente interação da aba real; cálculo, confiança, explicação e expert note ainda não homologados.', { ...evidence, ...sentiment }));
  results.push(result('qa.dossier', 'Profundidade de dossier: liga + sentiment + hero + estados', 'NOT_VERIFIABLE', 'Abas reais registradas. Oito contextos são contrato/backlog; conteúdo, proveniência, estados e paridade visual exigem Team Leader + QA browser.', evidence));
  window.closeModal?.('player-modal');
  return results;
}

export function classifyConsoleEvents(events, deniedRequests = []) {
  const denied = new Set(deniedRequests.map(r => typeof r === 'string' ? r.replace(/^\S+ /, '') : r.url));
  const classified = events.map(event => {
    const actualException = ['TypeError', 'ReferenceError', 'SyntaxError', 'RangeError', 'EvalError', 'URIError'].includes(event.causeName);
    const boundary = !actualException && (event.causeName === 'QABoundaryError' || (event.kind === 'console' && /^QA sandbox blocked non-local GET\/mutation:|^Read-only QA resource boundary/.test(event.message || '')) || (event.type === 'resource-loading' && denied.has(event.url)));
    const transport = event.causeName === 'QATransportError';
    const unsupported = !actualException && (['css-parsing', 'not-implemented'].includes(event.type) || (!event.type && /^(Could not parse CSS|Not implemented:)/.test(event.message || '')));
    const error = event.kind === 'jsdomError' || event.kind === 'unhandledrejection' || (event.kind === 'console' && event.level === 'error');
    return { ...event, classification: boundary ? 'INTENTIONAL_RESOURCE_BOUNDARY' : transport ? 'ENVIRONMENT_TRANSPORT' : unsupported ? 'JSDOM_UNSUPPORTED' : error ? 'PRODUCT_ERROR' : 'LOG' };
  });
  const productErrors = classified.filter(e => e.classification === 'PRODUCT_ERROR');
  const environmentEvents = classified.filter(e => !['PRODUCT_ERROR', 'LOG'].includes(e.classification));
  return { status: productErrors.length ? 'FAIL' : environmentEvents.length || deniedRequests.length ? 'NOT_VERIFIABLE' : 'PASS', productErrors, environmentEvents, logs: classified };
}

export async function runLocalSmoke(config, { fetchImpl = fetch, appURL = process.env.APP_URL || 'http://127.0.0.1:8080', apiURL = process.env.API_URL || 'http://127.0.0.1:3001', allowLocalSync = process.env.MONITOR_ALLOW_LOCAL_SYNC === '1', domTimeoutMs = 15000 } = {}) {
  const app = localURL(appURL); const api = localURL(apiURL); const results = [];
  const request = async (id, title, route, predicate, base = api, method = 'GET', body) => {
    const url = new URL(route, base); const start = Date.now(); let status = null;
    try {
      const res = await fetchImpl(url.href, { method, redirect: 'error', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(method === 'POST' ? 45000 : 8000) });
      status = res.status; const text = await res.text(); let data;
      try { data = JSON.parse(text); } catch { data = text; }
      const ok = res.ok && predicate(data);
      results.push(result(id, title, ok ? 'PASS' : 'FAIL', ok ? 'Resposta e assertions atuais verificadas' : 'HTTP/schema/assertion mismatch', { url: url.href, method, httpStatus: status, latencyMs: Date.now() - start, responseSample: typeof data === 'string' ? data.slice(0, 200) : JSON.stringify(data).slice(0, 1000) }, { route }));
      return ok ? data : null;
    } catch (error) {
      results.push(result(id, title, 'BLOCKED', error.message, { url: url.href, method, httpStatus: status, latencyMs: Date.now() - start, error: error.message }, { route })); return null;
    }
  };
  const health = await request('qa.api', 'GET backend health', '/api/health', data => ['ONLINE', 'ok', 'HEALTHY'].includes(data.status));
  const html = await request('qa.web', 'GET frontend shell real', '/index.html', text => typeof text === 'string' && text.includes('player-modal'), app);
  if (allowLocalSync && health) {
    await request('qa.sync', 'Sleeper sync no backend LOCAL autorizado', '/api/integrations/sleeper/sync-league', data => data.success === true && !data.error && data.status !== 'failed' && data.preserved !== true, api, 'POST', { leagueId: config.leagueId });
  } else results.push(result('qa.sync', 'Sleeper sync local', 'NOT_VERIFIABLE', allowLocalSync ? 'Backend indisponível para sync' : 'Sync local mutável desabilitada: MONITOR_ALLOW_LOCAL_SYNC=1 autoriza apenas loopback. Proteção snapshot testada por npm test.', { reason: 'Não executar mutação silenciosa', allowLocalSync }));
  const search = await request('qa.search', 'Busca real Josh Allen', '/api/players/search?q=Josh%20Allen&limit=5', data => Array.isArray(data.players) && data.players.some(p => p.name === 'Josh Allen'));
  await request('qa.filter', 'Filtro IDP real (não passa com array vazio)', '/api/players/search?position=IDP&limit=5', data => data.players?.length > 0 && data.players.every(p => ['DL', 'LB', 'DB', 'DE', 'DT', 'CB', 'S'].includes(p.position || p.pos)));
  await request('qa.news', 'News: fonte, canonical URL, timestamps e deduplicação', '/api/news?limit=20', data => {
    const rows = Array.isArray(data) ? data : data.news || data.articles;
    if (!rows?.length) return false;
    const urls = rows.map(r => r.canonicalUrl || r.canonical_url || r.url || r.source_url);
    return urls.every(url => /^https?:\/\//.test(url || '')) && new Set(urls).size === urls.length && rows.every(r => (r.source || r.sourceName || r.source_name) && (r.publishedAt || r.published_at));
  });
  const catalog = await request('qa.catalog', 'Catálogo: fixtures/mocks não aparecem como oficiais', '/api/players/search?status=all&limit=100', data => data.players?.length > 0 && data.players.every(p => !/Roster Player|Canonical Test|^mock|fixture|Saudável/i.test(`${p.name} ${p.status || ''}`)));
  const playerId = search?.players?.find(p => p.name === 'Josh Allen')?.id || catalog?.players?.[0]?.id;
  if (playerId) await request('qa.card', 'Player card com identidade e proveniência', `/api/players/${encodeURIComponent(playerId)}`, data => !!(data.player?.name || data.name || data.player?.canonical_name) && !/Roster Player|Canonical Test/.test(JSON.stringify(data)));
  else results.push(result('qa.card', 'Player card', 'BLOCKED', 'Nenhum player real disponível', { dependency: 'qa.search/qa.catalog' }));
  for (const viewport of ['360x800', '390x844', '768x1024', '1024x768', '1440x900', '1920x1080']) results.push(result(`qa.responsive.${viewport}`, `Responsive ${viewport}`, 'NOT_VERIFIABLE', 'JSDOM não implementa layout; requer navegador real no runtime QA/Antigravity.', { reason: 'No real viewport', requestedViewport: viewport }, { viewport }));
  if (!html) {
    results.push(result('qa.modal.all', 'Modais X/ESC/backdrop/reopen/focus', 'BLOCKED', 'Shell local inacessível', { dependency: 'qa.web' }));
    results.push(result('qa.dossier', 'Contrato de dossier profundo', 'BLOCKED', 'Shell inacessível', { dependency: 'qa.web', contract: config.dossierContract, hydrated: false, modalOpen: false, observedTabs: [] }));
    return results;
  }
  const events = []; const deniedRequests = []; const resourceRequests = []; let eventCount = 0;
  const record = event => { eventCount++; events.push({ ...event, capturedAt: isoNow() }); };
  // localhost/127.0.0.1/::1 are equivalent ONLY at the two configured protocol/ports, not all loopback services.
  const allowed = url => ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) && !url.username && !url.password && [app, api].some(base => base.protocol === url.protocol && base.port === url.port);
  const readOnlyFetch = async (url, options = {}, resource = false) => {
    const dest = new URL(url, app); const method = String(options.method || 'GET').toUpperCase();
    let body;
    try { body = JSON.parse(options.body || 'null'); } catch { body = null; }
    const authorizedSync = !resource && allowLocalSync && allowed(dest) && dest.protocol === api.protocol && dest.port === api.port && method === 'POST' && dest.pathname === '/api/integrations/sleeper/sync-league' && body?.leagueId === config.leagueId;
    if (!allowed(dest) || (method !== 'GET' && !authorizedSync)) {
      deniedRequests.push({ method, url: dest.href, reason: method !== 'GET' ? 'MUTATION_BLOCKED' : 'UNCONFIGURED_OR_EXTERNAL_RESOURCE', intentional: true });
      if (resource) return new Response('Read-only QA resource boundary', { status: 403 });
      throw Object.assign(new Error(`QA sandbox blocked non-local GET/mutation: ${method} ${dest.href}`), { name: 'QABoundaryError' });
    }
    try {
      const response = await fetchImpl(dest.href, { ...options, method, signal: AbortSignal.timeout(authorizedSync ? 45000 : 8000), redirect: 'error' });
      resourceRequests.push({ method, url: dest.href, httpStatus: response.status, authorizedLocalSync: authorizedSync });
      return response;
    } catch (error) {
      record({ kind: 'transport', message: error.message, url: dest.href, causeName: 'QATransportError' });
      throw Object.assign(new Error(`Local QA transport unavailable: ${dest.href}: ${error.message}`, { cause: error }), { name: 'QATransportError' });
    }
  };
  const readOnlyResources = requestInterceptor(request => readOnlyFetch(request.url, { method: request.method }, true));
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', e => record({ kind: 'jsdomError', type: e.type, message: e.message, stack: e.cause?.stack || e.stack, causeName: e.cause?.name, url: e.url || e.cause?.url || null }));
  for (const level of ['log', 'info', 'warn', 'error', 'debug']) virtualConsole.on(level, (...args) => record({ kind: 'console', level, message: args.map(a => typeof a === 'string' ? a : a?.stack || JSON.stringify(a)).join(' '), causeName: args.find(a => a instanceof Error || a?.name?.endsWith('Error'))?.name }));
  const dom = new JSDOM(html, { url: new URL('/', app).href, runScripts: 'dangerously', resources: { interceptors: [readOnlyResources] }, virtualConsole, pretendToBeVisual: false, beforeParse(window) {
    window.AbortController = AbortController; window.AbortSignal = AbortSignal;
    window.YL_API_BASE = api.origin;
    // Existing UI preference selects the configured real league, not a synthetic player/catalog fixture.
    window.localStorage.setItem('yl_active_league_id', config.leagueId);
    window.scrollTo = () => {};
    window.fetch = (url, options = {}) => readOnlyFetch(url, options);
    window.addEventListener('unhandledrejection', event => record({ kind: 'unhandledrejection', message: event.reason?.message || String(event.reason), stack: event.reason?.stack, causeName: event.reason?.name }));
  } });
  try {
    const { window } = dom;
    const scriptsReady = await waitFor(() => window.document.readyState === 'complete' && typeof window.openModal === 'function' && typeof window.closeModal === 'function', domTimeoutMs);
    if (!scriptsReady) results.push(result('qa.bootstrap', 'Scripts locais prontos', 'BLOCKED', 'Timeout de scripts/dependências locais. Sem inventar sucesso.', { readyState: window.document.readyState, resourceRequests }));
    for (const modalId of ['player-modal', 'article-reader-modal', 'onboarding-modal', 'lineup-swap-modal', 'waiver-modal', 'checkout-modal', 'manager-dna-modal', 'start-sit-modal']) results.push(await runModalQA(window, modalId));
    results.push(...await runDossierQA(window, config.dossierContract, { preferredPlayerId: playerId, timeoutMs: domTimeoutMs }));
    results.push(result('qa.focus-trap', 'Focus trap real por teclado', 'NOT_VERIFIABLE', 'JSDOM não reproduz tabulação real de navegador; teste unitário estático não é E2E', { engine: 'JSDOM', requirement: 'Browser keyboard Tab/Shift+Tab and reopen' }));
    const consoleQA = classifyConsoleEvents(events, deniedRequests);
    results.push(result('qa.console', 'Erros runtime ao carregar app local', consoleQA.status, `${consoleQA.productErrors.length} erro(s) de produto; ${consoleQA.environmentEvents.length} evento(s) de ambiente; ${deniedRequests.length} recurso(s) intencionalmente bloqueados`, { ...consoleQA, eventCount, truncated: eventCount > events.length, deniedRequests, resourceRequests, limitation: 'Exceções reais não são silenciadas. Bloqueio intencional/terceiro/transport/layout implica NOT_VERIFIABLE, nunca PASS completo.' }, { issueType: consoleQA.productErrors.length ? 'PRODUCT_ERROR' : 'ENVIRONMENT_OR_DEPENDENCY' }));
  } finally { dom.window.close(); }
  return results;
}
