/**
 * Source Block Reference Service (SR-D2 / ADR-0022 / Database Design §5).
 *
 * Invariants:
 * 1. ZERO source text is accepted or stored on the server.
 * 2. Only metadata is persisted: kind, char_count, attributed_work_id, client_commitment, session_id.
 * 3. Enforces per-block cap (8,000) and conversation cap (40,000).
 * 4. Structural ownership (user_id).
 */

import {
  MAX_BLOCK_CHAR_COUNT,
  MAX_CONVERSATION_CHAR_COUNT,
  SourceBlockCapError,
  ConversationSourceCapError,
} from '../../packages/guidance/src/caps';
import type { SourceBlockKind, SourceBlockRefRecord } from '../../packages/guidance/src/types';

export interface CreateSourceBlockRefInput {
  id?: string;
  conversationId: string;
  userId: string;
  kind: SourceBlockKind;
  charCount: number;
  attributedWorkId?: string;
  clientCommitment: string;
  sessionId: string;
}

export class SourceBlockRefService {
  private records = new Map<string, SourceBlockRefRecord>();

  /**
   * Records a source block metadata reference.
   * Strictly enforces that NO body or plain text is accepted.
   */
  async recordSourceBlockRef(
    input: CreateSourceBlockRefInput & { body?: never; text?: never }
  ): Promise<SourceBlockRefRecord> {
    // 1. Validate block cap
    if (input.charCount > MAX_BLOCK_CHAR_COUNT) {
      throw new SourceBlockCapError(
        `Source block exceeds cap of ${MAX_BLOCK_CHAR_COUNT} characters (has ${input.charCount}).`,
        input.charCount,
        MAX_BLOCK_CHAR_COUNT
      );
    }

    // 2. Validate conversation-wide cap
    const convRecords = await this.listByConversation(input.conversationId, input.userId);
    const totalChars = convRecords.reduce((sum, r) => sum + r.charCount, 0) + input.charCount;

    if (totalChars > MAX_CONVERSATION_CHAR_COUNT) {
      throw new ConversationSourceCapError(
        `Total source text for conversation exceeds ${MAX_CONVERSATION_CHAR_COUNT} characters (would be ${totalChars}).`,
        totalChars,
        MAX_CONVERSATION_CHAR_COUNT
      );
    }

    const id = input.id ?? crypto.randomUUID();
    const record: SourceBlockRefRecord = {
      id,
      conversationId: input.conversationId,
      userId: input.userId,
      kind: input.kind,
      charCount: input.charCount,
      attributedWorkId: input.attributedWorkId,
      clientCommitment: input.clientCommitment,
      sessionId: input.sessionId,
      createdAt: new Date().toISOString(),
    };

    this.records.set(id, record);
    return record;
  }

  async getById(id: string, userId: string): Promise<SourceBlockRefRecord | null> {
    const rec = this.records.get(id);
    if (!rec || rec.userId !== userId) {
      return null;
    }
    return rec;
  }

  async listByConversation(conversationId: string, userId: string): Promise<SourceBlockRefRecord[]> {
    const list: SourceBlockRefRecord[] = [];
    for (const rec of this.records.values()) {
      if (rec.conversationId === conversationId && rec.userId === userId) {
        list.push(rec);
      }
    }
    return list;
  }

  /**
   * Returns all source block references across all users.
   * Metadata only: used by the SR-D3 accretion tripwire.
   */
  async listAll(): Promise<SourceBlockRefRecord[]> {
    return Array.from(this.records.values());
  }
}
