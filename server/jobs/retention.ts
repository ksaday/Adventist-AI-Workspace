/**
 * Retention and Purge Scheduled Jobs (Data Retention and Controls §6).
 *
 * Implements:
 * 1. Hourly `purgeExpiredConversations`: hard-deletes soft-deleted conversations past `purge_after`.
 * 2. Hourly `finaliseAccountDeletions`: finalises account deletions past grace period with crypto-erase first.
 * 3. 15-min `expireSessionsAndTokens`: purges expired sessions and single-use password reset tokens.
 * 4. Weekly `staleConfigCheck`: flags source-directory revisions and emergency entries older than review threshold.
 *
 * Requirements:
 * - Every destructive job supports dry-run mode (`dryRun: true`).
 * - Supports clock fixtures (`Clock`) allowing deterministic time-travel testing (Exit Criterion 3).
 * - Logs planned and actual deletion counts to the audit trail.
 */

import { type ConversationService, type StoredConversation } from '../domain/conversation.js';
import { type AuditChain } from '../audit/index.js';
import { destroyKeyBuffer, type WrappedKey } from '../crypto/index.js';
import { logSecurityEvent } from '../obs/logger.js';

export interface Clock {
  now(): Date;
}

export const systemClock: Clock = {
  now: () => new Date(),
};

export interface RetentionJobOptions {
  dryRun?: boolean;
  clock?: Clock;
  auditChain?: AuditChain;
}

export interface PurgeConversationsResult {
  job: 'purge_expired_conversations';
  dryRun: boolean;
  purgedCount: number;
  purgedIds: string[];
  executedAt: string;
}

export interface FinaliseDeletionsResult {
  job: 'finalise_account_deletions';
  dryRun: boolean;
  finalisedCount: number;
  finalisedUserIds: string[];
  keysCryptoErased: number;
  executedAt: string;
}

export interface ExpireSessionsResult {
  job: 'expire_sessions_and_tokens';
  dryRun: boolean;
  expiredSessionsCount: number;
  expiredTokensCount: number;
  executedAt: string;
}

export interface StaleConfigResult {
  job: 'stale_config_check';
  staleEntries: Array<{ id: string; type: string; ageDays: number }>;
  warningIssued: boolean;
  executedAt: string;
}

export interface UserDeletionRecord {
  userId: string;
  status: 'active' | 'suspended' | 'pending_deletion' | 'deleted';
  deletionDue: Date;
  dek?: WrappedKey;
  activeDekBuffer?: Buffer;
}

export interface SessionRecord {
  sessionId: string;
  userId: string;
  expiresAt: Date;
}

export interface ResetTokenRecord {
  tokenId: string;
  userId: string;
  expiresAt: Date;
}

/**
 * 1. Purge Expired Conversations
 * Hard-deletes soft-deleted conversations whose purge_after date is reached.
 */
export function purgeExpiredConversations(
  conversationService: ConversationService,
  options: RetentionJobOptions = {}
): PurgeConversationsResult {
  const { dryRun = false, clock = systemClock, auditChain } = options;
  const now = clock.now();
  const allConversations = conversationService.listConversations();

  const expired = allConversations.filter(c => {
    if (!c.deletedAt || !c.purgeAfter) return false;
    const purgeTime = new Date(c.purgeAfter).getTime();
    return purgeTime <= now.getTime();
  });

  const purgedIds = expired.map(c => c.id);

  if (!dryRun) {
    for (const id of purgedIds) {
      conversationService.hardDeleteConversation(id);
    }

    if (auditChain && purgedIds.length > 0) {
      auditChain.append({
        id: `purge-${now.getTime()}`,
        actorId: 'system_retention_job',
        action: 'purge_expired_conversations',
        resourceId: `purged_${purgedIds.length}_conversations`,
        payloadDigest: `purged_count:${purgedIds.length}`,
      });
    }

    logSecurityEvent('RETENTION_PURGE_CONVERSATIONS', {
      purgedCount: purgedIds.length,
      dryRun: false,
    });
  }

  return {
    job: 'purge_expired_conversations',
    dryRun,
    purgedCount: purgedIds.length,
    purgedIds,
    executedAt: now.toISOString(),
  };
}

/**
 * 2. Finalise Account Deletions
 * Performs ordered deletion for accounts past their grace period:
 * Step 1: Crypto-erase DEK
 * Step 2: Remove rows
 */
export function finaliseAccountDeletions(
  userRecords: UserDeletionRecord[],
  options: RetentionJobOptions = {}
): FinaliseDeletionsResult {
  const { dryRun = false, clock = systemClock, auditChain } = options;
  const now = clock.now();

  const pendingAccounts = userRecords.filter(
    u => u.status === 'pending_deletion' && u.deletionDue.getTime() <= now.getTime()
  );

  const finalisedUserIds: string[] = [];
  let keysCryptoErased = 0;

  for (const account of pendingAccounts) {
    finalisedUserIds.push(account.userId);

    if (!dryRun) {
      // Step 1: Crypto-erase DEK first
      if (account.activeDekBuffer) {
        destroyKeyBuffer(account.activeDekBuffer);
        account.activeDekBuffer = undefined;
      }
      if (account.dek) {
        account.dek = undefined;
        keysCryptoErased++;
      }
      // Step 2: Mark deleted
      account.status = 'deleted';
    } else {
      if (account.dek || account.activeDekBuffer) {
        keysCryptoErased++;
      }
    }
  }

  if (!dryRun && auditChain && finalisedUserIds.length > 0) {
    auditChain.append({
      id: `account-del-${now.getTime()}`,
      actorId: 'system_retention_job',
      action: 'finalise_account_deletions',
      resourceId: `finalised_${finalisedUserIds.length}_accounts`,
      payloadDigest: `finalised_count:${finalisedUserIds.length}`,
    });
  }

  return {
    job: 'finalise_account_deletions',
    dryRun,
    finalisedCount: finalisedUserIds.length,
    finalisedUserIds,
    keysCryptoErased,
    executedAt: now.toISOString(),
  };
}

/**
 * 3. Expire Sessions and Reset Tokens
 * Purges sessions and tokens whose expiration timestamp has passed.
 */
export function expireSessionsAndTokens(
  sessions: SessionRecord[],
  tokens: ResetTokenRecord[],
  options: RetentionJobOptions = {}
): ExpireSessionsResult {
  const { dryRun = false, clock = systemClock } = options;
  const now = clock.now();

  const expiredSessionIndices: number[] = [];
  for (let i = 0; i < sessions.length; i++) {
    if (sessions[i].expiresAt.getTime() <= now.getTime()) {
      expiredSessionIndices.push(i);
    }
  }

  const expiredTokenIndices: number[] = [];
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].expiresAt.getTime() <= now.getTime()) {
      expiredTokenIndices.push(i);
    }
  }

  const expiredSessionsCount = expiredSessionIndices.length;
  const expiredTokensCount = expiredTokenIndices.length;

  if (!dryRun) {
    // Remove in reverse order
    for (let i = expiredSessionIndices.length - 1; i >= 0; i--) {
      sessions.splice(expiredSessionIndices[i], 1);
    }
    for (let i = expiredTokenIndices.length - 1; i >= 0; i--) {
      tokens.splice(expiredTokenIndices[i], 1);
    }
  }

  return {
    job: 'expire_sessions_and_tokens',
    dryRun,
    expiredSessionsCount,
    expiredTokensCount,
    executedAt: now.toISOString(),
  };
}

/**
 * 4. Stale Config Check
 * Flags entries that have not been reviewed within the configured window (e.g., 180 days).
 */
export function staleConfigCheck(
  configEntries: Array<{ id: string; type: string; lastReviewedAt: Date }>,
  reviewWindowDays = 180,
  options: RetentionJobOptions = {}
): StaleConfigResult {
  const { clock = systemClock } = options;
  const now = clock.now();
  const windowMs = reviewWindowDays * 24 * 60 * 60 * 1000;

  const staleEntries: Array<{ id: string; type: string; ageDays: number }> = [];

  for (const entry of configEntries) {
    const ageMs = now.getTime() - entry.lastReviewedAt.getTime();
    if (ageMs > windowMs) {
      staleEntries.push({
        id: entry.id,
        type: entry.type,
        ageDays: Math.floor(ageMs / (24 * 60 * 60 * 1000)),
      });
    }
  }

  return {
    job: 'stale_config_check',
    staleEntries,
    warningIssued: staleEntries.length > 0,
    executedAt: now.toISOString(),
  };
}
