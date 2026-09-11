/**
 * Authentication and Session Management Service (Phase 1).
 *
 * Enforces:
 * 1. Enumeration-resistant flows (constant-shape responses).
 * 2. Breached password screening (SR-1.7).
 * 3. Privacy-conscious IP prefix (/24 or /48) and UA family truncation (Database Design §3).
 * 4. Opaque session tokens hashed with SHA-256 before storage.
 */

import crypto from 'node:crypto';
import { screenPassword } from './breach-screening.js';
import { computeEmailHash, generateUserDek, wrapDek, unwrapDek, encryptEnvelope } from '../crypto/index.js';

export interface UserSession {
  sessionId: string;
  userId: string;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  ipPrefix?: string;
  userAgentFamily?: string;
}

export interface UserRecord {
  id: string;
  emailHash: string;
  emailEnc: string;
  passwordHash: string;
  status: 'active' | 'suspended' | 'pending_deletion' | 'deleted';
  createdAt: Date;
}

/**
 * Expands "::" zero-compression in an IPv6 address to its full 8-group form.
 * Needed because a naive split(':') on a compressed address (e.g. '::1',
 * 'fe80::1' — the form virtually every real IPv6 address takes) does not
 * produce 8 groups, and previously produced malformed output like '::1::/48'.
 */
function expandIpv6Groups(ip: string): string[] {
  const addr = ip.split('%')[0]; // strip a zone id, e.g. fe80::1%eth0
  if (!addr.includes('::')) return addr.split(':');
  const [head, tail] = addr.split('::');
  const headParts = head ? head.split(':') : [];
  const tailParts = tail ? tail.split(':') : [];
  const missing = Math.max(0, 8 - headParts.length - tailParts.length);
  return [...headParts, ...Array(missing).fill('0'), ...tailParts];
}

/**
 * Truncates an IP address to privacy-preserving subnet (/24 for IPv4, /48 for IPv6).
 */
export function truncateIpToPrefix(ip: string): string {
  if (!ip) return '0.0.0.0/24';
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length >= 3) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
    }
  }
  if (ip.includes(':')) {
    const groups = expandIpv6Groups(ip);
    return `${groups.slice(0, 3).join(':')}::/48`;
  }
  return '0.0.0.0/24';
}

/**
 * Parses user agent to high-level family only, avoiding detailed tracking fingerprints.
 */
export function parseUserAgentFamily(ua: string): string {
  if (!ua) return 'Unknown Client';
  if (/chrome/i.test(ua) && /mac/i.test(ua)) return 'Chrome on macOS';
  if (/chrome/i.test(ua) && /windows/i.test(ua)) return 'Chrome on Windows';
  if (/firefox/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return 'Safari';
  return 'Standard Browser';
}

/**
 * Hash password with salted scrypt.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt}$${derivedKey.toString('hex')}`;
}

/**
 * Verifies password against salted scrypt hash in constant time.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;

  const salt = parts[1];
  const expectedKey = Buffer.from(parts[2], 'hex');
  const actualKey = crypto.scryptSync(password, salt, 64);

  return crypto.timingSafeEqual(expectedKey, actualKey);
}

/**
 * Generates an opaque random session token and its SHA-256 hash.
 */
export function createSessionToken(): { rawToken: string; tokenHash: string } {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  return { rawToken, tokenHash };
}
