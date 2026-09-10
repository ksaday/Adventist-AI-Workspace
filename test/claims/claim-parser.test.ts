import { describe, it, expect } from 'vitest';
import { parseClaimBlock, suggestManualSegments } from '../../packages/claims/src/index.js';

describe('Claim Block Parser: SDAWS-CLAIMS-V1 & Total Failure Semantics (Phase 3)', () => {
  const validAnswer = `
Here is an overview of the sanctuary service and atonement.

\`\`\`SDAWS-CLAIMS-V1
C1 | scripture | Leviticus 16:30 | high | On this day shall atonement be made for you to cleanse you.
C2 | egw | The Great Controversy, p. 421 | high | The sanctuary in heaven is the very center of Christ's work in behalf of men.
C3 | doctrinal | UNKNOWN | medium | The 2300 days ended in 1844.
C4 | synthesis | NONE | low | The typical service points forward to the antitypical reality.
\`\`\`
  `;

  it('successfully parses valid SDAWS-CLAIMS-V1 block with all claim types', () => {
    const result = parseClaimBlock(validAnswer);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.claims).toHaveLength(4);
      expect(result.claims[0].text).toContain('On this day shall atonement be made');
      expect(result.claims[0].type).toBe('scripture');
      expect(result.claims[0].assertedSource).toBe('Leviticus 16:30');
      expect(result.claims[1].type).toBe('egw');
      expect(result.claims[2].assertedSource).toBeUndefined(); // UNKNOWN is normalized to undefined
      expect(result.claims[3].assertedSource).toBeUndefined(); // NONE is normalized to undefined
    }
  });

  it('TOTAL FAILURE SEMANTICS: returns ok: false if block is absent', () => {
    const answerWithoutBlock = 'Here is a fluent answer with no claims fence.';
    const result = parseClaimBlock(answerWithoutBlock);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('BLOCK_ABSENT');
    }
  });

  it('TOTAL FAILURE SEMANTICS: malformed line yields total failure and never a half-parsed ledger', () => {
    const malformedAnswer = `
\`\`\`SDAWS-CLAIMS-V1
C1 | scripture | John 3:16 | high | Valid claim text
C2 | invalid_pipe_count
C3 | egw | DA 100 | high | Another valid text
\`\`\`
    `;

    const result = parseClaimBlock(malformedAnswer);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('BLOCK_MALFORMED');
      expect(result.detail).toContain('Line 2');
    }
  });

  it('suggests manual sentence segments when automatic parsing fails', () => {
    const plainText = 'The high priest entered the sanctuary once a year. This symbolized the final cleansing of sin. Christ is our mediator in heaven.';
    const segments = suggestManualSegments(plainText);

    expect(segments.length).toBeGreaterThanOrEqual(2);
    expect(segments[0]).toContain('The high priest entered');
  });
});
