#!/usr/bin/env node
/**
 * YARDLINE — Agente em Tempo Real de Monitoramento & Sincronização GitHub
 *
 * Repositório: https://github.com/llfaraco/yardline
 * Branch: main
 *
 * Serviço explícito de observação de repositório (runtime local).
 * Faz SOMENTE git fetch/log/status/rev-list; não stash, pull, checkout, commit ou push.
 * Divergências são pendingReview. Team Leader revisa implementação via agent-handoffs.
 * Integração/push de código é um comando MANUAL fora deste daemon, após QA/revisão.
 * GET /health, GET /api/status, POST /api/trigger (fetch-only).
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';

const execFileAsync = promisify(execFile);

const __dirname = typeof fileURLToPath === 'function' ? dirname(fileURLToPath(import.meta.url)) : dirname(new URL(import.meta.url).pathname);
const ROOT_DIR = join(__dirname, '..');
const LIVE_DIR = 'C:\\Users\\png__\\OneDrive\\Área de Trabalho\\live-yardline';
const DATA_DIR = join(__dirname, 'data');
const LOGS_DIR = join(__dirname, 'logs');
const STATUS_FILE = join(DATA_DIR, 'sync-status.json');
const LOG_FILE = join(LOGS_DIR, 'sync-agent.log');

const PORT = Number(process.env.GITHUB_SYNC_PORT || 8788);
const INTERVAL_MS = Number(process.env.GITHUB_SYNC_INTERVAL_MS || 10 * 60 * 1000); // 10 minutos
const REMOTE = process.env.GIT_REMOTE || 'origin';
const BRANCH = process.env.GIT_BRANCH || 'main';

mkdirSync(DATA_DIR, { recursive: true });
mkdirSync(LOGS_DIR, { recursive: true });

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try {
    writeFileSync(LOG_FILE, line + '\n', { flag: 'a' });
  } catch {}
}

let syncState = {
  status: 'idle',
  role: 'github-sync-agent',
  repo: 'https://github.com/llfaraco/yardline',
  branch: BRANCH,
  intervalMs: INTERVAL_MS,
  intervalMinutes: Math.round(INTERVAL_MS / 60000),
  lastCheckAt: null,
  lastSyncAt: null,
  lastCommitHash: null,
  lastCommitSubject: null,
  consecutiveErrors: 0,
  lastError: null,
  syncCount: 0,
  history: []
};

// Carregar status persistido se existir
if (existsSync(STATUS_FILE)) {
  try {
    const saved = JSON.parse(readFileSync(STATUS_FILE, 'utf8'));
    syncState = { ...syncState, ...saved, status: 'idle' };
  } catch {}
}

function persistState() {
  try {
    writeFileSync(STATUS_FILE, JSON.stringify(syncState, null, 2), 'utf8');
  } catch {}
}

async function runGit(args, options = {}) {
  const opts = { cwd: ROOT_DIR, timeout: 45000, maxBuffer: 10 * 1024 * 1024, ...options };
  const { stdout, stderr } = await execFileAsync('git', args, opts);
  return { stdout: (stdout || '').trim(), stderr: (stderr || '').trim() };
}

function syncToLiveYardline() {
  if (!existsSync(LIVE_DIR)) return;
  const files = [
    { src: join(ROOT_DIR, 'yardline-app', 'index.html'), dst: join(LIVE_DIR, 'index.html') },
    { src: join(ROOT_DIR, 'yardline-app', 'css', 'styles.css'), dst: join(LIVE_DIR, 'css', 'styles.css') },
    { src: join(ROOT_DIR, 'yardline-app', 'js', 'data_and_views.js'), dst: join(LIVE_DIR, 'js', 'data_and_views.js') },
    { src: join(ROOT_DIR, 'yardline-app', 'js', 'engines.js'), dst: join(LIVE_DIR, 'js', 'engines.js') }
  ];

  for (const { src, dst } of files) {
    if (existsSync(src)) {
      mkdirSync(dirname(dst), { recursive: true });
      copyFileSync(src, dst);
    }
  }
  log('[Parity] Arquivos replicados com sucesso para live-yardline');
}

let isSyncing = false;

async function runSyncCycle(isManual = false) {
  if (isSyncing) {
    log('[Sync] Ciclo anterior ainda em andamento. Aguardando...');
    return { ok: false, message: 'Ciclo anterior em andamento' };
  }

  isSyncing = true;
  syncState.status = 'syncing';
  syncState.lastCheckAt = new Date().toISOString();
  persistState();

  try {
    log(`[Sync] Iniciando verificação do GitHub (${isManual ? 'Manual' : 'Automática a cada 10 min'})...`);

    // 1. Fetch remoto
    await runGit(['fetch', REMOTE, BRANCH]);

    // 2. Verificar commits pendentes
    const { stdout: remoteBehind } = await runGit(['rev-list', `HEAD..${REMOTE}/${BRANCH}`, '--count']);
    const { stdout: localAhead } = await runGit(['rev-list', `${REMOTE}/${BRANCH}..HEAD`, '--count']);

    const commitsToPull = parseInt(remoteBehind || '0', 10);
    const commitsToPush = parseInt(localAhead || '0', 10);

    let updated = false;

    // Repository observation is deliberately separate from Antigravity implementation.
    // NEVER integrate/stash/checkout/push dirty or unreviewed agent code automatically.
    syncState.pendingReview = { remoteCommits: commitsToPull, localCommits: commitsToPush };
    syncState.writePolicy = 'FETCH_ONLY; integration/commit/push require manual Team Leader review';
    if (commitsToPull || commitsToPush) log(`[Review required] Remote=${commitsToPull}; local=${commitsToPush}. No automatic source mutation or push.`);

    // 5. Ler último commit local
    const { stdout: headLog } = await runGit(['log', '-n', '1', '--format=%h|%s']);
    const [hHash, hSubject] = (headLog || '').split('|');
    syncState.lastCommitHash = hHash || syncState.lastCommitHash;
    syncState.lastCommitSubject = hSubject || syncState.lastCommitSubject;

    syncState.lastSyncAt = new Date().toISOString();
    syncState.status = 'idle';
    syncState.consecutiveErrors = 0;
    syncState.lastError = null;
    syncState.syncCount += 1;

    // Registrar no histórico (últimos 20)
    syncState.history.unshift({
      timestamp: syncState.lastSyncAt,
      type: isManual ? 'manual' : 'scheduled',
      pulled: 0,
      pushed: 0,
      commit: syncState.lastCommitHash,
      subject: syncState.lastCommitSubject
    });
    if (syncState.history.length > 20) syncState.history.length = 20;

    persistState();
    return { ok: true, updated, pulled: 0, pushed: 0, commit: syncState.lastCommitHash };
  } catch (err) {
    syncState.status = 'error';
    syncState.consecutiveErrors += 1;
    syncState.lastError = err.message;
    log(`[Sync Error] Falha durante o ciclo: ${err.message}`);
    persistState();
    return { ok: false, error: err.message };
  } finally {
    isSyncing = false;
  }
}

// Iniciar servidor HTTP para acompanhamento
const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      status: 'ok',
      agent: 'github-sync-agent',
      syncStatus: syncState.status,
      isSyncing: isSyncing,
      intervalMinutes: syncState.intervalMinutes,
      lastCheckAt: syncState.lastCheckAt,
      lastSyncAt: syncState.lastSyncAt,
      lastCommitHash: syncState.lastCommitHash
    }));
    return;
  }

  if (url.pathname === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(syncState));
    return;
  }

  if (url.pathname === '/api/trigger' && req.method === 'POST') {
    const result = await runSyncCycle(true);
    res.writeHead(result.ok ? 200 : 500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(result));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint não encontrado' }));
});

server.listen(PORT, '0.0.0.0', () => {
  log(`=======================================================`);
  log(`🚀 YARDLINE GitHub Sync Agent iniciado na porta ${PORT}`);
  log(`📡 Monitorando repositório: ${syncState.repo} (branch: ${BRANCH})`);
  log(`⏱️ Intervalo de sincronização: ${syncState.intervalMinutes} minutos (${INTERVAL_MS}ms)`);
  log(`=======================================================`);

  // Executar primeiro ciclo imediatamente
  runSyncCycle(false);

  // Agendar loop a cada 10 minutos
  setInterval(() => {
    runSyncCycle(false);
  }, INTERVAL_MS);
});

// Tratamento de encerramento
process.on('SIGINT', () => {
  log('Recebido SIGINT. Encerrando agente de sincronização...');
  server.close(() => process.exit(0));
});

process.on('SIGTERM', () => {
  log('Recebido SIGTERM. Encerrando agente de sincronização...');
  server.close(() => process.exit(0));
});
