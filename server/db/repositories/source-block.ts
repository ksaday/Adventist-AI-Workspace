/**
 * Postgres-backed source_block_ref persistence (P2/P3/P4 save wiring).
 *
 * Metadata only — id, kind, char_count, attributed_work_id, client_commitment,
 * session_id. The source text and its salt are computed and held in the
 * browser only (packages/guidance/src/caps.ts) and never reach this file or
 * any request body it reads (SR-D1 / ADR-0022).
 */

import { query } from '../pool.js';

export type SourceBlockKind = 'pasted_text' | 'bible_reference' | 'egw_citation' | 'url';

export class ConversationNotFoundError extends Error {
  constructor(conversationId: string) {
    super(`Conversation ${conversationId} not found.`);
    this.name = 'ConversationNotFoundError';
  }
}

export async function createSourceBlockRef(params: {
  id: string;
  conversationId: string;
  userId: string;
  kind: SourceBlockKind;
  charCount: number;
  attributedWorkId?: string;
  clientCommitment: string; // hex
  sessionId: string;
}): Promise<{ id: string }> {
  const owned = await query<{ id: string }>(
    `SELECT id FROM conversation WHERE id = $1 AND user_id = $2`,
    [params.conversationId, params.userId]
  );
  if (owned.length === 0) {
    throw new ConversationNotFoundError(params.conversationId);
  }

  await query(
    `INSERT INTO source_block_ref
       (id, conversation_id, user_id, kind, char_count, attributed_work_id, client_commitment, session_id)
     VALUES ($1, $2, $3, $4, $5, $6, decode($7, 'hex'), $8)`,
    [
      params.id,
      params.conversationId,
      params.userId,
      params.kind,
      params.charCount,
      params.attributedWorkId ?? null,
      params.clientCommitment,
      params.sessionId,
    ]
  );

  return { id: params.id };
}
