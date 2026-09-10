/**
 * Server Egress Client with Cost Firewall Layer 3 & Layer 4 Enforcement (SR-10.3, SR-10.4).
 *
 * Rules:
 * - SR-10.3: Host must be on the explicit allowlist.
 * - SR-10.4: URL must NOT derive from arbitrary user input.
 * - Direct global `fetch` is prohibited in server business logic; all egress must go through this client.
 */

import { assertEgressAllowed } from '../cost-firewall/egress-guard.js';

export interface EgressRequestOptions extends RequestInit {
  timeoutMs?: number;
}

/**
 * Perform an allowlisted outbound HTTP request from the server.
 * Rejects any host not on the allowlist and records a security event.
 */
export async function secureEgressFetch(
  urlStr: string,
  options: EgressRequestOptions = {}
): Promise<Response> {
  // Validate host against allowlist (SR-10.3)
  const validatedUrl = assertEgressAllowed(urlStr);

  const { timeoutMs = 10000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(validatedUrl.toString(), {
      ...fetchOptions,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}
