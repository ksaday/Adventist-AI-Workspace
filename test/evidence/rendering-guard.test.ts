import { describe, it, expect } from 'vitest';
import { mayAssertOfficialVerification, type EvidenceLevel } from '../../packages/evidence/src/index.js';

describe('Evidence Ladder Rendering Guard (SR-6.4a / ADR-0019)', () => {
  it('permits official verification assertion ONLY for E4', () => {
    expect(mayAssertOfficialVerification('E4')).toBe(true);
  });

  it('rejects official verification assertion for E0, E1, E2, E3', () => {
    const nonVerifyingLevels: EvidenceLevel[] = ['E0', 'E1', 'E2', 'E3'];
    for (const level of nonVerifyingLevels) {
      expect(mayAssertOfficialVerification(level)).toBe(false);
    }
  });
});
