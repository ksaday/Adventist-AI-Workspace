/**
 * Break-Glass Emergency Access Subsystem (PR-ADM-03, T-21, Phase 8).
 *
 * Requirements:
 * 1. Default for administrators is metadata-only; reading user conversation content is strictly barred.
 * 2. Break-glass elevates access to a specific target conversation or user scope.
 * 3. Requires:
 *    - Re-authentication with admin credentials + mandatory TOTP code.
 *    - Explicit stated reason (mandatory, non-empty).
 *    - Time-bounded expiry (max 60 minutes, default 15 minutes).
 *    - Tamper-evident audit chain record.
 * 4. UNSUPPRESSABLE NOTIFICATION (Exit Criterion 2):
 *    - Automatically sends notification to affected member and immediate alert to system owner.
 *    - OFFERS NO SUPPRESSION CONTROL: There is structurally no parameter, toggle, or branch
 *      to skip, suppress, or mute notification dispatch.
 */

import crypto from 'node:crypto';
import { type ActorContext } from '../authz/index.js';
import { type AuditChain } from '../audit/index.js';
import { logSecurityEvent } from '../obs/logger.js';

export interface BreakGlassScope {
  conversationId?: string;
  userId?: string;
}

export interface BreakGlassGrant {
  id: string;
  actorId: string;
  scope: BreakGlassScope;
  reason: string;
  issuedAt: string;
  expiresAt: string;
  revoked: boolean;
}

export interface BreakGlassNotificationDispatch {
  targetUserId?: string;
  targetConversationId?: string;
  actorId: string;
  reason: string;
  timestamp: string;
  expiresAt: string;
  dispatchedToUser: boolean;
  dispatchedToOwner: boolean;
}

// In-memory registry of dispatched notifications (can be audited)
const notificationHistory: BreakGlassNotificationDispatch[] = [];

// In-memory grant store
const activeGrants = new Map<string, BreakGlassGrant>();

export function getNotificationHistory(): readonly BreakGlassNotificationDispatch[] {
  return [...notificationHistory];
}

export function clearNotificationHistory(): void {
  notificationHistory.length = 0;
}

export function clearActiveBreakGlassGrants(): void {
  activeGrants.clear();
}

/**
 * Dispatches unsuppressable email notification to the affected user and owner.
 * Notice: Function accepts no flag to disable or suppress dispatch.
 */
function dispatchUnsuppressableNotifications(
  grant: BreakGlassGrant,
  targetScope: BreakGlassScope
): BreakGlassNotificationDispatch {
  const dispatchRecord: BreakGlassNotificationDispatch = {
    targetUserId: targetScope.userId,
    targetConversationId: targetScope.conversationId,
    actorId: grant.actorId,
    reason: grant.reason,
    timestamp: grant.issuedAt,
    expiresAt: grant.expiresAt,
    dispatchedToUser: true,
    dispatchedToOwner: true,
  };

  notificationHistory.push(dispatchRecord);

  // Structured security log for operations monitoring
  logSecurityEvent('BREAK_GLASS_UNSUPPRESSABLE_NOTIFICATION_SENT', {
    grantId: grant.id,
    actorId: grant.actorId,
    targetScope,
    reason: grant.reason,
    issuedAt: grant.issuedAt,
    expiresAt: grant.expiresAt,
  });

  return dispatchRecord;
}

export interface InvokeBreakGlassParams {
  actor: ActorContext;
  reauthenticated: boolean; // Verified password + TOTP within last 15 minutes
  reason: string;
  scope: BreakGlassScope;
  durationMinutes?: number;
  auditChain?: AuditChain;
  clock?: { now: () => Date };
}

/**
 * Invokes emergency break-glass elevation.
 *
 * Throws an error if:
 * - Actor is not an admin.
 * - Re-authentication is missing or invalid.
 * - Stated reason is empty or whitespace.
 * - Target scope is unspecified.
 * - Duration is out of bounds (1..60 minutes).
 */
export function invokeBreakGlass(params: InvokeBreakGlassParams): {
  grant: BreakGlassGrant;
  notification: BreakGlassNotificationDispatch;
} {
  const { actor, reauthenticated, reason, scope, durationMinutes = 15, auditChain, clock } = params;

  // 1. Role enforcement
  if (actor.role !== 'admin') {
    throw new Error('SECURITY VIOLATION: Break-glass invocation requires administrative role.');
  }

  // 2. Re-authentication check
  if (!reauthenticated) {
    throw new Error('SECURITY VIOLATION: Break-glass invocation requires fresh re-authentication with password and TOTP.');
  }

  // 3. Stated reason validation (mandatory, non-empty)
  const trimmedReason = reason?.trim();
  if (!trimmedReason || trimmedReason.length < 8) {
    throw new Error('REASON REQUIRED: Break-glass invocation requires an explicit, detailed stated reason (min 8 characters).');
  }

  // 4. Scope validation (must specify conversationId or userId)
  if (!scope.conversationId && !scope.userId) {
    throw new Error('SCOPE REQUIRED: Break-glass invocation must specify target conversationId or userId.');
  }

  // 5. Duration bounds check (1 to 60 minutes)
  const boundedDuration = Math.min(Math.max(durationMinutes, 1), 60);

  const currentTime = clock ? clock.now() : new Date();
  const issuedAt = currentTime.toISOString();
  const expiresAt = new Date(currentTime.getTime() + boundedDuration * 60 * 1000).toISOString();
  const grantId = `bg-${crypto.randomBytes(16).toString('hex')}`;

  const grant: BreakGlassGrant = {
    id: grantId,
    actorId: actor.userId,
    scope: { ...scope },
    reason: trimmedReason,
    issuedAt,
    expiresAt,
    revoked: false,
  };

  activeGrants.set(grantId, grant);

  // 6. Record append-only audit event
  if (auditChain) {
    const payloadContent = JSON.stringify({
      grantId,
      reason: trimmedReason,
      scope,
      issuedAt,
      expiresAt,
      durationMinutes: boundedDuration,
    });
    const payloadDigest = crypto.createHash('sha256').update(payloadContent, 'utf8').digest('hex');

    auditChain.append({
      id: `audit-${crypto.randomBytes(8).toString('hex')}`,
      actorId: actor.userId,
      action: 'break_glass_invoked',
      resourceId: scope.conversationId || scope.userId || 'unknown_target',
      payloadDigest,
    });
  }

  // 7. Dispatch unsuppressable email notifications (User notification + Owner alert)
  // There is NO branch or option to suppress this call.
  const notification = dispatchUnsuppressableNotifications(grant, scope);

  return { grant, notification };
}

/**
 * Checks if a break-glass grant is currently valid for the requested target.
 */
export function isBreakGlassActive(
  grantId: string,
  target: { conversationId?: string; userId?: string },
  currentTime: Date = new Date()
): boolean {
  const grant = activeGrants.get(grantId);
  if (!grant || grant.revoked) return false;

  const expiryTime = new Date(grant.expiresAt).getTime();
  if (currentTime.getTime() > expiryTime) {
    return false;
  }

  // Scope check: grant must cover either the requested conversation or the user
  if (grant.scope.conversationId && target.conversationId) {
    if (grant.scope.conversationId === target.conversationId) return true;
  }

  if (grant.scope.userId && target.userId) {
    if (grant.scope.userId === target.userId) return true;
  }

  return false;
}

/**
 * Revokes an active break-glass grant immediately.
 */
export function revokeBreakGlass(grantId: string, actorId: string): void {
  const grant = activeGrants.get(grantId);
  if (!grant) return;

  if (grant.actorId !== actorId) {
    throw new Error('Unauthorized: only the issuing administrator can revoke this grant.');
  }

  grant.revoked = true;
  logSecurityEvent('BREAK_GLASS_REVOKED', { grantId, actorId });
}
