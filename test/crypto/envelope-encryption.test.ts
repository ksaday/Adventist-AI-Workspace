import { describe, it, expect } from 'vitest';
import {
  generateUserDek,
  wrapDek,
  unwrapDek,
  encryptEnvelope,
  decryptEnvelope,
  destroyKeyBuffer,
  computeEmailHash,
} from '../../server/crypto/index.js';
import crypto from 'node:crypto';

describe('Crypto Service: Envelope Encryption & AAD Binding (Phase 1 Exit Criteria)', () => {
  const masterKey = crypto.randomBytes(32);
  const user1Id = '018f4a12-1111-7000-8000-000000000001';
  const user2Id = '018f4a12-2222-7000-8000-000000000002';

  it('performs end-to-end DEK wrap and unwrap with Master Key', () => {
    const userDek = generateUserDek();
    const wrapped = wrapDek(userDek, masterKey, 'master-v1');

    expect(wrapped.wrappedDek).toBeDefined();
    expect(wrapped.keyId).toBe('master-v1');

    const unwrappedDek = unwrapDek(wrapped, masterKey);
    expect(unwrappedDek).toEqual(userDek);
  });

  it('performs envelope encrypt and decrypt round trip for sensitive text', () => {
    const userDek = generateUserDek();
    const plaintext = 'This is a private spiritual guidance conversation body.';
    const aad = { userId: user1Id, resourceId: 'conv-123', purpose: 'message_body' };

    const envelope = encryptEnvelope(plaintext, userDek, aad);
    expect(envelope.ciphertext).toBeDefined();
    expect(envelope.ciphertext).not.toBe(plaintext);

    const decrypted = decryptEnvelope(envelope, userDek, aad);
    expect(decrypted).toBe(plaintext);
  });

  it('REJECTS decryption when ciphertext is moved to another user or resource (AAD mismatch)', () => {
    const userDek = generateUserDek();
    const plaintext = 'Confidential prayer request.';
    const user1AAD = { userId: user1Id, resourceId: 'conv-001', purpose: 'prayer_burden' };
    const user2AAD = { userId: user2Id, resourceId: 'conv-001', purpose: 'prayer_burden' };
    const wrongResourceAAD = { userId: user1Id, resourceId: 'conv-999', purpose: 'prayer_burden' };

    const envelope = encryptEnvelope(plaintext, userDek, user1AAD);

    // 1. Attempting to decrypt with User 2's context must fail
    expect(() => {
      decryptEnvelope(envelope, userDek, user2AAD);
    }).toThrow();

    // 2. Attempting to decrypt under a different resourceId must fail
    expect(() => {
      decryptEnvelope(envelope, userDek, wrongResourceAAD);
    }).toThrow();
  });

  it('crypto-erase: zeroing or destroying the DEK makes post-deletion decryption impossible', () => {
    const userDek = generateUserDek();
    const plaintext = 'Text that must be crypto-erased upon account deletion.';
    const aad = { userId: user1Id, resourceId: 'msg-456' };

    const envelope = encryptEnvelope(plaintext, userDek, aad);

    // Verify it decrypts initially
    expect(decryptEnvelope(envelope, userDek, aad)).toBe(plaintext);

    // Destroy key buffer (zero out memory)
    destroyKeyBuffer(userDek);

    // Decryption with the erased/zeroed key fails
    expect(() => {
      decryptEnvelope(envelope, userDek, aad);
    }).toThrow();
  });

  it('computes deterministic email HMAC for blind-indexed lookups without plain email leak', () => {
    const hmacSecret = 'test-server-hmac-secret-32-chars-long';
    const email1 = 'member@example.org';
    const email2 = 'MEMBER@EXAMPLE.ORG '; // case and whitespace insensitivity

    const hash1 = computeEmailHash(email1, hmacSecret);
    const hash2 = computeEmailHash(email2, hmacSecret);

    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    expect(hash1).not.toContain('member');
  });
});
