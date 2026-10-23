import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { app } from '../src/server.js';
import { authService } from '../src/modules/auth/auth.service.js';
import { billingService, YardlinePaymentProvider } from '../src/modules/billing/billing.service.js';

test('HTTP billing rejects unsigned callbacks, verifies raw bytes, and exposes no invented draft/DNA statistics', async t => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const route of ['/api/drafts', '/api/manager-dna']) {
    const response = await fetch(base + route);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).dataStatus, 'unavailable');
  }
  const previousSandbox = process.env.PAYMENT_SANDBOX;
  process.env.PAYMENT_SANDBOX = 'true';
  t.after(() => { if (previousSandbox === undefined) delete process.env.PAYMENT_SANDBOX; else process.env.PAYMENT_SANDBOX = previousSandbox; });
  billingService.provider = new YardlinePaymentProvider('http-test-secret');
  const session = authService.register({ email: 'http@example.test', password: 'Password123!', displayName: 'Tester' });
  const { checkout } = await billingService.createCheckoutSession(session.user.id, 'PRO');
  assert.equal(checkout.simulation, true);
  const body = `{ "providerPaymentId": "${checkout.providerPaymentId}", "status": "paid" }`;
  const post = headers => fetch(base + '/api/webhooks/payment/pix', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body });
  assert.equal((await post({})).status, 400);
  assert.equal((await post({ 'x-signature': 'sandbox_test_signature' })).status, 400);
  assert.equal(billingService.getUserSubscription(session.user.id).plan, 'FREE');
  const signature = crypto.createHmac('sha256', 'http-test-secret').update(body).digest('hex');
  assert.equal((await post({ 'x-signature': signature })).status, 200);
  assert.equal(billingService.getUserSubscription(session.user.id).plan, 'PRO');
});
