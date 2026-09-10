/**
 * RFC 6238 TOTP (Time-Based One-Time Password) Service.
 *
 * Implements:
 * 1. RFC 6238 (TOTP) / RFC 4226 (HOTP) using HMAC-SHA1.
 * 2. 30-second time step, 6 digits, ±1 step tolerance (90-second total acceptance window).
 * 3. Constant-time timing-safe comparison.
 * 4. RFC 4648 Base32 secret generation and decoding.
 * 5. 10 single-use recovery codes, hashed at rest.
 * 6. 2FA lockout tracking: 5 failed attempts per 15 minutes locks 2FA for 15 minutes.
 * 7. Mandatory TOTP enforcement for admin accounts (SR-1.8, Auth Design §5 & §8).
 * 8. Re-authentication verification helper (15-minute validity for admin mutations).
 */

import crypto from 'node:crypto';

// --- Base32 Encoding / Decoding (RFC 4648) ---

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function encodeBase32(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

export function decodeBase32(base32Str: string): Buffer {
  const cleaned = base32Str.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (idx === -1) {
      throw new Error(`Invalid Base32 character: ${cleaned[i]}`);
    }
    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

// --- RFC 4226 / 6238 Core Calculations ---

/**
 * Calculates HOTP code for a given counter and secret key.
 */
export function generateHotp(secret: Buffer, counter: number, digits = 6): string {
  const counterBuffer = Buffer.alloc(8);
  // Write 64-bit integer big-endian
  counterBuffer.writeBigInt64BE(BigInt(counter), 0);

  const hmac = crypto.createHmac('sha1', secret);
  hmac.update(counterBuffer);
  const digest = hmac.digest();

  // Dynamic truncation (RFC 4226 §5.3)
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  const otp = binary % Math.pow(10, digits);
  return otp.toString().padStart(digits, '0');
}

/**
 * Calculates current TOTP time step index.
 */
export function getTotpStep(timestampMs: number = Date.now(), stepSeconds = 30): number {
  return Math.floor(timestampMs / 1000 / stepSeconds);
}

/**
 * Generates TOTP code for a given secret at a specific timestamp.
 */
export function generateTotp(
  secretBase32: string,
  timestampMs: number = Date.now(),
  stepSeconds = 30,
  digits = 6
): string {
  const secret = decodeBase32(secretBase32);
  const step = getTotpStep(timestampMs, stepSeconds);
  return generateHotp(secret, step, digits);
}

/**
 * Verifies a TOTP code with ±1 step tolerance (RFC 6238 recommended).
 * Performs constant-time comparison to prevent timing attacks.
 */
export function verifyTotp(
  token: string,
  secretBase32: string,
  options: {
    timestampMs?: number;
    stepSeconds?: number;
    tolerance?: number;
    digits?: number;
  } = {}
): boolean {
  const {
    timestampMs = Date.now(),
    stepSeconds = 30,
    tolerance = 1,
    digits = 6,
  } = options;

  if (!token || typeof token !== 'string') return false;
  const sanitizedToken = token.trim();
  if (sanitizedToken.length !== digits || !/^\d+$/.test(sanitizedToken)) {
    return false;
  }

  let secret: Buffer;
  try {
    secret = decodeBase32(secretBase32);
  } catch {
    return false;
  }

  const currentStep = getTotpStep(timestampMs, stepSeconds);
  const tokenBuf = Buffer.from(sanitizedToken, 'utf8');

  // Check current step and ±tolerance steps
  for (let offset = -tolerance; offset <= tolerance; offset++) {
    const candidateCode = generateHotp(secret, currentStep + offset, digits);
    const candidateBuf = Buffer.from(candidateCode, 'utf8');

    if (
      tokenBuf.length === candidateBuf.length &&
      crypto.timingSafeEqual(tokenBuf, candidateBuf)
    ) {
      return true;
    }
  }

  return false;
}

// --- TOTP Setup & URI Helpers ---

export interface TotpEnrollmentData {
  secretBase32: string;
  otpauthUri: string;
  recoveryCodes: string[];
  recoveryCodeHashes: string[];
}

/**
 * Generates fresh enrollment data: 20-byte random secret, otpauth URI, and 10 recovery codes.
 */
export function createTotpEnrollment(accountEmail: string, issuer = 'SDA AI Workspace'): TotpEnrollmentData {
  const randomBytes = crypto.randomBytes(20);
  const secretBase32 = encodeBase32(randomBytes);

  const encodedIssuer = encodeURIComponent(issuer);
  const encodedAccount = encodeURIComponent(accountEmail);
  const otpauthUri = `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secretBase32}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;

  const recoveryCodes: string[] = [];
  const recoveryCodeHashes: string[] = [];

  for (let i = 0; i < 10; i++) {
    // Generate code format: xxxx-xxxx-xxxx
    const part1 = crypto.randomBytes(2).toString('hex');
    const part2 = crypto.randomBytes(2).toString('hex');
    const part3 = crypto.randomBytes(2).toString('hex');
    const code = `${part1}-${part2}-${part3}`.toLowerCase();

    recoveryCodes.push(code);
    recoveryCodeHashes.push(hashRecoveryCode(code));
  }

  return {
    secretBase32,
    otpauthUri,
    recoveryCodes,
    recoveryCodeHashes,
  };
}

export function hashRecoveryCode(code: string): string {
  const normalized = code.trim().toLowerCase().replace(/-/g, '');
  return crypto.createHash('sha256').update(normalized, 'utf8').digest('hex');
}

export function verifyAndConsumeRecoveryCode(
  providedCode: string,
  storedHashes: string[]
): { valid: boolean; remainingHashes: string[] } {
  const targetHash = hashRecoveryCode(providedCode);
  const matchIndex = storedHashes.findIndex(h => h === targetHash);

  if (matchIndex === -1) {
    return { valid: false, remainingHashes: storedHashes };
  }

  const remainingHashes = [...storedHashes];
  remainingHashes.splice(matchIndex, 1);
  return { valid: true, remainingHashes };
}

// --- Lockout & Rate Limiting for TOTP (Auth Design §5 & §7) ---

export interface TotpAttemptTracker {
  failedAttempts: number;
  lockUntil?: number;
}

const attemptStore = new Map<string, TotpAttemptTracker>();

export function checkTotpLockout(userId: string, nowMs = Date.now()): { locked: boolean; retryAfterSeconds?: number } {
  const tracker = attemptStore.get(userId);
  if (!tracker) return { locked: false };

  if (tracker.lockUntil && tracker.lockUntil > nowMs) {
    return {
      locked: true,
      retryAfterSeconds: Math.ceil((tracker.lockUntil - nowMs) / 1000),
    };
  }

  // Lock expired
  if (tracker.lockUntil && tracker.lockUntil <= nowMs) {
    attemptStore.delete(userId);
  }

  return { locked: false };
}

export function recordTotpFailure(userId: string, nowMs = Date.now()): { locked: boolean; retryAfterSeconds?: number } {
  let tracker = attemptStore.get(userId);
  if (!tracker || (tracker.lockUntil && tracker.lockUntil <= nowMs)) {
    tracker = { failedAttempts: 0 };
    attemptStore.set(userId, tracker);
  }

  tracker.failedAttempts++;

  // 5 code attempts per 15 minutes, then a 15-minute lock on 2FA (Auth Design §5)
  if (tracker.failedAttempts >= 5) {
    const lockDurationMs = 15 * 60 * 1000;
    tracker.lockUntil = nowMs + lockDurationMs;
    return {
      locked: true,
      retryAfterSeconds: Math.ceil(lockDurationMs / 1000),
    };
  }

  return { locked: false };
}

export function clearTotpFailures(userId: string): void {
  attemptStore.delete(userId);
}

// --- Admin Mandatory TOTP Enforcement (SR-1.8, Auth Design §5 & §8) ---

export class AdminTotpRequiredError extends Error {
  constructor(message = 'TOTP is mandatory for accounts with an administrative role.') {
    super(message);
    this.name = 'AdminTotpRequiredError';
  }
}

/**
 * Validates that an account with an admin role has active TOTP enrolled.
 * Throws AdminTotpRequiredError if violated.
 */
export function assertAdminTotpEnrolled(user: { role: string; totpEnabled: boolean }): void {
  if (user.role === 'admin' && !user.totpEnabled) {
    throw new AdminTotpRequiredError(
      'Administrative accounts must have Two-Factor Authentication (TOTP) enabled. Role assignment or operation blocked.'
    );
  }
}

/**
 * Checks whether an admin role can be granted to a target user.
 * Admin role is strictly forbidden without active TOTP.
 */
export function canAssignAdminRole(targetUser: { totpEnabled: boolean }): boolean {
  return targetUser.totpEnabled === true;
}

/**
 * Helper to check whether an admin session was re-authenticated within 15 minutes (PR-ADM-08).
 */
export function hasRecentReauth(lastReauthAt?: Date | string | number, maxAgeMinutes = 15, nowMs = Date.now()): boolean {
  if (!lastReauthAt) return false;
  const reauthTime = new Date(lastReauthAt).getTime();
  if (isNaN(reauthTime)) return false;
  return nowMs - reauthTime <= maxAgeMinutes * 60 * 1000;
}
