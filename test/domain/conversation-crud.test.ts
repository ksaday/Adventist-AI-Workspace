import { describe, it, expect } from 'vitest';
import { ConversationService } from '../../server/domain/conversation.js';
import { generateUserDek, decryptEnvelope } from '../../server/crypto/index.js';

describe('Conversation & Message CRUD (Phase 2)', () => {
  const userId = '018f4a12-8888-7000-8000-000000000001';

  it('creates conversation with encrypted title and manages sequential messages', () => {
    const service = new ConversationService();
    const userDek = generateUserDek();

    const conv = service.createConversation({
      id: 'conv-001',
      userId,
      app: 'p3',
      titlePlaintext: 'Sabbath Observance Questions',
      userDek,
      privacyMode: 'standard',
    });

    expect(conv.id).toBe('conv-001');
    expect(conv.messageCount).toBe(0);

    // Verify title is encrypted
    const title = decryptEnvelope(conv.titleEnc, userDek, {
      userId,
      resourceId: conv.id,
      purpose: 'conversation_title',
    });
    expect(title).toBe('Sabbath Observance Questions');

    // Add sequential messages
    const msg1 = service.addMessage({
      messageId: 'msg-001',
      conversationId: conv.id,
      userId,
      role: 'user',
      bodyPlaintext: 'What does Isaiah 58:13 teach regarding the Sabbath?',
      userDek,
    });
    expect(msg1.seq).toBe(1);

    const msg2 = service.addMessage({
      messageId: 'msg-002',
      conversationId: conv.id,
      userId,
      role: 'workspace',
      bodyPlaintext: 'Prepared composed prompt for Isaiah 58:13.',
      userDek,
    });
    expect(msg2.seq).toBe(2);

    const msg3 = service.addMessage({
      messageId: 'msg-003',
      conversationId: conv.id,
      userId,
      role: 'assistant_external',
      bodyPlaintext: 'Isaiah 58:13 calls the Sabbath a delight...',
      userDek,
      providerId: 'claude',
    });
    expect(msg3.seq).toBe(3);

    expect(conv.messageCount).toBe(3);
    expect(conv.messages).toHaveLength(3);
  });

  it('handles archive, soft-delete with 30-day purge window, and restore', () => {
    const service = new ConversationService();
    const userDek = generateUserDek();

    const conv = service.createConversation({
      id: 'conv-002',
      userId,
      app: 'p2',
      titlePlaintext: 'Family Prayer Requests',
      userDek,
    });

    // Archive
    service.archive(conv.id);
    expect(conv.archivedAt).toBeDefined();

    // Soft delete
    service.softDelete(conv.id);
    expect(conv.deletedAt).toBeDefined();
    expect(conv.purgeAfter).toBeDefined();

    // Ensure purgeAfter is approximately 30 days in future
    const deletedTime = new Date(conv.deletedAt!).getTime();
    const purgeTime = new Date(conv.purgeAfter!).getTime();
    const daysDiff = (purgeTime - deletedTime) / (1000 * 60 * 60 * 24);
    expect(Math.round(daysDiff)).toBe(30);

    // Restore
    service.restore(conv.id);
    expect(conv.deletedAt).toBeUndefined();
    expect(conv.purgeAfter).toBeUndefined();
  });

  it('duplicates a conversation with sequence reset and re-encrypted titles', () => {
    const service = new ConversationService();
    const userDek = generateUserDek();

    const original = service.createConversation({
      id: 'conv-orig',
      userId,
      app: 'p4',
      titlePlaintext: 'Sermon Outline: Grace',
      userDek,
    });

    service.addMessage({
      messageId: 'msg-orig-1',
      conversationId: original.id,
      userId,
      role: 'user',
      bodyPlaintext: 'Three point sermon outline on Ephesians 2:8-10',
      userDek,
    });

    const duplicate = service.duplicate({
      sourceConversationId: original.id,
      newConversationId: 'conv-copy',
      userDek,
    });

    expect(duplicate.id).toBe('conv-copy');
    expect(duplicate.messages).toHaveLength(1);
    expect(duplicate.messages[0].seq).toBe(1);

    const dupTitle = decryptEnvelope(duplicate.titleEnc, userDek, {
      userId,
      resourceId: duplicate.id,
      purpose: 'conversation_title',
    });
    expect(dupTitle).toBe('Copy of Sermon Outline: Grace');
  });
});
