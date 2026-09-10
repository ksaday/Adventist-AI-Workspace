/**
 * Conversation and Message Domain Service (Phase 2).
 *
 * Implements:
 * 1. Conversation and message CRUD with sequential message numbering (`seq`).
 * 2. Strict 3-Layer Ephemeral Mode enforcement at the service layer.
 * 3. Archive, duplicate, and soft delete with 30-day recovery window.
 * 4. Client-side title decryption and search helper.
 */

import {
  encryptEnvelope,
  decryptEnvelope,
  type EnvelopeCiphertext,
  type AADContext,
} from '../crypto/index.js';

export type AppKind = 'p2' | 'p3' | 'p4' | 'verify';
export type PrivacyMode = 'standard' | 'ephemeral' | 'private';
export type MessageRole = 'user' | 'workspace' | 'assistant_external' | 'system_note';

export class EphemeralBodyPersistenceError extends Error {
  constructor(conversationId: string) {
    super(
      `SECURITY INVARIANT VIOLATION: Cannot persist message body in an Ephemeral conversation (${conversationId}).\n` +
      `Ephemeral mode guarantees that source and answer text are never persisted on the server (Database Design §5, SR-D1).`
    );
    this.name = 'EphemeralBodyPersistenceError';
  }
}

export interface StoredMessage {
  id: string;
  conversationId: string;
  userId: string;
  seq: number; // Strictly sequential integer (1, 2, 3...)
  role: MessageRole;
  bodyEnc?: EnvelopeCiphertext;
  charCount: number;
  providerId?: string;
  createdAt: string;
}

export interface StoredConversation {
  id: string;
  userId: string;
  app: AppKind;
  titleEnc: EnvelopeCiphertext;
  privacyMode: PrivacyMode;
  messageCount: number;
  tags: string[];
  archivedAt?: string;
  deletedAt?: string;
  purgeAfter?: string; // 30 days after deletedAt
  createdAt: string;
  updatedAt: string;
  messages: StoredMessage[];
}

export class ConversationService {
  private conversations: Map<string, StoredConversation> = new Map();

  /**
   * Create a new conversation with encrypted title.
   */
  public createConversation(params: {
    id: string;
    userId: string;
    app: AppKind;
    titlePlaintext: string;
    userDek: Buffer;
    privacyMode?: PrivacyMode;
    tags?: string[];
  }): StoredConversation {
    const aad: AADContext = {
      userId: params.userId,
      resourceId: params.id,
      purpose: 'conversation_title',
    };

    const titleEnc = encryptEnvelope(params.titlePlaintext, params.userDek, aad);
    const now = new Date().toISOString();

    const conversation: StoredConversation = {
      id: params.id,
      userId: params.userId,
      app: params.app,
      titleEnc,
      privacyMode: params.privacyMode ?? 'standard',
      messageCount: 0,
      tags: params.tags ?? [],
      createdAt: now,
      updatedAt: now,
      messages: [],
    };

    this.conversations.set(params.id, conversation);
    return conversation;
  }

  public getConversation(id: string): StoredConversation | undefined {
    return this.conversations.get(id);
  }

  /**
   * Appends a message using sequence-based ordering (`seq`).
   * Enforces Layer 2 of Ephemeral Mode: throws if attempting to store a body on an ephemeral conversation.
   */
  public addMessage(params: {
    messageId: string;
    conversationId: string;
    userId: string;
    role: MessageRole;
    bodyPlaintext?: string;
    userDek?: Buffer;
    charCount?: number;
    providerId?: string;
  }): StoredMessage {
    const conv = this.conversations.get(params.conversationId);
    if (!conv) {
      throw new Error(`Conversation not found: ${params.conversationId}`);
    }

    // Ephemeral Mode Service Layer Enforcement (Layer 2)
    if (conv.privacyMode === 'ephemeral' && params.bodyPlaintext && params.bodyPlaintext.trim().length > 0) {
      throw new EphemeralBodyPersistenceError(conv.id);
    }

    const nextSeq = conv.messageCount + 1;
    let bodyEnc: EnvelopeCiphertext | undefined = undefined;

    if (params.bodyPlaintext && params.userDek && conv.privacyMode !== 'ephemeral') {
      const aad: AADContext = {
        userId: params.userId,
        resourceId: `${conv.id}:${nextSeq}`,
        purpose: 'message_body',
      };
      bodyEnc = encryptEnvelope(params.bodyPlaintext, params.userDek, aad);
    }

    const message: StoredMessage = {
      id: params.messageId,
      conversationId: conv.id,
      userId: params.userId,
      seq: nextSeq,
      role: params.role,
      bodyEnc,
      charCount: params.charCount ?? params.bodyPlaintext?.length ?? 0,
      providerId: params.providerId,
      createdAt: new Date().toISOString(),
    };

    conv.messages.push(message);
    conv.messageCount = nextSeq;
    conv.updatedAt = new Date().toISOString();

    return message;
  }

  /**
   * Archive a conversation.
   */
  public archive(conversationId: string): void {
    const conv = this.conversations.get(conversationId);
    if (conv) {
      conv.archivedAt = new Date().toISOString();
      conv.updatedAt = new Date().toISOString();
    }
  }

  /**
   * Soft-delete a conversation with a 30-day purge recovery window.
   */
  public softDelete(
    conversationId: string,
    options?: { deletedAt?: Date; purgeDays?: number }
  ): void {
    const conv = this.conversations.get(conversationId);
    if (conv) {
      const now = options?.deletedAt ? options.deletedAt.getTime() : Date.now();
      const purgeDays = options?.purgeDays ?? 30;
      conv.deletedAt = new Date(now).toISOString();
      conv.purgeAfter = new Date(now + purgeDays * 24 * 60 * 60 * 1000).toISOString();
      conv.updatedAt = new Date(now).toISOString();
    }
  }

  /**
   * Restore a soft-deleted conversation within the 30-day window.
   */
  public restore(conversationId: string): void {
    const conv = this.conversations.get(conversationId);
    if (conv) {
      delete conv.deletedAt;
      delete conv.purgeAfter;
      conv.updatedAt = new Date().toISOString();
    }
  }

  /**
   * Lists all conversations stored in the service.
   */
  public listConversations(): StoredConversation[] {
    return Array.from(this.conversations.values());
  }

  /**
   * Hard-deletes a conversation permanently (used by retention purge jobs).
   */
  public hardDeleteConversation(conversationId: string): boolean {
    return this.conversations.delete(conversationId);
  }

  /**
   * Duplicates a conversation and resets sequence numbers for the new copy.
   */
  public duplicate(params: {
    sourceConversationId: string;
    newConversationId: string;
    userDek: Buffer;
  }): StoredConversation {
    const source = this.conversations.get(params.sourceConversationId);
    if (!source) {
      throw new Error(`Source conversation not found: ${params.sourceConversationId}`);
    }

    // Decrypt title to re-encrypt under the new resourceId AAD
    const sourceTitleAad: AADContext = {
      userId: source.userId,
      resourceId: source.id,
      purpose: 'conversation_title',
    };
    const titlePlain = decryptEnvelope(source.titleEnc, params.userDek, sourceTitleAad);

    const duplicated = this.createConversation({
      id: params.newConversationId,
      userId: source.userId,
      app: source.app,
      titlePlaintext: `Copy of ${titlePlain}`,
      userDek: params.userDek,
      privacyMode: source.privacyMode,
      tags: [...source.tags],
    });

    for (const msg of source.messages) {
      let bodyText: string | undefined = undefined;
      if (msg.bodyEnc && source.privacyMode !== 'ephemeral') {
        const msgAad: AADContext = {
          userId: source.userId,
          resourceId: `${source.id}:${msg.seq}`,
          purpose: 'message_body',
        };
        bodyText = decryptEnvelope(msg.bodyEnc, params.userDek, msgAad);
      }

      this.addMessage({
        messageId: `dup-${msg.id}`,
        conversationId: duplicated.id,
        userId: source.userId,
        role: msg.role,
        bodyPlaintext: bodyText,
        userDek: params.userDek,
        charCount: msg.charCount,
        providerId: msg.providerId,
      });
    }

    return duplicated;
  }
}

/**
 * Client-Side Conversation Search:
 * Fetches the encrypted list, decrypts titles in memory, and searches locally.
 * Guarantees zero search query transmission to the server.
 */
export function searchClientSide(
  conversations: StoredConversation[],
  query: string,
  userDek: Buffer
): Array<{ id: string; title: string; app: AppKind }> {
  const normalizedQuery = query.toLowerCase().trim();
  const results: Array<{ id: string; title: string; app: AppKind }> = [];

  for (const conv of conversations) {
    if (conv.deletedAt) continue;

    const aad: AADContext = {
      userId: conv.userId,
      resourceId: conv.id,
      purpose: 'conversation_title',
    };

    try {
      const decryptedTitle = decryptEnvelope(conv.titleEnc, userDek, aad);
      if (
        decryptedTitle.toLowerCase().includes(normalizedQuery) ||
        conv.tags.some(t => t.toLowerCase().includes(normalizedQuery))
      ) {
        results.push({
          id: conv.id,
          title: decryptedTitle,
          app: conv.app,
        });
      }
    } catch {
      // If decryption fails, skip rather than crashing search
    }
  }

  return results;
}
