/**
 * Postgres-backed conversation/message persistence (Phase 11 app-wiring).
 *
 * This is the real persistence path used by app/api/conversations/*. It is a
 * parallel implementation to server/domain/conversation.ts's in-memory
 * ConversationService (kept as-is so its existing unit tests still exercise
 * the pure business rules), applying the same Layer-2 ephemeral-body rule
 * server-side as defense in depth ahead of the DB's own trigger
 * (check_ephemeral_no_body, 0002_phase2_conversations.sql).
 */

import crypto from 'node:crypto';
import { query, withTransaction } from '../pool.js';
import { splitEnvelope, joinEnvelope, packEnvelope, unpackEnvelope } from '../envelope-codec.js';
import { encryptEnvelope, decryptEnvelope } from '../../crypto/index.js';
import { EphemeralBodyPersistenceError, type PrivacyMode } from '../../domain/conversation.js';

export type AppKind = 'p2' | 'p3' | 'p4' | 'verify';
export type MessageRole = 'user' | 'workspace' | 'assistant_external' | 'system_note';

export interface ConversationSummary {
  id: string;
  app: AppKind;
  title: string;
  privacyMode: PrivacyMode;
  updatedAt: string;
}

export interface MessageView {
  seq: number;
  role: MessageRole;
  content: string | null; // null for ephemeral turns (never persisted)
  providerId?: string;
}

export async function createConversation(params: {
  userId: string;
  app: AppKind;
  title: string;
  userDek: Buffer;
  privacyMode?: PrivacyMode;
}): Promise<ConversationSummary> {
  const id = crypto.randomUUID();
  const privacyMode = params.privacyMode ?? 'standard';
  const titleEnvelope = encryptEnvelope(params.title, params.userDek, {
    userId: params.userId,
    resourceId: id,
    purpose: 'title',
  });

  await query(
    `INSERT INTO conversation (id, user_id, app, title_enc, privacy_mode)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, params.userId, params.app, packEnvelope(titleEnvelope), privacyMode]
  );

  return { id, app: params.app, title: params.title, privacyMode, updatedAt: new Date().toISOString() };
}

export async function listConversations(userId: string, userDek: Buffer): Promise<ConversationSummary[]> {
  const rows = await query<{
    id: string;
    app: AppKind;
    title_enc: Buffer | null;
    privacy_mode: PrivacyMode;
    updated_at: string;
  }>(
    `SELECT id, app, title_enc, privacy_mode, updated_at
       FROM conversation
      WHERE user_id = $1 AND deleted_at IS NULL
      ORDER BY updated_at DESC`,
    [userId]
  );

  return rows.map((row) => ({
    id: row.id,
    app: row.app,
    title: row.title_enc
      ? decryptEnvelope(unpackEnvelope(row.title_enc, 'user-dek-v1'), userDek, {
          userId,
          resourceId: row.id,
          purpose: 'title',
        })
      : '(untitled)',
    privacyMode: row.privacy_mode,
    updatedAt: row.updated_at,
  }));
}

export async function addMessage(params: {
  conversationId: string;
  userId: string;
  role: MessageRole;
  content?: string;
  userDek: Buffer;
  providerId?: string;
}): Promise<{ seq: number }> {
  const convRows = await query<{ privacy_mode: PrivacyMode; message_count: number }>(
    `SELECT privacy_mode, message_count FROM conversation WHERE id = $1 AND user_id = $2`,
    [params.conversationId, params.userId]
  );
  if (convRows.length === 0) {
    throw new Error(`Conversation ${params.conversationId} not found.`);
  }
  const conv = convRows[0];

  if (conv.privacy_mode === 'ephemeral' && params.content && params.content.trim().length > 0) {
    throw new EphemeralBodyPersistenceError(params.conversationId);
  }

  const seq = conv.message_count + 1;
  const id = crypto.randomUUID();

  await withTransaction(async (client) => {
    if (params.content && conv.privacy_mode !== 'ephemeral') {
      const envelope = encryptEnvelope(params.content, params.userDek, {
        userId: params.userId,
        resourceId: `${params.conversationId}:${seq}`,
        purpose: 'message_body',
      });
      const split = splitEnvelope(envelope);
      await client.query(
        `INSERT INTO message (id, conversation_id, user_id, seq, role, body_enc, body_key_id, body_iv, body_tag, char_count, provider_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          id,
          params.conversationId,
          params.userId,
          seq,
          params.role,
          split.ciphertext,
          split.keyId,
          split.iv,
          split.tag,
          params.content.length,
          params.providerId ?? null,
        ]
      );
    } else {
      await client.query(
        `INSERT INTO message (id, conversation_id, user_id, seq, role, char_count, provider_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [id, params.conversationId, params.userId, seq, params.role, params.content?.length ?? null, params.providerId ?? null]
      );
    }
    await client.query(
      `UPDATE conversation SET message_count = $1, updated_at = now() WHERE id = $2`,
      [seq, params.conversationId]
    );
  });

  return { seq };
}

export async function getConversationMessages(
  conversationId: string,
  userId: string,
  userDek: Buffer
): Promise<MessageView[]> {
  const rows = await query<{
    seq: number;
    role: MessageRole;
    body_enc: Buffer | null;
    body_key_id: string | null;
    body_iv: Buffer | null;
    body_tag: Buffer | null;
    provider_id: string | null;
  }>(
    `SELECT seq, role, body_enc, body_key_id, body_iv, body_tag, provider_id
       FROM message
      WHERE conversation_id = $1 AND user_id = $2
      ORDER BY seq ASC`,
    [conversationId, userId]
  );

  return rows.map((row) => ({
    seq: row.seq,
    role: row.role,
    providerId: row.provider_id ?? undefined,
    content:
      row.body_enc && row.body_key_id && row.body_iv && row.body_tag
        ? decryptEnvelope(
            joinEnvelope({ ciphertext: row.body_enc, iv: row.body_iv, tag: row.body_tag, keyId: row.body_key_id }),
            userDek,
            { userId, resourceId: `${conversationId}:${row.seq}`, purpose: 'message_body' }
          )
        : null,
  }));
}
