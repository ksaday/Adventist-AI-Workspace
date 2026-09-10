import { describe, it, expect } from 'vitest';
import {
  evaluateChecklist,
  attestCitation,
  paraphraseCitation,
  toggleVerbatimQuotation,
} from '../../packages/pastor/src/checklist';
import type { ChecklistCitation } from '../../packages/pastor/src/types';

describe('Pre-pulpit Citation Checklist Evaluator (Phase 6 / PR-P4-09 / Exit Criterion 1)', () => {
  it('blocks "Mark Ready" while any citation marked for verbatim quotation sits below E4', () => {
    const citations: ChecklistCitation[] = [
      {
        id: 'cit-1',
        reference: 'John 3:16',
        type: 'scripture',
        evidenceLevel: 'E1', // Model recall
        markedForVerbatimQuotation: true, // Marked for verbatim pulpit quotation
      },
      {
        id: 'cit-2',
        reference: 'Romans 5:1',
        type: 'scripture',
        evidenceLevel: 'E4', // Confirmed
        markedForVerbatimQuotation: true,
      },
    ];

    const result = evaluateChecklist(citations);
    expect(result.isReady).toBe(false);
    expect(result.blockingCount).toBe(1);
    expect(result.blockingCitations[0].id).toBe('cit-1');
  });

  it('Invariant 3 / ADR-0019: E3 (TEXT_CONSISTENT) is NOT verified and strictly BLOCKS verbatim quotations', () => {
    const citations: ChecklistCitation[] = [
      {
        id: 'cit-egw',
        reference: 'Desire of Ages, p. 331',
        type: 'egw',
        evidenceLevel: 'E3', // TEXT_CONSISTENT with member-supplied text
        markedForVerbatimQuotation: true, // Marked for verbatim pulpit quotation
      },
    ];

    // Under ADR-0019, E3 is TEXT_CONSISTENT, not verified. It must block verbatim public preaching.
    const result = evaluateChecklist(citations);
    expect(result.isReady).toBe(false);
    expect(result.blockingCount).toBe(1);
    expect(result.blockingCitations[0].evidenceLevel).toBe('E3');
  });

  it('resolves blocking through personal attestation at official source (raising to E4)', () => {
    const initialCitations: ChecklistCitation[] = [
      {
        id: 'cit-1',
        reference: 'Steps to Christ, p. 70',
        type: 'egw',
        evidenceLevel: 'E1',
        markedForVerbatimQuotation: true,
      },
    ];

    expect(evaluateChecklist(initialCitations).isReady).toBe(false);

    // Pastor personally checks the reference in the official EGW library
    const resolved = attestCitation(initialCitations, 'cit-1', 'Pastor John', 'https://m.egwwritings.org/...');
    const result = evaluateChecklist(resolved);

    expect(result.isReady).toBe(true);
    expect(result.blockingCount).toBe(0);
    expect(resolved[0].evidenceLevel).toBe('E4');
    expect(resolved[0].confirmedBy).toBe('Pastor John');
    expect(resolved[0].confirmedAt).toBeDefined();
  });

  it('resolves blocking through paraphrase (unmarking verbatim quotation)', () => {
    const initialCitations: ChecklistCitation[] = [
      {
        id: 'cit-1',
        reference: '2 Corinthians 12:9',
        type: 'scripture',
        evidenceLevel: 'E1',
        markedForVerbatimQuotation: true,
      },
    ];

    expect(evaluateChecklist(initialCitations).isReady).toBe(false);

    // Pastor decides to paraphrase the passage rather than quote verbatim from memory
    const resolved = paraphraseCitation(initialCitations, 'cit-1');
    const result = evaluateChecklist(resolved);

    expect(result.isReady).toBe(true);
    expect(result.blockingCount).toBe(0);
    expect(resolved[0].markedForVerbatimQuotation).toBe(false);
  });

  it('toggles verbatim quotation state correctly', () => {
    const citations: ChecklistCitation[] = [
      {
        id: 'cit-1',
        reference: 'Genesis 1:1',
        type: 'scripture',
        evidenceLevel: 'E1',
        markedForVerbatimQuotation: false,
      },
    ];

    const toggledOn = toggleVerbatimQuotation(citations, 'cit-1');
    expect(toggledOn[0].markedForVerbatimQuotation).toBe(true);

    const toggledOff = toggleVerbatimQuotation(toggledOn, 'cit-1');
    expect(toggledOff[0].markedForVerbatimQuotation).toBe(false);
  });
});
