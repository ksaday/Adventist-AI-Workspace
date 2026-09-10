/**
 * SR-10.3 Cost Firewall Layer 3: Egress Allowlist Guard
 *
 * "Server egress is restricted by an explicit allowlist of hostnames
 * (database, email provider, billing provider, error reporter).
 * All other outbound connections are refused and logged as a security event."
 */

import { logSecurityEvent } from '../obs/logger.js';

export class CostFirewallEgressViolationError extends Error {
  public url: string;
  public hostname: string;

  constructor(url: string, hostname: string) {
    super(
      `SECURITY EVENT: Cost Firewall SR-10.3 Egress Violation.\n` +
      `Outbound request to '${hostname}' (${url}) was REFUSED.\n` +
      `Host is not on the server egress allowlist.`
    );
    this.name = 'CostFirewallEgressViolationError';
    this.url = url;
    this.hostname = hostname;
  }
}

// Configurable allowlisted hostnames (can be extended via env if needed, but defaults are strict)
export const DEFAULT_EGRESS_ALLOWLIST: readonly string[] = [
  'localhost',
  '127.0.0.1',
  'api.resend.com',
  'api.paddle.com',
  'sandbox-api.paddle.com',
  'sentry.io',
  'o0.ingest.sentry.io'
] as const;

/**
 * Checks if a destination hostname is permitted by the egress allowlist.
 */
export function isEgressPermitted(hostname: string, customAllowlist?: readonly string[]): boolean {
  const allowlist = customAllowlist || DEFAULT_EGRESS_ALLOWLIST;
  const lowerHost = hostname.toLowerCase();

  return allowlist.some(allowed => {
    if (allowed.startsWith('*.')) {
      const suffix = allowed.slice(2);
      return lowerHost === suffix || lowerHost.endsWith('.' + suffix);
    }
    return lowerHost === allowed;
  });
}

/**
 * Validates a target URL before outbound dispatch.
 * Raises and logs a security event if not allowed.
 */
export function assertEgressAllowed(urlStr: string, customAllowlist?: readonly string[]): URL {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlStr);
  } catch (err) {
    logSecurityEvent('EGRESS_MALFORMED_URL', { url: urlStr });
    throw new Error(`Invalid egress URL: ${urlStr}`);
  }

  if (!isEgressPermitted(parsedUrl.hostname, customAllowlist)) {
    logSecurityEvent('EGRESS_ALLOWLIST_VIOLATION', {
      hostname: parsedUrl.hostname,
      url: urlStr,
      protocol: parsedUrl.protocol,
    });
    throw new CostFirewallEgressViolationError(urlStr, parsedUrl.hostname);
  }

  return parsedUrl;
}
