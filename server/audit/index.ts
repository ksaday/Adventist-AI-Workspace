/**
 * Audit Service with Append-Only Hash Chain (Phase 1 deliverable).
 *
 * Implements a cryptographically verifiable tamper-evident log chain.
 * Each entry commits to the hash of the preceding entry.
 */

import crypto from 'node:crypto';

export interface AuditEntryData {
  id: string;
  timestamp: string;
  actorId: string;
  action: string;
  resourceId: string;
  payloadDigest?: string;
}

export interface AuditRecord extends AuditEntryData {
  prevHash: string;
  entryHash: string;
}

export const GENESIS_HASH = '0'.repeat(64);

/**
 * Computes SHA-256 digest of an audit entry combined with the previous entry's hash.
 */
export function computeEntryHash(entry: AuditEntryData, prevHash: string): string {
  const content = `${prevHash}|${entry.id}|${entry.timestamp}|${entry.actorId}|${entry.action}|${entry.resourceId}|${entry.payloadDigest ?? ''}`;
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Append-only audit logger maintaining the chain.
 */
export class AuditChain {
  private chain: AuditRecord[] = [];

  constructor(initialChain: AuditRecord[] = []) {
    this.chain = [...initialChain];
  }

  public getLatestHash(): string {
    if (this.chain.length === 0) return GENESIS_HASH;
    return this.chain[this.chain.length - 1].entryHash;
  }

  public append(entry: Omit<AuditEntryData, 'timestamp'>): AuditRecord {
    const prevHash = this.getLatestHash();
    const fullEntry: AuditEntryData = {
      ...entry,
      timestamp: new Date().toISOString(),
    };
    const entryHash = computeEntryHash(fullEntry, prevHash);

    const record: AuditRecord = {
      ...fullEntry,
      prevHash,
      entryHash,
    };

    this.chain.push(record);
    return record;
  }

  public getRecords(): readonly AuditRecord[] {
    return this.chain;
  }

  /**
   * Verifies the entire audit chain's cryptographic integrity.
   * Detects any modification, insertion, deletion, or re-ordering.
   */
  public verify(): { valid: boolean; brokenAt?: number; error?: string } {
    for (let i = 0; i < this.chain.length; i++) {
      const current = this.chain[i];
      const expectedPrev = i === 0 ? GENESIS_HASH : this.chain[i - 1].entryHash;

      if (current.prevHash !== expectedPrev) {
        return {
          valid: false,
          brokenAt: i,
          error: `Broken link at index ${i}: prevHash does not match previous entryHash.`,
        };
      }

      const recalculatedHash = computeEntryHash(current, current.prevHash);
      if (current.entryHash !== recalculatedHash) {
        return {
          valid: false,
          brokenAt: i,
          error: `Tamper detected at index ${i}: entryHash does not match payload digest.`,
        };
      }
    }

    return { valid: true };
  }
}
