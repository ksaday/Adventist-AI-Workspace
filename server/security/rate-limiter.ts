/**
 * Rate Limiting and Abuse Control Engine (Auth Design §7).
 *
 * Implements token bucket / sliding window limits:
 * - Login: 5 per 15 min per (IP, email_hash); 20 per 15 min per IP.
 * - Registration: 3 per hour per IP.
 * - Password reset request: 3 per hour per email_hash; 10 per hour per IP.
 * - Verification resend: 3 per hour per account.
 * - TOTP verify: 5 per 15 min (then 15-minute 2FA lock).
 * - Export: 3 per day per account.
 * - Prompt generation: Entitlement quota + fair use (30/min).
 */

export type RateLimitedEndpoint =
  | 'login_ip_email'
  | 'login_ip'
  | 'registration'
  | 'password_reset_email'
  | 'password_reset_ip'
  | 'verification_resend'
  | 'totp_verify'
  | 'export'
  | 'prompt_generation';

export interface RateLimitConfig {
  maxHits: number;
  windowMs: number;
}

export const DEFAULT_RATE_LIMITS: Record<RateLimitedEndpoint, RateLimitConfig> = {
  login_ip_email: { maxHits: 5, windowMs: 15 * 60 * 1000 },
  login_ip: { maxHits: 20, windowMs: 15 * 60 * 1000 },
  registration: { maxHits: 3, windowMs: 60 * 60 * 1000 },
  password_reset_email: { maxHits: 3, windowMs: 60 * 60 * 1000 },
  password_reset_ip: { maxHits: 10, windowMs: 60 * 60 * 1000 },
  verification_resend: { maxHits: 3, windowMs: 60 * 60 * 1000 },
  totp_verify: { maxHits: 5, windowMs: 15 * 60 * 1000 },
  export: { maxHits: 3, windowMs: 24 * 60 * 60 * 1000 },
  prompt_generation: { maxHits: 30, windowMs: 60 * 1000 },
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfterSeconds?: number;
}

export interface Clock {
  now(): Date;
}

export class RateLimiter {
  private hits = new Map<string, number[]>();
  private clock: Clock;

  constructor(clock: Clock = { now: () => new Date() }) {
    this.clock = clock;
  }

  private buildKey(endpoint: RateLimitedEndpoint, key: string): string {
    return `${endpoint}:${key}`;
  }

  /**
   * Consumes a single token from the rate limit bucket.
   */
  public consume(
    endpoint: RateLimitedEndpoint,
    key: string,
    customConfig?: RateLimitConfig
  ): RateLimitResult {
    const config = customConfig || DEFAULT_RATE_LIMITS[endpoint];
    const fullKey = this.buildKey(endpoint, key);
    const nowMs = this.clock.now().getTime();
    const windowStart = nowMs - config.windowMs;

    // Filter hits older than the current window
    const existingHits = (this.hits.get(fullKey) || []).filter(ts => ts > windowStart);

    if (existingHits.length >= config.maxHits) {
      const oldestHit = existingHits[0];
      const resetMs = oldestHit + config.windowMs;
      const retryAfterSeconds = Math.max(1, Math.ceil((resetMs - nowMs) / 1000));

      this.hits.set(fullKey, existingHits);
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(resetMs),
        retryAfterSeconds,
      };
    }

    // Record new hit
    existingHits.push(nowMs);
    this.hits.set(fullKey, existingHits);

    const remaining = Math.max(0, config.maxHits - existingHits.length);
    const resetMs = existingHits[0] + config.windowMs;

    return {
      allowed: true,
      remaining,
      resetAt: new Date(resetMs),
    };
  }

  /**
   * Inspects rate limit state without consuming a token.
   */
  public inspect(
    endpoint: RateLimitedEndpoint,
    key: string,
    customConfig?: RateLimitConfig
  ): RateLimitResult {
    const config = customConfig || DEFAULT_RATE_LIMITS[endpoint];
    const fullKey = this.buildKey(endpoint, key);
    const nowMs = this.clock.now().getTime();
    const windowStart = nowMs - config.windowMs;

    const existingHits = (this.hits.get(fullKey) || []).filter(ts => ts > windowStart);
    const remaining = Math.max(0, config.maxHits - existingHits.length);

    if (existingHits.length >= config.maxHits) {
      const oldestHit = existingHits[0];
      const resetMs = oldestHit + config.windowMs;
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(resetMs),
        retryAfterSeconds: Math.max(1, Math.ceil((resetMs - nowMs) / 1000)),
      };
    }

    const resetMs = existingHits.length > 0 ? existingHits[0] + config.windowMs : nowMs + config.windowMs;

    return {
      allowed: true,
      remaining,
      resetAt: new Date(resetMs),
    };
  }

  /**
   * Clears hits for a key (e.g. after successful login or testing).
   */
  public reset(endpoint: RateLimitedEndpoint, key: string): void {
    this.hits.delete(this.buildKey(endpoint, key));
  }

  /**
   * Resets all rate limiter state.
   */
  public resetAll(): void {
    this.hits.clear();
  }
}

// Global application rate limiter instance
export const rateLimiter = new RateLimiter();
