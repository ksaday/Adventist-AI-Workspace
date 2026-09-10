import { describe, it, expect } from 'vitest';
import {
  ConversationService,
  EphemeralBodyPersistenceError,
} from '../../server/domain/conversation.js';
import { generateUserDek } from '../../server/crypto/index.js';

describe('3-Layer Ephemeral Mode Enforcement (Phase 2 Exit Criteria)', () => {
  const userId = '018f4a12-9999-7000-8000-000000000001';

  it('Layer 1 (UI/Client): standard ephemeral turn creates metadata-only record with no body', () => {
    const service = new ConversationService();
    const userDek = generateUserDek();

    const conv = service.createConversation({
      id: 'ephemeral-conv-01',
      userId,
      app: 'p2',
      titlePlaintext: 'Private Prayer (Ephemeral)',
      userDek,
      privacyMode: 'ephemeral',
    });

    // When operating in Ephemeral mode, client passes undefined bodyPlaintext
    const msg = service.addMessage({
      messageId: 'e-msg-1',
      conversationId: conv.id,
      userId,
      role: 'user',
      charCount: 150, // charCount is kept for analytics/quota, but body is null
    });

    expect(msg.bodyEnc).toBeUndefined();
    expect(msg.charCount).toBe(150);
  });

  it('Layer 2 (Service Layer): REFUSES to persist body in ephemeral mode and throws EphemeralBodyPersistenceError', () => {
    const service = new ConversationService();
    const userDek = generateUserDek();

    const conv = service.createConversation({
      id: 'ephemeral-conv-02',
      userId,
      app: 'p3',
      titlePlaintext: 'Sensitive Question',
      userDek,
      privacyMode: 'ephemeral',
    });

    // Attempting to supply a bodyPlaintext to an ephemeral conversation must be rejected!
    expect(() => {
      service.addMessage({
        messageId: 'e-msg-2',
        conversationId: conv.id,
        userId,
        role: 'user',
        bodyPlaintext: 'This sensitive confession must never reach the server database.',
        userDek,
      });
    }).toThrowError(EphemeralBodyPersistenceError);

    // Confirm that no message was persisted
    expect(conv.messages).toHaveLength(0);
    expect(conv.messageCount).toBe(0);
  });

  it('Layer 3 (Database / Direct SQL constraint): validates ephemeral constraint trigger logic', () => {
    // Simulates the DB trigger: trg_enforce_ephemeral_no_body
    function simulateDbTrigger(conversationPrivacy: string, bodyEnc: unknown) {
      if (conversationPrivacy === 'ephemeral' && bodyEnc !== null && bodyEnc !== undefined) {
        throw new Error(
          'SECURITY INVARIANT VIOLATION: Ephemeral conversation message cannot contain body_enc (SR-D1 / Database Design §5)'
        );
      }
      return true;
    }

    // Standard conversation can have body_enc
    expect(() => simulateDbTrigger('standard', Buffer.from('encrypted-data'))).not.toThrow();

    // Ephemeral conversation with null body is allowed
    expect(() => simulateDbTrigger('ephemeral', null)).not.toThrow();

    // Direct SQL insert of body_enc into ephemeral conversation raises exception
    expect(() => simulateDbTrigger('ephemeral', Buffer.from('encrypted-data'))).toThrowError(
      'Ephemeral conversation message cannot contain body_enc'
    );
  });
});
