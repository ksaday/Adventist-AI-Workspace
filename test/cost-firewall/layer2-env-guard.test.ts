import { describe, it, expect } from 'vitest';
import { validateStartupEnv, CostFirewallEnvViolationError } from '../../server/cost-firewall/env-guard.js';

describe('Cost Firewall Layer 2 (SR-10.2): Startup Environment Guard', () => {
  it('allows benign environment variables', () => {
    const benignEnv = {
      NODE_ENV: 'production',
      PORT: '3000',
      DATABASE_URL: 'postgres://user:pass@localhost:5432/sda_workspace',
      RESEND_API_KEY: 're_12345',
      PADDLE_SECRET_KEY: 'pdl_secret',
    };

    const result = validateStartupEnv(benignEnv, { abortOnFailure: false });
    expect(result.ok).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('prevents startup on deliberate OPENAI_API_KEY', () => {
    const maliciousEnv = {
      NODE_ENV: 'production',
      OPENAI_API_KEY: 'sk-proj-deliberate-test-key-12345',
    };

    expect(() => {
      validateStartupEnv(maliciousEnv, { throwOnError: true, abortOnFailure: false });
    }).toThrowError(CostFirewallEnvViolationError);
  });

  it('detects all prohibited provider key variants', () => {
    const prohibitedKeys = [
      'OPENAI_API_KEY',
      'ANTHROPIC_API_KEY',
      'GOOGLE_AI_API_KEY',
      'GEMINI_API_KEY',
      'MISTRAL_API_KEY',
      'COHERE_API_KEY',
      'PERPLEXITY_API_KEY',
      'OPENAI_SECRET_KEY',
    ];

    for (const key of prohibitedKeys) {
      const env = { [key]: 'test-value' };
      const result = validateStartupEnv(env, { abortOnFailure: false });
      expect(result.ok).toBe(false);
      expect(result.violations).toContain(key);
    }
  });
});
