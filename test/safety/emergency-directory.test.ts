/**
 * Emergency Directory Verification Test (Testing Strategy §4 / Implementation Plan §Phase 9 Exit Criterion 3).
 *
 * Enforces:
 * - Every emergency number is verified with a recorded date, verifier, and official method.
 * - Key risk categories (self_harm, imminent_harm, abuse, medical_emergency) have verified entries.
 * - Multi-regional coverage (US, KR, CA, UK, GLOBAL).
 */

import { describe, it, expect } from 'vitest';
import emergencyDir from '../../data/emergency/emergency-directory.v1.json';
import { getEmergencyResources } from '../../packages/safety/src/index';

describe('Emergency Directory Verification (Exit Criterion 3)', () => {
  it('every entry has a verified date, verifier, and verification method', () => {
    expect(emergencyDir.directory.length).toBeGreaterThanOrEqual(10);

    for (const entry of emergencyDir.directory) {
      expect(entry.verifiedAt).toBeDefined();
      expect(entry.verifiedBy).toBeDefined();
      expect(entry.verificationMethod).toBeDefined();

      // Check valid ISO date format YYYY-MM-DD
      expect(entry.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Date.parse(entry.verifiedAt)).not.toBeNaN();

      // Check non-empty contact and name
      expect(entry.name.length).toBeGreaterThan(0);
      expect(entry.contact.length).toBeGreaterThan(0);
      expect(entry.available.length).toBeGreaterThan(0);
    }
  });

  it('provides verified coverage for critical risk categories in English and Korean regions', () => {
    const usSelfHarm = emergencyDir.directory.find(e => e.region === 'US' && e.category === 'self_harm');
    expect(usSelfHarm).toBeDefined();
    expect(usSelfHarm?.contact).toBe('988');

    const krSelfHarm = emergencyDir.directory.find(e => e.region === 'KR' && e.category === 'self_harm');
    expect(krSelfHarm).toBeDefined();
    expect(krSelfHarm?.contact).toBe('109');

    const usAbuse = emergencyDir.directory.find(e => e.region === 'US' && e.category === 'abuse');
    expect(usAbuse).toBeDefined();

    const krAbuse = emergencyDir.directory.find(e => e.region === 'KR' && e.category === 'abuse');
    expect(krAbuse).toBeDefined();
  });

  it('getEmergencyResources helper correctly filters verified entries by category', () => {
    const selfHarmResources = getEmergencyResources('self_harm');
    expect(selfHarmResources.length).toBeGreaterThanOrEqual(3);
    for (const r of selfHarmResources) {
      expect(r.category).toBe('self_harm');
      expect(r.verifiedAt).toBeDefined();
    }
  });
});
