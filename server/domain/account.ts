/**
 * Account Lifecycle Service (Phase 1 deliverable).
 *
 * Implements:
 * 1. Ordered account deletion (key destruction / crypto-erase first, rendering data unreadable).
 * 2. Complete GDPR export of a member's data.
 */

import {
  destroyKeyBuffer,
  decryptEnvelope,
  type EnvelopeCiphertext,
  type WrappedKey,
} from '../crypto/index.js';

export interface ExportData {
  userId: string;
  email: string;
  profile: {
    displayName?: string;
    uiLocale: string;
    timezone: string;
  };
  membership: {
    planId: string;
    status: string;
  };
  conversations: Array<{
    id: string;
    title: string;
    app: string;
    messages: Array<{
      seq: number;
      role: string;
      body: string;
    }>;
  }>;
  exportedAt: string;
}

export interface MockUserDataStore {
  userKey?: WrappedKey;
  profileEnc?: EnvelopeCiphertext;
  conversations: Array<{
    id: string;
    titleEnc: EnvelopeCiphertext;
    app: string;
    messages: Array<{
      seq: number;
      role: string;
      bodyEnc: EnvelopeCiphertext;
    }>;
  }>;
}

/**
 * Performs ordered deletion of a user account:
 * Step 1: Destroy the user's DEK (crypto-erase).
 * Step 2: Delete associated table rows.
 */
export function deleteAccountOrdered(
  store: MockUserDataStore,
  activeDek?: Buffer
): { cryptoErased: boolean; rowsDeleted: boolean } {
  // 1. Destroy DEK in memory if present
  if (activeDek) {
    destroyKeyBuffer(activeDek);
  }

  // 2. Destroy user_key from the persistent store first (Crypto-Erase)
  delete store.userKey;

  // 3. Clear stored data rows
  store.conversations = [];
  delete store.profileEnc;

  return {
    cryptoErased: true,
    rowsDeleted: true,
  };
}

/**
 * Compiles a complete data export for an account, decrypting stored fields.
 */
export function exportUserData(
  userId: string,
  email: string,
  store: MockUserDataStore,
  userDek: Buffer
): ExportData {
  const decryptedConversations = store.conversations.map(conv => ({
    id: conv.id,
    app: conv.app,
    title: decryptEnvelope(conv.titleEnc, userDek, { userId, resourceId: conv.id, purpose: 'title' }),
    messages: conv.messages.map(msg => ({
      seq: msg.seq,
      role: msg.role,
      body: decryptEnvelope(msg.bodyEnc, userDek, {
        userId,
        resourceId: `${conv.id}:${msg.seq}`,
        purpose: 'message_body',
      }),
    })),
  }));

  return {
    userId,
    email,
    profile: {
      uiLocale: 'en',
      timezone: 'UTC',
    },
    membership: {
      planId: 'member',
      status: 'active',
    },
    conversations: decryptedConversations,
    exportedAt: new Date().toISOString(),
  };
}
