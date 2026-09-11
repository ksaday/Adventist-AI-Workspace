/**
 * Master Key Offline Generation & Dual-Escrow Ceremony Tool.
 *
 * Implements:
 * - CSPRNG 256-bit AES master key generation
 * - SHA-256 4-byte (8 hex char) integrity checksum
 * - 2-of-2 XOR split secret sharing (Share A and Share B)
 * - Printable Dual-Escrow Custody Certificates
 * - Key recombination and checksum verification
 */

import crypto from 'node:crypto';

export interface KeyShare {
  custodian: 'A' | 'B';
  shareHex: string;
  checksum: string;
}

export interface MasterKeyEscrowPackage {
  keyHex: string;
  checksum: string;
  shareA: KeyShare;
  shareB: KeyShare;
  generatedAt: string;
}

/**
 * Computes an 8-character uppercase hex integrity checksum over a byte buffer.
 */
export function computeChecksum(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 8).toUpperCase();
}

/**
 * Generates an offline 256-bit master key and splits it into dual-custody shares.
 */
export function generateMasterKey(): MasterKeyEscrowPackage {
  const keyBytes = crypto.randomBytes(32);
  const keyHex = keyBytes.toString('hex');
  const checksum = computeChecksum(keyBytes);

  // Generate 2-of-2 split: Share A is random 32 bytes; Share B is Key XOR Share A
  const shareABytes = crypto.randomBytes(32);
  const shareBBytes = Buffer.alloc(32);
  for (let i = 0; i < 32; i++) {
    shareBBytes[i] = keyBytes[i] ^ shareABytes[i];
  }

  const shareAHex = shareABytes.toString('hex');
  const shareBHex = shareBBytes.toString('hex');

  const shareAChecksum = computeChecksum(shareABytes);
  const shareBChecksum = computeChecksum(shareBBytes);

  return {
    keyHex,
    checksum,
    shareA: {
      custodian: 'A',
      shareHex: shareAHex,
      checksum: shareAChecksum,
    },
    shareB: {
      custodian: 'B',
      shareHex: shareBHex,
      checksum: shareBChecksum,
    },
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Verifies that a master key hex string matches an 8-character checksum.
 */
export function verifyMasterKey(keyHex: string, checksum: string): boolean {
  if (!/^[0-9a-fA-F]{64}$/.test(keyHex)) {
    return false;
  }
  const keyBytes = Buffer.from(keyHex, 'hex');
  return computeChecksum(keyBytes).toUpperCase() === checksum.toUpperCase();
}

/**
 * Recombines Share A and Share B to reconstruct the master key.
 */
export function recombineShares(shareAHex: string, shareBHex: string): { keyHex: string; checksum: string } {
  if (!/^[0-9a-fA-F]{64}$/.test(shareAHex) || !/^[0-9a-fA-F]{64}$/.test(shareBHex)) {
    throw new Error('Invalid share format: must be 64-character hex strings.');
  }

  const shareA = Buffer.from(shareAHex, 'hex');
  const shareB = Buffer.from(shareBHex, 'hex');
  const recovered = Buffer.alloc(32);

  for (let i = 0; i < 32; i++) {
    recovered[i] = shareA[i] ^ shareB[i];
  }

  const keyHex = recovered.toString('hex');
  const checksum = computeChecksum(recovered);

  return { keyHex, checksum };
}

/**
 * Formats a printable dual-escrow certificate.
 */
export function formatCustodyCertificate(share: KeyShare, generatedAt: string): string {
  const bankBox = share.custodian === 'A' ? 'Safe Deposit Box A (Primary Metro)' : 'Safe Deposit Box B (Secondary Metro)';
  return `
================================================================================
          SDA AI WORKSPACE — DUAL-ESCROW MASTER KEY CERTIFICATE
                              CUSTODY COPY ${share.custodian}
================================================================================
Classification: S1 MAXIMUM CONFIDENTIAL
Designated Location: ${bankBox}
Generated: ${generatedAt}
Algorithm: AES-256-GCM Envelope Root Key (2-of-2 Secret Split)

SHARE ${share.custodian} HEX:
  ${share.shareHex.slice(0, 32)}
  ${share.shareHex.slice(32)}

SHARE CHECKSUM: ${share.checksum}

INSTRUCTIONS FOR CUSTODIAN ${share.custodian}:
1. Seal this document immediately inside a Tamper-Evident Security Bag (TESB).
2. Record the TESB serial number in the custody log.
3. Sign across the adhesive seal alongside the ceremony witness.
4. Transport and deposit into ${bankBox}.
5. Do NOT open or disclose this share unless an S1 Disaster Recovery event is
   officially declared in accordance with RB-17.
================================================================================
`;
}

// If executed directly from CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const pkg = generateMasterKey();
  console.log('Master Key Generated Successfully.');
  console.log(`Key Checksum: ${pkg.checksum}`);
  console.log(formatCustodyCertificate(pkg.shareA, pkg.generatedAt));
  console.log(formatCustodyCertificate(pkg.shareB, pkg.generatedAt));
}
