/**
 * Packs/unpacks server/crypto/index.ts's EnvelopeCiphertext to and from the
 * bytea column shapes in server/data/migrations/*.sql, which are not uniform:
 * some columns (message.body_enc) have separate iv/tag/key_id columns,
 * others (app_user.email_enc, conversation.title_enc) have only one bytea
 * column (plus a *_key_id text column in some cases, none in others).
 */

import type { EnvelopeCiphertext } from '../crypto/index.js';

const IV_LEN = 12;
const TAG_LEN = 16;

/** For a single *_enc bytea column with no separate iv/tag columns. keyId is not stored (fixed by convention). */
export function packEnvelope(envelope: EnvelopeCiphertext): Buffer {
  return Buffer.concat([
    Buffer.from(envelope.iv, 'base64'),
    Buffer.from(envelope.tag, 'base64'),
    Buffer.from(envelope.ciphertext, 'base64'),
  ]);
}

export function unpackEnvelope(packed: Buffer, keyId: string): EnvelopeCiphertext {
  return {
    iv: packed.subarray(0, IV_LEN).toString('base64'),
    tag: packed.subarray(IV_LEN, IV_LEN + TAG_LEN).toString('base64'),
    ciphertext: packed.subarray(IV_LEN + TAG_LEN).toString('base64'),
    keyId,
  };
}

/** For columns with separate ciphertext/iv/tag/key_id columns (e.g. message.body_*). */
export function splitEnvelope(envelope: EnvelopeCiphertext) {
  return {
    ciphertext: Buffer.from(envelope.ciphertext, 'base64'),
    iv: Buffer.from(envelope.iv, 'base64'),
    tag: Buffer.from(envelope.tag, 'base64'),
    keyId: envelope.keyId,
  };
}

export function joinEnvelope(parts: { ciphertext: Buffer; iv: Buffer; tag: Buffer; keyId: string }): EnvelopeCiphertext {
  return {
    ciphertext: parts.ciphertext.toString('base64'),
    iv: parts.iv.toString('base64'),
    tag: parts.tag.toString('base64'),
    keyId: parts.keyId,
  };
}
