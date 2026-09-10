import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTotpEnrollment,
  generateTotp,
  verifyTotp,
  verifyAndConsumeRecoveryCode,
  checkTotpLockout,
  recordTotpFailure,
  clearTotpFailures,
  assertAdminTotpEnrolled,
  canAssignAdminRole,
  AdminTotpRequiredError,
  hasRecentReauth,
} from '../../server/auth/totp.js';

describe('Two-Factor Authentication (TOTP) Service (RFC 6238 / SR-1.8)', () => {
  const testEmail = 'pastor.choe@adventist.org';

  beforeEach(() => {
    clearTotpFailures('user-lockout-test');
  });

  it('generates enrollment data with RFC 4648 Base32 secret and 10 recovery codes', () => {
    const enrollment = createTotpEnrollment(testEmail);

    expect(enrollment.secretBase32).toBeDefined();
    expect(enrollment.secretBase32.length).toBeGreaterThanOrEqual(32);
    expect(enrollment.otpauthUri).toContain('otpauth://totp/');
    expect(enrollment.otpauthUri).toContain(encodeURIComponent(testEmail));
    expect(enrollment.otpauthUri).toContain(`secret=${enrollment.secretBase32}`);

    expect(enrollment.recoveryCodes).toHaveLength(10);
    expect(enrollment.recoveryCodeHashes).toHaveLength(10);
    // Each code has format xxxx-xxxx-xxxx
    expect(enrollment.recoveryCodes[0]).toMatch(/^[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}$/);
  });

  it('verifies valid TOTP code at current time step', () => {
    const enrollment = createTotpEnrollment(testEmail);
    const now = 1757500000000; // Fixed timestamp

    const validCode = generateTotp(enrollment.secretBase32, now);
    expect(validCode).toHaveLength(6);
    expect(/^\d{6}$/.test(validCode)).toBe(true);

    const isValid = verifyTotp(validCode, enrollment.secretBase32, { timestampMs: now });
    expect(isValid).toBe(true);
  });

  it('accepts codes with ±1 time step tolerance (clock drift up to 30s before or after)', () => {
    const enrollment = createTotpEnrollment(testEmail);
    const now = 1757500000000;

    // Generate code from previous step (-30s)
    const prevCode = generateTotp(enrollment.secretBase32, now - 30_000);
    expect(verifyTotp(prevCode, enrollment.secretBase32, { timestampMs: now, tolerance: 1 })).toBe(true);

    // Generate code from next step (+30s)
    const nextCode = generateTotp(enrollment.secretBase32, now + 30_000);
    expect(verifyTotp(nextCode, enrollment.secretBase32, { timestampMs: now, tolerance: 1 })).toBe(true);
  });

  it('rejects codes outside tolerance window (2 steps away, e.g. 60s drift)', () => {
    const enrollment = createTotpEnrollment(testEmail);
    const now = 1757500000000;

    const twoStepsPast = generateTotp(enrollment.secretBase32, now - 60_000);
    expect(verifyTotp(twoStepsPast, enrollment.secretBase32, { timestampMs: now, tolerance: 1 })).toBe(false);

    const twoStepsFuture = generateTotp(enrollment.secretBase32, now + 60_000);
    expect(verifyTotp(twoStepsFuture, enrollment.secretBase32, { timestampMs: now, tolerance: 1 })).toBe(false);
  });

  it('rejects malformed and fabricated tokens', () => {
    const enrollment = createTotpEnrollment(testEmail);
    expect(verifyTotp('12345', enrollment.secretBase32)).toBe(false); // too short
    expect(verifyTotp('1234567', enrollment.secretBase32)).toBe(false); // too long
    expect(verifyTotp('abcdef', enrollment.secretBase32)).toBe(false); // non-digits
    expect(verifyTotp('', enrollment.secretBase32)).toBe(false); // empty
  });

  it('verifies and single-use consumes recovery codes', () => {
    const enrollment = createTotpEnrollment(testEmail);
    const codeToUse = enrollment.recoveryCodes[3];

    // First use succeeds and consumes the code
    const result1 = verifyAndConsumeRecoveryCode(codeToUse, enrollment.recoveryCodeHashes);
    expect(result1.valid).toBe(true);
    expect(result1.remainingHashes).toHaveLength(9);

    // Second use of the same code fails
    const result2 = verifyAndConsumeRecoveryCode(codeToUse, result1.remainingHashes);
    expect(result2.valid).toBe(false);
    expect(result2.remainingHashes).toHaveLength(9);
  });

  it('triggers 15-minute 2FA lock on 5 failed attempts (Auth Design §5 & §7)', () => {
    const userId = 'user-lockout-test';
    const nowMs = 1757500000000;

    // 4 failed attempts do not lock
    for (let i = 1; i <= 4; i++) {
      const res = recordTotpFailure(userId, nowMs);
      expect(res.locked).toBe(false);
    }

    // 5th failed attempt triggers 15-minute lock
    const fifth = recordTotpFailure(userId, nowMs);
    expect(fifth.locked).toBe(true);
    expect(fifth.retryAfterSeconds).toBe(15 * 60);

    // Subsequent checks confirm active lockout
    const check = checkTotpLockout(userId, nowMs + 60_000);
    expect(check.locked).toBe(true);
    expect(check.retryAfterSeconds).toBe(14 * 60);

    // After 15 minutes, lock is cleared
    const postLock = checkTotpLockout(userId, nowMs + 16 * 60 * 1000);
    expect(postLock.locked).toBe(false);
  });

  it('MANDATORY TOTP FOR ADMINS (SR-1.8): Admin role cannot be granted or exercised without TOTP', () => {
    // 1. Regular member without TOTP is fine
    expect(() =>
      assertAdminTotpEnrolled({ role: 'member', totpEnabled: false })
    ).not.toThrow();

    // 2. Admin account without TOTP throws AdminTotpRequiredError
    expect(() =>
      assertAdminTotpEnrolled({ role: 'admin', totpEnabled: false })
    ).toThrow(AdminTotpRequiredError);

    // 3. Admin account with TOTP passes
    expect(() =>
      assertAdminTotpEnrolled({ role: 'admin', totpEnabled: true })
    ).not.toThrow();

    // 4. Target user without TOTP cannot be assigned admin role
    expect(canAssignAdminRole({ totpEnabled: false })).toBe(false);
    expect(canAssignAdminRole({ totpEnabled: true })).toBe(true);
  });

  it('verifies 15-minute re-authentication window for administrative actions (PR-ADM-08)', () => {
    const nowMs = 1757500000000;

    // Reauth 5 minutes ago: valid
    expect(hasRecentReauth(nowMs - 5 * 60 * 1000, 15, nowMs)).toBe(true);

    // Reauth exactly 15 minutes ago: valid
    expect(hasRecentReauth(nowMs - 15 * 60 * 1000, 15, nowMs)).toBe(true);

    // Reauth 16 minutes ago: expired
    expect(hasRecentReauth(nowMs - 16 * 60 * 1000, 15, nowMs)).toBe(false);

    // Missing reauth: invalid
    expect(hasRecentReauth(undefined, 15, nowMs)).toBe(false);
  });
});
