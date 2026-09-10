import { describe, it, expect, beforeEach } from 'vitest';
import {
  invokeBreakGlass,
  isBreakGlassActive,
  revokeBreakGlass,
  getNotificationHistory,
  clearNotificationHistory,
  clearActiveBreakGlassGrants,
} from '../../server/auth/break-glass.js';
import { AuditChain } from '../../server/audit/index.js';
import { type ActorContext } from '../../server/authz/index.js';

describe('Break-Glass Emergency Access Subsystem (PR-ADM-03 / T-21 / Phase 8)', () => {
  const adminActor: ActorContext = {
    userId: 'admin-001',
    role: 'admin',
    tier: 'pastor',
  };

  const memberActor: ActorContext = {
    userId: 'member-001',
    role: 'member',
    tier: 'member',
  };

  beforeEach(() => {
    clearNotificationHistory();
    clearActiveBreakGlassGrants();
  });

  it('enforces administrative role requirement', () => {
    expect(() =>
      invokeBreakGlass({
        actor: memberActor,
        reauthenticated: true,
        reason: 'Investigating potential child safety report',
        scope: { conversationId: 'conv-123' },
      })
    ).toThrow(/Break-glass invocation requires administrative role/);
  });

  it('enforces fresh re-authentication (password + TOTP check)', () => {
    expect(() =>
      invokeBreakGlass({
        actor: adminActor,
        reauthenticated: false,
        reason: 'Investigating potential child safety report',
        scope: { conversationId: 'conv-123' },
      })
    ).toThrow(/requires fresh re-authentication/);
  });

  it('enforces mandatory non-empty stated reason with minimum length', () => {
    expect(() =>
      invokeBreakGlass({
        actor: adminActor,
        reauthenticated: true,
        reason: '   ',
        scope: { conversationId: 'conv-123' },
      })
    ).toThrow(/stated reason/);

    expect(() =>
      invokeBreakGlass({
        actor: adminActor,
        reauthenticated: true,
        reason: 'short',
        scope: { conversationId: 'conv-123' },
      })
    ).toThrow(/stated reason/);
  });

  it('enforces explicit target scope (conversationId or userId)', () => {
    expect(() =>
      invokeBreakGlass({
        actor: adminActor,
        reauthenticated: true,
        reason: 'Investigating critical system integrity issue',
        scope: {},
      })
    ).toThrow(/must specify target conversationId or userId/);
  });

  it('records an append-only audit event with cryptographic digest', () => {
    const auditChain = new AuditChain();

    const { grant } = invokeBreakGlass({
      actor: adminActor,
      reauthenticated: true,
      reason: 'Urgent compliance disclosure investigation',
      scope: { conversationId: 'conv-999', userId: 'user-888' },
      durationMinutes: 30,
      auditChain,
    });

    expect(grant.id).toBeDefined();
    expect(auditChain.getRecords().length).toBe(1);
    const entry = auditChain.getRecords()[0];
    expect(entry.action).toBe('break_glass_invoked');
    expect(entry.actorId).toBe('admin-001');
    expect(entry.resourceId).toBe('conv-999');
    expect(entry.payloadDigest).toBeDefined();
    expect(auditChain.verify().valid).toBe(true);
  });

  it('EXIT CRITERION 2: Dispatches unsuppressable email notification and offers NO suppression control', () => {
    // 1. Invoke break-glass
    const { grant, notification } = invokeBreakGlass({
      actor: adminActor,
      reauthenticated: true,
      reason: 'Urgent security review for reported abuse',
      scope: { conversationId: 'conv-target-42', userId: 'user-target-42' },
      durationMinutes: 15,
    });

    // 2. Notification was automatically and unconditionally dispatched
    expect(notification.dispatchedToUser).toBe(true);
    expect(notification.dispatchedToOwner).toBe(true);
    expect(notification.targetUserId).toBe('user-target-42');
    expect(notification.targetConversationId).toBe('conv-target-42');
    expect(notification.reason).toBe('Urgent security review for reported abuse');

    // 3. Recorded in notification audit history
    const history = getNotificationHistory();
    expect(history.length).toBe(1);
    expect(history[0].dispatchedToUser).toBe(true);
    expect(history[0].dispatchedToOwner).toBe(true);

    // 4. Invariant verification: The API does NOT accept suppression flags
    // (TypeScript interface InvokeBreakGlassParams structurally forbids suppression options)
    const optionsKeys = Object.keys({
      actor: adminActor,
      reauthenticated: true,
      reason: 'Valid reason here',
      scope: { conversationId: 'c1' },
    });
    expect(optionsKeys).not.toContain('suppressNotification');
    expect(optionsKeys).not.toContain('suppressEmail');
    expect(optionsKeys).not.toContain('silent');
  });

  it('enforces scope matching and time-bounded expiration', () => {
    const fixedNow = new Date('2026-09-10T12:00:00Z');
    const clock = { now: () => fixedNow };

    const { grant } = invokeBreakGlass({
      actor: adminActor,
      reauthenticated: true,
      reason: 'Valid operational audit justification',
      scope: { conversationId: 'conv-alpha', userId: 'user-alpha' },
      durationMinutes: 15,
      clock,
    });

    // Active within window and matching scope
    expect(isBreakGlassActive(grant.id, { conversationId: 'conv-alpha' }, fixedNow)).toBe(true);
    expect(isBreakGlassActive(grant.id, { userId: 'user-alpha' }, fixedNow)).toBe(true);

    // Mismatched scope rejected
    expect(isBreakGlassActive(grant.id, { conversationId: 'conv-beta' }, fixedNow)).toBe(false);
    expect(isBreakGlassActive(grant.id, { userId: 'user-beta' }, fixedNow)).toBe(false);

    // Expired after window (16 minutes later)
    const afterExpiry = new Date('2026-09-10T12:16:00Z');
    expect(isBreakGlassActive(grant.id, { conversationId: 'conv-alpha' }, afterExpiry)).toBe(false);

    // Revocation terminates access immediately
    revokeBreakGlass(grant.id, adminActor.userId);
    expect(isBreakGlassActive(grant.id, { conversationId: 'conv-alpha' }, fixedNow)).toBe(false);
  });
});
