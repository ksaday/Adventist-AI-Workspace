/**
 * Crypto Service (Phase 1 deliverable / Security Architecture §3).
 *
 * Implements:
 * 1. Envelope encryption with per-user Data Encryption Keys (DEKs).
 * 2. AES-256-GCM with Additional Authenticated Data (AAD) binding to prevent ciphertext transplantation.
 * 3. Master Key (KEK) wrapping and unwrapping of DEKs.
 * 4. Crypto-erase (key destruction renders ciphertext unreadable).
 */

import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const TAG_LENGTH = 16; // 128-bit authentication tag
const KEY_LENGTH = 32; // 256-bit key

export interface AADContext {
  userId: string;
  resourceId: string;
  purpose?: string;
}

export interface EnvelopeCiphertext {
  ciphertext: string; // Base64 encoded
  iv: string; // Base64 encoded
  tag: string; // Base64 encoded
  keyId: string;
}

export interface WrappedKey {
  wrappedDek: string; // Base64 encoded
  iv: string;
  tag: string;
  keyId: string;
}

/**
 * Format AAD context into a deterministic buffer for authentication binding.
 */
function serializeAAD(aad: AADContext): Buffer {
  const normalized = `user:${aad.userId}|resource:${aad.resourceId}|purpose:${aad.purpose ?? 'default'}`;
  return Buffer.from(normalized, 'utf8');
}

/**
 * Generates a high-entropy 256-bit user Data Encryption Key (DEK).
 */
export function generateUserDek(): Buffer {
  return crypto.randomBytes(KEY_LENGTH);
}

/**
 * Zeroes out a key buffer in memory (crypto-erase helper).
 */
export function destroyKeyBuffer(buf: Buffer): void {
  buf.fill(0);
}

/**
 * Wraps a user DEK under the Master Key (KEK).
 */
export function wrapDek(dek: Buffer, masterKey: Buffer, keyId = 'master-v1'): WrappedKey {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, masterKey, iv, { authTagLength: TAG_LENGTH });
  cipher.setAAD(Buffer.from(`key_id:${keyId}`, 'utf8'));

  const encrypted = Buffer.concat([cipher.update(dek), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    wrappedDek: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    keyId,
  };
}

/**
 * Unwraps a user DEK using the Master Key (KEK).
 */
export function unwrapDek(wrappedKey: WrappedKey, masterKey: Buffer): Buffer {
  const iv = Buffer.from(wrappedKey.iv, 'base64');
  const tag = Buffer.from(wrappedKey.tag, 'base64');
  const ciphertext = Buffer.from(wrappedKey.wrappedDek, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, masterKey, iv, { authTagLength: TAG_LENGTH });
  decipher.setAAD(Buffer.from(`key_id:${wrappedKey.keyId}`, 'utf8'));
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

/**
 * Encrypts sensitive text using per-user DEK and binds it to AAD context.
 */
export function encryptEnvelope(
  plaintext: string,
  userDek: Buffer,
  aad: AADContext,
  keyId = 'user-dek-v1'
): EnvelopeCiphertext {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, userDek, iv, { authTagLength: TAG_LENGTH });
  cipher.setAAD(serializeAAD(aad));

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    keyId,
  };
}

/**
 * Decrypts envelope ciphertext with DEK and verifies AAD binding.
 * Throws if authentication tag fails or if AAD does not match.
 */
export function decryptEnvelope(
  envelope: EnvelopeCiphertext,
  userDek: Buffer,
  aad: AADContext
): string {
  const iv = Buffer.from(envelope.iv, 'base64');
  const tag = Buffer.from(envelope.tag, 'base64');
  const ciphertext = Buffer.from(envelope.ciphertext, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, userDek, iv, { authTagLength: TAG_LENGTH });
  decipher.setAAD(serializeAAD(aad));
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Computes blind index HMAC for email lookup (Database Design §3).
 * Prevents plain email exposure in DB dumps while enabling O(1) indexed lookups.
 */
export function computeEmailHash(email: string, hmacSecret: string): string {
  const normalizedEmail = email.trim().toLowerCase();
  return crypto.createHmac('sha256', hmacSecret).update(normalizedEmail).digest('hex');
}
