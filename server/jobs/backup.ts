/**
 * Automated Database Backup & Weekly Off-Site Dispatch Job (Phase 10 / RB-15 / AC-O1).
 *
 * Implements:
 * 1. Daily database logical snapshots with AES-256-GCM envelope encryption.
 * 2. Weekly off-site dumps dispatched to an independent cloud storage vendor (e.g. Backblaze B2).
 * 3. Tamper-evident SHA-256 manifest generation.
 * 4. Automated retention pruning (30 days for daily snapshots, 52 weeks for off-site dumps).
 * 5. Strict verification of invariants: zero ephemeral bodies, zero EGW source text corpus.
 */

import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

export interface Clock {
  now(): Date;
}

export const SYSTEM_CLOCK: Clock = {
  now: () => new Date(),
};

export interface BackupManifest {
  backupId: string;
  kind: 'daily_snapshot' | 'weekly_offsite';
  createdAt: string;
  recordCount: number;
  uncompressedBytes: number;
  ciphertextBytes: number;
  payloadDigest: string; // SHA-256
  isOffsiteDispatched: boolean;
  offsiteVendor?: string;
}

export interface StoredBackup {
  manifest: BackupManifest;
  ciphertext: string; // Base64 AES-256-GCM payload with iv and tag embedded
  expiresAt: string;
}

export interface OffsiteStorageClient {
  uploadArchive(backupId: string, payload: Buffer): Promise<{ uploaded: boolean; remoteDigest: string }>;
  listArchives(): Promise<string[]>;
}

/**
 * Mock/simulated independent off-site vendor client (e.g. Backblaze B2 / AWS S3).
 */
export class SimulatedOffsiteClient implements OffsiteStorageClient {
  public storage = new Map<string, Buffer>();

  async uploadArchive(backupId: string, payload: Buffer): Promise<{ uploaded: boolean; remoteDigest: string }> {
    this.storage.set(backupId, payload);
    const remoteDigest = crypto.createHash('sha256').update(payload).digest('hex');
    return { uploaded: true, remoteDigest };
  }

  async listArchives(): Promise<string[]> {
    return Array.from(this.storage.keys());
  }
}

/**
 * Validates that dump records contain zero ephemeral bodies and zero EGW source text.
 */
export function assertBackupContentIntegrity(records: Record<string, unknown>[]): void {
  for (const record of records) {
    // 1. Invariant 4: No body column on source_block_ref
    if ('source_block_ref' === record._table) {
      if ('body' in record || 'content' in record || 'text' in record) {
        throw new Error('CRITICAL INVARIANT 4 VIOLATION: source_block_ref dump record contains a text body column.');
      }
    }

    // 2. Ephemeral Invariant: Ephemeral conversations must never be present in backups
    if (record.is_ephemeral === true || record.is_ephemeral === 1) {
      throw new Error('CRITICAL PRIVACY VIOLATION: Ephemeral conversation detected in persistent backup.');
    }
  }
}

/**
 * Encrypts a string using AES-256-GCM under the master key hex.
 */
function encryptPayload(plaintext: string, masterKeyHex: string, aadString: string): string {
  const masterKey = Buffer.from(masterKeyHex, 'hex');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, masterKey, iv, { authTagLength: TAG_LENGTH });
  cipher.setAAD(Buffer.from(aadString, 'utf8'));

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Combine iv (12) + tag (16) + ciphertext
  const combined = Buffer.concat([iv, tag, encrypted]);
  return combined.toString('base64');
}

/**
 * Decrypts an AES-256-GCM combined payload under the master key hex.
 */
function decryptPayload(ciphertextBase64: string, masterKeyHex: string, aadString: string): string {
  const masterKey = Buffer.from(masterKeyHex, 'hex');
  const combined = Buffer.from(ciphertextBase64, 'base64');

  if (combined.length < IV_LENGTH + TAG_LENGTH) {
    throw new Error('Invalid ciphertext payload: insufficient length.');
  }

  const iv = combined.subarray(0, IV_LENGTH);
  const tag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, masterKey, iv, { authTagLength: TAG_LENGTH });
  decipher.setAAD(Buffer.from(aadString, 'utf8'));
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Creates an encrypted daily snapshot.
 */
export async function createDailySnapshot(
  records: Record<string, unknown>[],
  masterKeyHex: string,
  clock: Clock = SYSTEM_CLOCK
): Promise<StoredBackup> {
  assertBackupContentIntegrity(records);

  const now = clock.now();
  const backupId = `bkp-daily-${now.toISOString().replace(/[:.]/g, '-')}`;
  const rawPayload = JSON.stringify(records);
  const payloadBuffer = Buffer.from(rawPayload, 'utf-8');
  const payloadDigest = crypto.createHash('sha256').update(payloadBuffer).digest('hex');

  // Envelope encrypt the snapshot
  const encrypted = encryptPayload(rawPayload, masterKeyHex, backupId);
  const ciphertextBytes = Buffer.from(encrypted, 'base64').byteLength;

  // 30 days retention for daily snapshots
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const manifest: BackupManifest = {
    backupId,
    kind: 'daily_snapshot',
    createdAt: now.toISOString(),
    recordCount: records.length,
    uncompressedBytes: payloadBuffer.byteLength,
    ciphertextBytes,
    payloadDigest,
    isOffsiteDispatched: false,
  };

  return {
    manifest,
    ciphertext: encrypted,
    expiresAt,
  };
}

/**
 * Creates and dispatches a weekly encrypted dump to an independent off-site vendor.
 */
export async function createWeeklyOffsiteDump(
  records: Record<string, unknown>[],
  masterKeyHex: string,
  offsiteClient: OffsiteStorageClient,
  clock: Clock = SYSTEM_CLOCK,
  vendorName = 'Backblaze-B2-Independent'
): Promise<StoredBackup> {
  assertBackupContentIntegrity(records);

  const now = clock.now();
  const backupId = `bkp-weekly-offsite-${now.toISOString().replace(/[:.]/g, '-')}`;
  const rawPayload = JSON.stringify(records);
  const payloadBuffer = Buffer.from(rawPayload, 'utf-8');
  const payloadDigest = crypto.createHash('sha256').update(payloadBuffer).digest('hex');

  // Envelope encrypt
  const encrypted = encryptPayload(rawPayload, masterKeyHex, backupId);
  const ciphertextBuffer = Buffer.from(encrypted, 'utf-8');

  // Dispatch to independent offsite vendor
  const result = await offsiteClient.uploadArchive(backupId, ciphertextBuffer);
  if (!result.uploaded) {
    throw new Error(`Failed to upload off-site backup archive ${backupId} to ${vendorName}`);
  }

  // 52 weeks (365 days) retention for weekly off-site dumps
  const expiresAt = new Date(now.getTime() + 52 * 7 * 24 * 60 * 60 * 1000).toISOString();

  const manifest: BackupManifest = {
    backupId,
    kind: 'weekly_offsite',
    createdAt: now.toISOString(),
    recordCount: records.length,
    uncompressedBytes: payloadBuffer.byteLength,
    ciphertextBytes: ciphertextBuffer.byteLength,
    payloadDigest,
    isOffsiteDispatched: true,
    offsiteVendor: vendorName,
  };

  return {
    manifest,
    ciphertext: encrypted,
    expiresAt,
  };
}

/**
 * Verifies and restores a backup archive.
 */
export function verifyAndRestoreBackup(backup: StoredBackup, masterKeyHex: string): Record<string, unknown>[] {
  const decryptedJson = decryptPayload(backup.ciphertext, masterKeyHex, backup.manifest.backupId);
  const verifiedDigest = crypto.createHash('sha256').update(Buffer.from(decryptedJson, 'utf-8')).digest('hex');

  if (verifiedDigest !== backup.manifest.payloadDigest) {
    throw new Error('BACKUP INTEGRITY MISMATCH: Decrypted payload digest does not match manifest SHA-256.');
  }

  const records = JSON.parse(decryptedJson) as Record<string, unknown>[];
  assertBackupContentIntegrity(records);
  return records;
}

/**
 * Prunes expired backup snapshots while strictly retaining non-expired ones.
 */
export function pruneExpiredBackups(
  backups: StoredBackup[],
  clock: Clock = SYSTEM_CLOCK
): { active: StoredBackup[]; purgedCount: number } {
  const now = clock.now();
  const active: StoredBackup[] = [];
  let purgedCount = 0;

  for (const bkp of backups) {
    if (new Date(bkp.expiresAt) <= now) {
      purgedCount++;
    } else {
      active.push(bkp);
    }
  }

  return { active, purgedCount };
}
