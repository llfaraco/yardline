import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { YardlinePaymentProvider } from '../src/modules/billing/billing.service.js';

test('webhook fails closed without a configured secret and rejects the sandbox bypass', async () => {
  const provider = new YardlinePaymentProvider('test-only-secret');
  for (const signature of [undefined, '', 'sandbox_test_signature', 'bad', '0'.repeat(64)]) {
    assert.equal(await provider.verifyWebhook('{}', signature), false);
  }
  assert.equal(await new YardlinePaymentProvider('').verifyWebhook('{}', '0'.repeat(64)), false);
});

test('webhook authenticates exact bytes and rejects payload tampering', async () => {
  const provider = new YardlinePaymentProvider('test-only-secret');
  const payload = '{ "status": "paid", "providerPaymentId": "test" }';
  const signature = crypto.createHmac('sha256', 'test-only-secret').update(payload).digest('hex');
  assert.equal(await provider.verifyWebhook(payload, signature), true);
  assert.equal(await provider.verifyWebhook(payload.replace('paid', 'pending'), signature), false);
  assert.equal(await provider.verifyWebhook(JSON.parse(payload), signature), false);
});

test('mock checkout cannot issue payment instructions without explicit sandbox opt-in', async () => {
  const previous = process.env.PAYMENT_SANDBOX;
  delete process.env.PAYMENT_SANDBOX;
  try {
    await assert.rejects(new YardlinePaymentProvider('test').createCheckout({ price_cents: 2990 }, {}), /Pagamentos indisponíveis/);
  } finally { if (previous !== undefined) process.env.PAYMENT_SANDBOX = previous; }
});
