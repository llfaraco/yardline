const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const srcDir = 'c:\\Users\\png__\\OneDrive\\Área de Trabalho\\YARDLINE\\yardline_app_unificado';
const dstDir = 'C:\\Users\\png__\\OneDrive\\Área de Trabalho\\live-yardline';

const filesToCopy = [
  'yardline-app/js/data_and_views.js',
  'yardline-app/js/engines.js',
  'server/src/contracts/dtos.js',
  'server/src/modules/sleeper/sleeper.sync.js',
  'server/src/server.js',
  'server/scripts/run-hourly-monitor.js',
  'server/scripts/sync-historical-stats.cjs',
  'server/scripts/test-card-news-dossier.cjs',
  'server/src/db/yardline.db',
  'server/data/hourly-reports/latest-report.json',
  'server/data/hourly-reports/MONITOR_LOG.md',
  'server/data/hourly-reports/report-2026-10-16T19-09-25-468Z.json',
  'news-worker/data/nfl-news.json',
  'sleeper-snapshot.json'
];

try {
  const { DatabaseSync } = require('node:sqlite');
  const dbFile = path.join(srcDir, 'server/src/db/yardline.db');
  if (fs.existsSync(dbFile)) {
    const tempDb = new DatabaseSync(dbFile);
    tempDb.exec('PRAGMA wal_checkpoint(TRUNCATE);');
    tempDb.close();
  }
} catch (e) {
  console.log('Checkpoint note:', e.message);
}

function getHash(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

console.log('=== SYNCING TO LIVE-YARDLINE MIRROR ===');
let allMatch = true;

for (const rel of filesToCopy) {
  const src = path.join(srcDir, rel);
  const dst = path.join(dstDir, rel);

  if (!fs.existsSync(src)) {
    console.error(`SOURCE NOT FOUND: ${src}`);
    allMatch = false;
    continue;
  }

  const dstParent = path.dirname(dst);
  if (!fs.existsSync(dstParent)) {
    fs.mkdirSync(dstParent, { recursive: true });
  }

  fs.copyFileSync(src, dst);

  const hashSrc = getHash(src);
  const hashDst = getHash(dst);
  const match = hashSrc === hashDst;
  if (!match) allMatch = false;

  console.log(`[${match ? 'MATCH' : 'MISMATCH'}] ${rel} -> ${hashSrc.slice(0, 12)}...`);
}

console.log(`\nOVERALL SYNC RESULT: ${allMatch ? '✅ 100% SHA-256 PARITY' : '❌ HASH MISMATCH'}`);
process.exit(allMatch ? 0 : 1);
