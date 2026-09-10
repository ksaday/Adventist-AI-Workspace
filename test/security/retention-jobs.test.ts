import { describe, it, expect, beforeEach } from 'vitest';
import { ConversationService } from '../../server/domain/conversation.js';
import { AuditChain } from '../../server/audit/index.js';
import {
  purgeExpiredConversations,
  finaliseAccountDeletions,
  expireSessionsAndTokens,
  staleConfigCheck,
  type Clock,
  type UserDeletionRecord,
  type SessionRecord,
  type ResetTokenRecord,
} from '../../server/jobs/retention.js';
import { generateUserDek, wrapDek } from '../../server/crypto/index.js';

describe('Retention and Purge Scheduled Jobs (Database Design §10 / Retention §6)', () => {
  const masterKey = Buffer.alloc(32, 0x5a);
  let conversationService: ConversationService;
  let auditChain: AuditChain;

  beforeEach(() => {
    conversationService = new ConversationService();
    auditChain = new AuditChain();
  });

  it('EXIT CRITERION 3: Executes clock-fixture time-travel tests and purges conversations past purge_after', () => {
    const userDek = generateUserDek();
    const t0 = new Date('2026-09-01T12:00:00Z');

    // Create 3 conversations
    const conv1 = conversationService.createConversation({
      id: 'conv-keep-active',
      userId: 'user-001',
      app: 'p3',
      titlePlaintext: 'Active Chat',
      userDek,
    });

    const conv2 = conversationService.createConversation({
      id: 'conv-soft-deleted-recent',
      userId: 'user-001',
      app: 'p3',
      titlePlaintext: 'Recently Deleted',
      userDek,
    });
    // Soft delete conv2 at t0 (purgeAfter = t0 + 30 days)
    conversationService.softDelete('conv-soft-deleted-recent', { deletedAt: t0 });

    const conv3 = conversationService.createConversation({
      id: 'conv-soft-deleted-expired',
      userId: 'user-001',
      app: 'p3',
      titlePlaintext: 'Expired Deleted',
      userDek,
    });
    conversationService.softDelete('conv-soft-deleted-expired', { deletedAt: t0 });

    // Simulate clock at t0 + 10 days (neither should be purged)
    const t10 = new Date('2026-09-11T12:00:00Z');
    const clockT10: Clock = { now: () => t10 };
    const resT10 = purgeExpiredConversations(conversationService, { clock: clockT10 });
    expect(resT10.purgedCount).toBe(0);
    expect(conversationService.getConversation('conv-soft-deleted-expired')).toBeDefined();

    // Simulate clock at t0 + 31 days (recovery window expired for soft-deleted)
    const t31 = new Date('2026-10-02T13:00:00Z');
    const clockT31: Clock = { now: () => t31 };

    // 1. Dry run at t31 should detect but NOT remove
    const dryRunRes = purgeExpiredConversations(conversationService, {
      dryRun: true,
      clock: clockT31,
    });
    expect(dryRunRes.dryRun).toBe(true);
    expect(dryRunRes.purgedCount).toBe(2);
    expect(dryRunRes.purgedIds).toContain('conv-soft-deleted-recent');
    expect(dryRunRes.purgedIds).toContain('conv-soft-deleted-expired');
    // Verify conversations still exist in storage after dry run
    expect(conversationService.getConversation('conv-soft-deleted-expired')).toBeDefined();

    // 2. Live run at t31 executes permanent purge
    const liveRunRes = purgeExpiredConversations(conversationService, {
      dryRun: false,
      clock: clockT31,
      auditChain,
    });
    expect(liveRunRes.dryRun).toBe(false);
    expect(liveRunRes.purgedCount).toBe(2);

    // Verify expired conversations are removed permanently
    expect(conversationService.getConversation('conv-soft-deleted-recent')).toBeUndefined();
    expect(conversationService.getConversation('conv-soft-deleted-expired')).toBeUndefined();
    // Active conversation is completely untouched
    expect(conversationService.getConversation('conv-keep-active')).toBeDefined();

    // Audit log records the purge count
    expect(auditChain.getRecords()).toHaveLength(1);
    expect(auditChain.getRecords()[0].action).toBe('purge_expired_conversations');
    expect(auditChain.verify().valid).toBe(true);
  });

  it('finalises account deletions by crypto-erasing DEK first (Ordered Deletion)', () => {
    const rawDek = generateUserDek();
    const wrappedDek = wrapDek(rawDek, masterKey);

    const accounts: UserDeletionRecord[] = [
      {
        userId: 'user-grace-active',
        status: 'pending_deletion',
        deletionDue: new Date('2026-10-15T00:00:00Z'),
        dek: wrappedDek,
      },
      {
        userId: 'user-grace-expired',
        status: 'pending_deletion',
        deletionDue: new Date('2026-09-05T00:00:00Z'),
        dek: wrappedDek,
        activeDekBuffer: rawDek,
      },
    ];

    const currentClock: Clock = { now: () => new Date('2026-09-10T00:00:00Z') };

    // Dry run
    const dryRun = finaliseAccountDeletions(accounts, { dryRun: true, clock: currentClock });
    expect(dryRun.dryRun).toBe(true);
    expect(dryRun.finalisedCount).toBe(1);
    expect(dryRun.finalisedUserIds).toEqual(['user-grace-expired']);
    expect(accounts[1].status).toBe('pending_deletion'); // Unchanged in dry run

    // Live run
    const liveRun = finaliseAccountDeletions(accounts, {
      dryRun: false,
      clock: currentClock,
      auditChain,
    });
    expect(liveRun.dryRun).toBe(false);
    expect(liveRun.finalisedCount).toBe(1);
    expect(liveRun.keysCryptoErased).toBe(1);

    // Account status updated to deleted, and DEK was destroyed/removed
    expect(accounts[1].status).toBe('deleted');
    expect(accounts[1].dek).toBeUndefined();

    // Account with active grace period is untouched
    expect(accounts[0].status).toBe('pending_deletion');
    expect(accounts[0].dek).toBeDefined();

    expect(auditChain.verify().valid).toBe(true);
  });

  it('purges expired sessions and single-use password reset tokens', () => {
    const clockTime = new Date('2026-09-10T15:00:00Z');
    const clock: Clock = { now: () => clockTime };

    const sessions: SessionRecord[] = [
      { sessionId: 'sess-active', userId: 'u1', expiresAt: new Date('2026-09-10T16:00:00Z') },
      { sessionId: 'sess-expired-1', userId: 'u2', expiresAt: new Date('2026-09-10T14:30:00Z') },
      { sessionId: 'sess-expired-2', userId: 'u3', expiresAt: new Date('2026-09-10T14:59:00Z') },
    ];

    const tokens: ResetTokenRecord[] = [
      { tokenId: 'tok-active', userId: 'u1', expiresAt: new Date('2026-09-10T15:30:00Z') },
      { tokenId: 'tok-expired', userId: 'u4', expiresAt: new Date('2026-09-10T14:00:00Z') },
    ];

    // Dry run
    const dry = expireSessionsAndTokens(sessions, tokens, { dryRun: true, clock });
    expect(dry.expiredSessionsCount).toBe(2);
    expect(dry.expiredTokensCount).toBe(1);
    expect(sessions).toHaveLength(3); // Unchanged

    // Live run
    const live = expireSessionsAndTokens(sessions, tokens, { dryRun: false, clock });
    expect(live.expiredSessionsCount).toBe(2);
    expect(live.expiredTokensCount).toBe(1);

    expect(sessions).toHaveLength(1);
    expect(sessions[0].sessionId).toBe('sess-active');

    expect(tokens).toHaveLength(1);
    expect(tokens[0].tokenId).toBe('tok-active');
  });

  it('flags stale configuration entries older than the review window', () => {
    const clockTime = new Date('2026-09-10T12:00:00Z');
    const clock: Clock = { now: () => clockTime };

    const configEntries = [
      {
        id: 'entry-recent',
        type: 'source_directory',
        lastReviewedAt: new Date('2026-06-01T12:00:00Z'), // ~101 days old
      },
      {
        id: 'entry-stale',
        type: 'emergency_resource',
        lastReviewedAt: new Date('2026-01-01T12:00:00Z'), // ~252 days old (>180)
      },
    ];

    const result = staleConfigCheck(configEntries, 180, { clock });
    expect(result.warningIssued).toBe(true);
    expect(result.staleEntries).toHaveLength(1);
    expect(result.staleEntries[0].id).toBe('entry-stale');
    expect(result.staleEntries[0].ageDays).toBeGreaterThan(180);
  });
});
