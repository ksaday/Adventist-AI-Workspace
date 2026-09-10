/**
 * Verifier Output Parser & Merge Engine (Prompt Template Library §7 / Verification Architecture §7).
 *
 * Invariants:
 * 1. Total-failure parsing: Malformed block fails closed.
 * 2. Basis cross-check: Verifier claiming 'compared-to-supplied-text' without a source block
 *    is downgraded to E2 with an explanatory ledger note.
 * 3. NO AI output ever produces VERIFIED. Only member attestation at an official source can (E4).
 * 4. Model agreement -> E2 NOT_VERIFIED ("A second AI agreed, but no source text was present").
 * 5. Model disagreement -> E2 CONTRADICTED.
 * 6. Supplied text match -> E3 TEXT_CONSISTENT ("Consistent with text you supplied. We never saw that text and cannot confirm where it came from").
 */

import type {
  EvidenceLevel,
  ClaimStatus,
  VerifierBasis,
  ParsedVerificationItem,
} from './types';

export interface ParseVerifierResult {
  ok: boolean;
  items: ParsedVerificationItem[];
  error?: string;
  reason?: 'BLOCK_ABSENT' | 'BLOCK_EMPTY' | 'BLOCK_MALFORMED';
}

export interface MergeResult {
  claimIndex: number;
  newLevel: EvidenceLevel;
  newStatus: ClaimStatus;
  note: string;
}

const VALID_STATUSES = new Set([
  'VERIFIED',
  'PARTIALLY_VERIFIED',
  'NOT_VERIFIED',
  'CONTRADICTED',
  'INSUFFICIENT_EVIDENCE',
]);

const VALID_BASES = new Set<string>([
  'compared-to-supplied-text',
  'consulted-source-in-this-conversation',
  'recall-only',
  'no-source-access',
  'supplied-text', // permissible alias
]);

/**
 * Parses the SDAWS-VERIFY-V1 fenced code block.
 */
export function parseVerifierBlock(answerText: string): ParseVerifierResult {
  const blockRegex = /```SDAWS-VERIFY-V1\s*([\s\S]*?)\s*```/;
  const match = blockRegex.exec(answerText);

  if (!match) {
    return {
      ok: false,
      items: [],
      reason: 'BLOCK_ABSENT',
      error: 'The verifier response did not contain a valid ```SDAWS-VERIFY-V1 code block.',
    };
  }

  const lines = match[1]
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (lines.length === 0) {
    return {
      ok: false,
      items: [],
      reason: 'BLOCK_EMPTY',
      error: 'The SDAWS-VERIFY-V1 block contains no verification items.',
    };
  }

  const items: ParsedVerificationItem[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Format: Cn | status | basis | explanation
    const parts = line.split('|').map(p => p.trim());

    if (parts.length < 4) {
      return {
        ok: false,
        items: [],
        reason: 'BLOCK_MALFORMED',
        error: `Line ${i + 1} has ${parts.length} fields instead of required 4: "${line}"`,
      };
    }

    const idPart = parts[0];
    const statusPart = parts[1].toUpperCase();
    const basisPart = parts[2].toLowerCase();
    const explanation = parts.slice(3).join('|').trim();

    const idMatch = /^C(\d+)$/i.exec(idPart);
    if (!idMatch) {
      return {
        ok: false,
        items: [],
        reason: 'BLOCK_MALFORMED',
        error: `Line ${i + 1} has invalid claim ID "${idPart}". Expected format "C1", "C2", etc.`,
      };
    }

    if (!VALID_STATUSES.has(statusPart)) {
      return {
        ok: false,
        items: [],
        reason: 'BLOCK_MALFORMED',
        error: `Line ${i + 1} has unrecognized status "${parts[1]}".`,
      };
    }

    if (!VALID_BASES.has(basisPart)) {
      return {
        ok: false,
        items: [],
        reason: 'BLOCK_MALFORMED',
        error: `Line ${i + 1} has unrecognized basis "${parts[2]}".`,
      };
    }

    items.push({
      claimIndex: parseInt(idMatch[1], 10),
      status: statusPart as ParsedVerificationItem['status'],
      basis: basisPart as VerifierBasis,
      explanation,
    });
  }

  return {
    ok: true,
    items,
  };
}

/**
 * Merges a parsed verifier result against the product's evidence ladder rules (Verification Architecture §7).
 *
 * Enforces:
 * - NO AI output ever produces VERIFIED or green.
 * - Cross-checks basis against hasSuppliedSource: if verifier claims compared-to-supplied-text
 *   but no source text exists in this conversation, it is downgraded to E2.
 */
export function mergeVerifierItem(
  item: ParsedVerificationItem,
  hasSuppliedSource: boolean
): MergeResult {
  const claimsSourceComparison =
    item.basis === 'compared-to-supplied-text' ||
    item.basis === 'consulted-source-in-this-conversation' ||
    item.basis === ('supplied-text' as VerifierBasis);

  // Case 1: Verifier claims CONTRADICTED
  if (item.status === 'CONTRADICTED') {
    return {
      claimIndex: item.claimIndex,
      newLevel: hasSuppliedSource && claimsSourceComparison ? 'E3' : 'E2',
      newStatus: 'CONTRADICTED',
      note: item.explanation || 'A verifier model identified a contradiction.',
    };
  }

  // Case 2: Verifier claims VERIFIED or PARTIALLY_VERIFIED
  if (item.status === 'VERIFIED' || item.status === 'PARTIALLY_VERIFIED') {
    // Cross-check: Did member supply source text in this session?
    if (hasSuppliedSource && claimsSourceComparison) {
      // E3: TEXT_CONSISTENT (NOT VERIFIED! NOT green!)
      return {
        claimIndex: item.claimIndex,
        newLevel: 'E3',
        newStatus: 'TEXT_CONSISTENT',
        note: 'Consistent with text you supplied. We never saw that text and cannot confirm where it came from.',
      };
    }

    // No source text present: downgrade to E2 NOT_VERIFIED (or flag inaccurate verifier basis)
    const downgradeNote = !hasSuppliedSource && claimsSourceComparison
      ? 'A second AI claimed to compare against source text, but our server records show no source text was supplied in this conversation. Treated as model recall (E2).'
      : 'A second AI agreed, but no source text was present. Model corroboration leaves status NOT_VERIFIED (E2).';

    return {
      claimIndex: item.claimIndex,
      newLevel: 'E2',
      newStatus: 'NOT_VERIFIED',
      note: downgradeNote,
    };
  }

  // Case 3: Verifier claims INSUFFICIENT_EVIDENCE
  if (item.status === 'INSUFFICIENT_EVIDENCE') {
    return {
      claimIndex: item.claimIndex,
      newLevel: 'E2',
      newStatus: 'INSUFFICIENT_EVIDENCE',
      note: item.explanation || 'The verifier reported insufficient evidence to evaluate this claim.',
    };
  }

  // Default: NOT_VERIFIED at E2
  return {
    claimIndex: item.claimIndex,
    newLevel: 'E2',
    newStatus: 'NOT_VERIFIED',
    note: item.explanation || 'A second AI evaluated this claim; status remains NOT_VERIFIED.',
  };
}
