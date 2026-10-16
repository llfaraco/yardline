import { Router } from 'express';
import { commandCenterService } from './command-center.service.js';

export const commandCenterRouter = Router();

// 1. Dashboard Geral
commandCenterRouter.get('/dashboard', (req, res) => {
  try {
    const dashboard = commandCenterService.getDashboard();
    res.json(dashboard);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Lista dos 15 Agentes
commandCenterRouter.get('/agents', (req, res) => {
  try {
    const agents = commandCenterService.getAgents();
    res.json(agents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. QA e Testes E2E
commandCenterRouter.get('/qa', (req, res) => {
  try {
    const qaTests = commandCenterService.getQATests();
    res.json(qaTests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Bugs e Bloqueios
commandCenterRouter.get('/bugs', (req, res) => {
  try {
    const bugs = commandCenterService.getBugs();
    res.json(bugs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Referências Externas
commandCenterRouter.get('/references', (req, res) => {
  try {
    const refs = commandCenterService.getExternalReferences();
    res.json(refs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Atividade dos Agentes (Timeline)
commandCenterRouter.get('/activity', (req, res) => {
  try {
    const timeline = commandCenterService.getActivityTimeline();
    res.json(timeline);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Contratos e Arquitetura
commandCenterRouter.get('/contracts', (req, res) => {
  try {
    const contracts = commandCenterService.getContractsAndArchitecture();
    res.json(contracts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Releases e Saúde do Projeto
commandCenterRouter.get('/release', (req, res) => {
  try {
    const release = commandCenterService.getReleaseStatus();
    res.json(release);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Trigger de revalidação de integridade
commandCenterRouter.post('/sync', (req, res) => {
  try {
    const dashboard = commandCenterService.getDashboard();
    res.json({ ok: true, syncedAt: new Date().toISOString(), dashboard });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
