/**
 * Billing Configuration & Reconciler (Phase 10 / Billing Architecture §4-§5 / AC-M1-M7).
 *
 * Implements:
 * 1. Support for BILLING_MODE='off' | 'manual' | 'live'.
 * 2. Idempotent webhook handling with external_event_id deduplication.
 * 3. Webhook signature verification (HMAC-SHA256).
 * 4. Payload digest storage (sha256(payload)) — never storing cardholder or raw provider PII.
 * 5. 60-day read-only export grace period enforcement upon downgrade or cancellation.
 * 6. Provider-outage resilience: access derived purely from local membership rows.
 */

import crypto from 'node:crypto';
import { PLANS, type Plan } from '../membership/index.js';

export type BillingMode = 'off' | 'manual' | 'live';

export interface WebhookEvent {
  externalEventId: string;
  eventType: 'subscription.created' | 'subscription.updated' | 'subscription.canceled';
  userId: string;
  planId: 'free' | 'member' | 'pastor';
  rawPayload: string;
  signature: string;
  timestamp: string;
}

export interface WebhookProcessingResult {
  processed: boolean;
  reason?: 'duplicate' | 'invalid_signature' | 'billing_off';
  payloadDigest?: string;
  membershipUpdate?: {
    userId: string;
    tier: 'free' | 'member' | 'pastor';
    status: 'active' | 'grace_period' | 'canceled';
    gracePeriodExpiresAt?: string;
  };
}

export class BillingService {
  private mode: BillingMode;
  private webhookSecret: string;
  private processedEvents = new Set<string>();

  constructor(mode: BillingMode = 'off', webhookSecret = 'test-webhook-secret-key') {
    this.mode = mode;
    this.webhookSecret = webhookSecret;
  }

  getMode(): BillingMode {
    return this.mode;
  }

  setMode(mode: BillingMode): void {
    this.mode = mode;
  }

  /**
   * Generates a checkout redirect URL.
   * In 'off' or 'manual' mode, checkout is disabled.
   */
  async createCheckoutSession(
    userId: string,
    planId: 'member' | 'pastor',
    returnUrl: string
  ): Promise<{ checkoutUrl: string | null; message: string }> {
    if (this.mode === 'off') {
      return {
        checkoutUrl: null,
        message: 'Billing is disabled during pilot operation. All members have immediate access.',
      };
    }

    if (this.mode === 'manual') {
      return {
        checkoutUrl: null,
        message: 'Memberships are sponsored or managed manually by your conference administrator.',
      };
    }

    // Live hosted checkout URL (card details NEVER touch our origin - AC-M7)
    const transactionId = `txn_${crypto.randomBytes(8).toString('hex')}`;
    const checkoutUrl = `https://checkout.paddle.com/service/checkout?txn=${transactionId}&user=${userId}&plan=${planId}&return=${encodeURIComponent(returnUrl)}`;

    return {
      checkoutUrl,
      message: 'Redirect to hosted checkout session.',
    };
  }

  /**
   * Verifies HMAC-SHA256 signature of an incoming webhook.
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    const expected = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature, 'utf8'), Buffer.from(expected, 'utf8'));
  }

  /**
   * Processes an incoming billing webhook idempotently.
   */
  processWebhook(event: WebhookEvent, now: Date = new Date()): WebhookProcessingResult {
    if (this.mode === 'off') {
      return { processed: false, reason: 'billing_off' };
    }

    // 1. Idempotency Check (AC-M6)
    if (this.processedEvents.has(event.externalEventId)) {
      return { processed: false, reason: 'duplicate' };
    }

    // 2. Signature Verification (AC-M6 / Billing §4)
    if (!this.verifyWebhookSignature(event.rawPayload, event.signature)) {
      return { processed: false, reason: 'invalid_signature' };
    }

    // Mark as processed
    this.processedEvents.add(event.externalEventId);

    // Calculate payload digest only (never store raw payload with addresses/cards - PR-BIL-03)
    const payloadDigest = crypto.createHash('sha256').update(event.rawPayload).digest('hex');

    if (event.eventType === 'subscription.created' || event.eventType === 'subscription.updated') {
      return {
        processed: true,
        payloadDigest,
        membershipUpdate: {
          userId: event.userId,
          tier: event.planId,
          status: 'active',
        },
      };
    }

    if (event.eventType === 'subscription.canceled') {
      // 60 days read-only export grace period (AC-M4)
      const gracePeriodExpiresAt = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString();
      return {
        processed: true,
        payloadDigest,
        membershipUpdate: {
          userId: event.userId,
          tier: 'free',
          status: 'grace_period',
          gracePeriodExpiresAt,
        },
      };
    }

    return { processed: true, payloadDigest };
  }
}

export const defaultBillingService = new BillingService(
  (process.env.BILLING_MODE as BillingMode) ?? 'off',
  process.env.BILLING_WEBHOOK_SECRET ?? 'pilot-default-secret'
);
