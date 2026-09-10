/**
 * Evidence State Machine & Rendering Guard.
 * (SR-6 / ADR-0019 / Verification Architecture §2, §9 / Database Design §8)
 *
 * Invariants:
 * 1. ONLY E4 may be rendered as VERIFIED or in green.
 * 2. mayAssertOfficialVerification uses strict equality (=== 'E4'), NEVER ordinal (>=).
 * 3. E3 permits TEXT_CONSISTENT and NEVER VERIFIED.
 * 4. E4 forbids TEXT_CONSISTENT (must resolve to what member found).
 * 5. Automated processes may never raise above E2.
 */

import type {
  EvidenceLevel,
  ClaimStatus,
  EvidenceRecord,
  ClaimProvenance,
} from './types';

export class InvalidStateTransitionError extends Error {
  constructor(
    message: string,
    public readonly currentStatus: ClaimStatus,
    public readonly currentLevel: EvidenceLevel,
    public readonly targetStatus: ClaimStatus,
    public readonly targetLevel: EvidenceLevel
  ) {
    super(message);
    this.name = 'InvalidStateTransitionError';
  }
}

export class IllegalStatusLevelError extends Error {
  constructor(
    message: string,
    public readonly status: ClaimStatus,
    public readonly level: EvidenceLevel
  ) {
    super(message);
    this.name = 'IllegalStatusLevelError';
  }
}

/**
 * Returns permitted claim statuses for a given evidence level.
 * Matches Database Design §8 CHECK constraints and Verification Architecture §9.
 */
export function permittedStatuses(level: EvidenceLevel): ClaimStatus[] {
  switch (level) {
    case 'E0':
      return ['NOT_VERIFIED', 'INSUFFICIENT_EVIDENCE'];
    case 'E1':
      return ['NOT_VERIFIED', 'INSUFFICIENT_EVIDENCE'];
    case 'E2':
      return ['NOT_VERIFIED', 'INSUFFICIENT_EVIDENCE', 'CONTRADICTED'];
    case 'E3':
      return ['NOT_VERIFIED', 'INSUFFICIENT_EVIDENCE', 'CONTRADICTED', 'TEXT_CONSISTENT'];
    case 'E4':
      return ['NOT_VERIFIED', 'INSUFFICIENT_EVIDENCE', 'CONTRADICTED', 'VERIFIED', 'PARTIALLY_VERIFIED'];
  }
}

/**
 * The normative rendering guard (SR-6.5 / ADR-0019).
 * ONLY E4 may be rendered as VERIFIED or in green.
 * Ordinal comparison over EvidenceLevel is strictly forbidden.
 */
export function mayAssertOfficialVerification(input: EvidenceRecord | EvidenceLevel): boolean {
  const level = typeof input === 'string' ? input : input.level;
  return level === 'E4';
}

/**
 * Validates whether a claim status is legally compatible with an evidence level.
 * Mirrors CHECK (status NOT IN ('VERIFIED','PARTIALLY_VERIFIED') OR evidence_level = 'E4')
 * and CHECK (status <> 'TEXT_CONSISTENT' OR evidence_level = 'E3').
 */
export function assertLegalStatusLevel(status: ClaimStatus, level: EvidenceLevel): void {
  // VERIFIED and PARTIALLY_VERIFIED require E4
  if (status === 'VERIFIED' || status === 'PARTIALLY_VERIFIED') {
    if (level !== 'E4') {
      throw new IllegalStatusLevelError(
        `Status '${status}' is strictly forbidden below evidence level E4 (got ${level}). Invariant 3 / ADR-0019.`,
        status,
        level
      );
    }
  }

  // TEXT_CONSISTENT is permitted ONLY at E3
  if (status === 'TEXT_CONSISTENT' && level !== 'E3') {
    throw new IllegalStatusLevelError(
      `Status 'TEXT_CONSISTENT' is permitted exclusively at evidence level E3 (got ${level}).`,
      status,
      level
    );
  }

  // Permitted statuses matrix check
  const allowed = permittedStatuses(level);
  if (!allowed.includes(status)) {
    throw new IllegalStatusLevelError(
      `Status '${status}' is not permitted at evidence level ${level}. Permitted: ${allowed.join(', ')}.`,
      status,
      level
    );
  }
}

/**
 * Validates a status/level transition according to Verification Architecture §9.
 */
export function validateStatusTransition(
  currentStatus: ClaimStatus,
  currentLevel: EvidenceLevel,
  newStatus: ClaimStatus,
  newLevel: EvidenceLevel,
  context?: {
    hasSourceBlockRef?: boolean;
    hasBoundAttestation?: boolean;
    actorMatchesOwner?: boolean;
  }
): { valid: boolean; reason?: string } {
  // Check legal target pair first
  try {
    assertLegalStatusLevel(newStatus, newLevel);
  } catch (err) {
    return { valid: false, reason: (err as Error).message };
  }

  // E3 transition requires sourceBlockRefId
  if (newLevel === 'E3' && context && !context.hasSourceBlockRef) {
    return {
      valid: false,
      reason: 'Transition to E3 requires a valid source_block_ref_id.',
    };
  }

  // E4 transition requires bound attestation by claim owner
  if (newLevel === 'E4') {
    if (context && !context.hasBoundAttestation) {
      return {
        valid: false,
        reason: 'Transition to E4 requires a bound official source attestation.',
      };
    }
    if (context && context.actorMatchesOwner === false) {
      return {
        valid: false,
        reason: 'Attestation must be made by the owner of the claim (actor_id = user_id).',
      };
    }
  }

  // Transitions to CONTRADICTED require level >= E2
  if (newStatus === 'CONTRADICTED' && (newLevel === 'E0' || newLevel === 'E1')) {
    return {
      valid: false,
      reason: "Status 'CONTRADICTED' requires evidence level E2 or higher.",
    };
  }

  return { valid: true };
}

/**
 * Raises evidence record to a higher level.
 * Automated processes may raise E0 -> E1 -> E2 only.
 * E3 requires sourceBlockRefId. E4 requires bound attestation with actorId === ownerId.
 */
export function raise(
  current: EvidenceRecord,
  next: {
    level: EvidenceLevel;
    provenance: ClaimProvenance;
    note?: string;
    sourceBlockRefId?: string;
    attestation?: EvidenceRecord['attestation'];
  }
): EvidenceRecord {
  // Check that level does not auto-raise past E2 without required artifacts
  if (next.level === 'E3') {
    if (!next.sourceBlockRefId) {
      throw new Error('Cannot raise claim to E3 without a recorded sourceBlockRefId.');
    }
    if (next.provenance !== 'user_supplied_text') {
      throw new Error("E3 evidence requires provenance 'user_supplied_text'.");
    }
  }

  if (next.level === 'E4') {
    if (!next.attestation) {
      throw new Error('Cannot raise claim to E4 without a bound attestation.');
    }
    if (next.attestation.actorId !== current.userId) {
      throw new Error('E4 attestation must be made by the owner of the claim (actorId = userId).');
    }
    if (next.provenance !== 'user_attestation') {
      throw new Error("E4 evidence requires provenance 'user_attestation'.");
    }
  }

  // Automated process raise ceiling: only model assertions can raise to E1/E2
  if (next.provenance === 'model_assertion' && next.level !== 'E1') {
    throw new Error("Provenance 'model_assertion' is restricted to level E1.");
  }
  if (next.provenance === 'second_model' && next.level !== 'E2') {
    throw new Error("Provenance 'second_model' is restricted to level E2.");
  }

  return {
    id: crypto.randomUUID(),
    claimId: current.claimId,
    userId: current.userId,
    level: next.level,
    provenance: next.provenance,
    note: next.note,
    recordedAt: new Date().toISOString(),
    sourceBlockRefId: next.sourceBlockRefId,
    attestation: next.attestation,
  };
}
