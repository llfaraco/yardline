import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { currentCommit, codeHash } from './code-state.js';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
export const CONFIG_PATH = path.join(REPO_ROOT, 'server/data/agent-orchestration.json');
export const HANDOFF_STATUS = ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'VERIFIED', 'RETRACTED'];
export const isActiveHandoff = handoff => !['VERIFIED', 'RETRACTED'].includes(handoff.status);
export const ACTIVE_STATUS = ['WORKING', 'WAITING_DEPENDENCY', 'NEEDS_REVIEW'];
const REQUIRED_IDS = ['agent_po', 'agent_sleeper_ref', 'agent_fantasypros_ref', 'agent_nfl_news', 'agent_yahoo_news', 'agent_qa_senior', 'agent_backend_lead', 'agent_data_engineer', 'agent_sleeper_integration', 'agent_scoring_engineer', 'agent_frontend_lead', 'agent_design_system', 'agent_accessibility', 'agent_security', 'agent_devops'];
export const isoNow = () => new Date().toISOString();

export function readJSON(file, fallback = null) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return fallback; throw error; }
}
export function atomicJSON(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const temp = `${file}.${crypto.randomUUID()}.tmp`;
  try {
    const fd = fs.openSync(temp, 'wx', 0o600);
    try { fs.writeFileSync(fd, JSON.stringify(value, null, 2) + '\n'); fs.fsyncSync(fd); }
    finally { fs.closeSync(fd); }
    fs.renameSync(temp, file);
  } finally { fs.rmSync(temp, { force: true }); }
}
export function loadOrchestration(file = CONFIG_PATH) {
  const config = readJSON(file);
  if (!config || config.agents?.length !== 15 || new Set(config.agents.map(a => a.id)).size !== 15 || REQUIRED_IDS.some(id => !config.agents.some(a => a.id === id))) throw new Error('Orchestration must contain the exact 15 canonical agent IDs');
  for (const agent of config.agents) {
    if (!ACTIVE_STATUS.includes(agent.status) || !Number.isInteger(agent.cadenceMinutes) || agent.cadenceMinutes < 1) throw new Error(`Invalid continuous agent state/cadence: ${agent.id}`);
    for (const key of ['name', 'mission', 'monitorTargets', 'allowedActions', 'evidenceRequired', 'handoffTo', 'writePolicy', 'stopConditions', 'reopenRules', 'nextAction']) if (!agent[key] || (Array.isArray(agent[key]) && !agent[key].length)) throw new Error(`Missing ${key}: ${agent.id}`);
  }
  return config;
}
export function isFresh(report, cadenceMinutes = 60, now = Date.now()) {
  const time = Date.parse(report?.finishedAt);
  return report?.status === 'FINISHED' && Number.isFinite(time) && time <= now && now - time <= cadenceMinutes * 60_000;
}
export function isCurrentReport(report, cadenceMinutes = 60) {
  return isFresh(report, cadenceMinutes) && !!report.currentCommit && report.currentCommit === currentCommit() && report.finishedWorkingTreeHash === codeHash();
}
export function computeReleaseGate(report, handoffs = [], now = Date.now()) {
  const reasons = [];
  const critical = handoffs.filter(h => ['P0', 'P1'].includes(h.priority) && isActiveHandoff(h));
  if (critical.length) reasons.push(`${critical.length} handoff(s) P0/P1 não verificados; veto do Senior QA.`);
  if (!isFresh(report, 60, now)) reasons.push('Sem ciclo finalizado com evidência atual (cadência 60 min).');
  const qa = report?.qaResults || [];
  if (!qa.length || qa.some(q => q.status !== 'PASS' || !q.evidence || !q.testedAt || Date.parse(q.testedAt) < Date.parse(report.startedAt))) reasons.push('QA incompleto, reprovado, bloqueado ou NOT_VERIFIABLE; PASS exige evidência do ciclo.');
  if (!report?.referenceChecks?.length || report.referenceChecks.some(r => r.status !== 'PASS')) reasons.push('Referências públicas incompletas ou sem verificação.');
  if (report?.currentCommit !== report?.finishedCommit || report?.workingTreeHash !== report?.finishedWorkingTreeHash) reasons.push('Código alterado durante o ciclo; reexecutar QA.');
  if (!report?.currentCommit || report.currentCommit !== currentCommit() || report.finishedWorkingTreeHash !== codeHash()) reasons.push('Evidência pertence a outro commit/árvore; código atual requer novo ciclo.');
  if (!report?.approvals?.seniorQA || !report?.approvals?.teamLeader) reasons.push('Homologação humana Team Leader + Senior QA pendente; polling não aprova UX/release.');
  return { status: reasons.length ? 'RELEASE BLOQUEADA' : 'RELEASE APROVADA', blockingReasons: reasons, criticalHandoffs: critical.map(h => h.id), seniorQaVetoActive: !!reasons.length };
}

export class OrchestrationStore {
  constructor({ dataDir = process.env.COMMAND_CENTER_DATA_DIR || path.join(REPO_ROOT, 'server/data'), configPath = CONFIG_PATH } = {}) {
    this.dataDir = dataDir;
    this.configPath = configPath;
    this.runtimeDir = path.join(dataDir, 'agent-runtime');
    this.handoffFile = path.join(dataDir, 'agent-handoffs/handoffs.json');
    this.latestFile = path.join(this.runtimeDir, 'latest-report.json');
    this.lockFile = path.join(this.runtimeDir, 'cycle-lock.json');
  }
  config() { return loadOrchestration(this.configPath); }
  latest() { return readJSON(this.latestFile); }
  handoffs() { return readJSON(this.handoffFile, []); }
  report(cycleId) {
    if (!/^cycle-[a-f0-9-]{36}$/.test(cycleId)) throw new Error('Invalid cycleId');
    return readJSON(path.join(this.runtimeDir, 'reports', `${cycleId}.json`));
  }
  saveReport(report) {
    atomicJSON(path.join(this.runtimeDir, 'reports', `${report.cycleId}.json`), report);
    atomicJSON(this.latestFile, report);
  }
  transaction(fn) {
    const lock = `${this.handoffFile}.lock`;
    fs.mkdirSync(path.dirname(lock), { recursive: true, mode: 0o700 });
    try { fs.mkdirSync(lock, { mode: 0o700 }); }
    catch (error) { if (error.code === 'EEXIST') throw Object.assign(new Error('Handoff store busy; retry. A crash lock requires operator review.'), { statusCode: 409 }); throw error; }
    try { const rows = this.handoffs(); const result = fn(rows); atomicJSON(this.handoffFile, rows); return result; }
    finally { fs.rmdirSync(lock); }
  }
  upsertHandoff(raw, cycleId) {
    for (const field of ['checkId', 'sourceAgent', 'targetAgent', 'title', 'observed', 'expected', 'reproduction', 'evidence', 'affectedFiles', 'proposedNextStep']) if (raw[field] == null) throw new Error(`Handoff ${field} required`);
    if (!['P0', 'P1', 'P2', 'P3'].includes(raw.priority) || !Array.isArray(raw.evidence) || !raw.evidence.length) throw new Error('Handoff requires priority and evidence');
    const fingerprint = crypto.createHash('sha256').update(`${raw.sourceAgent}|${raw.checkId}`).digest('hex');
    return this.transaction(rows => {
      let item = rows.find(h => h.fingerprint === fingerprint);
      const now = isoNow();
      let action = 'EXISTING';
      if (!item) {
        item = { ...raw, id: `handoff-${fingerprint.slice(0, 20)}`, fingerprint, status: 'OPEN', createdAt: now, updatedAt: now, reopenedCount: 0, occurrences: 0, coordinator: 'Team Leader' };
        rows.push(item); action = 'NEW';
      } else if (['VERIFIED', 'RETRACTED'].includes(item.status) || item.absentSince) {
        item.status = 'OPEN'; item.reopenedCount++; item.reopenedAt = now; action = 'REOPENED';
      }
      if (item.qaStatus !== raw.qaStatus || item.issueType !== raw.issueType) {
        (item.reviewHistory ||= []).push({ at: now, cycleId, reason: 'Exact check reclassified; prior evidence retained', previous: { qaStatus: item.qaStatus, issueType: item.issueType, title: item.title, observed: item.observed, evidence: item.evidence } });
      }
      // Escalate but never silently downgrade a previously critical handoff.
      if (raw.priority < item.priority) item.priority = raw.priority;
      Object.assign(item, { title: raw.title, qaStatus: raw.qaStatus, issueType: raw.issueType, observed: raw.observed, expected: raw.expected, evidence: raw.evidence, reproduction: raw.reproduction, proposedNextStep: raw.proposedNextStep, referenceDocuments: raw.referenceDocuments || [], updatedAt: now, lastSeenAt: now, lastSeenCycleId: cycleId, absentSince: null });
      if (item.occurrences === 0 || item.lastCountedCycleId !== cycleId) item.occurrences++;
      item.lastCountedCycleId = cycleId;
      return { action, handoff: item };
    });
  }
  reconcileHarnessFalsePositives(checks, cycleId) {
    const corrections = []; const byId = new Map(checks.map(check => [check.id, check]));
    const dossier = byId.get('qa.dossier');
    const dossierTabs = ['latest-news', 'game-logs', 'season-stats', 'outlook', 'news-analysis', 'depth-chart', 'leagues', 'full-profile'].map(tab => byId.get(`qa.dossier.tab.${tab}`));
    const allDossierTabsPass = dossierTabs.length === 8 && dossierTabs.every(check => check?.status === 'PASS' && !check.reused);
    const modalChecks = [...byId.values()].filter(check => check.id.startsWith('qa.modal.') && check.id !== 'qa.modal.all');
    const allModalChecksPass = modalChecks.length > 0 && modalChecks.every(check => check.status === 'PASS' && !check.reused);
    this.transaction(rows => {
      for (const row of rows) {
        if (row.sourceAgent !== 'agent_qa_senior' || !isActiveHandoff(row)) continue;
        const prior = row.evidence?.find(e => e.modalId || Array.isArray(e.tabs));
        const check = byId.get(row.checkId);
        let reason; let retract = true;
        if (row.checkId === 'qa.modal.all' && allModalChecksPass) {
          reason = 'SUPERSEDED_BY_GRANULAR_MODAL_CHECKS: every concrete modal check passed in the fresh cycle; aggregate blocker is retired with audit history.';
        } else if (row.checkId === 'qa.dossier' && allDossierTabsPass && byId.get('qa.dossier.observed.sentiment')?.status === 'PASS') {
          reason = 'SUPERSEDED_BY_GRANULAR_DOSSIER_CHECKS: all eight dossier tabs and observed sentiment passed in the fresh cycle; aggregate blocker is retired with audit history.';
        } else if (row.checkId.startsWith('qa.modal.') && prior?.ariaModal === false && ['open', 'x', 'reopen', 'escape', 'backdrop', 'focusRestored', 'roleDialog'].every(k => prior[k] === true) && check?.status === 'PASS' && check.evidence?.ariaModal === true && check.evidence?.semanticsCaptured === 'immediately after openModal, before close' && check.evidence?.closedAriaRemoved === true) {
          reason = 'FALSE_POSITIVE_CLOSED_ARIA: old harness sampled aria-modal after close; fresh exact check captures open semantics and correct cleanup.';
        } else if (row.checkId.startsWith('qa.dossier.tab.') && prior?.tabs?.length === 0 && !prior.hydrated && !prior.modalOpen && dossier?.evidence?.openedVia === 'card/opener') {
          if (check?.evidence?.hydrated && check.evidence.modalOpen && !check.evidence.canonicalContextObserved && check.status === 'FAIL') {
            reason = 'SUPERSEDED_BY_OBSERVED_GAP: old empty/unhydrated tab claim was invalid; fresh real opener now observes this exact contract gap.';
            retract = false;
          } else if ((check?.evidence?.canonicalContextObserved && check.evidence.hydrated && check.evidence.modalOpen) || dossier.status === 'BLOCKED') {
            reason = check?.evidence?.canonicalContextObserved ? 'FALSE_POSITIVE_UNHYDRATED_TABS: exact context exists in fresh open/hydrated DOM.' : 'UNSUPPORTED_ABSENCE_CLAIM: old empty tabs before DOM identity readiness; current opener/dependency BLOCKED, not proof that eight contexts are absent.';
          }
        }
        if (!reason || row.reviewHistory?.some(h => h.reason === reason)) continue;
        const correction = { at: isoNow(), cycleId, checkId: row.checkId, handoffId: row.id, reason, action: retract ? 'RETRACTED' : 'RECLASSIFIED_REAL_GAP', actor: 'QA harness correction — NOT product verification', previous: { status: row.status, priority: row.priority, title: row.title, observed: row.observed, evidence: row.evidence }, currentEvidence: check?.evidence || dossier?.evidence };
        (row.reviewHistory ||= []).push(correction);
        row.updatedAt = correction.at;
        if (retract) { row.status = 'RETRACTED'; row.retraction = correction; }
        corrections.push({ handoffId: row.id, checkId: row.checkId, reason, action: correction.action });
      }
    });
    return corrections;
  }
  markPassingChecks(checkIds, cycleId) {
    if (!checkIds.length) return;
    this.transaction(rows => {
      for (const row of rows) if (checkIds.includes(row.checkId)) {
        row.lastPassingCycleId = cycleId; row.absentSince ||= isoNow();
        // Passing once is NOT resolution; requires explicit evidence-based verification.
      }
    });
  }
  transition(id, { status, evidence, verificationCycleId, actor }) {
    if (!['ACKNOWLEDGED', 'IN_PROGRESS', 'VERIFIED'].includes(status)) throw Object.assign(new Error('Only ACKNOWLEDGED, IN_PROGRESS or VERIFIED transitions accepted'), { statusCode: 400 });
    if (!actor || typeof actor !== 'string' || actor.length > 120) throw Object.assign(new Error('actor required'), { statusCode: 400 });
    return this.transaction(rows => {
      const row = rows.find(h => h.id === id);
      if (!row) throw Object.assign(new Error('Handoff not found'), { statusCode: 404 });
      const transitions = { OPEN: ['ACKNOWLEDGED'], ACKNOWLEDGED: ['IN_PROGRESS'], IN_PROGRESS: ['VERIFIED'], VERIFIED: [], RETRACTED: [] };
      if (row.status !== status && !transitions[row.status].includes(status)) throw Object.assign(new Error('Invalid handoff transition'), { statusCode: 409 });
      if (status === 'VERIFIED') {
        const report = this.report(verificationCycleId || '');
        const current = this.latest();
        const check = [...(report?.qaResults || []), ...(report?.referenceChecks || [])].find(r => r.id === row.checkId);
        if (!Array.isArray(evidence) || !evidence.length || !isCurrentReport(report) || current?.cycleId !== report.cycleId || check?.status !== 'PASS' || check.reused || !check.evidence || report.currentCommit !== report.finishedCommit || report.workingTreeHash !== report.finishedWorkingTreeHash || Date.parse(check.testedAt || check.checkedAt) < Date.parse(row.lastSeenAt)) throw Object.assign(new Error('VERIFIED requires fresh passing evidence for this exact check, after its last failure, on unchanged code'), { statusCode: 409 });
        row.verification = { evidence, cycleId: verificationCycleId, actor, verifiedAt: isoNow() };
      }
      row.status = status; row.updatedAt = isoNow(); row.lastActor = actor;
      return row;
    });
  }
  claimCycle(cycleId) {
    fs.mkdirSync(this.runtimeDir, { recursive: true, mode: 0o700 });
    let existing = readJSON(this.lockFile);
    if (existing) {
      let alive = true;
      try { process.kill(existing.pid, 0); } catch (error) { if (error.code === 'ESRCH') alive = false; }
      if (alive) return { accepted: false, ...existing };
      const old = this.report(existing.cycleId);
      if (old && ['QUEUED', 'RUNNING'].includes(old.status)) {
        Object.assign(old, { status: 'FAILED', finishedAt: isoNow(), error: 'Monitor owner terminated; no passing evidence.' }); this.saveReport(old);
      }
      fs.rmSync(this.lockFile, { force: true });
    }
    const lock = { cycleId, pid: process.pid, startedAt: isoNow(), status: 'QUEUED' };
    try { fs.writeFileSync(this.lockFile, JSON.stringify(lock), { flag: 'wx', mode: 0o600 }); }
    catch (error) { if (error.code === 'EEXIST') return { accepted: false, ...readJSON(this.lockFile) }; throw error; }
    return { accepted: true, ...lock };
  }
  adoptCycle(cycleId) {
    const lock = readJSON(this.lockFile);
    if (lock?.cycleId !== cycleId) throw new Error('Cycle lock missing/mismatch');
    atomicJSON(this.lockFile, { ...lock, pid: process.pid, status: 'RUNNING' });
  }
  releaseCycle(cycleId) { if (readJSON(this.lockFile)?.cycleId === cycleId) fs.rmSync(this.lockFile, { force: true }); }
}
export const orchestrationStore = new OrchestrationStore();
