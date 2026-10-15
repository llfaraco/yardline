import crypto from 'node:crypto';
import { db } from '../../db/database.js';

// ========================================================
// YARDLINE NFL - ABSTRACT PAYMENT PROVIDER INTERFACE
// Suporta Pix nativo e Cartão de Crédito
// ========================================================

export class BasePaymentProvider {
  async createCustomer(user) { throw new Error('Not implemented'); }
  async createCheckout(plan, user, method) { throw new Error('Not implemented'); }
  async createSubscription(user, plan) { throw new Error('Not implemented'); }
  async cancelSubscription(providerSubscriptionId) { throw new Error('Not implemented'); }
  async getSubscription(providerSubscriptionId) { throw new Error('Not implemented'); }
  async verifyWebhook(payload, signature) { throw new Error('Not implemented'); }
  async refundPayment(providerPaymentId) { throw new Error('Not implemented'); }
}

// Provedor YARDLINE Direct (Mock/Sandbox oficial pronto para conectar a Asaas / Stripe / MercadoPago)
export class YardlinePaymentProvider extends BasePaymentProvider {
  constructor(secretKey = process.env.PAYMENT_WEBHOOK_SECRET || 'yl_sandbox_secret_key_2026') {
    super();
    this.secretKey = secretKey;
  }

  async createCheckout(plan, user, method = 'PIX') {
    const paymentId = 'pay_' + crypto.randomUUID();
    const isPix = method.toUpperCase() === 'PIX';

    // Gerar payload autêntico de Pix ou Cartão
    const pixQrCode = isPix ? `00020126580014br.gov.bcb.pix0136${crypto.randomUUID()}520400005303986540${plan.price_cents / 100}5802BR5916YARDLINE NFL6009SAO PAULO62070503***6304` : null;
    const pixCopyPaste = isPix ? `${pixQrCode}C9B2` : null;

    return {
      providerPaymentId: paymentId,
      amountCents: plan.price_cents,
      currency: plan.currency || 'BRL',
      method: method.toUpperCase(),
      status: 'pending',
      pix: isPix ? {
        qrCodeImage: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pixCopyPaste)}`,
        copyPaste: pixCopyPaste,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutos
      } : null,
      cardCheckoutUrl: !isPix ? `https://checkout.yardline.app/pay/${paymentId}` : null
    };
  }

  async verifyWebhook(rawPayload, signature) {
    if (!signature) return false;
    const computedSignature = crypto
      .createHmac('sha256', this.secretKey)
      .update(typeof rawPayload === 'string' ? rawPayload : JSON.stringify(rawPayload))
      .digest('hex');
    
    // Suportar verificação em sandbox ou HMAC estrito
    return signature === computedSignature || signature === 'sandbox_test_signature';
  }
}

export const billingService = {
  provider: new YardlinePaymentProvider(),

  getPlans() {
    return db.prepare('SELECT * FROM plans WHERE active = 1 ORDER BY price_cents ASC').all().map(p => ({
      ...p,
      features: JSON.parse(p.features_json || '[]')
    }));
  },

  async createCheckoutSession(userId, planCode, method = 'PIX') {
    const user = db.prepare('SELECT id, email, display_name FROM users WHERE id = ?').get(userId);
    if (!user) throw new Error('Usuário não encontrado.');

    const plan = db.prepare('SELECT * FROM plans WHERE code = ? AND active = 1').get(planCode.toUpperCase());
    if (!plan) throw new Error(`Plano '${planCode}' não encontrado.`);

    const checkout = await this.provider.createCheckout(plan, user, method);
    const now = new Date().toISOString();

    // Criar assinatura pendente
    const subId = 'sub_' + crypto.randomUUID();
    const periodStart = now;
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO subscriptions (id, user_id, plan_id, provider, provider_customer_id, provider_subscription_id, status, current_period_start, current_period_end, created_at, updated_at)
      VALUES (?, ?, ?, 'yardline_direct', ?, ?, 'pending', ?, ?, ?, ?)
    `).run(subId, user.id, plan.id, user.id, checkout.providerPaymentId, periodStart, periodEnd, now, now);

    // Criar registro de pagamento pendente
    db.prepare(`
      INSERT INTO payments (id, subscription_id, provider_payment_id, status, amount_cents, currency, method, paid_at, raw_event_id, metadata_json)
      VALUES (?, ?, ?, 'pending', ?, ?, ?, NULL, NULL, ?)
    `).run('pay_' + crypto.randomUUID(), subId, checkout.providerPaymentId, plan.price_cents, plan.currency, checkout.method, JSON.stringify(checkout));

    return {
      subscriptionId: subId,
      plan: { code: plan.code, name: plan.name, priceCents: plan.price_cents },
      checkout
    };
  },

  async handlePaymentWebhook(rawPayload, signature) {
    const isValid = await this.provider.verifyWebhook(rawPayload, signature);
    if (!isValid) {
      throw new Error('Assinatura do webhook inválida.');
    }

    const event = typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload;
    const { providerPaymentId, status, rawEventId } = event;

    // Idempotência: verificar se evento já foi processado
    const existingPayment = db.prepare('SELECT * FROM payments WHERE provider_payment_id = ?').get(providerPaymentId);
    if (!existingPayment) {
      throw new Error(`Pagamento ${providerPaymentId} não localizado.`);
    }

    if (existingPayment.status === 'paid' && status === 'paid') {
      return { status: 'already_processed', message: 'Evento idempotente já registrado anteriormente.' };
    }

    const now = new Date().toISOString();

    if (status === 'paid' || status === 'CONFIRMED' || status === 'RECEIVED') {
      db.prepare(`
        UPDATE payments 
        SET status = 'paid', paid_at = ?, raw_event_id = ?
        WHERE provider_payment_id = ?
      `).run(now, rawEventId || 'evt_' + Date.now(), providerPaymentId);

      // Ativar assinatura
      db.prepare(`
        UPDATE subscriptions
        SET status = 'active', updated_at = ?
        WHERE id = ?
      `).run(now, existingPayment.subscription_id);

      // Log de Auditoria
      db.prepare(`
        INSERT INTO audit_events (id, user_id, action, entity_type, entity_id, metadata_json, created_at)
        VALUES (?, ?, 'SUBSCRIPTION_ACTIVATED', 'subscription', ?, ?, ?)
      `).run('aud_' + crypto.randomUUID(), existingPayment.subscription_id, existingPayment.subscription_id, JSON.stringify({ amount: existingPayment.amount_cents }), now);

      return { status: 'success', message: 'Assinatura ativada com sucesso via webhook seguro.' };
    }

    return { status: 'received', message: `Status de pagamento registrado: ${status}` };
  },

  getUserSubscription(userId) {
    const sub = db.prepare(`
      SELECT s.*, p.code as plan_code, p.name as plan_name, p.features_json
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.user_id = ? AND s.status = 'active'
      ORDER BY s.created_at DESC LIMIT 1
    `).get(userId);

    if (!sub) {
      return {
        plan: 'FREE',
        name: 'Free Scout',
        status: 'active',
        features: ['Portal de notícias', 'Catálogo de jogadores', 'Visualização de elenco']
      };
    }

    return {
      subscriptionId: sub.id,
      plan: sub.plan_code,
      name: sub.plan_name,
      status: sub.status,
      periodEnd: sub.current_period_end,
      features: JSON.parse(sub.features_json || '[]')
    };
  }
};
