import test from 'node:test';
import assert from 'node:assert/strict';
import { db, initDatabase } from '../src/db/database.js';
import { authService } from '../src/modules/auth/auth.service.js';
import { solveOptimalLineupAssignment } from '../src/modules/engines/lineup.solver.js';
import { calculateLeagueBaselines, computeVBD } from '../src/modules/engines/vbd.engine.js';
import { billingService } from '../src/modules/billing/billing.service.js';
import { newsService } from '../src/modules/news/news.service.js';

initDatabase();

test('1. Auth Service: Registro, Login e Sessões Seguras', () => {
  const email = `coach_${Date.now()}@yardline.com.br`;
  const password = 'SuperSecretPassword2026!';
  const displayName = 'Head Coach Teste';

  // Registro
  const session = authService.register({ email, password, displayName });
  assert.ok(session.token.startsWith('yl_sess_'), 'Token deve ter prefixo yl_sess_');
  assert.equal(session.user.email, email.toLowerCase());

  // Validação de token
  const validatedUser = authService.validateToken(session.token);
  assert.equal(validatedUser.id, session.user.id);

  // Login
  const loginSession = authService.login({ email, password });
  assert.ok(loginSession.token);
  assert.equal(loginSession.user.id, session.user.id);

  // Logout
  authService.logout(session.token);
  assert.equal(authService.validateToken(session.token), null);
});

test('2. Billing Service: Planos, Checkout Pix e Webhook Idempotente', async () => {
  const plans = billingService.getPlans();
  assert.ok(plans.length >= 3, 'Deve conter planos Free, Pro e All-Pro');

  const testUser = authService.register({
    email: `billing_${Date.now()}@yardline.com.br`,
    password: 'Password123!',
    displayName: 'Manager Billing'
  });

  // Criar Checkout Pix
  const checkoutResult = await billingService.createCheckoutSession(testUser.user.id, 'PRO', 'PIX');
  assert.ok(checkoutResult.checkout.pix.copyPaste, 'Pix Copia e Cola deve ser gerado');
  assert.equal(checkoutResult.checkout.amountCents, 2990);
  assert.equal(checkoutResult.checkout.status, 'pending');

  // Webhook de Confirmação de Pagamento
  const webhookPayload = {
    providerPaymentId: checkoutResult.checkout.providerPaymentId,
    status: 'paid',
    rawEventId: 'evt_sandbox_test'
  };

  const webhookResult = await billingService.handlePaymentWebhook(webhookPayload, 'sandbox_test_signature');
  assert.equal(webhookResult.status, 'success');

  // Verificar ativação do plano
  const sub = billingService.getUserSubscription(testUser.user.id);
  assert.equal(sub.plan, 'PRO');
  assert.equal(sub.status, 'active');

  // Teste de Idempotência: reenvio do mesmo webhook
  const duplicateResult = await billingService.handlePaymentWebhook(webhookPayload, 'sandbox_test_signature');
  assert.equal(duplicateResult.status, 'already_processed');
});

test('3. Exact Lineup Solver: Algoritmo Combinatório Branch & Bound', () => {
  const slots = [
    { key: 'QB', allowed: ['QB'] },
    { key: 'RB', allowed: ['RB'] },
    { key: 'WR', allowed: ['WR'] },
    { key: 'FLEX', allowed: ['RB', 'WR'] }
  ];

  const pool = [
    { id: '1', position: 'QB', projection: 20.0 },
    { id: '2', position: 'RB', projection: 15.0 },
    { id: '3', position: 'RB', projection: 12.0 },
    { id: '4', position: 'WR', projection: 14.0 },
    { id: '5', position: 'WR', projection: 10.0 }
  ];

  const result = solveOptimalLineupAssignment(slots, pool);
  // Ótimo: QB (20) + RB (15) + WR (14) + FLEX (RB 12) = 61.0 pts
  assert.equal(result.bestScore, 61.0);
  assert.equal(Object.keys(result.bestAssignment).length, 4);
  assert.equal(result.bestAssignment.QB, '1');
  assert.equal(result.bestAssignment.RB, '2');
  assert.equal(result.bestAssignment.WR, '4');
  assert.equal(result.bestAssignment.FLEX, '3');
});

test('4. Dynamic VBD Engine: Baselines Derivadas do Formato', () => {
  const slotsDef = [
    { key: 'QB' },
    { key: 'RB1' }, { key: 'RB2' },
    { key: 'WR1' }, { key: 'WR2' },
    { key: 'FLEX' }
  ];

  const players = [
    { position: 'WR', projection: 18.0 },
    { position: 'WR', projection: 15.0 },
    { position: 'WR', projection: 12.0 },
    { position: 'WR', projection: 9.0 }
  ];

  const baselines = calculateLeagueBaselines(slotsDef, 2, players, 'PPR');
  assert.ok(baselines.WR > 0);
  
  const vbd = computeVBD(18.0, 'WR', baselines, 'PPR');
  assert.ok(vbd > 0);
});

test('5. News Service: Ingestão, Deduplicação e Vínculo a Atleta', () => {
  const canonicalUrl = `https://espn.com.br/nfl/noticia-${Date.now()}`;
  const title = 'Josh Allen comanda vitória espetacular dos Bills';

  // Inserir jogador canônico para teste de vínculo
  db.prepare(`
    INSERT OR IGNORE INTO players (id, canonical_name, position, team, created_at, updated_at)
    VALUES ('4984', 'Josh Allen', 'QB', 'BUF', datetime('now'), datetime('now'))
  `).run();

  const ingest1 = newsService.ingestNewsItem({
    source: 'ESPN NFL',
    canonicalUrl,
    title,
    summary: 'Grande atuação na Semana 6',
    publishedAt: new Date().toISOString(),
    playerIds: ['4984']
  });

  assert.equal(ingest1.isDuplicate, false);

  // Tentativa duplicada
  const ingest2 = newsService.ingestNewsItem({
    source: 'ESPN NFL',
    canonicalUrl,
    title,
    summary: 'Grande atuação na Semana 6'
  });

  assert.equal(ingest2.isDuplicate, true);

  // Consulta por atleta
  const playerNews = newsService.getPlayerNews('4984');
  assert.ok(playerNews.length >= 1);
  assert.ok(playerNews.some(n => n.title === title), 'A notícia inserida deve constar na lista de notícias do atleta');
});
