/**
 * Regression coverage for wiring server/security/rate-limiter.ts into the real
 * auth routes (found missing during the 2026-09-11 app-wiring correctness review —
 * see STATE.md). Both routes check the rate limit before touching the database,
 * so these run without DATABASE_URL / a live Postgres.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { rateLimiter, DEFAULT_RATE_LIMITS } from '../../server/security/rate-limiter.js';
import { POST as loginPOST } from '../../app/api/auth/login/route.js';
import { POST as registerPOST } from '../../app/api/auth/register/route.js';

function postRequest(url: string, ip: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  });
}

describe('Auth routes: rate limiting (SR / Auth Design §7)', () => {
  beforeEach(() => {
    rateLimiter.resetAll();
  });

  it('login: rejects with 429 once the per-IP limit is exceeded, before touching the database', async () => {
    const ip = '203.0.113.10';
    const max = DEFAULT_RATE_LIMITS.login_ip.maxHits;

    for (let i = 0; i < max; i++) {
      const res = await loginPOST(postRequest('http://localhost/api/auth/login', ip, { email: 'not-json-valid' }));
      // Malformed body (fails zod .email()) -> genericFailure (401), consumed without DB access.
      expect(res.status).toBe(401);
    }

    const limited = await loginPOST(postRequest('http://localhost/api/auth/login', ip, { email: 'not-json-valid' }));
    expect(limited.status).toBe(429);
    expect(limited.headers.get('Retry-After')).toBeTruthy();
  });

  it('register: rejects with 429 once the per-IP limit is exceeded, before touching the database', async () => {
    const ip = '203.0.113.20';
    const max = DEFAULT_RATE_LIMITS.registration.maxHits;

    for (let i = 0; i < max; i++) {
      const res = await registerPOST(postRequest('http://localhost/api/auth/register', ip, {}));
      // Empty body fails zod parsing -> genericFailure (400), consumed without DB access.
      expect(res.status).toBe(400);
    }

    const limited = await registerPOST(postRequest('http://localhost/api/auth/register', ip, {}));
    expect(limited.status).toBe(429);
    expect(limited.headers.get('Retry-After')).toBeTruthy();
  });

  it('login: a different IP is not affected by another IP exhausting its limit', async () => {
    const busyIp = '203.0.113.30';
    const quietIp = '203.0.113.31';
    const max = DEFAULT_RATE_LIMITS.login_ip.maxHits;

    for (let i = 0; i < max + 1; i++) {
      await loginPOST(postRequest('http://localhost/api/auth/login', busyIp, { email: 'x' }));
    }

    const res = await loginPOST(postRequest('http://localhost/api/auth/login', quietIp, { email: 'x' }));
    expect(res.status).toBe(401); // not 429 — the quiet IP has its own bucket
  });
});
