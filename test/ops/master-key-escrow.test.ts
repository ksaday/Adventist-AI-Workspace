import { describe, it, expect } from 'vitest';
import {
  generateMasterKey,
  verifyMasterKey,
  recombineShares,
  computeChecksum,
  formatCustodyCertificate,
} from '../../scripts/generate-master-key';

describe('Master Key Offline Generation & Dual-Escrow System', () => {
  it('generates a valid 256-bit key with matching checksum', () => {
    const pkg = generateMasterKey();
    expect(pkg.keyHex).toMatch(/^[0-9a-fA-F]{64}$/);
    expect(pkg.checksum).toMatch(/^[0-9A-F]{8}$/);
    expect(verifyMasterKey(pkg.keyHex, pkg.checksum)).toBe(true);
  });

  it('generates two distinct shares with independent checksums', () => {
    const pkg = generateMasterKey();
    expect(pkg.shareA.shareHex).toMatch(/^[0-9a-fA-F]{64}$/);
    expect(pkg.shareB.shareHex).toMatch(/^[0-9a-fA-F]{64}$/);
    expect(pkg.shareA.shareHex).not.toBe(pkg.shareB.shareHex);
    expect(pkg.shareA.checksum).not.toBe(pkg.shareB.checksum);
  });

  it('recombines Share A and Share B to reconstruct the exact original master key', () => {
    const pkg = generateMasterKey();
    const reconstructed = recombineShares(pkg.shareA.shareHex, pkg.shareB.shareHex);
    expect(reconstructed.keyHex).toBe(pkg.keyHex);
    expect(reconstructed.checksum).toBe(pkg.checksum);
    expect(verifyMasterKey(reconstructed.keyHex, reconstructed.checksum)).toBe(true);
  });

  it('rejects tampered or malformed keys during verification', () => {
    const pkg = generateMasterKey();
    // Tamper key by flipping first character
    const tamperedHex = (pkg.keyHex[0] === 'a' ? 'b' : 'a') + pkg.keyHex.slice(1);
    expect(verifyMasterKey(tamperedHex, pkg.checksum)).toBe(false);
    expect(verifyMasterKey('short-key', pkg.checksum)).toBe(false);
  });

  it('formats distinct custody certificates for Custodian A and Custodian B', () => {
    const pkg = generateMasterKey();
    const certA = formatCustodyCertificate(pkg.shareA, pkg.generatedAt);
    const certB = formatCustodyCertificate(pkg.shareB, pkg.generatedAt);

    expect(certA).toContain('CUSTODY COPY A');
    expect(certA).toContain('Safe Deposit Box A');
    expect(certA).toContain(pkg.shareA.checksum);

    expect(certB).toContain('CUSTODY COPY B');
    expect(certB).toContain('Safe Deposit Box B');
    expect(certB).toContain(pkg.shareB.checksum);
  });
});
