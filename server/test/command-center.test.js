import { test } from 'node:test';
import assert from 'node:assert';
import { commandCenterService } from '../src/modules/command-center/command-center.service.js';
import {
  AGENT_STATUS,
  QA_STATUS,
  BUG_SEVERITY,
  createAgentStatusDTO,
  createQATestDTO,
  createBugDTO
} from '../src/modules/command-center/command-center.dtos.js';

test('Command Center — Todos os 15 Agentes Obrigatórios estão presentes e ativos', () => {
  const agents = commandCenterService.getAgents();
  assert.strictEqual(agents.length, 15, 'Devem existir exatamente 15 agentes monitorados');

  const requiredRoles = [
    'Product Owner / Requirements Agent',
    'Sleeper Reference Agent',
    'FantasyPros Reference Agent',
    'NFL News Reference Agent',
    'Yahoo News Reference Agent',
    'Senior QA / E2E Tester',
    'Backend / API Lead',
    'Data Engineer / Database Lead',
    'Sleeper Integration Specialist',
    'Scoring and Fantasy Rules Engineer',
    'Frontend Lead',
    'Design System / UI Lead',
    'Accessibility and Interaction Agent',
    'Security and Privacy Agent',
    'DevOps / Release Agent'
  ];

  requiredRoles.forEach(roleName => {
    const found = agents.find(a => a.name === roleName);
    assert.ok(found, `Agente '${roleName}' deve existir no Command Center`);
    assert.ok(found.currentTask, `Agente '${roleName}' deve possuir tarefa atual descrita`);
    assert.ok(Object.values(AGENT_STATUS).includes(found.status), `Status do agente '${roleName}' deve ser válido`);
    assert.ok(Array.isArray(found.filesModified), `filesModified do agente '${roleName}' deve ser array`);
    assert.ok(Array.isArray(found.testsRun), `testsRun do agente '${roleName}' deve ser array`);
  });
});

test('Command Center — Regra de Ouro: Saúde nunca é HEALTHY se houver P0, P1 ou teste reprovado', () => {
  const dashboard = commandCenterService.getDashboard();
  assert.ok(dashboard, 'Dashboard deve retornar dados consolidados');
  assert.ok(dashboard.overallHealth, 'overallHealth deve estar presente');

  // Se houver P0 ou P1 aberto, overallHealth JAMAIS pode ser 'HEALTHY'
  if (dashboard.bugsSummary.p0 > 0 || dashboard.bugsSummary.p1 > 0 || dashboard.qaSummary.fail > 0) {
    assert.notStrictEqual(dashboard.overallHealth, 'HEALTHY', 'Saúde jamais pode ser HEALTHY com bugs impeditivos ou falhas de QA');
  }

  assert.ok(dashboard.services.backend.port === 3001);
  assert.ok(dashboard.services.frontend.port === 8080);
  assert.strictEqual(dashboard.services.database.type, 'SQLite');
});

test('Command Center — QA Senior possui casos reais com status estritos e múltiplos viewports', () => {
  const qaTests = commandCenterService.getQATests();
  assert.ok(qaTests.length >= 6, 'Devem existir ao menos 6 cenários de QA documentados');

  qaTests.forEach(t => {
    assert.ok(Object.values(QA_STATUS).includes(t.status), `Status '${t.status}' deve ser estrito (PASS, FAIL, BLOCKED, etc.)`);
    assert.ok(t.steps.length > 0, `Caso ${t.id} deve conter passos executados`);
    assert.ok(t.expectedResult, `Caso ${t.id} deve conter resultado esperado`);
    assert.ok(t.observedResult, `Caso ${t.id} deve conter resultado observado`);
    assert.ok(t.viewport, `Caso ${t.id} deve especificar o viewport`);
  });
});

test('Command Center — Status de Release é inequívoco (RELEASE BLOQUEADA ou RELEASE APROVADA)', () => {
  const release = commandCenterService.getReleaseStatus();
  assert.ok(['RELEASE BLOQUEADA', 'RELEASE APROVADA'].includes(release.status), 'Status de release deve ser estritamente binário e inequívoco');
  assert.ok(Array.isArray(release.blockingReasons), 'blockingReasons deve ser um array');
  assert.ok(Array.isArray(release.gates), 'Deve listar os 5 Portões de Qualidade');
  assert.strictEqual(release.gates.length, 5, 'Devem existir exatamente 5 Portões');
});

test('Command Center — Referências Externas possuem tipo estrito (OBSERVED, INFERRED, NOT_VERIFIABLE)', () => {
  const refs = commandCenterService.getExternalReferences();
  assert.strictEqual(refs.length, 4, 'Devem existir exatamente 4 fontes de referência (Sleeper, FantasyPros, NFL, Yahoo)');

  const validTypes = ['OBSERVED', 'INFERRED', 'NOT_VERIFIABLE'];
  refs.forEach(r => {
    assert.ok(validTypes.includes(r.observationType), `Tipo de observação '${r.observationType}' deve ser válido`);
    assert.ok(r.domain, `Referência ${r.id} deve ter domínio`);
    assert.ok(r.evidence, `Referência ${r.id} deve conter evidência auditada`);
  });
});

test('Command Center — Contratos e Arquitetura listam garantias inegociáveis de dados', () => {
  const contracts = commandCenterService.getContractsAndArchitecture();
  assert.ok(contracts.guarantees.length >= 10, 'Devem existir pelo menos 10 garantias inegociáveis de dados');
  assert.ok(contracts.guarantees.includes('null jamais vira zero (0.0)'));
  assert.ok(contracts.guarantees.includes('null ou status desconhecido jamais vira "Saudável"'));
  assert.ok(contracts.guarantees.includes('Pontos do banco de reservas NUNCA somam no placar do confronto oficial'));
});
