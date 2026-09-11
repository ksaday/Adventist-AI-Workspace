/**
 * Regression coverage for server/db/repositories/source-block.ts (P2/P3/P4
 * persistence wiring, 2026-09-11). Requires a live Postgres with migrations
 * applied and APP_MASTER_KEY_HEX set — skipped otherwise, same convention as
 * test/auth/login-timing-side-channel.test.ts.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import crypto from 'node:crypto';

const hasDb = !!process.env.DATABASE_URL && !!process.env.APP_MASTER_KEY_HEX;

describe.skipIf(!hasDb)('source_block_ref persistence (real Postgres)', () => {
  let query: typeof import('../../server/db/pool.js').query;
  let createSourceBlockRef: typeof import('../../server/db/repositories/source-block.js').createSourceBlockRef;
  let ConversationNotFoundError: typeof import('../../server/db/repositories/source-block.js').ConversationNotFoundError;
  let registerUser: typeof import('../../server/db/repositories/user.js').registerUser;
  let createConversation: typeof import('../../server/db/repositories/conversation.js').createConversation;
  let getUserDek: typeof import('../../server/db/repositories/user.js').getUserDek;

  let userId: string;
  let otherUserId: string;
  let conversationId: string;

  beforeAll(async () => {
    query = (await import('../../server/db/pool.js')).query;
    const sourceBlockRepo = await import('../../server/db/repositories/source-block.js');
    createSourceBlockRef = sourceBlockRepo.createSourceBlockRef;
    ConversationNotFoundError = sourceBlockRepo.ConversationNotFoundError;
    const userRepo = await import('../../server/db/repositories/user.js');
    registerUser = userRepo.registerUser;
    getUserDek = userRepo.getUserDek;
    createConversation = (await import('../../server/db/repositories/conversation.js')).createConversation;

    const owner = await registerUser({
      email: `sourceblock-owner-${Date.now()}@example.com`,
      password: 'a-real-password-1234',
      declaredRole: 'member',
    });
    userId = owner.userId;

    const other = await registerUser({
      email: `sourceblock-other-${Date.now()}@example.com`,
      password: 'a-real-password-1234',
      declaredRole: 'member',
    });
    otherUserId = other.userId;

    const dek = await getUserDek(userId);
    const conv = await createConversation({
      userId,
      app: 'p3',
      title: 'Test guidance conversation',
      userDek: dek,
    });
    conversationId = conv.id;
    dek.fill(0);
  });

  it('persists metadata only — client_commitment round-trips, no text/salt column exists', async () => {
    const commitment = crypto.createHash('sha256').update('salt+text, never sent').digest('hex');
    const id = crypto.randomUUID();

    await createSourceBlockRef({
      id,
      conversationId,
      userId,
      kind: 'pasted_text',
      charCount: 42,
      attributedWorkId: undefined,
      clientCommitment: commitment,
      sessionId: crypto.randomUUID(),
    });

    const rows = await query<{ client_commitment: Buffer; char_count: number; kind: string }>(
      'SELECT client_commitment, char_count, kind FROM source_block_ref WHERE id = $1',
      [id]
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].client_commitment.toString('hex')).toBe(commitment);
    expect(rows[0].char_count).toBe(42);
    expect(rows[0].kind).toBe('pasted_text');

    // The table itself has no body/text/salt column — structural, not just this insert's behavior.
    const columns = await query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'source_block_ref'`
    );
    const columnNames = columns.map(c => c.column_name);
    expect(columnNames).not.toContain('text');
    expect(columnNames).not.toContain('body');
    expect(columnNames).not.toContain('salt');
  });

  it('rejects a source block for a conversation the caller does not own (IDOR)', async () => {
    await expect(
      createSourceBlockRef({
        id: crypto.randomUUID(),
        conversationId,
        userId: otherUserId, // does not own conversationId
        kind: 'pasted_text',
        charCount: 10,
        clientCommitment: crypto.createHash('sha256').update('x').digest('hex'),
        sessionId: crypto.randomUUID(),
      })
    ).rejects.toThrow(ConversationNotFoundError);
  });
});
