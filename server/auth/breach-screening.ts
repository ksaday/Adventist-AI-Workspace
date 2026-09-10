/**
 * Breached Password Screening (SR-1.7).
 *
 * Checks prospective passwords against a locally bundled set of known breached/weak
 * passwords. Runs completely locally with ZERO network egress, satisfying SR-10.3.
 */

// Baseline list of notoriously breached and weak password patterns
const COMMON_BREACHED_PASSWORDS = new Set([
  'password',
  '123456',
  '12345678',
  '123456789',
  '12345',
  'qwerty',
  '111111',
  'iloveyou',
  'admin',
  'welcome',
  'monkey',
  'dragon',
  'master',
  'sunshine',
  'princess',
  'solo',
  'letmein',
  'trustno1',
  'adventist',
  'sda12345',
  'seventhday',
  'maranatha',
]);

export interface BreachCheckResult {
  isBreached: boolean;
  reason?: string;
}

/**
 * Screens a prospective password against the local breach dataset.
 */
export function screenPassword(password: string): BreachCheckResult {
  const normalized = password.trim().toLowerCase();

  if (normalized.length < 8) {
    return {
      isBreached: true,
      reason: 'Password must be at least 8 characters long.',
    };
  }

  if (COMMON_BREACHED_PASSWORDS.has(normalized)) {
    return {
      isBreached: true,
      reason: 'This password appears in known data breach lists and cannot be used.',
    };
  }

  // Simple sequential check
  if (/^(?:012345|123456|234567|345678|456789|567890)+$/.test(normalized)) {
    return {
      isBreached: true,
      reason: 'Password is a predictable sequence and is easily guessed.',
    };
  }

  return { isBreached: false };
}
