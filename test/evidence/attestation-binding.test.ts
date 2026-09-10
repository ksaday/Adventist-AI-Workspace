/**
 * Attestation Binding & URL Canonicalization Tests (SR-7.2, SR-7.6 / Database Design §8).
 */

import { describe, it, expect } from 'vitest';
import {
  canonicalizeAndValidateAttestedUrl,
  validateAttestation,
  defaultSourceDirectory,
  type SourceDirectoryEntryRevision,
} from '../../packages/evidence/src/index.js';

describe('Attestation Binding & URL Canonicalization (SR-7.6)', () => {
  const activeEgwRevision = defaultSourceDirectory.getCurrentRevision('egw_library_read')!;

  it('accepts valid official passage URL under /read/', () => {
    const raw = 'https://egwwritings.org/read/128.534#534';
    const res = canonicalizeAndValidateAttestedUrl(raw, activeEgwRevision);

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.officialUrlHost).toBe('egwwritings.org');
      expect(res.officialUrlPath).toBe('/read/128.534');
      expect(res.officialUrl).toBe('https://egwwritings.org/read/128.534');
    }
  });

  it('rejects insecure HTTP scheme', () => {
    const raw = 'http://egwwritings.org/read/128.534';
    const res = canonicalizeAndValidateAttestedUrl(raw, activeEgwRevision);

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reasonCode).toBe('INVALID_SCHEME');
    }
  });

  it('rejects credentials in URL (userinfo)', () => {
    const raw = 'https://admin:secret@egwwritings.org/read/128.534';
    const res = canonicalizeAndValidateAttestedUrl(raw, activeEgwRevision);

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reasonCode).toBe('CREDENTIALS_FORBIDDEN');
    }
  });

  it('rejects explicit port specification', () => {
    const ports = ['https://egwwritings.org:443/read/123', 'https://egwwritings.org:8080/read/123'];
    for (const raw of ports) {
      const res = canonicalizeAndValidateAttestedUrl(raw, activeEgwRevision);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.reasonCode).toBe('PORT_FORBIDDEN');
      }
    }
  });

  it('rejects IP addresses and loopback addresses', () => {
    const ips = [
      'https://127.0.0.1/read/123',
      'https://localhost/read/123',
      'https://192.168.1.1/read/123',
      'https://10.0.0.1/read/123',
    ];
    for (const raw of ips) {
      const res = canonicalizeAndValidateAttestedUrl(raw, activeEgwRevision);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(['RAW_IP_FORBIDDEN', 'HOST_MISMATCH']).toContain(res.reasonCode);
      }
    }
  });

  it('rejects dot segment path traversal and encoded dots', () => {
    const escapes = [
      'https://egwwritings.org/read/../other',
      'https://egwwritings.org/read/%2e%2e/other',
      'https://egwwritings.org/read/%2E%2E/other',
    ];
    for (const raw of escapes) {
      const res = canonicalizeAndValidateAttestedUrl(raw, activeEgwRevision);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.reasonCode).toBe('PATH_ESCAPE_DETECTED');
      }
    }
  });

  it('rejects bare directory prefix and homepage', () => {
    const bare = 'https://egwwritings.org/read/';
    const root = 'https://egwwritings.org/';

    const resBare = canonicalizeAndValidateAttestedUrl(bare, activeEgwRevision);
    expect(resBare.ok).toBe(false);
    if (!resBare.ok) {
      expect(resBare.reasonCode).toBe('BARE_PREFIX_REJECTED');
    }

    const resRoot = canonicalizeAndValidateAttestedUrl(root, activeEgwRevision);
    expect(resRoot.ok).toBe(false);
    if (!resRoot.ok) {
      expect(resRoot.reasonCode).toBe('PREFIX_NOT_SATISFIED');
    }
  });

  it('maps attestation outcomes accurately to recommended statuses', () => {
    const outcomes: Array<{ outcome: any; expectedStatus: string }> = [
      { outcome: 'found_correct', expectedStatus: 'VERIFIED' },
      { outcome: 'found_details_differ', expectedStatus: 'PARTIALLY_VERIFIED' },
      { outcome: 'not_found', expectedStatus: 'INSUFFICIENT_EVIDENCE' },
      { outcome: 'contradicted', expectedStatus: 'CONTRADICTED' },
    ];

    for (const { outcome, expectedStatus } of outcomes) {
      const res = validateAttestation(
        {
          claimId: 'c1',
          claimOwnerId: 'user_1',
          actorId: 'user_1',
          sourceDirectoryEntryId: 'egw_library_read',
          sourceDirectoryRevision: 1,
          rawUrl: 'https://egwwritings.org/read/128.534',
          outcome,
        },
        activeEgwRevision
      );

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.recommendedStatus).toBe(expectedStatus);
        expect(res.attestation.actorId).toBe('user_1');
        expect(res.attestation.attestedPathPrefix).toBe('/read/');
      }
    }
  });
});
