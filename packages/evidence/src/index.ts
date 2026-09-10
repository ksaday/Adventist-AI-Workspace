// packages/evidence - Evidence state machine and rendering guard (SR-6 / ADR-0019)
export type EvidenceLevel = 'E0' | 'E1' | 'E2' | 'E3' | 'E4';
export type ClaimStatus = 'UNPROCESSED' | 'TEXT_CONSISTENT' | 'VERIFIED' | 'PARTIALLY_VERIFIED' | 'CONTRADICTED' | 'UNVERIFIABLE';

/**
 * Rendering guard: ONLY E4 may be rendered as VERIFIED or in green.
 * SR-6.4a / ADR-0019
 */
export function mayAssertOfficialVerification(level: EvidenceLevel): boolean {
  return level === 'E4';
}
