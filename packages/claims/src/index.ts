/**
 * Claim Block Parser (Component Architecture §2.4 / Prompt Architecture §3.5).
 *
 * Invariant: Total-failure semantics. A malformed block yields ok: false and triggers
 * the manual path; it NEVER yields a half-parsed ledger.
 */

export type ClaimType =
  | 'scripture'
  | 'egw'
  | 'historical'
  | 'doctrinal'
  | 'synthesis'
  | 'personal';

export interface ParsedClaim {
  index: number;
  text: string;
  type: ClaimType;
  assertedSource?: string;
  modelConfidence?: 'high' | 'medium' | 'low';
}

export type ParseResult =
  | { ok: true; claims: ParsedClaim[]; blockVersion: 'SDAWS-CLAIMS-V1' }
  | { ok: false; reason: 'BLOCK_ABSENT' | 'BLOCK_MALFORMED' | 'BLOCK_EMPTY'; detail: string };

const VALID_TYPES = new Set<ClaimType>([
  'scripture',
  'egw',
  'historical',
  'doctrinal',
  'synthesis',
  'personal',
]);

const VALID_CONFIDENCE = new Set(['high', 'medium', 'low']);

/**
 * Parses the SDAWS-CLAIMS-V1 fenced code block from an AI answer.
 */
export function parseClaimBlock(answerText: string): ParseResult {
  const blockRegex = /```SDAWS-CLAIMS-V1\s*([\s\S]*?)\s*```/;
  const match = blockRegex.exec(answerText);

  if (!match) {
    return {
      ok: false,
      reason: 'BLOCK_ABSENT',
      detail: 'The answer did not contain a valid ```SDAWS-CLAIMS-V1 code fence.',
    };
  }

  const rawLines = match[1]
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (rawLines.length === 0) {
    return {
      ok: false,
      reason: 'BLOCK_EMPTY',
      detail: 'The SDAWS-CLAIMS-V1 block contains no claim entries.',
    };
  }

  const claims: ParsedClaim[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    // Format: Cn | type | asserted-source | confidence | claim text
    const parts = line.split('|').map(p => p.trim());

    if (parts.length < 5) {
      return {
        ok: false,
        reason: 'BLOCK_MALFORMED',
        detail: `Line ${i + 1} has ${parts.length} fields instead of the required 5: "${line}"`,
      };
    }

    const claimId = parts[0]; // e.g. "C1"
    const typeStr = parts[1].toLowerCase() as ClaimType;
    const assertedSource = parts[2] === 'NONE' || parts[2] === 'UNKNOWN' ? undefined : parts[2];
    const confidence = parts[3].toLowerCase();
    const claimText = parts.slice(4).join('|').trim(); // in case claim text contains a pipe

    if (!/^C\d+$/i.test(claimId)) {
      return {
        ok: false,
        reason: 'BLOCK_MALFORMED',
        detail: `Line ${i + 1} has invalid claim ID "${claimId}". Must match "C1", "C2", etc.`,
      };
    }

    if (!VALID_TYPES.has(typeStr)) {
      return {
        ok: false,
        reason: 'BLOCK_MALFORMED',
        detail: `Line ${i + 1} has unrecognized claim type "${parts[1]}".`,
      };
    }

    if (!VALID_CONFIDENCE.has(confidence)) {
      return {
        ok: false,
        reason: 'BLOCK_MALFORMED',
        detail: `Line ${i + 1} has invalid confidence level "${parts[3]}". Must be high, medium, or low.`,
      };
    }

    if (!claimText) {
      return {
        ok: false,
        reason: 'BLOCK_MALFORMED',
        detail: `Line ${i + 1} has an empty claim text body.`,
      };
    }

    claims.push({
      index: i + 1,
      type: typeStr,
      assertedSource,
      modelConfidence: confidence as 'high' | 'medium' | 'low',
      text: claimText,
    });
  }

  return {
    ok: true,
    claims,
    blockVersion: 'SDAWS-CLAIMS-V1',
  };
}

/**
 * Fallback: splits text into candidate sentence segments for manual claim selection.
 */
export function suggestManualSegments(answerText: string): string[] {
  // Strip code blocks
  const cleanText = answerText.replace(/```[\s\S]*?```/g, '').trim();

  // Segment by sentence terminators (. ! ? or newline)
  return cleanText
    .split(/(?<=[.!?\n])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 10);
}
