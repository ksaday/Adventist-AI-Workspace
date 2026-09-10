/**
 * False-Verification Red-Team Suite (Phase 7 Exit Criteria / SR-6 / ADR-0019 / Verification Architecture §2).
 *
 * Tests all 10 adversarial attacks against the verification subsystem:
 * 1. Attempting VERIFIED at E3 (supplied-text consistency).
 * 2. Attempting VERIFIED at E2 (second model corroboration).
 * 3. Attempting VERIFIED at E1 or E0 (model recall or no source).
 * 4. Lookalike hosts (e.g. egwwritings.org.attacker.com, evangelicalegwwritings.org).
 * 5. URL path escapes (dot segments, %2e, backslashes, double slashes).
 * 6. Bare directory prefix, search page, or sibling prefix.
 * 7. Ineligible or deactivated Source Directory revision.
 * 8. Attestation by someone other than the claim's owner (actor_id != user_id).
 * 9. Partially-NULL E4 row (violating MATCH FULL & composite check).
 * 10. Ordinal comparison attempt (>= 'E3' or >= 'E4') vs strict equality (level === 'E4').
 */

import { describe, it, expect } from 'vitest';
import {
  mayAssertOfficialVerification,
  assertLegalStatusLevel,
  validateStatusTransition,
  validateAttestation,
  defaultSourceDirectory,
  raise,
  type EvidenceLevel,
  type ClaimStatus,
  type EvidenceRecord,
} from '../../packages/evidence/src/index.js';
import { VerificationService } from '../../server/domain/evidence.js';

describe('False-Verification Red-Team Suite (Phase 7 Exit Criteria)', () => {
  const activeEgwRevision = defaultSourceDirectory.getCurrentRevision('egw_library_read')!;

  // ── Attack 1: Attempting VERIFIED at E3 ──────────────────────────────────
  it('Attack 1: Strictly rejects VERIFIED or PARTIALLY_VERIFIED at evidence level E3', () => {
    // 1. Rendering guard check
    expect(mayAssertOfficialVerification('E3')).toBe(false);

    // 2. Status level validation check
    expect(() => assertLegalStatusLevel('VERIFIED', 'E3')).toThrow(/strictly forbidden below evidence level E4/);
    expect(() => assertLegalStatusLevel('PARTIALLY_VERIFIED', 'E3')).toThrow(/strictly forbidden below evidence level E4/);

    // 3. State transition check
    const trans = validateStatusTransition('NOT_VERIFIED', 'E1', 'VERIFIED', 'E3');
    expect(trans.valid).toBe(false);
  });

  // ── Attack 2: Attempting VERIFIED at E2 (Second Model Corroboration) ────
  it('Attack 2: Corroboration (E2) never yields VERIFIED; agreement leaves status NOT_VERIFIED', () => {
    expect(mayAssertOfficialVerification('E2')).toBe(false);

    expect(() => assertLegalStatusLevel('VERIFIED', 'E2')).toThrow(/strictly forbidden below evidence level E4/);
    expect(() => assertLegalStatusLevel('PARTIALLY_VERIFIED', 'E2')).toThrow(/strictly forbidden below evidence level E4/);

    const trans = validateStatusTransition('NOT_VERIFIED', 'E1', 'VERIFIED', 'E2');
    expect(trans.valid).toBe(false);
  });

  // ── Attack 3: Attempting VERIFIED at E0 or E1 ────────────────────────────
  it('Attack 3: Model recall (E1) or no source (E0) cannot produce VERIFIED or TEXT_CONSISTENT', () => {
    const lowLevels: EvidenceLevel[] = ['E0', 'E1'];
    for (const lvl of lowLevels) {
      expect(mayAssertOfficialVerification(lvl)).toBe(false);
      expect(() => assertLegalStatusLevel('VERIFIED', lvl)).toThrow();
      expect(() => assertLegalStatusLevel('PARTIALLY_VERIFIED', lvl)).toThrow();
      expect(() => assertLegalStatusLevel('TEXT_CONSISTENT', lvl)).toThrow();
    }
  });

  // ── Attack 4: Lookalike Hosts ────────────────────────────────────────────
  it('Attack 4: Lookalike hosts and sibling domains are strictly rejected', () => {
    const maliciousUrls = [
      'https://egwwritings.org.attacker.com/read/123',
      'https://evangelicalegwwritings.org/read/123',
      'https://fake-egwwritings.org/read/123',
      'https://egwwritings.org.evil.net/read/123',
      'https://subdomain.egwwritings.org/read/123',
    ];

    for (const url of maliciousUrls) {
      const result = validateAttestation(
        {
          claimId: 'c1',
          claimOwnerId: 'user_1',
          actorId: 'user_1',
          sourceDirectoryEntryId: 'egw_library_read',
          sourceDirectoryRevision: 1,
          rawUrl: url,
          outcome: 'found_correct',
        },
        activeEgwRevision
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reasonCode).toBe('HOST_MISMATCH');
      }
    }
  });

  // ── Attack 5: URL Path Escapes ───────────────────────────────────────────
  it('Attack 5: Path escapes (dot segments, %2e, backslashes, double slashes) are rejected', () => {
    const escapeUrls = [
      'https://egwwritings.org/read/../admin',
      'https://egwwritings.org/read/./secret',
      'https://egwwritings.org/read/%2e%2e/bypass',
      'https://egwwritings.org/read/%2E%2E/bypass',
      'https://egwwritings.org/read\\something',
      'https://egwwritings.org/read//double-slash',
    ];

    for (const url of escapeUrls) {
      const result = validateAttestation(
        {
          claimId: 'c1',
          claimOwnerId: 'user_1',
          actorId: 'user_1',
          sourceDirectoryEntryId: 'egw_library_read',
          sourceDirectoryRevision: 1,
          rawUrl: url,
          outcome: 'found_correct',
        },
        activeEgwRevision
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reasonCode).toBe('PATH_ESCAPE_DETECTED');
      }
    }
  });

  // ── Attack 6: Bare Prefix, Root, Search, or Sibling Prefix ───────────────
  it('Attack 6: Bare directory prefix, homepage, search, or sibling paths are rejected', () => {
    const invalidPaths = [
      'https://egwwritings.org/read/', // Bare prefix!
      'https://egwwritings.org/',      // Homepage!
      'https://egwwritings.org/search?query=peace', // Search page!
      'https://egwwritings.org/reading/book123',   // Sibling prefix!
    ];

    for (const url of invalidPaths) {
      const result = validateAttestation(
        {
          claimId: 'c1',
          claimOwnerId: 'user_1',
          actorId: 'user_1',
          sourceDirectoryEntryId: 'egw_library_read',
          sourceDirectoryRevision: 1,
          rawUrl: url,
          outcome: 'found_correct',
        },
        activeEgwRevision
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(['PREFIX_NOT_SATISFIED', 'BARE_PREFIX_REJECTED']).toContain(result.reasonCode);
      }
    }
  });

  // ── Attack 7: Ineligible or Deactivated Source Directory Revision ────────
  it('Attack 7: Deactivated or non-attestation-eligible revisions strictly reject E4', () => {
    // 1. Search landing entry is attestationEligible: false
    const searchRev = defaultSourceDirectory.getCurrentRevision('egw_search_landing')!;
    const searchRes = validateAttestation(
      {
        claimId: 'c1',
        claimOwnerId: 'user_1',
        actorId: 'user_1',
        sourceDirectoryEntryId: 'egw_search_landing',
        sourceDirectoryRevision: 1,
        rawUrl: 'https://egwwritings.org/search?query=love',
        outcome: 'found_correct',
      },
      searchRev
    );
    expect(searchRes.ok).toBe(false);
    if (!searchRes.ok) {
      expect(searchRes.reasonCode).toBe('ENTRY_NOT_ELIGIBLE');
    }

    // 2. Disabled revision
    const disabledRev = { ...activeEgwRevision, status: 'disabled' as const };
    const disabledRes = validateAttestation(
      {
        claimId: 'c1',
        claimOwnerId: 'user_1',
        actorId: 'user_1',
        sourceDirectoryEntryId: 'egw_library_read',
        sourceDirectoryRevision: 1,
        rawUrl: 'https://egwwritings.org/read/123',
        outcome: 'found_correct',
      },
      disabledRev
    );
    expect(disabledRes.ok).toBe(false);
    if (!disabledRes.ok) {
      expect(disabledRes.reasonCode).toBe('ENTRY_NOT_ACTIVE');
    }
  });

  // ── Attack 8: Attestation by Non-Owner ───────────────────────────────────
  it('Attack 8: Confirmation by third party or administrator is rejected (actor_id = user_id required)', () => {
    const result = validateAttestation(
      {
        claimId: 'c1',
        claimOwnerId: 'user_original_owner',
        actorId: 'user_admin_or_third_party',
        sourceDirectoryEntryId: 'egw_library_read',
        sourceDirectoryRevision: 1,
        rawUrl: 'https://egwwritings.org/read/123',
        outcome: 'found_correct',
      },
      activeEgwRevision
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reasonCode).toBe('ACTOR_MISMATCH');
      expect(result.error).toContain('actor_id = user_id');
    }
  });

  // ── Attack 9: Partially-NULL E4 Attributes (MATCH FULL Enforcement) ──────
  it('Attack 9: Service rejects partially-NULL E4 attestation record matching MATCH FULL constraint', async () => {
    const service = new VerificationService();
    const v = await service.createVerification({
      conversationId: 'conv_1',
      userId: 'user_1',
    });

    const [claim] = await service.saveClaims(v.id, 'user_1', [
      {
        verificationId: v.id,
        userId: 'user_1',
        ordinal: 1,
        text: 'Ellen White connects trust with peace.',
        claimType: 'egw',
        extraction: 'block',
      },
    ]);

    // Attempt recording E4 with missing officialUrlHost or partial fields
    await expect(
      service.recordEvidence(claim.id, 'user_1', 'E4', 'VERIFIED', 'user_attestation', {
        attestation: {
          actorId: 'user_1',
          sourceDirectoryEntryId: 'egw_library_read',
          sourceDirectoryRevision: 1,
          attestedPathPrefix: '/read/',
          attestedEligible: true,
          attestedEntryStatus: 'active',
          officialUrl: 'https://egwwritings.org/read/123',
          officialUrlHost: '', // NULL / empty!
          officialUrlPath: '/read/123',
          attestedAt: new Date().toISOString(),
          outcome: 'found_correct',
        },
      })
    ).rejects.toThrow(/MATCH FULL/);
  });

  // ── Attack 10: Ordinal Comparison Attempt ────────────────────────────────
  it('Attack 10: mayAssertOfficialVerification requires strict equality, rejecting ordinal comparison', () => {
    const levels: EvidenceLevel[] = ['E0', 'E1', 'E2', 'E3', 'E4'];

    for (const level of levels) {
      const record: EvidenceRecord = {
        id: 'ev_1',
        claimId: 'claim_1',
        userId: 'user_1',
        level,
        provenance: level === 'E4' ? 'user_attestation' : 'model_assertion',
        recordedAt: new Date().toISOString(),
      };

      if (level === 'E4') {
        expect(mayAssertOfficialVerification(record)).toBe(true);
        expect(mayAssertOfficialVerification(level)).toBe(true);
      } else {
        expect(mayAssertOfficialVerification(record)).toBe(false);
        expect(mayAssertOfficialVerification(level)).toBe(false);
      }
    }
  });

  // ── Automated Raise Ceiling Check ────────────────────────────────────────
  it('strictly prevents automated process from raising past E2', () => {
    const initialRecord: EvidenceRecord = {
      id: 'ev_1',
      claimId: 'c1',
      userId: 'user_1',
      level: 'E1',
      provenance: 'model_assertion',
      recordedAt: new Date().toISOString(),
    };

    // Auto-raising to E2 is permitted for second model
    const e2Record = raise(initialRecord, {
      level: 'E2',
      provenance: 'second_model',
      note: 'corroboration',
    });
    expect(e2Record.level).toBe('E2');

    // Auto-raising to E3 with second_model is forbidden
    expect(() =>
      raise(e2Record, {
        level: 'E3',
        provenance: 'second_model',
      })
    ).toThrow();

    // Auto-raising to E4 without attestation is forbidden
    expect(() =>
      raise(e2Record, {
        level: 'E4',
        provenance: 'second_model',
      })
    ).toThrow();
  });
});
