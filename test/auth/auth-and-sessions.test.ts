import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  truncateIpToPrefix,
  parseUserAgentFamily,
} from '../../server/auth/index.js';
import { screenPassword } from '../../server/auth/breach-screening.js';

describe('Auth & Session Management (Phase 1)', () => {
  it('hashes and verifies passwords securely using scrypt with salt', () => {
    const password = 'Correct-Horse-Battery-Staple-2026!';
    const hash = hashPassword(password);

    expect(hash).toContain('scrypt$');
    expect(verifyPassword(password, hash)).toBe(true);
    expect(verifyPassword('WrongPassword123!', hash)).toBe(false);
  });

  it('screens breached and weak passwords locally with zero external network calls (SR-1.7)', () => {
    const breached = ['password', '12345678', 'qwerty', 'adventist', '123456'];
    for (const pw of breached) {
      const result = screenPassword(pw);
      expect(result.isBreached).toBe(true);
    }

    const short = 'abc';
    expect(screenPassword(short).isBreached).toBe(true);

    const strong = 'MyHighEntropyStrongP@ssw0rd!2026';
    expect(screenPassword(strong).isBreached).toBe(false);
  });

  it('generates high-entropy session tokens and SHA-256 storage hashes', () => {
    const { rawToken, tokenHash } = createSessionToken();
    expect(rawToken).toHaveLength(64);
    expect(tokenHash).toHaveLength(64);
    expect(rawToken).not.toBe(tokenHash);
  });

  it('truncates client IP to privacy-preserving subnet (/24 for IPv4, /48 for IPv6)', () => {
    expect(truncateIpToPrefix('192.168.1.150')).toBe('192.168.1.0/24');
    expect(truncateIpToPrefix('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe('2001:0db8:85a3::/48');
  });

  it('correctly truncates "::" zero-compressed IPv6 addresses (the form real addresses actually take)', () => {
    // A naive split(':') on these previously produced malformed output like '::1::/48',
    // which Postgres's inet column type rejects outright — found by a real registration
    // request from localhost (curl -> ::1), not by the golden-file test above.
    expect(truncateIpToPrefix('::1')).toBe('0:0:0::/48');
    expect(truncateIpToPrefix('fe80::1')).toBe('fe80:0:0::/48');
    expect(truncateIpToPrefix('2001:db8::8a2e:370:7334')).toBe('2001:db8:0::/48');
  });

  it('parses User-Agent to generic browser family, avoiding fingerprinting', () => {
    const macChromeUA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36';
    expect(parseUserAgentFamily(macChromeUA)).toBe('Chrome on macOS');

    const winChromeUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36';
    expect(parseUserAgentFamily(winChromeUA)).toBe('Chrome on Windows');
  });
});
