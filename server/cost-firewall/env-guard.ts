/**
 * SR-10.2 Cost Firewall Layer 2: Startup Environment Guard
 *
 * "The server runtime environment must not contain any variable matching
 * `/(_API_KEY|_SECRET_KEY)$/` whose name also matches
 * `/(OPENAI|ANTHROPIC|GOOGLE_AI|GEMINI|MISTRAL|COHERE|PERPLEXITY)/`.
 * Startup aborts if one is present."
 */

export class CostFirewallEnvViolationError extends Error {
  public violations: string[];

  constructor(violations: string[]) {
    super(
      `CRITICAL SECURITY VIOLATION: Cost Firewall SR-10.2 triggered.\n` +
      `The following prohibited AI provider keys were found in the environment:\n` +
      violations.map(v => `  - ${v}`).join('\n') +
      `\nThe server is structurally barred from holding AI provider credentials. Startup aborted.`
    );
    this.name = 'CostFirewallEnvViolationError';
    this.violations = violations;
  }
}

const FORBIDDEN_KEY_PATTERN = /(_API_KEY|_SECRET_KEY)$/i;
const FORBIDDEN_PROVIDER_PATTERN = /(OPENAI|ANTHROPIC|GOOGLE_AI|GEMINI|MISTRAL|COHERE|PERPLEXITY)/i;

/**
 * Validates the runtime environment against prohibited AI provider API keys.
 * If any violation is found, logs an alert and aborts the process (or throws).
 */
export function validateStartupEnv(
  env: Record<string, string | undefined> = process.env,
  options: { abortOnFailure?: boolean; throwOnError?: boolean } = { abortOnFailure: true }
): { ok: boolean; violations: string[] } {
  const violations: string[] = [];

  for (const key of Object.keys(env)) {
    if (FORBIDDEN_KEY_PATTERN.test(key) && FORBIDDEN_PROVIDER_PATTERN.test(key)) {
      violations.push(key);
    }
  }

  if (violations.length > 0) {
    const error = new CostFirewallEnvViolationError(violations);
    console.error(`[COST-FIREWALL-SR-10.2] ${error.message}`);

    if (options.throwOnError) {
      throw error;
    }

    if (options.abortOnFailure !== false && typeof process !== 'undefined' && process.exit) {
      process.exit(1);
    }

    return { ok: false, violations };
  }

  return { ok: true, violations: [] };
}
