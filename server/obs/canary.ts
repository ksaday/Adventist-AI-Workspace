/**
 * Privacy Canary Test (Phase 0 deliverable / Exit criterion).
 *
 * Verifies that structured logging scrubbers reliably redact canary tokens,
 * passwords, bearer tokens, and sensitive keys prior to egress or disk persistence.
 */

import { scrub } from './logger.js';

export interface CanaryTestResult {
  passed: boolean;
  leakedCanaries: string[];
}

export function runPrivacyCanaryTest(): CanaryTestResult {
  const canaryToken = 'canary-9a8b7c6d5e4f3a2b1c';
  const canaryBearer = 'Bearer canary-secret-bearer-token-12345';
  const canaryPassword = 'canary-super-secret-password-xyz';

  const payloadWithCanaries = {
    user: 'test-user',
    password: canaryPassword,
    authHeader: canaryBearer,
    session: {
      secret_key: 'canary-session-secret',
      body_enc: 'canary-encrypted-body-text',
    },
    nested: {
      token: canaryToken,
      innocentField: 'normal-log-message',
    },
  };

  const scrubbed = scrub(payloadWithCanaries);
  const jsonOutput = JSON.stringify(scrubbed);

  const leaked: string[] = [];

  if (jsonOutput.includes(canaryToken)) leaked.push('canaryToken');
  if (jsonOutput.includes(canaryBearer)) leaked.push('canaryBearer');
  if (jsonOutput.includes(canaryPassword)) leaked.push('canaryPassword');
  if (jsonOutput.includes('canary-session-secret')) leaked.push('canarySessionSecret');
  if (jsonOutput.includes('canary-encrypted-body-text')) leaked.push('canaryBodyEnc');

  return {
    passed: leaked.length === 0,
    leakedCanaries: leaked,
  };
}
