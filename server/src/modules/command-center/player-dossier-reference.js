import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { REPO_ROOT } from './orchestration-store.js';

const DOCUMENTS = {
  audit: { path: 'docs/fantasypros-bijan-yardline-audit.md', title: 'FantasyPros · Bijan Robinson — auditoria externa', endpoint: 'player-dossier/audit' },
  handoff: { path: 'docs/player-dossier-team-leader-handoff.md', title: 'Dossier profundo — Team Leader → Antigravity', endpoint: 'player-dossier/handoff' }
};

export function playerDossierReference() {
  return Object.fromEntries(Object.entries(DOCUMENTS).map(([kind, document]) => {
    const file = path.join(REPO_ROOT, document.path);
    const available = fs.existsSync(file);
    return [kind, { ...document, available, status: available ? 'VERSIONED_REFERENCE' : 'NOT_VERIFIABLE', sha256: available ? crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') : null, observationPolicy: 'Preservar OBSERVED / INFERRED / NOT_VERIFIABLE do relatório; arquivo disponível não é QA PASS atual.' }];
  }));
}

export function readPlayerDossierDocument(kind) {
  if (!Object.hasOwn(DOCUMENTS, kind)) throw Object.assign(new Error('Unknown versioned dossier document'), { statusCode: 404 });
  const file = path.join(REPO_ROOT, DOCUMENTS[kind].path);
  if (!fs.existsSync(file)) throw Object.assign(new Error('NOT_VERIFIABLE: versioned audit document not supplied; never manufacture external observations'), { statusCode: 404 });
  return fs.readFileSync(file, 'utf8');
}
