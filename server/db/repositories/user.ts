/**
 * User registration and login repository (Phase 11 app-wiring).
 *
 * Wires server/crypto/index.ts (DEK generation/wrapping, envelope encryption)
 * and server/auth/index.ts (password hashing) to the real app_user/credential/
 * user_key/profile/membership tables from server/data/migrations/0001_*.sql.
 */

import crypto from 'node:crypto';
import { withTransaction, query } from '../pool.js';
import { packEnvelope, unpackEnvelope } from '../envelope-codec.js';
import {
  generateUserDek,
  wrapDek,
  unwrapDek,
  encryptEnvelope,
  decryptEnvelope,
  computeEmailHash,
  destroyKeyBuffer,
  type WrappedKey,
} from '../../crypto/index.js';
import { getMasterKey, getEmailHashSecret } from '../../crypto/master-key.js';
import { hashPassword, verifyPassword } from '../../auth/index.js';

export type DeclaredRole = 'member' | 'pastor' | 'teacher' | 'other';

export interface RegisterInput {
  email: string;
  password: string;
  declaredRole: DeclaredRole;
  uiLocale?: 'en' | 'ko';
}

export interface RegisteredUser {
  userId: string;
  email: string;
  declaredRole: DeclaredRole;
}

export class EmailAlreadyRegisteredError extends Error {
  constructor() {
    super('An account with this email already exists.');
    this.name = 'EmailAlreadyRegisteredError';
  }
}

export async function registerUser(input: RegisterInput): Promise<RegisteredUser> {
  const emailHash = computeEmailHash(input.email, getEmailHashSecret());

  const existing = await query<{ id: string }>(
    `SELECT id FROM app_user WHERE email_hash = decode($1, 'hex')`,
    [emailHash]
  );
  if (existing.length > 0) {
    throw new EmailAlreadyRegisteredError();
  }

  const userId = crypto.randomUUID();
  const dek = generateUserDek();
  const wrapped: WrappedKey = wrapDek(dek, getMasterKey());
  const emailEnvelope = encryptEnvelope(input.email.trim().toLowerCase(), dek, {
    userId,
    resourceId: userId,
    purpose: 'email',
  });
  const passwordHash = hashPassword(input.password);
  const planId = input.declaredRole === 'pastor' ? 'pastor' : 'member';

  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO app_user (id, email_hash, email_enc, status) VALUES ($1, decode($2,'hex'), $3, 'active')`,
      [userId, emailHash, packEnvelope(emailEnvelope)]
    );
    await client.query(
      `INSERT INTO credential (id, user_id, kind, secret_hash) VALUES ($1, $2, 'password', $3)`,
      [crypto.randomUUID(), userId, passwordHash]
    );
    await client.query(
      `INSERT INTO user_key (user_id, key_id, wrapped_dek) VALUES ($1, $2, decode($3,'hex'))`,
      [userId, wrapped.keyId, Buffer.concat([
        Buffer.from(wrapped.iv, 'base64'),
        Buffer.from(wrapped.tag, 'base64'),
        Buffer.from(wrapped.wrappedDek, 'base64'),
      ]).toString('hex')]
    );
    await client.query(
      `INSERT INTO profile (user_id, ui_locale, declared_role) VALUES ($1, $2, $3)`,
      [userId, input.uiLocale ?? 'en', input.declaredRole]
    );
    await client.query(
      `INSERT INTO membership (user_id, plan_id, status) VALUES ($1, $2, 'active')`,
      [userId, planId]
    );
  });

  destroyKeyBuffer(dek);

  return { userId, email: input.email, declaredRole: input.declaredRole };
}

export interface LoginResult {
  userId: string;
  userDek: Buffer;
}

/**
 * Unwraps a user's DEK using the server's master key. This does NOT require the
 * user's password — the master key (KEK) can unwrap any user's DEK by design
 * (ADR-0007: "a server tier holds the master key"). Password verification
 * (verifyLogin) is an independent identity gate; DEK custody is not
 * password-derived, so this is also what every authenticated request after
 * login uses to read/write that user's encrypted rows.
 */
export async function getUserDek(userId: string): Promise<Buffer> {
  const keys = await query<{ key_id: string; wrapped_dek: Buffer }>(
    `SELECT key_id, wrapped_dek FROM user_key WHERE user_id = $1`,
    [userId]
  );
  if (keys.length === 0) {
    throw new Error(`No user_key row for user ${userId}.`);
  }
  const packed = keys[0].wrapped_dek;
  const wrapped: WrappedKey = {
    iv: packed.subarray(0, 12).toString('base64'),
    tag: packed.subarray(12, 28).toString('base64'),
    wrappedDek: packed.subarray(28).toString('base64'),
    keyId: keys[0].key_id,
  };
  return unwrapDek(wrapped, getMasterKey());
}

// A fixed-but-unknowable scrypt hash, computed once at module load. verifyLogin runs
// verifyPassword against this whenever the account doesn't exist (or has no password
// credential), so a nonexistent email costs the same scrypt work as a real one — the
// account-existence timing side channel that server/auth/index.ts's "Enumeration-resistant
// flows (constant-shape responses)" invariant is supposed to close.
const DUMMY_PASSWORD_HASH = hashPassword(crypto.randomBytes(32).toString('hex'));

export async function verifyLogin(email: string, password: string): Promise<LoginResult | null> {
  const emailHash = computeEmailHash(email, getEmailHashSecret());

  const users = await query<{ id: string; status: string }>(
    `SELECT id, status FROM app_user WHERE email_hash = decode($1, 'hex')`,
    [emailHash]
  );
  const user = users[0];
  const accountUsable = !!user && user.status === 'active';

  let secretHash: string | null = null;
  if (accountUsable) {
    const creds = await query<{ secret_hash: string }>(
      `SELECT secret_hash FROM credential WHERE user_id = $1 AND kind = 'password'`,
      [user.id]
    );
    secretHash = creds[0]?.secret_hash ?? null;
  }

  const passwordOk = verifyPassword(password, secretHash ?? DUMMY_PASSWORD_HASH);
  if (!accountUsable || !secretHash || !passwordOk) return null;

  const userDek = await getUserDek(user.id);

  await query(`UPDATE app_user SET last_seen_at = now() WHERE id = $1`, [user.id]);

  return { userId: user.id, userDek };
}

export async function getUserEmail(userId: string, userDek: Buffer): Promise<string | null> {
  const rows = await query<{ email_enc: Buffer }>('SELECT email_enc FROM app_user WHERE id = $1', [userId]);
  if (rows.length === 0) return null;
  const envelope = unpackEnvelope(rows[0].email_enc, 'user-dek-v1');
  return decryptEnvelope(envelope, userDek, { userId, resourceId: userId, purpose: 'email' });
}
