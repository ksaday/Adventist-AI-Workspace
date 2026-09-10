import { describe, it, expect } from 'vitest';
import {
  generateUserDek,
  encryptEnvelope,
  decryptEnvelope,
  wrapDek,
} from '../../server/crypto/index.js';
import {
  deleteAccountOrdered,
  exportUserData,
  type MockUserDataStore,
} from '../../server/domain/account.js';
import crypto from 'node:crypto';

describe('Account Lifecycle: Deletion & Export (Phase 1 Exit Criteria)', () => {
  const masterKey = crypto.randomBytes(32);
  const userId = '018f4a12-7777-7000-8000-000000000001';

  function seedAccount(): { userDek: Buffer; store: MockUserDataStore } {
    const userDek = generateUserDek();
    const wrappedKey = wrapDek(userDek, masterKey);

    const store: MockUserDataStore = {
      userKey: wrappedKey,
      conversations: [
        {
          id: 'conv-101',
          app: 'p3',
          titleEnc: encryptEnvelope('Sanctuary Doctrine Study', userDek, {
            userId,
            resourceId: 'conv-101',
            purpose: 'title',
          }),
          messages: [
            {
              seq: 1,
              role: 'user',
              bodyEnc: encryptEnvelope('Can you help explain the Day of Atonement in Leviticus 16?', userDek, {
                userId,
                resourceId: 'conv-101:1',
                purpose: 'message_body',
              }),
            },
            {
              seq: 2,
              role: 'assistant_external',
              bodyEnc: encryptEnvelope('In Leviticus 16, the high priest enters the Most Holy Place...', userDek, {
                userId,
                resourceId: 'conv-101:2',
                purpose: 'message_body',
              }),
            },
          ],
        },
      ],
    };

    return { userDek, store };
  }

  it('EXPORT IS COMPLETE: exports all profile, membership, and decrypted conversations for a seeded account', () => {
    const { userDek, store } = seedAccount();

    const exportDoc = exportUserData(userId, 'member@example.org', store, userDek);

    expect(exportDoc.userId).toBe(userId);
    expect(exportDoc.email).toBe('member@example.org');
    expect(exportDoc.conversations).toHaveLength(1);
    expect(exportDoc.conversations[0].title).toBe('Sanctuary Doctrine Study');
    expect(exportDoc.conversations[0].messages).toHaveLength(2);
    expect(exportDoc.conversations[0].messages[0].body).toContain('Day of Atonement');
    expect(exportDoc.conversations[0].messages[1].body).toContain('high priest');
  });

  it('ORDERED DELETION & POST-DELETION FAILURE: destroys key first, and post-deletion decryption fails', () => {
    const { userDek, store } = seedAccount();

    // Capture an envelope before deletion
    const savedEnvelope = store.conversations[0].messages[0].bodyEnc;
    const savedAad = { userId, resourceId: 'conv-101:1', purpose: 'message_body' };

    // Confirm it decrypts prior to deletion
    expect(decryptEnvelope(savedEnvelope, userDek, savedAad)).toContain('Day of Atonement');

    // Execute ordered account deletion (crypto-erase key first, then rows)
    const deletionResult = deleteAccountOrdered(store, userDek);

    expect(deletionResult.cryptoErased).toBe(true);
    expect(deletionResult.rowsDeleted).toBe(true);
    expect(store.userKey).toBeUndefined();
    expect(store.conversations).toHaveLength(0);

    // Post-deletion: attempting decryption with the wiped/zeroed userDek must fail!
    expect(() => {
      decryptEnvelope(savedEnvelope, userDek, savedAad);
    }).toThrow();
  });
});
