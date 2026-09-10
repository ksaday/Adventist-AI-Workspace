import { describe, it, expect, beforeEach } from 'vitest';
import { RateLimiter, type Clock } from '../../server/security/rate-limiter.js';

describe('Rate Limiter and Abuse Controls (Auth Design §7)', () => {
  let currentTime: number;
  let clock: Clock;
  let limiter: RateLimiter;

  beforeEach(() => {
    currentTime = 1757500000000;
    clock = { now: () => new Date(currentTime) };
    limiter = new RateLimiter(clock);
  });

  it('enforces login rate limit: 5 attempts per 15 minutes per (IP, email_hash)', () => {
    const key = '192.168.1.0/24:hash123';

    // First 5 attempts succeed
    for (let i = 1; i <= 5; i++) {
      const result = limiter.consume('login_ip_email', key);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5 - i);
    }

    // 6th attempt is blocked
    const blocked = limiter.consume('login_ip_email', key);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBe(15 * 60);

    // After 15 minutes, quota resets
    currentTime += 15 * 60 * 1000 + 1000;
    const postReset = limiter.consume('login_ip_email', key);
    expect(postReset.allowed).toBe(true);
    expect(postReset.remaining).toBe(4);
  });

  it('enforces registration limit: 3 per hour per IP', () => {
    const ip = '10.0.0.0/24';

    for (let i = 0; i < 3; i++) {
      expect(limiter.consume('registration', ip).allowed).toBe(true);
    }

    const fourth = limiter.consume('registration', ip);
    expect(fourth.allowed).toBe(false);
    expect(fourth.retryAfterSeconds).toBe(3600);
  });

  it('enforces export limit: 3 per day per account', () => {
    const userId = 'usr-export-heavy';

    for (let i = 0; i < 3; i++) {
      expect(limiter.consume('export', userId).allowed).toBe(true);
    }

    const fourth = limiter.consume('export', userId);
    expect(fourth.allowed).toBe(false);
    expect(fourth.retryAfterSeconds).toBe(24 * 3600);
  });

  it('inspects quota without consuming tokens', () => {
    const key = 'check-only-key';
    const inspectInitial = limiter.inspect('prompt_generation', key);
    expect(inspectInitial.allowed).toBe(true);
    expect(inspectInitial.remaining).toBe(30);

    // Still 30 available
    const consumeFirst = limiter.consume('prompt_generation', key);
    expect(consumeFirst.allowed).toBe(true);
    expect(consumeFirst.remaining).toBe(29);
  });
});
