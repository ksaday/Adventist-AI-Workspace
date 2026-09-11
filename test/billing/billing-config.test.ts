import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import { BillingService, type WebhookEvent } from '../../server/billing/config';

describe('Billing Configuration & Reconciler Suite (Phase 10 / AC-M1-M7)', () => {
  const secret = 'test-secret-hmac-key';

  function signPayload(payload: string, secretKey = secret): string {
    return crypto.createHmac('sha256', secretKey).update(payload).digest('hex');
  }

  it('operates cleanly in BILLING_MODE=off with checkout disabled (AC-M1)', async () => {
    const service = new BillingService('off', secret);
    const checkout = await service.createCheckoutSession('usr-1', 'pastor', 'https://app.example.com/billing/return');

    expect(checkout.checkoutUrl).toBeNull();
    expect(checkout.message).toContain('Billing is disabled during pilot operation');

    const result = service.processWebhook({
      externalEventId: 'evt-1',
      eventType: 'subscription.created',
      userId: 'usr-1',
      planId: 'pastor',
      rawPayload: '{"event":"sub"}',
      signature: 'dummy',
      timestamp: new Date().toISOString(),
    });

    expect(result.processed).toBe(false);
    expect(result.reason).toBe('billing_off');
  });

  it('generates hosted checkout URL in live mode without collecting card details (AC-M7)', async () => {
    const service = new BillingService('live', secret);
    const checkout = await service.createCheckoutSession('usr-1', 'pastor', 'https://app.example.com/billing/return');

    expect(checkout.checkoutUrl).toContain('https://checkout.paddle.com/service/checkout?txn=');
    expect(checkout.checkoutUrl).toContain('user=usr-1');
    expect(checkout.checkoutUrl).toContain('plan=pastor');
  });

  it('verifies webhook signature and rejects forged webhooks (AC-M6)', () => {
    const service = new BillingService('live', secret);
    const payload = JSON.stringify({ event: 'sub.created', user: 'usr-1' });
    const validSig = signPayload(payload);
    const invalidSig = signPayload(payload, 'wrong-key');

    const eventValid: WebhookEvent = {
      externalEventId: 'evt-valid',
      eventType: 'subscription.created',
      userId: 'usr-1',
      planId: 'member',
      rawPayload: payload,
      signature: validSig,
      timestamp: new Date().toISOString(),
    };

    const validResult = service.processWebhook(eventValid);
    expect(validResult.processed).toBe(true);
    expect(validResult.membershipUpdate?.tier).toBe('member');
    expect(validResult.membershipUpdate?.status).toBe('active');
    expect(validResult.payloadDigest).toBeDefined();

    const eventInvalid: WebhookEvent = {
      ...eventValid,
      externalEventId: 'evt-forged',
      signature: invalidSig,
    };

    const invalidResult = service.processWebhook(eventInvalid);
    expect(invalidResult.processed).toBe(false);
    expect(invalidResult.reason).toBe('invalid_signature');
  });

  it('enforces idempotency on replayed webhooks (AC-M6)', () => {
    const service = new BillingService('live', secret);
    const payload = JSON.stringify({ event: 'sub.created', id: 'unique-1' });
    const sig = signPayload(payload);

    const event: WebhookEvent = {
      externalEventId: 'evt-idempotent-test',
      eventType: 'subscription.created',
      userId: 'usr-2',
      planId: 'pastor',
      rawPayload: payload,
      signature: sig,
      timestamp: new Date().toISOString(),
    };

    // First attempt succeeds
    const first = service.processWebhook(event);
    expect(first.processed).toBe(true);

    // Replay attempt rejected as duplicate
    const replay = service.processWebhook(event);
    expect(replay.processed).toBe(false);
    expect(replay.reason).toBe('duplicate');
  });

  it('enforces 60-day read-only export grace period on subscription cancellation (AC-M4)', () => {
    const service = new BillingService('live', secret);
    const payload = JSON.stringify({ event: 'sub.canceled', user: 'usr-cancel' });
    const sig = signPayload(payload);

    const fixedNow = new Date('2026-06-01T12:00:00.000Z');

    const event: WebhookEvent = {
      externalEventId: 'evt-cancel-1',
      eventType: 'subscription.canceled',
      userId: 'usr-cancel',
      planId: 'free',
      rawPayload: payload,
      signature: sig,
      timestamp: fixedNow.toISOString(),
    };

    const result = service.processWebhook(event, fixedNow);
    expect(result.processed).toBe(true);
    expect(result.membershipUpdate?.status).toBe('grace_period');
    expect(result.membershipUpdate?.tier).toBe('free');

    // 60 days after June 1 = July 31
    const expectedExpiry = new Date(fixedNow.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString();
    expect(result.membershipUpdate?.gracePeriodExpiresAt).toBe(expectedExpiry);
  });
});
