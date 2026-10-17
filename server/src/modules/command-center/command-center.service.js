import { db } from '../../db/database.js';
import { createAgentStatusDTO, createQATestDTO, createBugDTO, createActivityEventDTO } from './command-center.dtos.js';
import { orchestrationStore, isCurrentReport, computeReleaseGate, isActiveHandoff } from './orchestration-store.js';
import { startMonitoringCycle, currentCommit } from './monitor-cycle.js';
import { playerDossierReference, readPlayerDossierDocument } from './player-dossier-reference.js';

const textEvidence = value => typeof value === 'string' ? value : JSON.stringify(value || { reason: 'Sem evidência de execução atual' });
export class CommandCenterService {
  constructor(store = orchestrationStore, startCycle = startMonitoringCycle) { this.store = store; this.startCycle = startCycle; }
  getOrchestration() {
    const config = this.store.config(); const latest = this.store.latest();
    return { ...config, playerDossierReference: playerDossierReference(), harnessCorrections: latest?.harnessCorrections || [], liveState: isCurrentReport(latest, config.cadenceMinutes) ? 'LIVE' : 'STALE', lastCycle: latest ? { cycleId: latest.cycleId, status: latest.status, currentCommit: latest.currentCommit, startedAt: latest.startedAt, finishedAt: latest.finishedAt, error: latest.error || null } : null, execution: 'Runtime-owned recurrent polling; no implicit AI writer activation', handoffWriteAPI: process.env.COMMAND_CENTER_WRITE_TOKEN ? 'TOKEN_REQUIRED' : 'DISABLED_USE_LOCAL_CLI' };
  }
  getPlayerDossierDocument(kind) { return readPlayerDossierDocument(kind); }
  getHandoffs() { return this.store.handoffs(); }
  getCycle(id) { return this.store.report(id); }
  updateHandoff(id, body) { return this.store.transition(id, body); }
  triggerSync() {
    const latest = this.store.latest();
    // Single flight is file locked; also rate-limit public trigger to one start/minute.
    if (latest && Date.now() - Date.parse(latest.startedAt) < 60000) return { cycleId: latest.cycleId, status: latest.status, accepted: false, reason: 'Existing cycle / 60-second cooldown' };
    return this.startCycle({ store: this.store });
  }
  getAgents() {
    const config = this.store.config(); const report = this.store.latest(); const handoffs = this.getHandoffs();
    return config.agents.map(agent => {
      const run = report?.agentRuns?.find(r => r.agentId === agent.id);
      const live = isCurrentReport(report, agent.cadenceMinutes) && !!run?.finishedAt;
      const bugs = handoffs.filter(h => h.sourceAgent === agent.id);
      return createAgentStatusDTO({ ...agent, status: report?.status === 'RUNNING' ? 'WORKING' : live ? run.status : agent.status, currentTask: agent.mission, progress: 0, startedAt: run?.startedAt || null, updatedAt: run?.finishedAt || null, cycleId: run ? report.cycleId : null, liveState: live ? 'LIVE' : 'STALE', qaResult: live ? run.qaResult : 'NOT_VERIFIABLE', lastTestResult: live ? run.qaResult : 'NOT_VERIFIABLE', testsRun: run?.checks || [], evidence: textEvidence(run?.evidence || { reason: 'Nenhum ciclo atual observado. Política declarativa não é execução comprovada.' }), lastError: run?.lastError || report?.error || null, openHandoffs: bugs.filter(isActiveHandoff).length, reopenedHandoffs: bugs.filter(h => h.reopenedCount > 0).length, limitations: agent.writePolicy + ' Implementação é controlada exclusivamente pelo Team Leader Manus; observadores externos apenas entregam evidências.', report: { objective: agent.mission, executedSteps: run?.checks || [], expectedResult: 'Evidência atual sem dados inventados', observedResult: live ? run.qaResult : 'STALE / NOT_VERIFIABLE', risk: 'Veto P0/P1; sem auto-release' } });
    });
  }
  getQATests() {
    const report = this.store.latest(); const fresh = isCurrentReport(report);
    const qa = report?.qaResults?.length ? report.qaResults : ['smoke', 'modals', 'sync', 'cards', 'search', 'responsive'].map(id => ({ id: `qa.${id}`, title: `QA ${id}`, area: 'Local QA', status: 'NOT_VERIFIABLE', viewport: id === 'responsive' ? '360x800 / 1440x900 — não executado' : 'Nenhum viewport real verificado', steps: ['Executar npm run monitor:once em runtime online'], expectedResult: 'Evidência atual da execução real', observedResult: 'Nenhum ciclo real finalizado', evidence: { reason: 'No current monitoring report' } }));
    return qa.map((q, index) => createQATestDTO({ ...q, id: q.id || `qa.invalid.${index}`, title: q.title || q.id || 'QA runner', area: q.area || 'Local QA', expectedResult: q.expectedResult || 'Teste real com evidência atual', status: fresh ? q.status : 'NOT_VERIFIABLE', cycleId: report?.cycleId || null, steps: q.steps?.length ? q.steps : [q.title || q.id], observedResult: fresh ? q.observedResult || q.status : `STALE: ${q.observedResult || 'Sem evidência atual'}`, evidence: textEvidence(q.evidence), priority: q.priority || q.severity || 'P1' }));
  }
  getBugs() {
    return this.getHandoffs().map(h => createBugDTO({ id: h.id, title: h.title, severity: h.priority, status: h.status === 'ACKNOWLEDGED' ? 'IN_PROGRESS' : h.status, area: h.sourceAgent, responsibleAgent: h.targetAgent, stepsToReproduce: h.reproduction, expectedResult: h.expected, observedResult: h.observed, evidence: textEvidence(h.evidence), file: h.affectedFiles?.[0], proposedFix: h.proposedNextStep, createdAt: h.createdAt, updatedAt: h.updatedAt, resolvedAt: h.verification?.verifiedAt || null }));
  }
  getExternalReferences() {
    const report = this.store.latest(); const config = this.store.config();
    return [['sleeper', 'Sleeper', 'api.sleeper.app', 'agent_sleeper_ref'], ['fantasypros', 'FantasyPros', 'www.fantasypros.com', 'agent_fantasypros_ref'], ['nfl', 'NFL', 'www.nfl.com', 'agent_nfl_news'], ['yahoo', 'Yahoo Sports', 'sports.yahoo.com', 'agent_yahoo_news']].map(([id, name, domain, agentId]) => {
      const checks = report?.referenceChecks?.filter(r => r.agentId === agentId) || [];
      const fresh = isCurrentReport(report);
      return { id, name, sourceName: name, domain, testedFlow: checks.map(c => c.id).join(", "), loadingBehavior: "NOT_VERIFIABLE: no reference browser interaction", differencesVsYardline: "Comparison requires Team Leader Manus review of external evidence", responsibleAgent: config.agents.find(a => a.id === agentId).name, observationType: fresh && checks.length && checks.every(c => c.observationType === 'OBSERVED') ? 'OBSERVED' : checks.some(c => c.reused) && fresh ? 'INFERRED' : 'NOT_VERIFIABLE', status: fresh ? checks.some(c => c.status === 'FAIL') ? 'FAIL' : checks.some(c => c.status === 'NOT_VERIFIABLE') ? 'NOT_VERIFIABLE' : checks.length ? 'PASS' : 'NOT_VERIFIABLE' : 'NOT_VERIFIABLE', liveState: fresh && checks.length ? 'LIVE' : 'STALE', url: config.referenceTargets.find(t => t.agentId === agentId)?.url, checks, analyzedFeatures: checks.map(c => c.id), evidence: textEvidence(checks.length ? checks : { reason: 'Nenhuma observação externa atual; fonte não presumida online' }), limitations: 'GET/read-only; sem login, assets proprietários, viewport real ou prova de paridade funcional.', nextAction: 'Repetir polling e entregar divergências/indisponibilidade ao Team Leader.', handoffTo: config.agents.find(a => a.id === agentId).handoffTo };
    });
  }
  getActivityTimeline() {
    const report = this.store.latest();
    return (report?.agentRuns || []).map(run => createActivityEventDTO({ id: `${report.cycleId}-${run.agentId}`, agentId: run.agentId, agentName: run.name, status: run.status, objective: this.store.config().agents.find(a => a.id === run.agentId)?.mission || run.name, stepsExecuted: run.checks, observedResult: run.qaResult, evidence: textEvidence(run.evidence), timestamp: run.finishedAt, nextAction: run.nextAction }));
  }
  getReleaseStatus() {
    const report = this.store.latest(); const handoffs = this.getHandoffs(); const gate = computeReleaseGate(report, handoffs);
    const blocked = gate.status !== 'RELEASE APROVADA';
    return { ...gate, decision: blocked ? 'BLOQUEADO PARA PRODUÇÃO' : 'APROVADO PARA PRODUÇÃO', cycleId: report?.cycleId || null, gates: ['Dados Confiáveis', 'Funcionalidade Completa', 'Paridade Comportamental', 'Fluidez & Qualidade Visual', 'Release Profissional'].map((name, index) => ({ id: index + 1, name: `Portão ${index + 1}: ${name}`, status: blocked ? 'BLOQUEADO' : 'APROVADO', criteria: ['Zero mocks oficiais; nulos/proveniência explícitos', 'Teste real atual; viewport privado/mobile pode ser NOT_VERIFIABLE', 'Comportamento observável com evidência, sem copiar código/assets', 'Browser QA + aprovação formal; JSDOM não aprova visual', '0 P0/P1 não verificados + Team Leader/Senior QA'][index] })), checklist: { openP0Bugs: handoffs.filter(h => h.priority === 'P0' && isActiveHandoff(h)).length, openP1Bugs: handoffs.filter(h => h.priority === 'P1' && isActiveHandoff(h)).length, criticalTestsFailed: (report?.qaResults || []).filter(q => ['P0', 'P1'].includes(q.severity) && q.status !== 'PASS').length, backendTestsPassing: isCurrentReport(report) && report.qaResults.some(q => q.id === 'qa.unit' && q.status === 'PASS'), sha256ParityConfirmed: null, sqliteTrackedInGit: false, noEmojisInNavigation: null, seniorQaVetoActive: blocked } };
  }
  getDashboard() {
    const agents = this.getAgents(); const bugs = this.getBugs(); const qaTests = this.getQATests(); const release = this.getReleaseStatus(); const report = this.store.latest(); const handoffs = this.getHandoffs(); const live = isCurrentReport(report);
    const unresolved = bugs.filter(isActiveHandoff);
    let metrics = null; let dbError = null;
    try { metrics = { totalPlayers: db.prepare('SELECT count(*) AS count FROM players').get().count, totalRosters: db.prepare('SELECT count(*) AS count FROM rosters').get().count, totalMatchups: db.prepare('SELECT count(*) AS count FROM matchups').get().count }; }
    catch (error) { dbError = error.message; }
    const qaCheck = id => report?.qaResults?.find(r => r.id === id);
    const service = (id, port) => ({ port, status: live && qaCheck(id)?.status === 'PASS' ? 'HEALTHY' : 'NOT_VERIFIABLE', latencyMs: live ? qaCheck(id)?.evidence?.latencyMs ?? null : null, lastSync: report?.finishedAt || null });
    const p0 = unresolved.filter(b => b.severity === 'P0').length; const p1 = unresolved.filter(b => b.severity === 'P1').length;
    return { overallHealth: p0 ? 'BLOCKED / CRITICAL' : p1 ? 'DEGRADED' : !live ? 'STALE' : release.status === 'RELEASE BLOQUEADA' ? 'AUDITING' : 'HEALTHY', healthReasons: release.blockingReasons, releaseStatus: release.status, releaseBlockingReason: release.blockingReasons.join(' | '), liveState: live ? 'LIVE' : 'STALE', lastCycle: this.getOrchestration().lastCycle, cadenceMinutes: this.store.config().cadenceMinutes, agentsSummary: { total: agents.length, active: agents.filter(a => ['WORKING', 'NEEDS_REVIEW'].includes(a.status)).length, blocked: agents.filter(a => ['BLOCKED', 'WAITING_DEPENDENCY'].includes(a.status)).length, completed: 0 }, bugsSummary: { p0, p1, p2: unresolved.filter(b => b.severity === 'P2').length, p3: unresolved.filter(b => b.severity === 'P3').length }, handoffsSummary: { open: handoffs.filter(isActiveHandoff).length, retracted: handoffs.filter(h => h.status === 'RETRACTED').length, reopened: handoffs.filter(h => h.reopenedCount > 0).length, newInLastCycle: report?.newBugs?.length || 0, reopenedInLastCycle: report?.reopenedBugs?.length || 0 }, qaSummary: { total: qaTests.length, pass: qaTests.filter(q => q.status === 'PASS').length, fail: qaTests.filter(q => q.status === 'FAIL').length, blocked: qaTests.filter(q => q.status === 'BLOCKED').length, notVerifiable: qaTests.filter(q => q.status === 'NOT_VERIFIABLE').length, notTested: qaTests.filter(q => q.status === 'NOT_TESTED').length }, services: { backend: service('qa.api', 3001), frontend: { ...service('qa.web', 8080), url: process.env.APP_URL || 'http://127.0.0.1:8080/' }, database: { type: 'SQLite', status: dbError ? 'NOT_VERIFIABLE' : 'OBSERVED', metrics, error: dbError }, githubSync: { port: 8788, status: 'NOT_VERIFIABLE', policy: 'FETCH_ONLY; manual reviewed push' }, newsWorker: { port: 8787, status: 'NOT_VERIFIABLE' }, sleeperStack: { port: 3000, status: 'NOT_VERIFIABLE', leagueId: this.store.config().leagueId } }, lastBuild: { timestamp: report?.finishedAt || null, commit: report?.currentCommit || currentCommit(), branch: null, status: live ? report.status : 'NOT_VERIFIABLE' }, lastSyncSleeper: live && qaCheck('qa.sync')?.status === 'PASS' ? qaCheck('qa.sync').testedAt : null, lastNflFeed: report?.referenceChecks?.find(c => c.id === 'nfl.news')?.checkedAt || null, lastYahooFeed: report?.referenceChecks?.find(c => c.id === 'yahoo.news')?.checkedAt || null, lastError: report?.error || report?.agentRuns?.find(r => r.lastError)?.lastError || null, generatedAt: new Date().toISOString() };
  }
  getContractsAndArchitecture() {
    const contracts = {
      version: '1.0.0',
      guarantees: [
        'null jamais vira zero (0.0)',
        'null ou status desconhecido jamais vira "Saudável"',
        'Roster desconhecido jamais vira Roster 2 por conveniência',
        'Erro na API jamais é mascarado como sucesso',
        'Mock jamais é apresentado como dado oficial de produção',
        'Projeção vazia permanece null ou explicitamente unprojected',
        'Temporada regular jamais se transforma em playoffs silenciosamente',
        'ID da Sleeper jamais é inferido automaticamente como ID da ESPN',
        'Notícia sem fonte e link canônico é descartada',
        'Cálculo de pontuação exige breakdown explícito por regra aplicada',
        'Pontos do banco de reservas NUNCA somam no placar do confronto oficial'
      ],
      contracts: [
        {
          name: 'PlayerCardDTO',
          description: 'Contrato canônico para cards de jogadores e modal de dossiê analítico',
          fields: [
            { field: 'id', type: 'string', required: true, rule: 'Identificador canônico único' },
            { field: 'sleeperId', type: 'string | null', required: false, rule: 'ID oficial no catálogo Sleeper' },
            { field: 'espnId', type: 'string | null', required: false, rule: 'ID oficial no catálogo ESPN (isolado)' },
            { field: 'name', type: 'string', required: true, rule: 'Nome completo do atleta' },
            { field: 'position', type: 'string', required: true, rule: 'QB | RB | WR | TE | K | DL | LB | DB | FLEX' },
            { field: 'team', type: 'string | null', required: false, rule: 'Sigla oficial NFL (SF, DAL, BAL, etc.)' },
            { field: 'jersey', type: 'string | null', required: false, rule: 'Número da camisa' },
            { field: 'injuryStatus', type: 'string | null', required: false, rule: 'Active | Questionable | Doubtful | Out | IR | null' },
            { field: 'photoUrl', type: 'string | null', required: false, rule: 'URL oficial ESPN CDN ou fallback Sleeper' },
            { field: 'metrics', type: 'MetricDTO', required: true, rule: 'Métricas canônicas com nulos preservados' },
            { field: 'provenance', type: 'DataStatusDTO', required: true, rule: 'Origem oficial e timestamp' }
          ]
        },
        {
          name: 'MatchupDTO',
          description: 'Contrato canônico para confrontos entre elencos (Game Center)',
          fields: [
            { field: 'id', type: 'string', required: true, rule: 'ID formatado: matchup_{week}_{matchupId}' },
            { field: 'matchupId', type: 'number', required: true, rule: 'ID do confronto (1 a 8 na liga de 16 times)' },
            { field: 'week', type: 'number', required: true, rule: 'Semana ativa da NFL' },
            { field: 'rosterAId / homeRosterId', type: 'number', required: true, rule: 'ID do elenco mandante' },
            { field: 'rosterBId / awayRosterId', type: 'number', required: true, rule: 'ID do elenco visitante' },
            { field: 'scoreA / homeScore', type: 'number | null', required: false, rule: 'Placar oficial titular mandante' },
            { field: 'scoreB / awayScore', type: 'number | null', required: false, rule: 'Placar oficial titular visitante' },
            { field: 'players', type: 'Array<string>', required: true, rule: 'Lista de IDs de todos os atletas envolvidos' },
            { field: 'provenance', type: 'DataStatusDTO', required: true, rule: 'Origem oficial e timestamp' }
          ]
        },
        {
          name: 'RosterDTO',
          description: 'Contrato canônico para elencos da liga (16 times)',
          fields: [
            { field: 'rosterId', type: 'number', required: true, rule: 'ID do elenco (1 a 16)' },
            { field: 'owner', type: 'string', required: true, rule: 'Username do manager (@Faraco, @neyllon, etc.)' },
            { field: 'teamName', type: 'string', required: true, rule: 'Nome fantasia do time' },
            { field: 'starters', type: 'Array<string>', required: true, rule: 'Exatamente 19 IDs de atletas titulares' },
            { field: 'players', type: 'Array<string>', required: true, rule: 'Todos os atletas sob contrato (titulares + banco)' },
            { field: 'record', type: 'string', required: true, rule: 'Campanha: V-D ou V-D-E' },
            { field: 'fpts', type: 'number', required: true, rule: 'Total de pontos feitos na temporada' },
            { field: 'fptsAgainst', type: 'number', required: true, rule: 'Total de pontos contra' }
          ]
        },
        {
          name: 'AgentStatusDTO',
          description: 'Contrato de telemetria operacional de cada um dos 15 agentes',
          fields: [
            { field: 'id', type: 'string', required: true, rule: 'Identificador do agente' },
            { field: 'name', type: 'string', required: true, rule: 'Nome formal do agente' },
            { field: 'role', type: 'string', required: true, rule: 'Responsabilidade e limite de atuação' },
            { field: 'status', type: 'AGENT_STATUS', required: true, rule: 'IDLE | WORKING | BLOCKED | FAILED | COMPLETED' },
            { field: 'progress', type: 'number', required: true, rule: 'Percentual de 0 a 100' },
            { field: 'filesModified', type: 'Array<string>', required: true, rule: 'Lista de arquivos alterados com evidência' },
            { field: 'testsRun', type: 'Array<string>', required: true, rule: 'Testes executados com resultado' }
          ]
        }
      ]
    };
    contracts.version = '2.0.0';
    contracts.guarantees.push('PASS exige evidência atual do commit/árvore; STALE não é aprovação', 'Ciclo contínuo não usa COMPLETED', 'observadores externos consomem relatórios; Git sync faz somente fetch, sem implementação/push');
    contracts.contracts.find(c => c.name === 'AgentStatusDTO').fields.find(f => f.field === 'status').rule = 'WORKING | BLOCKED | NEEDS_REVIEW | WAITING_DEPENDENCY; contínuo nunca COMPLETED';
    contracts.contracts.push({ name: 'AgentHandoff', description: 'Fila persistida de decisão do Team Leader Manus', fields: ['id','checkId','sourceAgent','targetAgent','priority','title','observed','expected','reproduction','evidence','affectedFiles','proposedNextStep','status','createdAt','updatedAt'].map(field => ({ field, type: ['evidence','affectedFiles','reproduction'].includes(field) ? 'array' : 'string', required: true, rule: field === 'status' ? 'OPEN/ACKNOWLEDGED/IN_PROGRESS/VERIFIED; RETRACTED somente falso positivo com histórico; QA fresco do check exato' : 'Rastreável ao cycleId; deduplicação/reabertura sourceAgent + checkId exatos; sem segredos' })) });
    contracts.contracts.push({ name: 'YardlineDossierContract', description: 'Requisito comportamental, não claim de paridade visual', fields: [{ field: 'provenance', type: 'official/derived/editorial', required: true, rule: 'Sleeper identidade/roster/scoring; Yardline cálculos; NFL/Yahoo editorial' }, { field: 'tabs', type: 'array', required: true, rule: this.store.config().dossierContract.requiredTabs.join(', ') }] });
    contracts.playerDossierReference = playerDossierReference();
    contracts.dossierContract = this.store.config().dossierContract;
    contracts.guarantees.push('RETRACTED preserva falso positivo do harness, não é VERIFIED de produto; falha real reabre o mesmo check', 'Dossier via card/opener e identidade hidratada; dependência ausente não significa oito abas ausentes');
    return contracts;
  }

}
export const commandCenterService = new CommandCenterService();
