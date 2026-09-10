import { describe, it, expect } from 'vitest';
import {
  MAX_BLOCK_CHAR_COUNT,
  MAX_CONVERSATION_CHAR_COUNT,
  validateBlockCap,
  validateConversationCap,
  computeClientCommitment,
  createClientSourceBlock,
  toSourceBlockRefRecord,
  SourceBlockCapError,
  ConversationSourceCapError,
} from '../../packages/guidance/src/caps';
import { SourceBlockRefService } from '../../server/domain/source-block';

describe('Source Block Caps and Client Commitment (Phase 5)', () => {
  it('enforces the 8,000 character per-block cap (SR-D2 / AC-E3)', () => {
    expect(MAX_BLOCK_CHAR_COUNT).toBe(8000);

    const validText = 'A'.repeat(8000);
    const check1 = validateBlockCap(validText);
    expect(check1.valid).toBe(true);
    expect(check1.charCount).toBe(8000);

    const invalidText = 'A'.repeat(8001);
    const check2 = validateBlockCap(invalidText);
    expect(check2.valid).toBe(false);
    expect(check2.charCount).toBe(8001);
    expect(check2.error).toContain('Source block exceeds cap of 8000 characters');

    expect(() =>
      createClientSourceBlock({
        kind: 'pasted_text',
        label: 'Too big',
        text: invalidText,
      })
    ).toThrow(SourceBlockCapError);
  });

  it('enforces the 40,000 character per-conversation cap (SR-D2)', () => {
    expect(MAX_CONVERSATION_CHAR_COUNT).toBe(40000);

    const existingBlocks = [
      { charCount: 8000 },
      { charCount: 8000 },
      { charCount: 8000 },
      { charCount: 8000 },
    ]; // 32,000 total

    // Adding 8,000 reaches exactly 40,000 (valid)
    const check1 = validateConversationCap(existingBlocks, 8000);
    expect(check1.valid).toBe(true);
    expect(check1.totalCharCount).toBe(40000);

    // Adding 8,001 exceeds 40,000 (invalid)
    const check2 = validateConversationCap(existingBlocks, 8001);
    expect(check2.valid).toBe(false);
    expect(check2.totalCharCount).toBe(40001);
    expect(check2.error).toContain('Total conversation source blocks exceed cap of 40000 characters');

    expect(() =>
      createClientSourceBlock({
        kind: 'pasted_text',
        label: 'Overflow block',
        text: 'A'.repeat(8000),
        existingBlocks: [...existingBlocks, { charCount: 1 }], // 32,001 + 8000 = 40001
      })
    ).toThrow(ConversationSourceCapError);
  });

  it('computes browser-side client commitment deterministically over salt and normalised text', () => {
    const raw1 = 'Trust in the Lord with all your heart.\r\n';
    const raw2 = 'Trust in the Lord with all your heart.\n';
    const salt = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

    const res1 = computeClientCommitment(raw1.trim(), salt);
    const res2 = computeClientCommitment(raw2.trim(), salt);

    expect(res1.commitment).toBe(res2.commitment);
    expect(res1.commitment.length).toBe(64); // SHA-256 hex
    expect(res1.salt).toBe(salt);

    // Different salt yields different commitment
    const salt2 = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const res3 = computeClientCommitment(raw1.trim(), salt2);
    expect(res3.commitment).not.toBe(res1.commitment);
  });

  it('structural invariant: toSourceBlockRefRecord extracts metadata only with zero text body', () => {
    const block = createClientSourceBlock({
      kind: 'pasted_text',
      label: 'Selected quotation',
      text: 'For God so loved the world...',
    });

    const record = toSourceBlockRefRecord(block, 'conv-123', 'user-456', 'sess-789');

    // Confirm metadata presence
    expect(record.id).toBe(block.id);
    expect(record.conversationId).toBe('conv-123');
    expect(record.userId).toBe('user-456');
    expect(record.kind).toBe('pasted_text');
    expect(record.charCount).toBe(29);
    expect(record.clientCommitment).toBe(block.commitment);
    expect(record.sessionId).toBe('sess-789');

    // Confirm strict absence of text and salt (Invariant 4 / ADR-0022)
    expect((record as unknown as Record<string, unknown>).text).toBeUndefined();
    expect((record as unknown as Record<string, unknown>).body).toBeUndefined();
    expect((record as unknown as Record<string, unknown>).salt).toBeUndefined();
  });

  it('SourceBlockRefService persists metadata only and enforces caps on the server', async () => {
    const service = new SourceBlockRefService();

    const ref = await service.recordSourceBlockRef({
      conversationId: 'conv-abc',
      userId: 'user-001',
      kind: 'bible_reference',
      charCount: 15,
      clientCommitment: 'abc123commitment',
      sessionId: 'session-xyz',
    });

    expect(ref.id).toBeDefined();
    expect(ref.charCount).toBe(15);

    // Verify retrieval by user
    const fetched = await service.getById(ref.id, 'user-001');
    expect(fetched).not.toBeNull();
    expect(fetched?.conversationId).toBe('conv-abc');

    // IDOR protection: cannot retrieve another user's ref
    const forbidden = await service.getById(ref.id, 'user-999');
    expect(forbidden).toBeNull();

    // Rejects block exceeding 8,000 on server
    await expect(
      service.recordSourceBlockRef({
        conversationId: 'conv-abc',
        userId: 'user-001',
        kind: 'pasted_text',
        charCount: 8001,
        clientCommitment: 'commit',
        sessionId: 'sess',
      })
    ).rejects.toThrow(SourceBlockCapError);
  });
});
