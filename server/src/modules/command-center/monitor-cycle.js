import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { REPO_ROOT, orchestrationStore, isoNow, computeReleaseGate, isActiveHandoff } from './orchestration-store.js';
import { runReferenceChecks } from './reference-monitor.js';
import { runLocalSmoke, runUnitQA } from './local-qa.js';
import { playerDossierReference } from './player-dossier-reference.js';

import { currentCommit, codeHash } from './code-state.js';
export { currentCommit, codeHash } from './code-state.js';

export function startMonitoringCycle({ store = orchestrationStore, launch = spawn } = {}) {
  if (process.env.MONITOR_CHILD === '1' && launch === spawn) throw Object.assign(new Error('Nested monitor disabled inside QA suite'), { statusCode: 409 });
  const cycleId = `cycle-${crypto.randomUUID()}`;
  const lock = store.claimCycle(cycleId);
  if (!lock.accepted) return { cycleId: lock.cycleId, status: 'RUNNING', accepted: false };
  const previousCycleId = store.latest()?.cycleId || null;
  const report = { cycleId, previousCycleId, status: 'QUEUED', currentCommit: currentCommit(), workingTreeHash: codeHash(), startedAt: isoNow(), finishedAt: null, agentRuns: [], referenceChecks: [], qaResults: [], newBugs: [], reopenedBugs: [], releaseGate: { status: 'RELEASE BLOQUEADA', blockingReasons: ['Ciclo aguardando execução; nenhuma evidência de PASS.'] }, nextActions: ['Aguardar worker; consumir handoffs pelo Team Leader.'] };
  store.saveReport(report);
  const logFile = path.join(store.runtimeDir, `${cycleId}.log`); const output = fs.openSync(logFile, 'w', 0o600);
  let child;
  try {
    child = launch(process.execPath, [path.join(REPO_ROOT, 'server/scripts/run-hourly-monitor.js'), '--cycle-id', cycleId], { cwd: REPO_ROOT, env: { ...process.env, COMMAND_CENTER_DATA_DIR: store.dataDir }, stdio: ['ignore', output, output], shell: false, windowsHide: true });
  } catch (error) { fs.closeSync(output); Object.assign(report, { status: 'FAILED', finishedAt: isoNow(), error: error.message }); store.saveReport(report); store.releaseCycle(cycleId); throw error; }
  fs.closeSync(output);
  const timer = setTimeout(() => { child.kill('SIGTERM'); setTimeout(() => child.kill('SIGKILL'), 2000).unref(); }, store.config().maxCycleMinutes * 60000);
  timer.unref();
  const failed = error => {
    clearTimeout(timer);
    const latest = store.report(cycleId);
    if (latest && ['QUEUED', 'RUNNING'].includes(latest.status)) {
      Object.assign(latest, { status: 'FAILED', finishedAt: isoNow(), error: error.message || String(error) });
      latest.releaseGate = computeReleaseGate(latest, store.handoffs()); store.saveReport(latest);
    }
    store.releaseCycle(cycleId);
  };
  child.once('error', failed);
  child.once('close', (code, signal) => failed(new Error(`Worker exited code=${code}; signal=${signal || 'none'}. Missing finished report.`)));
  return { cycleId, status: 'QUEUED', accepted: true, logFile };
}
function matches(patterns, id) { return patterns.some(p => p.endsWith('*') ? id.startsWith(p.slice(0, -1)) : p === id); }
export async function runMonitoringCycle({ store = orchestrationStore, cycleId, referenceRunner = runReferenceChecks, smokeRunner = runLocalSmoke, unitRunner = runUnitQA } = {}) {
  let claim;
  if (!cycleId) { cycleId = `cycle-${crypto.randomUUID()}`; claim = store.claimCycle(cycleId); if (!claim.accepted) return { cycleId: claim.cycleId, status: 'RUNNING', accepted: false }; }
  else store.adoptCycle(cycleId);
  const latest = store.latest();
  const previous = latest?.previousCycleId ? store.report(latest.previousCycleId) : latest;
  const config = store.config();
  const report = { cycleId, status: 'RUNNING', mode: 'POLLING_READ_ONLY', currentCommit: currentCommit(), workingTreeHash: codeHash(), startedAt: isoNow(), finishedAt: null, agentRuns: [], referenceChecks: [], qaResults: [], newBugs: [], reopenedBugs: [], releaseGate: { status: 'RELEASE BLOQUEADA', blockingReasons: ['Ciclo em execução'] }, nextActions: [], limitations: ['Recurring read-only polling, not 100% coverage or push-based real-time monitoring.', 'No reference login, private flows, purchases or mutation.', 'JSDOM is not a real viewport; mobile/responsive/focus trapping may be NOT_VERIFIABLE.', 'Declarative agents run deterministic assigned checks; no LLM/Antigravity writer is implicitly resumed.'] };
  store.saveReport(report);
  try {
    // Independent scopes: external outage must not skip local tests, and vice versa.
    const scopes = await Promise.allSettled([
      referenceRunner(config, { previousReport: previous }),
      smokeRunner(config),
      unitRunner(path.join(store.runtimeDir, 'logs', `${cycleId}-npm-test.log`))
    ]);
    if (scopes[0].status === 'fulfilled') { report.referenceChecks = scopes[0].value.checks; report.editorialComparison = scopes[0].value.editorialComparison; }
    else report.referenceChecks = [{ id: 'reference.runner', agentId: 'agent_devops', status: 'NOT_VERIFIABLE', observationType: 'NOT_VERIFIABLE', checkedAt: isoNow(), httpStatus: null, latencyMs: null, error: scopes[0].reason.message, evidence: { reason: scopes[0].reason.message } }];
    for (let index = 1; index < scopes.length; index++) {
      if (scopes[index].status === 'fulfilled') report.qaResults.push(...(Array.isArray(scopes[index].value) ? scopes[index].value : [scopes[index].value]));
      else report.qaResults.push({ id: `qa.runner.${index}`, title: 'QA runner failure', status: 'BLOCKED', severity: 'P0', priority: 'P0', testedAt: isoNow(), observedResult: scopes[index].reason.message, expectedResult: 'Runner completes with fresh evidence', steps: ['Run monitor'], viewport: 'Node', evidence: { error: scopes[index].reason.message } });
    }
    // Explicit correction, not blanket auto-resolution. Retain old evidence and exact IDs for recurrence.
    report.harnessCorrections = store.reconcileHarnessFalsePositives(report.qaResults, cycleId);
    report.playerDossierHandoff = config.dossierContract.implementationHandoff;
    report.playerDossierReference = playerDossierReference();
    for (const check of [...report.referenceChecks, ...report.qaResults]) {
      if (check.status === 'PASS') continue;
      const dossierTabIds = ['latest-news', 'game-logs', 'season-stats', 'outlook', 'news-analysis', 'depth-chart', 'leagues', 'full-profile'].map(tab => `qa.dossier.tab.${tab}`);
      const granularDossierPass = dossierTabIds.every(id => report.qaResults.some(result => result.id === id && result.status === 'PASS' && !result.reused)) && report.qaResults.some(result => result.id === 'qa.dossier.observed.sentiment' && result.status === 'PASS' && !result.reused);
      const granularModalPass = report.qaResults.filter(result => result.id.startsWith('qa.modal.') && result.id !== 'qa.modal.all').length > 0 && report.qaResults.filter(result => result.id.startsWith('qa.modal.') && result.id !== 'qa.modal.all').every(result => result.status === 'PASS' && !result.reused);
      if ((check.id === 'qa.dossier' && granularDossierPass) || (check.id === 'qa.modal.all' && granularModalPass)) continue;
      const isReference = !!check.agentId;
      const sourceAgent = check.agentId || 'agent_qa_senior';
      const agent = config.agents.find(a => a.id === sourceAgent);
      const priority = isReference ? (check.status === 'FAIL' && ['sleeper.league', 'sleeper.players', 'sleeper.rosters'].includes(check.id) ? 'P1' : 'P2') : check.status === 'NOT_VERIFIABLE' ? (check.id.startsWith('qa.dossier') ? 'P1' : 'P2') : check.priority || check.severity || 'P1';
      const raw = { sourceAgent, targetAgent: agent?.handoffTo || 'Antigravity / Team Leader + QA', priority, checkId: check.id, title: `${check.status}: ${check.title || check.id}`, observed: check.error || check.observedResult || check.status, expected: check.expectedResult || 'GET público verificável com integridade e freshness explícita', reproduction: isReference ? [`GET ${check.url || '(no documented route)'}`, 'Run npm run monitor:once; inspect referenceChecks'] : check.steps || ['cd server && npm run monitor:once'], evidence: [{ cycleId, currentCommit: report.currentCommit, checkedAt: check.checkedAt || check.testedAt, ...(typeof check.evidence === 'object' ? check.evidence : { detail: check.evidence }) }], affectedFiles: check.affectedFiles || (isReference ? ['server/src/modules/command-center/reference-monitor.js', 'server/data/agent-orchestration.json'] : ['yardline-app/js/data_and_views.js', 'yardline-app/js/engines.js', 'server/test']), proposedNextStep: isReference && check.status === 'NOT_VERIFIABLE' ? 'Team Leader revisar rota/rede/gate público; não bypass/login; não confundir indisponibilidade com bug de produto.' : 'Team Leader priorizar e distribuir ao escritor Antigravity. Corrigir, anexar diff/teste e solicitar ciclo fresco para VERIFIED.' };
      raw.qaStatus = check.status;
      raw.issueType = check.issueType || (check.status === 'FAIL' ? 'OBSERVED_FAILURE' : 'VERIFICATION_DEPENDENCY');
      if (check.id.startsWith('qa.dossier')) {
        raw.referenceDocuments = [config.dossierContract.playerAudit?.path, config.dossierContract.implementationHandoff?.path].filter(Boolean);
        raw.evidence[0].versionedReferences = report.playerDossierReference;
        raw.targetAgent = 'Antigravity / Team Leader + Frontend + Data + Senior QA';
        raw.proposedNextStep = 'Team Leader revisar relatório Bijan e handoff versionados; implementar os oito contextos/mescla de layout com dados reais e proveniência. Não distribuir claims antigos de oito abas ausentes; revisar harnessCorrections e observedTabs. Sem implementação automática nesta correção.';
      } else if (check.id === 'qa.console' && check.status === 'NOT_VERIFIABLE') {
        raw.proposedNextStep = 'Revisar logs/deniedRequests e dependências de ambiente/terceiro em navegador autorizado. Não tratar bloqueio intencional como bug; preservar exceções reais e falhas anteriores até verificação exata.';
      }
      const item = store.upsertHandoff(raw, cycleId);
      if (item.action === 'NEW') report.newBugs.push(item.handoff.id);
      if (item.action === 'REOPENED') report.reopenedBugs.push(item.handoff.id);
    }
    store.markPassingChecks([...report.referenceChecks, ...report.qaResults].filter(r => r.status === 'PASS' && !r.reused).map(r => r.id), cycleId);
    for (const agent of config.agents) {
      const checks = [...report.referenceChecks, ...report.qaResults].filter(r => matches(agent.monitorTargets, r.id));
      const own = checks.filter(r => !r.reused);
      const hasFailure = checks.some(r => ['FAIL', 'BLOCKED'].includes(r.status));
      const hasUnknown = checks.some(r => r.status === 'NOT_VERIFIABLE');
      report.agentRuns.push({ agentId: agent.id, name: agent.name, status: hasFailure ? 'BLOCKED' : hasUnknown ? 'NEEDS_REVIEW' : agent.status === 'WAITING_DEPENDENCY' ? 'WAITING_DEPENDENCY' : 'WORKING', qaResult: checks.some(r => r.status === 'FAIL') ? 'FAIL' : checks.some(r => r.status === 'BLOCKED') ? 'BLOCKED' : hasUnknown ? 'NOT_VERIFIABLE' : checks.length ? 'PASS' : 'NOT_VERIFIABLE', startedAt: report.startedAt, finishedAt: isoNow(), checks: checks.map(r => r.id), evidence: own.map(r => ({ checkId: r.id, status: r.status, checkedAt: r.checkedAt || r.testedAt, evidence: r.evidence })), lastError: checks.find(r => r.error || ['FAIL', 'BLOCKED'].includes(r.status))?.error || checks.find(r => ['FAIL', 'BLOCKED'].includes(r.status))?.observedResult || null, nextAction: agent.nextAction, executionType: 'Deterministic checks assigned by declarative mission; implementation/reasoning remains Antigravity responsibility' });
    }
    report.coordinatorRun = { ...config.coordinator, status: 'NEEDS_REVIEW', receivedHandoffs: store.handoffs().filter(isActiveHandoff).map(h => h.id), retractedHandoffs: store.handoffs().filter(h => h.status === 'RETRACTED').map(h => h.id), playerDossierHandoff: report.playerDossierHandoff, nextAction: 'Antigravity Team Leader must review harnessCorrections and player dossier documents BEFORE ACK/prioritize/assign. No automated distribution or human approval.' };
    report.status = 'FINISHED';
  } catch (error) { report.status = 'FAILED'; report.error = error.message; }
  finally {
    report.finishedAt = isoNow(); report.finishedCommit = currentCommit(); report.finishedWorkingTreeHash = codeHash();
    report.releaseGate = computeReleaseGate(report, store.handoffs());
    report.releaseStatus = report.releaseGate.status;
    report.nextActions = ['Team Leader revisar harnessCorrections antes de consumir OPEN/ACKNOWLEDGED/IN_PROGRESS; RETRACTED é correção de QA, não VERIFIED de produto.', 'Consultar docs/fantasypros-bijan-yardline-audit.md e docs/player-dossier-team-leader-handoff.md; não distribuir oito claims antigos de abas ausentes.', 'Antigravity implementar somente após revisão; anexar dados/proveniência, evidência, solicitar QA e VERIFIED do check exato.', 'Iniciar serviço declarado no runtime local para polling horário; não há garantia de atividade quando host está offline.', ...report.releaseGate.blockingReasons];
    store.saveReport(report); store.releaseCycle(cycleId);
  }
  return report;
}
