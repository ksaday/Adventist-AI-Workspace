/**
 * Pre-pulpit Citation Checklist Evaluator (PR-P4-09 / UX §6.3 / ADR-0019 / ADR-0021).
 *
 * Invariants:
 * 1. Blocking rule: Any citation marked for verbatim public quotation sitting below E4
 *    (including E3, which is TEXT_CONSISTENT and not verified) strictly blocks "Mark Ready to Preach".
 * 2. Invariant 5: Applies to Scripture as well as EGW because zero Bible verse text is bundled.
 * 3. Resolutions:
 *    - Personal confirmation at official source (raising to E4 with actor and timestamp).
 *    - Paraphrase (unmarking verbatim quotation).
 */

import type { ChecklistCitation, ChecklistEvaluation, EvidenceLevel } from './types';

/**
 * Evaluates whether an outline is ready to preach based on its citation checklist.
 */
export function evaluateChecklist(citations: ChecklistCitation[]): ChecklistEvaluation {
  const blockingCitations = citations.filter(
    c => c.markedForVerbatimQuotation && c.evidenceLevel !== 'E4'
  );

  const totalVerbatim = citations.filter(c => c.markedForVerbatimQuotation).length;

  return {
    isReady: blockingCitations.length === 0,
    blockingCount: blockingCitations.length,
    totalVerbatimCount: totalVerbatim,
    blockingCitations,
  };
}

/**
 * Resolves a blocked citation through personal member/pastor attestation at official source (SR-6.4a / E4).
 */
export function attestCitation(
  citations: ChecklistCitation[],
  citationId: string,
  confirmedBy: string,
  officialUrl?: string
): ChecklistCitation[] {
  return citations.map(c => {
    if (c.id === citationId) {
      return {
        ...c,
        evidenceLevel: 'E4' as EvidenceLevel,
        confirmedBy,
        confirmedAt: new Date().toISOString(),
        officialUrl: officialUrl ?? c.officialUrl,
      };
    }
    return c;
  });
}

/**
 * Resolves a blocked citation by switching it to paraphrase (unmarking verbatim quotation).
 */
export function paraphraseCitation(
  citations: ChecklistCitation[],
  citationId: string
): ChecklistCitation[] {
  return citations.map(c => {
    if (c.id === citationId) {
      return {
        ...c,
        markedForVerbatimQuotation: false,
      };
    }
    return c;
  });
}

/**
 * Toggles whether a citation is marked for direct verbatim public quotation.
 */
export function toggleVerbatimQuotation(
  citations: ChecklistCitation[],
  citationId: string
): ChecklistCitation[] {
  return citations.map(c => {
    if (c.id === citationId) {
      return {
        ...c,
        markedForVerbatimQuotation: !c.markedForVerbatimQuotation,
      };
    }
    return c;
  });
}
