import { describe, it, expect } from 'vitest';
import { screenSafety, getEmergencyResources } from '../../packages/safety/src/index.js';

describe('Safety Screener: Pre-transmission Screening (Phase 3)', () => {
  it('screens English self-harm crisis terms without logging the text span', () => {
    const crisisText = 'I feel completely hopeless and want to end my life.';
    const matches = screenSafety(crisisText, ['en']);

    expect(matches).toHaveLength(1);
    expect(matches[0].category).toBe('self_harm');
    expect(matches[0].severity).toBe(3);
    // Invariant: text span is not stored in match result
    expect(matches[0]).not.toHaveProperty('term');
  });

  it('screens Korean crisis terms correctly', () => {
    const koreanCrisis = '너무 힘들어서 자살하고 싶은 마음이 듭니다.';
    const matches = screenSafety(koreanCrisis, ['ko']);

    expect(matches).toHaveLength(1);
    expect(matches[0].category).toBe('self_harm');
    expect(matches[0].severity).toBe(3);
  });

  it('returns appropriate verified emergency resources for detected category', () => {
    const resources = getEmergencyResources('self_harm');
    expect(resources.length).toBeGreaterThanOrEqual(2);

    const usResource = resources.find(r => r.region === 'US');
    expect(usResource?.contact).toBe('988');

    const krResource = resources.find(r => r.region === 'KR');
    expect(krResource?.contact).toBe('109');
  });
});
