import { describe, it, expect, beforeEach } from 'vitest';
import { assertEgressAllowed, CostFirewallEgressViolationError } from '../../server/cost-firewall/egress-guard.js';
import { secureEgressFetch } from '../../server/egress/client.js';
import { getSecurityEvents, clearSecurityEvents } from '../../server/obs/logger.js';

describe('Cost Firewall Layer 3 (SR-10.3): Server Egress Allowlist', () => {
  beforeEach(() => {
    clearSecurityEvents();
  });

  it('permits allowlisted endpoints', () => {
    expect(() => assertEgressAllowed('https://api.resend.com/emails')).not.toThrow();
    expect(() => assertEgressAllowed('https://api.paddle.com/transactions')).not.toThrow();
    expect(() => assertEgressAllowed('http://localhost:5432')).not.toThrow();
  });

  it('refuses deliberate fetch to https://api.openai.com and raises security event', async () => {
    const prohibitedUrl = 'https://api.openai.com/v1/chat/completions';

    await expect(secureEgressFetch(prohibitedUrl)).rejects.toThrowError(
      CostFirewallEgressViolationError
    );

    const events = getSecurityEvents();
    const violation = events.find(e => e.event === 'EGRESS_ALLOWLIST_VIOLATION');
    expect(violation).toBeDefined();
    expect((violation?.details as { hostname: string }).hostname).toBe('api.openai.com');
  });

  it('refuses other external AI provider endpoints', async () => {
    const prohibitedHosts = [
      'https://api.anthropic.com/v1/messages',
      'https://generativelanguage.googleapis.com/v1beta/models',
      'https://api.cohere.com/v1/generate',
    ];

    for (const url of prohibitedHosts) {
      await expect(secureEgressFetch(url)).rejects.toThrowError(
        CostFirewallEgressViolationError
      );
    }
  });
});
