import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
export function currentCommit() {
  try { return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8', timeout: 5000 }).trim(); }
  catch { return null; }
}
export function codeHash() {
  const hash = crypto.createHash('sha256');
  function walk(file) {
    if (!fs.existsSync(file)) return;
    if (fs.statSync(file).isDirectory()) for (const name of fs.readdirSync(file).sort()) { if (name !== 'node_modules') walk(path.join(file, name)); }
    else if (/\.(js|mjs|cjs|json|html|css|sql|md)$/.test(file)) { hash.update(path.relative(ROOT, file)); hash.update(fs.readFileSync(file)); }
  }
  for (const file of ['server/src', 'server/test', 'server/scripts', 'server/package.json', 'server/data/agent-orchestration.json', 'yardline-app', 'sync-agent/github-sync-agent.mjs', 'docs/fantasypros-bijan-yardline-audit.md', 'docs/player-dossier-team-leader-handoff.md']) walk(path.join(ROOT, file));
  return hash.digest('hex');
}
