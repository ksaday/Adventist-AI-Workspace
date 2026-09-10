import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';

describe('Cross-Site Request Forgery (CSRF) Protection Suite', () => {
  interface CsrfSession {
    sessionId: string;
    csrfSecret: string;
  }

  function generateCsrfToken(session: CsrfSession): string {
    const timestamp = Date.now();
    const payload = `${session.sessionId}:${timestamp}`;
    const hmac = crypto.createHmac('sha256', session.csrfSecret).update(payload).digest('hex');
    return `${payload}:${hmac}`;
  }

  function verifyCsrfToken(
    token: string,
    session: CsrfSession,
    maxAgeMs = 3600_000,
    now = Date.now()
  ): boolean {
    if (!token) return false;
    const parts = token.split(':');
    if (parts.length !== 3) return false;

    const [tokenSessionId, tokenTimestampStr, tokenHmac] = parts;
    if (tokenSessionId !== session.sessionId) return false;

    const tokenTimestamp = parseInt(tokenTimestampStr, 10);
    if (isNaN(tokenTimestamp) || now - tokenTimestamp > maxAgeMs) return false;

    const payload = `${tokenSessionId}:${tokenTimestampStr}`;
    const expectedHmac = crypto.createHmac('sha256', session.csrfSecret).update(payload).digest('hex');

    const actualBuf = Buffer.from(tokenHmac, 'utf8');
    const expectedBuf = Buffer.from(expectedHmac, 'utf8');

    return actualBuf.length === expectedBuf.length && crypto.timingSafeEqual(actualBuf, expectedBuf);
  }

  const testSession: CsrfSession = {
    sessionId: 'sess-abc-123',
    csrfSecret: 'super-secret-csrf-key-32-bytes-len',
  };

  it('generates and validates session-bound anti-CSRF tokens', () => {
    const token = generateCsrfToken(testSession);
    expect(token).toBeDefined();
    expect(verifyCsrfToken(token, testSession)).toBe(true);
  });

  it('rejects tokens from a different session (session swapping attack)', () => {
    const attackerSession: CsrfSession = {
      sessionId: 'sess-attacker-999',
      csrfSecret: 'attacker-secret',
    };

    const attackerToken = generateCsrfToken(attackerSession);
    expect(verifyCsrfToken(attackerToken, testSession)).toBe(false);
  });

  it('rejects tampered or forged CSRF tokens', () => {
    const validToken = generateCsrfToken(testSession);
    const forgedToken = validToken.slice(0, -4) + '0000';
    expect(verifyCsrfToken(forgedToken, testSession)).toBe(false);
  });

  it('rejects expired CSRF tokens', () => {
    const token = generateCsrfToken(testSession);
    // Verify with simulated time 2 hours later (maxAge = 1 hour)
    const twoHoursLater = Date.now() + 2 * 3600_000;
    expect(verifyCsrfToken(token, testSession, 3600_000, twoHoursLater)).toBe(false);
  });

  it('verifies session cookie policies (SameSite=Lax/Strict, HttpOnly, Secure)', () => {
    function createSessionCookieHeader(token: string): string {
      return `session_token=${token}; Path=/; HttpOnly; Secure; SameSite=Lax`;
    }

    const cookie = createSessionCookieHeader('test-token-value');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Lax');
  });
});
