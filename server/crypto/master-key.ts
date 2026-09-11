/**
 * Loads the server's master key (KEK) from the environment at first use.
 * Never persisted, never logged. `APP_MASTER_KEY_HEX` must be a 64-character
 * hex string (256-bit AES key) — see scripts/generate-master-key.ts for the
 * production offline-ceremony generator; for beta this is a plain env var.
 */

let masterKey: Buffer | undefined;

export function getMasterKey(): Buffer {
  if (!masterKey) {
    const hex = process.env.APP_MASTER_KEY_HEX;
    if (!hex || !/^[0-9a-f]{64}$/i.test(hex)) {
      throw new Error(
        'APP_MASTER_KEY_HEX is missing or is not a 64-character hex string (256-bit key).'
      );
    }
    masterKey = Buffer.from(hex, 'hex');
  }
  return masterKey;
}

export function getEmailHashSecret(): string {
  const secret = process.env.APP_MASTER_KEY_HEX;
  if (!secret) {
    throw new Error('APP_MASTER_KEY_HEX is missing.');
  }
  return secret;
}
