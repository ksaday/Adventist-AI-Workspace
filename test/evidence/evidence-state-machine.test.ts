/**
 * Evidence State Machine & Transitions Tests (SR-6 / ADR-0019 / Verification Architecture §9).
 */

import { describe, it, expect } from 'vitest';
import {
  permittedStatuses,
  assertLegalStatusLevel,
  validateStatusTransition,
  raise,
  type EvidenceLevel,
  type ClaimStatus,
  type EvidenceRecord,
} from '../../packages/evidence/src/index.js';

describe('Evidence State Machine (Verification Architecture §9 / Database Design §8)', () => {
  it('enforces normative permittedStatuses mapping for each evidence level', () => {
    // E0: NOT_VERIFIED, INSUFFICIENT_EVIDENCE
    expect(permittedStatuses('E0')).toEqual(['NOT_VERIFIED', 'INSUFFICIENT_EVIDENCE']);

    // E1: NOT_VERIFIED, INSUFFICIENT_EVIDENCE
    expect(permittedStatuses('E1')).toEqual(['NOT_VERIFIED', 'INSUFFICIENT_EVIDENCE']);

    // E2: NOT_VERIFIED, INSUFFICIENT_EVIDENCE, CONTRADICTED
    expect(permittedStatuses('E2')).toEqual(['NOT_VERIFIED', 'INSUFFICIENT_EVIDENCE', 'CONTRADICTED']);

    // E3: NOT_VERIFIED, INSUFFICIENT_EVIDENCE, CONTRADICTED, TEXT_CONSISTENT (NO VERIFIED!)
    expect(permittedStatuses('E3')).toEqual(['NOT_VERIFIED', 'INSUFFICIENT_EVIDENCE', 'CONTRADICTED', 'TEXT_CONSISTENT']);
    expect(permittedStatuses('E3')).not.toContain('VERIFIED');
    expect(permittedStatuses('E3')).not.toContain('PARTIALLY_VERIFIED');

    // E4: NOT_VERIFIED, INSUFFICIENT_EVIDENCE, CONTRADICTED, VERIFIED, PARTIALLY_VERIFIED (NO TEXT_CONSISTENT!)
    expect(permittedStatuses('E4')).toEqual(['NOT_VERIFIED', 'INSUFFICIENT_EVIDENCE', 'CONTRADICTED', 'VERIFIED', 'PARTIALLY_VERIFIED']);
    expect(permittedStatuses('E4')).not.toContain('TEXT_CONSISTENT');
  });

  it('assertLegalStatusLevel validates the two database CHECK constraints', () => {
    // Constraint 1: verified_requires_member_confirmation (status NOT IN ('VERIFIED','PARTIALLY_VERIFIED') OR evidence_level = 'E4')
    expect(() => assertLegalStatusLevel('VERIFIED', 'E4')).not.toThrow();
    expect(() => assertLegalStatusLevel('PARTIALLY_VERIFIED', 'E4')).not.toThrow();

    const nonE4Levels: EvidenceLevel[] = ['E0', 'E1', 'E2', 'E3'];
    for (const lvl of nonE4Levels) {
      expect(() => assertLegalStatusLevel('VERIFIED', lvl)).toThrow();
      expect(() => assertLegalStatusLevel('PARTIALLY_VERIFIED', lvl)).toThrow();
    }

    // Constraint 2: text_consistent_is_e3_only (status <> 'TEXT_CONSISTENT' OR evidence_level = 'E3')
    expect(() => assertLegalStatusLevel('TEXT_CONSISTENT', 'E3')).not.toThrow();

    const nonE3Levels: EvidenceLevel[] = ['E0', 'E1', 'E2', 'E4'];
    for (const lvl of nonE3Levels) {
      expect(() => assertLegalStatusLevel('TEXT_CONSISTENT', lvl)).toThrow();
    }
  });

  it('validateStatusTransition enforces transition rules from Verification Architecture §9', () => {
    // any -> NOT_VERIFIED: always valid
    expect(validateStatusTransition('VERIFIED', 'E4', 'NOT_VERIFIED', 'E4').valid).toBe(true);
    expect(validateStatusTransition('TEXT_CONSISTENT', 'E3', 'NOT_VERIFIED', 'E3').valid).toBe(true);

    // any -> INSUFFICIENT_EVIDENCE: always valid
    expect(validateStatusTransition('NOT_VERIFIED', 'E1', 'INSUFFICIENT_EVIDENCE', 'E1').valid).toBe(true);

    // NOT_VERIFIED -> CONTRADICTED: requires level >= E2
    expect(validateStatusTransition('NOT_VERIFIED', 'E1', 'CONTRADICTED', 'E1').valid).toBe(false);
    expect(validateStatusTransition('NOT_VERIFIED', 'E2', 'CONTRADICTED', 'E2').valid).toBe(true);

    // NOT_VERIFIED -> TEXT_CONSISTENT: requires level = E3 and sourceBlockRef
    expect(validateStatusTransition('NOT_VERIFIED', 'E1', 'TEXT_CONSISTENT', 'E3', { hasSourceBlockRef: false }).valid).toBe(false);
    expect(validateStatusTransition('NOT_VERIFIED', 'E1', 'TEXT_CONSISTENT', 'E3', { hasSourceBlockRef: true }).valid).toBe(true);

    // Transition to VERIFIED at E4 requires bound attestation and matching owner
    expect(validateStatusTransition('NOT_VERIFIED', 'E1', 'VERIFIED', 'E4', { hasBoundAttestation: false }).valid).toBe(false);
    expect(validateStatusTransition('NOT_VERIFIED', 'E1', 'VERIFIED', 'E4', { hasBoundAttestation: true, actorMatchesOwner: false }).valid).toBe(false);
    expect(validateStatusTransition('NOT_VERIFIED', 'E1', 'VERIFIED', 'E4', { hasBoundAttestation: true, actorMatchesOwner: true }).valid).toBe(true);
  });

  it('raise() allows E0->E1->E2 and refuses automated progression to E3 or E4', () => {
    const rec0: EvidenceRecord = {
      id: '1',
      claimId: 'c1',
      userId: 'u1',
      level: 'E0',
      provenance: 'deterministic_validator',
      recordedAt: new Date().toISOString(),
    };

    const rec1 = raise(rec0, { level: 'E1', provenance: 'model_assertion' });
    expect(rec1.level).toBe('E1');

    const rec2 = raise(rec1, { level: 'E2', provenance: 'second_model' });
    expect(rec2.level).toBe('E2');

    // Raising to E3 requires sourceBlockRefId
    expect(() => raise(rec2, { level: 'E3', provenance: 'user_supplied_text' })).toThrow(/sourceBlockRefId/);

    const rec3 = raise(rec2, {
      level: 'E3',
      provenance: 'user_supplied_text',
      sourceBlockRefId: 'sbr_1',
    });
    expect(rec3.level).toBe('E3');

    // Raising to E4 requires attestation and matching actorId
    expect(() =>
      raise(rec3, {
        level: 'E4',
        provenance: 'user_attestation',
        attestation: {
          actorId: 'different_user',
          sourceDirectoryEntryId: 'egw_library_read',
          sourceDirectoryRevision: 1,
          attestedPathPrefix: '/read/',
          attestedEligible: true,
          attestedEntryStatus: 'active',
          officialUrl: 'https://egwwritings.org/read/123',
          officialUrlHost: 'egwwritings.org',
          officialUrlPath: '/read/123',
          attestedAt: new Date().toISOString(),
          outcome: 'found_correct',
        },
      })
    ).toThrow(/actorId = userId/);

    const rec4 = raise(rec3, {
      level: 'E4',
      provenance: 'user_attestation',
      attestation: {
        actorId: 'u1',
        sourceDirectoryEntryId: 'egw_library_read',
        sourceDirectoryRevision: 1,
        attestedPathPrefix: '/read/',
        attestedEligible: true,
        attestedEntryStatus: 'active',
        officialUrl: 'https://egwwritings.org/read/123',
        officialUrlHost: 'egwwritings.org',
        officialUrlPath: '/read/123',
        attestedAt: new Date().toISOString(),
        outcome: 'found_correct',
      },
    });
    expect(rec4.level).toBe('E4');
  });
});
