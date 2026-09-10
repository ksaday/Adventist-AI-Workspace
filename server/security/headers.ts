/**
 * Security Headers and Content Security Policy (CSP) Module.
 *
 * Implements Security Architecture §62:
 * 1. Nonce-based CSP without 'unsafe-inline' or 'unsafe-eval'.
 * 2. Strict connect-src 'self' (bars unauthorized external egress).
 * 3. HSTS with 2-year max-age, includeSubDomains, preload.
 * 4. X-Frame-Options: DENY and frame-ancestors: 'none' (anti-clickjacking).
 * 5. X-Content-Type-Options: nosniff (anti-MIME confusion).
 * 6. Referrer-Policy: strict-origin-when-cross-origin.
 * 7. Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=().
 */

import crypto from 'node:crypto';

/**
 * Generates a cryptographically strong random base64 nonce for CSP.
 */
export function generateCspNonce(): string {
  return crypto.randomBytes(16).toString('base64');
}

/**
 * Builds the strict Content Security Policy string using the provided nonce.
 */
export function buildCspHeader(nonce: string): string {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'none'",
    "object-src 'none'",
  ];

  return directives.join('; ');
}

/**
 * Returns the full dictionary of canonical security headers.
 */
export function getSecurityHeaders(nonce?: string): Record<string, string> {
  const currentNonce = nonce || generateCspNonce();

  return {
    'Content-Security-Policy': buildCspHeader(currentNonce),
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'X-Permitted-Cross-Domain-Policies': 'none',
  };
}

/**
 * Validates whether a given CSP string conforms to the required nonce-only policy.
 */
export function validateCspConformity(cspString: string): {
  valid: boolean;
  violations: string[];
} {
  const violations: string[] = [];

  if (cspString.includes("'unsafe-inline'")) {
    violations.push("CSP contains prohibited directive: 'unsafe-inline'");
  }
  if (cspString.includes("'unsafe-eval'")) {
    violations.push("CSP contains prohibited directive: 'unsafe-eval'");
  }
  if (!cspString.includes("frame-ancestors 'none'")) {
    violations.push("CSP missing required directive: frame-ancestors 'none'");
  }
  if (!cspString.includes("connect-src 'self'")) {
    violations.push("CSP missing required directive: connect-src 'self'");
  }
  if (!cspString.includes("'nonce-")) {
    violations.push("CSP missing nonce-based script-src/style-src");
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}
