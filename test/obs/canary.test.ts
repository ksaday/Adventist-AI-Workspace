import { describe, it, expect } from 'vitest';
import { runPrivacyCanaryTest } from '../../server/obs/canary.js';
import { scrub } from '../../server/obs/logger.js';

describe('Privacy Canary and Log Scrubber (Phase 0 / SR-D1)', () => {
  it('passes the privacy canary test with zero leaked canaries', () => {
    const result = runPrivacyCanaryTest();
    expect(result.passed).toBe(true);
    expect(result.leakedCanaries).toHaveLength(0);
  });

  it('redacts sensitive credentials from complex nested objects', () => {
    const raw = {
      password: 'super-secret-pw',
      nested: {
        authorization: 'secret-token-abcdef',
        dek: 'data-encryption-key-blob',
        rawHeader: 'Bearer secret-bearer-token-12345',
      },
      safeField: 'audit-id-1234',
    };

    const scrubbed = scrub(raw) as Record<string, unknown>;
    expect(scrubbed.password).toBe('[REDACTED]');
    expect((scrubbed.nested as Record<string, unknown>).authorization).toBe('[REDACTED]');
    expect((scrubbed.nested as Record<string, unknown>).dek).toBe('[REDACTED]');
    expect((scrubbed.nested as Record<string, unknown>).rawHeader).toBe('Bearer [REDACTED]');
    expect(scrubbed.safeField).toBe('audit-id-1234');
  });
});
