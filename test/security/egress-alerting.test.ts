import { describe, it, expect, beforeEach } from 'vitest';
import { assertEgressAllowed, CostFirewallEgressViolationError } from '../../server/cost-firewall/egress-guard.js';
import { secureEgressFetch } from '../../server/egress/client.js';
import { getSecurityEvents, clearSecurityEvents } from '../../server/obs/logger.js';

describe('Egress-Denial Alerting Suite (SR-10.3 / Phase 8)', () => {
  beforeEach(() => {
    clearSecurityEvents();
  });

  it('raises CostFirewallEgressViolationError and logs security alert on blocked external AI endpoint call', () => {
    const forbiddenEndpoints = [
      'https://api.openai.com/v1/chat/completions',
      'https://api.anthropic.com/v1/messages',
      'https://generativelanguage.googleapis.com/v1beta/models',
      'https://api.mistral.ai/v1/chat/completions',
      'https://api.cohere.com/v1/generate',
      'https://api.perplexity.ai/chat/completions',
    ];

    for (const url of forbiddenEndpoints) {
      expect(() => assertEgressAllowed(url)).toThrow(CostFirewallEgressViolationError);
    }

    const events = getSecurityEvents().filter(e => e.event === 'EGRESS_ALLOWLIST_VIOLATION');
    expect(events.length).toBe(forbiddenEndpoints.length);

    // Verify context structure
    for (let i = 0; i < forbiddenEndpoints.length; i++) {
      const parsed = new URL(forbiddenEndpoints[i]);
      expect(events[i].details).toMatchObject({
        hostname: parsed.hostname,
        url: forbiddenEndpoints[i],
        protocol: 'https:',
      });
      expect(events[i].timestamp).toBeDefined();
    }
  });

  it('blocks and logs security alert when secureEgressFetch is called with unauthorized destination', async () => {
    const maliciousTarget = 'https://malicious-telemetry-sink.example.com/exfiltrate';

    await expect(secureEgressFetch(maliciousTarget)).rejects.toThrow(CostFirewallEgressViolationError);

    const alert = getSecurityEvents().find(
      e => e.event === 'EGRESS_ALLOWLIST_VIOLATION' && (e.details as any)?.hostname === 'malicious-telemetry-sink.example.com'
    );
    expect(alert).toBeDefined();
  });
});
