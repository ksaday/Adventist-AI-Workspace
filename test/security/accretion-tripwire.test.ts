import { describe, it, expect, beforeEach } from 'vitest';
import { SourceBlockRefService } from '../../server/domain/source-block.js';
import { AuditChain } from '../../server/audit/index.js';
import {
  runAccretionTripwire,
  DEFAULT_ACCRETION_THRESHOLD_CHARS,
} from '../../server/jobs/accretion-tripwire.js';
import { getSecurityEvents, clearSecurityEvents } from '../../server/obs/logger.js';

describe('SR-D3 Accretion Tripwire Subsystem (Corpus-Formation Tripwire)', () => {
  let sourceBlockService: SourceBlockRefService;
  let auditChain: AuditChain;

  beforeEach(() => {
    sourceBlockService = new SourceBlockRefService();
    auditChain = new AuditChain();
    clearSecurityEvents();
  });

  it('aggregates source block metadata correctly without triggering below threshold', async () => {
    // User 1 supplies 3 blocks from Desire of Ages (total 15,000 chars)
    for (let i = 0; i < 3; i++) {
      await sourceBlockService.recordSourceBlockRef({
        conversationId: `conv-u1-${i}`,
        userId: 'user-001',
        kind: 'pasted_text',
        charCount: 5000,
        attributedWorkId: 'da',
        clientCommitment: `commit-da-${i}`,
        sessionId: 'sess-1',
      });
    }

    // User 2 supplies 2 blocks from Great Controversy (total 12,000 chars)
    for (let i = 0; i < 2; i++) {
      await sourceBlockService.recordSourceBlockRef({
        conversationId: `conv-u2-${i}`,
        userId: 'user-002',
        kind: 'pasted_text',
        charCount: 6000,
        attributedWorkId: 'gc',
        clientCommitment: `commit-gc-${i}`,
        sessionId: 'sess-2',
      });
    }

    const report = await runAccretionTripwire(sourceBlockService, {
      thresholdChars: DEFAULT_ACCRETION_THRESHOLD_CHARS, // 50,000
      auditChain,
    });

    expect(report.totalSourceBlocks).toBe(5);
    expect(report.totalCharacters).toBe(27000);
    expect(report.tripwireTriggered).toBe(false);
    expect(report.flaggedWorks).toHaveLength(0);

    const daSummary = report.workBreakdown.find(w => w.attributedWorkId === 'da');
    expect(daSummary).toBeDefined();
    expect(daSummary?.totalChars).toBe(15000);
    expect(daSummary?.blockCount).toBe(3);
    expect(daSummary?.uniqueUserCount).toBe(1);
    expect(daSummary?.exceedsThreshold).toBe(false);

    // No security alert triggered
    const secEvents = getSecurityEvents().filter(e => e.event === 'ACCRETION_TRIPWIRE_ALERT');
    expect(secEvents).toHaveLength(0);
  });

  it('triggers administrative alert when a single work exceeds the 50,000-character threshold', async () => {
    // 7 distinct users each paste 7,500 characters from Desire of Ages (total 52,500 chars)
    for (let u = 1; u <= 7; u++) {
      await sourceBlockService.recordSourceBlockRef({
        conversationId: `conv-cross-user-${u}`,
        userId: `user-00${u}`,
        kind: 'pasted_text',
        charCount: 7500,
        attributedWorkId: 'da',
        clientCommitment: `commit-cross-${u}`,
        sessionId: `sess-${u}`,
      });
    }

    const report = await runAccretionTripwire(sourceBlockService, {
      thresholdChars: DEFAULT_ACCRETION_THRESHOLD_CHARS, // 50,000
      auditChain,
    });

    expect(report.totalCharacters).toBe(52500);
    expect(report.tripwireTriggered).toBe(true);
    expect(report.flaggedWorks).toHaveLength(1);

    const flagged = report.flaggedWorks[0];
    expect(flagged.attributedWorkId).toBe('da');
    expect(flagged.totalChars).toBe(52500);
    expect(flagged.uniqueUserCount).toBe(7);
    expect(flagged.exceedsThreshold).toBe(true);

    // Verify security event was logged
    const secEvents = getSecurityEvents().filter(e => e.event === 'ACCRETION_TRIPWIRE_ALERT');
    expect(secEvents).toHaveLength(1);
    expect(secEvents[0].details).toMatchObject({
      flaggedCount: 1,
      thresholdChars: 50000,
    });

    // Verify audit event was appended
    expect(auditChain.getRecords().some(r => r.action === 'accretion_tripwire_alert')).toBe(true);
    expect(auditChain.verify().valid).toBe(true);
  });

  it('ZERO TEXT INVARIANT: Accretion tripwire inspects and returns metadata only, never text bodies', async () => {
    await sourceBlockService.recordSourceBlockRef({
      conversationId: 'conv-metadata-check',
      userId: 'user-001',
      kind: 'pasted_text',
      charCount: 4500,
      attributedWorkId: 'sc',
      clientCommitment: 'dummy-commitment-marker',
      sessionId: 'sess-meta',
    });

    const allRecords = await sourceBlockService.listAll();
    expect(allRecords).toHaveLength(1);
    const rec = allRecords[0];

    // Invariant 4 / ADR-0022: source_block_ref has NO body or text column
    expect((rec as any).body).toBeUndefined();
    expect((rec as any).text).toBeUndefined();
    expect((rec as any).sourceText).toBeUndefined();
    expect((rec as any).bodyEnc).toBeUndefined();

    const report = await runAccretionTripwire(sourceBlockService);
    const reportJson = JSON.stringify(report);

    // Verify report structure contains zero text
    expect(reportJson).not.toContain('Steps to Christ was written in 1892');
    expect(report.workBreakdown[0].attributedWorkId).toBe('sc');
    expect(report.workBreakdown[0].totalChars).toBe(4500);
  });
});
