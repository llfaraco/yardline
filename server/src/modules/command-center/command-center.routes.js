import { Router } from 'express';
import crypto from 'node:crypto';
import { commandCenterService } from './command-center.service.js';

function authorizedWrite(req) {
  const token = process.env.COMMAND_CENTER_WRITE_TOKEN;
  if (!token) return false; // Fail closed; local CLI is available without a public mutation endpoint.
  const input = req.headers.authorization?.replace(/^Bearer /, '') || '';
  const a = Buffer.from(token); const b = Buffer.from(input);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
export function createCommandCenterRouter(service = commandCenterService) {
  const router = Router();
  const endpoints = { dashboard: 'getDashboard', agents: 'getAgents', qa: 'getQATests', bugs: 'getBugs', references: 'getExternalReferences', activity: 'getActivityTimeline', contracts: 'getContractsAndArchitecture', release: 'getReleaseStatus', orchestration: 'getOrchestration', handoffs: 'getHandoffs' };
  for (const [route, method] of Object.entries(endpoints)) router.get(`/${route}`, (req, res) => {
    try { res.setHeader('Cache-Control', 'no-store'); res.json(service[method]()); }
    catch (error) { res.status(error.statusCode || 500).json({ error: error.message }); }
  });
  router.get('/player-dossier/:artifact', (req, res) => {
    try {
      const markdown = service.getPlayerDossierDocument(req.params.artifact);
      res.setHeader('Cache-Control', 'no-store');
      res.type('text/markdown').send(markdown);
    } catch (error) { res.status(error.statusCode || 500).json({ error: error.message }); }
  });
  router.get('/cycles/:cycleId', (req, res) => {
    try { const report = service.getCycle(req.params.cycleId); if (!report) return res.status(404).json({ error: 'Cycle not found' }); res.setHeader('Cache-Control', 'no-store'); res.json(report); }
    catch (error) { res.status(400).json({ error: error.message }); }
  });
  router.post('/sync', (req, res) => {
    try {
      const cycle = service.triggerSync();
      // Preserve ok/syncedAt/dashboard; cycleId/status are additive. No arbitrary URL/command from request body.
      res.status(202).json({ ok: true, syncedAt: new Date().toISOString(), dashboard: service.getDashboard(), ...cycle });
    } catch (error) { res.status(error.statusCode || 500).json({ error: error.message }); }
  });
  router.patch('/handoffs/:id', (req, res) => {
    if (!authorizedWrite(req)) return res.status(403).json({ error: 'Handoff writes require configured COMMAND_CENTER_WRITE_TOKEN; use operator-owned local CLI otherwise.' });
    try { res.json(service.updateHandoff(req.params.id, req.body || {})); }
    catch (error) { res.status(error.statusCode || 400).json({ error: error.message }); }
  });
  return router;
}
export const commandCenterRouter = createCommandCenterRouter();
