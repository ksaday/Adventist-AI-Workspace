import { describe, it, expect } from 'vitest';
import { canonicalizeAndValidateAttestedUrl } from '../../packages/evidence/src/attestation.js';
import { type SourceDirectoryEntryRevision } from '../../packages/evidence/src/types.js';
import { assertEgressAllowed } from '../../server/cost-firewall/egress-guard.js';

describe('SSRF Protection Suite (SR-7.5 / SR-7.6 / SR-10.3 / Security §62)', () => {
  const dummyRevision: SourceDirectoryEntryRevision = {
    revision: 1,
    name: 'Ellen G. White Writings (Complete Published Works)',
    host: 'egwwritings.org',
    baseUrl: 'https://egwwritings.org',
    attestationEligible: true,
    attestationPathPrefix: '/read/',
    status: 'active',
    lastReviewed: '2026-01-01',
  };

  describe('User-Supplied Attestation URL Screening (SR-7.6)', () => {
    it('rejects loopback and localhost addresses', () => {
      const loopbacks = [
        'https://127.0.0.1/read/123',
        'https://localhost/read/123',
        'https://[::1]/read/123',
        'https://127.0.0.2/read/123',
      ];

      for (const url of loopbacks) {
        const res = canonicalizeAndValidateAttestedUrl(url, dummyRevision);
        expect(res.ok).toBe(false);
      }
    });

    it('rejects AWS/GCP cloud metadata link-local endpoints', () => {
      const metadataUrls = [
        'https://169.254.169.254/latest/meta-data/',
        'https://metadata.google.internal/computeMetadata/v1/',
      ];

      for (const url of metadataUrls) {
        const res = canonicalizeAndValidateAttestedUrl(url, dummyRevision);
        expect(res.ok).toBe(false);
      }
    });

    it('rejects private IPv4 subnets (RFC 1918)', () => {
      const privateIps = [
        'https://10.0.0.1/read/123',
        'https://192.168.1.1/read/123',
        'https://172.16.0.1/read/123',
        'https://172.31.255.255/read/123',
      ];

      for (const url of privateIps) {
        const res = canonicalizeAndValidateAttestedUrl(url, dummyRevision);
        expect(res.ok).toBe(false);
        if (!res.ok) {
          expect(['RAW_IP_FORBIDDEN', 'HOST_MISMATCH']).toContain(res.reasonCode);
        }
      }
    });

    it('rejects userinfo credentials embedded in URL', () => {
      const credentialUrls = [
        'https://admin:password@egwwritings.org/read/123',
        'https://root@egwwritings.org/read/123',
      ];

      for (const url of credentialUrls) {
        const res = canonicalizeAndValidateAttestedUrl(url, dummyRevision);
        expect(res.ok).toBe(false);
        if (!res.ok) {
          expect(res.reasonCode).toBe('CREDENTIALS_FORBIDDEN');
        }
      }
    });

    it('rejects non-HTTPS schemes (http, ftp, file, javascript)', () => {
      const nonHttps = [
        'http://egwwritings.org/read/123',
        'ftp://egwwritings.org/read/123',
        'file:///etc/passwd',
        'javascript:alert(1)',
      ];

      for (const url of nonHttps) {
        const res = canonicalizeAndValidateAttestedUrl(url, dummyRevision);
        expect(res.ok).toBe(false);
        if (!res.ok) {
          expect(['INVALID_SCHEME', 'URL_PARSE_ERROR']).toContain(res.reasonCode);
        }
      }
    });

    it('rejects explicit ports (even 443)', () => {
      const explicitPorts = [
        'https://egwwritings.org:443/read/123',
        'https://egwwritings.org:8080/read/123',
        'https://egwwritings.org:22/read/123',
      ];

      for (const url of explicitPorts) {
        const res = canonicalizeAndValidateAttestedUrl(url, dummyRevision);
        expect(res.ok).toBe(false);
        if (!res.ok) {
          expect(res.reasonCode).toBe('PORT_FORBIDDEN');
        }
      }
    });

    it('rejects path traversal and directory escape sequences', () => {
      const traversalUrls = [
        'https://egwwritings.org/read/../admin',
        'https://egwwritings.org/read/%2e%2e/internal',
        'https://egwwritings.org/read/..\\private',
      ];

      for (const url of traversalUrls) {
        const res = canonicalizeAndValidateAttestedUrl(url, dummyRevision);
        expect(res.ok).toBe(false);
        if (!res.ok) {
          expect(res.reasonCode).toBe('PATH_ESCAPE_DETECTED');
        }
      }
    });
  });

  describe('Server Outbound Egress Guard (SR-10.3)', () => {
    it('blocks outbound requests to arbitrary or malicious hosts', () => {
      const blockedHosts = [
        'https://169.254.169.254/latest/meta-data',
        'https://internal.lan/service',
        'https://evil.attacker.com/leak',
        'https://api.openai.com/v1/models',
      ];

      for (const url of blockedHosts) {
        expect(() => assertEgressAllowed(url)).toThrow();
      }
    });

    it('allows explicitly allowlisted system infrastructure hosts only', () => {
      const allowedHosts = [
        'https://api.resend.com/emails',
        'https://api.paddle.com/transactions',
        'https://sentry.io/api/123',
      ];

      for (const url of allowedHosts) {
        expect(() => assertEgressAllowed(url)).not.toThrow();
      }
    });
  });
});
