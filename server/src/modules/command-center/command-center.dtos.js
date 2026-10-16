/**
 * YARDLINE — AGENT COMMAND CENTER DTOs & CONTRATOS CANÔNICOS
 * Define as estruturas de dados para governança, auditoria, QA e release.
 */

// ========================================================
// 1. STATUS E SEVERIDADES ENUMERADAS
// ========================================================

export const AGENT_STATUS = {
  IDLE: 'IDLE',
  WORKING: 'WORKING',
  BLOCKED: 'BLOCKED',
  FAILED: 'FAILED',
  COMPLETED: 'COMPLETED',
  NEEDS_REVIEW: 'NEEDS_REVIEW',
  WAITING_DEPENDENCY: 'WAITING_DEPENDENCY'
};

export const QA_STATUS = {
  PASS: 'PASS',
  FAIL: 'FAIL',
  BLOCKED: 'BLOCKED',
  NOT_VERIFIABLE: 'NOT_VERIFIABLE',
  NOT_TESTED: 'NOT_TESTED'
};

export const BUG_SEVERITY = {
  P0: 'P0', // Bloqueia Release
  P1: 'P1', // Bloqueia Feature
  P2: 'P2', // Degrada Qualidade
  P3: 'P3'  // Melhoria Futura
};

export const BUG_STATUS = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  VERIFIED: 'VERIFIED',
  CLOSED: 'CLOSED'
};

export const OBSERVATION_TYPE = {
  OBSERVED: 'OBSERVED',
  INFERRED: 'INFERRED',
  NOT_VERIFIABLE: 'NOT_VERIFIABLE'
};

// ========================================================
// 2. FÁBRICAS DE DTOs DO COMMAND CENTER
// ========================================================

/**
 * Cria e valida um AgentStatusDTO
 */
export function createAgentStatusDTO(raw = {}) {
  if (!raw.id || !raw.name || !raw.role) {
    throw new Error('[AgentStatusDTO] id, name e role são obrigatórios.');
  }

  const validStatuses = Object.values(AGENT_STATUS);
  const status = validStatuses.includes(raw.status) ? raw.status : AGENT_STATUS.IDLE;

  return {
    id: String(raw.id),
    name: String(raw.name),
    role: String(raw.role),
    status,
    currentTask: String(raw.currentTask || 'Aguardando próxima diretiva do Team Leader'),
    priority: ['P0', 'P1', 'P2', 'P3'].includes(raw.priority) ? raw.priority : 'P1',
    progress: Math.min(100, Math.max(0, Number(raw.progress) || 0)),
    startedAt: raw.startedAt ? String(raw.startedAt) : new Date().toISOString(),
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : new Date().toISOString(),
    durationMinutes: Number(raw.durationMinutes) || 0,
    filesModified: Array.isArray(raw.filesModified) ? raw.filesModified.map(String) : [],
    testsRun: Array.isArray(raw.testsRun) ? raw.testsRun.map(String) : [],
    lastTestResult: raw.lastTestResult ? String(raw.lastTestResult) : 'N/A',
    blocks: Array.isArray(raw.blocks) ? raw.blocks.map(String) : [],
    dependencies: Array.isArray(raw.dependencies) ? raw.dependencies.map(String) : [],
    nextAction: String(raw.nextAction || 'Monitorar pipeline'),
    evidence: raw.evidence ? String(raw.evidence) : null,
    limitations: raw.limitations ? String(raw.limitations) : null,
    report: raw.report ? {
      objective: String(raw.report.objective || ''),
      executedSteps: Array.isArray(raw.report.executedSteps) ? raw.report.executedSteps.map(String) : [],
      expectedResult: String(raw.report.expectedResult || ''),
      observedResult: String(raw.report.observedResult || ''),
      rootCause: raw.report.rootCause ? String(raw.report.rootCause) : null,
      risk: String(raw.report.risk || 'Baixo')
    } : null
  };
}

/**
 * Cria e valida um QATestDTO
 */
export function createQATestDTO(raw = {}) {
  if (!raw.id || !raw.title || !raw.area) {
    throw new Error('[QATestDTO] id, title e area são obrigatórios.');
  }

  const validStatuses = Object.values(QA_STATUS);
  const status = validStatuses.includes(raw.status) ? raw.status : QA_STATUS.NOT_TESTED;

  return {
    id: String(raw.id),
    title: String(raw.title),
    area: String(raw.area),
    assignedAgent: String(raw.assignedAgent || 'Senior QA / E2E Tester'),
    priority: ['P0', 'P1', 'P2', 'P3'].includes(raw.priority) ? raw.priority : 'P1',
    route: String(raw.route || '/'),
    viewport: String(raw.viewport || '1440x900 (Desktop)'),
    authState: String(raw.authState || 'Autenticado (@Faraco)'),
    preconditions: Array.isArray(raw.preconditions) ? raw.preconditions.map(String) : [],
    steps: Array.isArray(raw.steps) ? raw.steps.map(String) : [],
    expectedResult: String(raw.expectedResult || ''),
    observedResult: String(raw.observedResult || ''),
    evidence: String(raw.evidence || ''),
    consoleLogs: Array.isArray(raw.consoleLogs) ? raw.consoleLogs.map(String) : [],
    networkRequests: Array.isArray(raw.networkRequests) ? raw.networkRequests : [],
    affectedFile: raw.affectedFile ? String(raw.affectedFile) : null,
    status,
    severity: ['P0', 'P1', 'P2', 'P3'].includes(raw.severity) ? raw.severity : 'P1',
    testedAt: raw.testedAt ? String(raw.testedAt) : new Date().toISOString(),
    regressionTest: raw.regressionTest ? String(raw.regressionTest) : null
  };
}

/**
 * Cria e valida um BugDTO
 */
export function createBugDTO(raw = {}) {
  if (!raw.id || !raw.title || !raw.severity) {
    throw new Error('[BugDTO] id, title e severity são obrigatórios.');
  }

  return {
    id: String(raw.id),
    title: String(raw.title),
    severity: ['P0', 'P1', 'P2', 'P3'].includes(raw.severity) ? raw.severity : 'P2',
    status: Object.values(BUG_STATUS).includes(raw.status) ? raw.status : BUG_STATUS.OPEN,
    area: String(raw.area || 'Geral'),
    responsibleAgent: String(raw.responsibleAgent || 'Team Leader'),
    route: String(raw.route || '/'),
    file: raw.file ? String(raw.file) : null,
    line: raw.line != null ? Number(raw.line) : null,
    stepsToReproduce: Array.isArray(raw.stepsToReproduce) ? raw.stepsToReproduce.map(String) : [],
    expectedResult: String(raw.expectedResult || ''),
    observedResult: String(raw.observedResult || ''),
    evidence: String(raw.evidence || ''),
    rootCause: raw.rootCause ? String(raw.rootCause) : null,
    proposedFix: raw.proposedFix ? String(raw.proposedFix) : null,
    regressionTest: raw.regressionTest ? String(raw.regressionTest) : null,
    dependencies: Array.isArray(raw.dependencies) ? raw.dependencies.map(String) : [],
    createdAt: raw.createdAt ? String(raw.createdAt) : new Date().toISOString(),
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : new Date().toISOString(),
    resolvedAt: raw.resolvedAt ? String(raw.resolvedAt) : null
  };
}

/**
 * Cria e valida um IntegrationStatusDTO
 */
export function createIntegrationStatusDTO(raw = {}) {
  return {
    service: String(raw.service || 'unknown'),
    endpoint: String(raw.endpoint || ''),
    status: raw.status === 'HEALTHY' || raw.status === 'WARNING' || raw.status === 'ERROR' ? raw.status : 'HEALTHY',
    statusCode: Number(raw.statusCode) || 200,
    responseTimeMs: Number(raw.responseTimeMs) || 0,
    lastSyncAt: raw.lastSyncAt ? String(raw.lastSyncAt) : new Date().toISOString(),
    recordsCount: raw.recordsCount != null ? Number(raw.recordsCount) : null,
    error: raw.error ? String(raw.error) : null
  };
}

/**
 * Cria e valida um ActivityEventDTO
 */
export function createActivityEventDTO(raw = {}) {
  if (!raw.id || !raw.agentId || !raw.objective) {
    throw new Error('[ActivityEventDTO] id, agentId e objective são obrigatórios.');
  }

  return {
    id: String(raw.id),
    agentId: String(raw.agentId),
    agentName: String(raw.agentName || raw.agentId),
    area: String(raw.area || 'Core'),
    status: Object.values(AGENT_STATUS).includes(raw.status) ? raw.status : AGENT_STATUS.COMPLETED,
    priority: ['P0', 'P1', 'P2', 'P3'].includes(raw.priority) ? raw.priority : 'P1',
    objective: String(raw.objective),
    stepsExecuted: Array.isArray(raw.stepsExecuted) ? raw.stepsExecuted.map(String) : [],
    expectedResult: String(raw.expectedResult || ''),
    observedResult: String(raw.observedResult || ''),
    evidence: String(raw.evidence || ''),
    filesModified: Array.isArray(raw.filesModified) ? raw.filesModified.map(String) : [],
    testsExecuted: Array.isArray(raw.testsExecuted) ? raw.testsExecuted.map(String) : [],
    rootCause: raw.rootCause ? String(raw.rootCause) : null,
    nextAction: String(raw.nextAction || 'Próxima etapa'),
    dependencies: Array.isArray(raw.dependencies) ? raw.dependencies.map(String) : [],
    risk: String(raw.risk || 'Baixo'),
    timestamp: raw.timestamp ? String(raw.timestamp) : new Date().toISOString()
  };
}
