/**
 * Citation Validator Evaluation Benchmark (Testing Strategy §9 / Evaluation Strategy §1 Layer A).
 *
 * Runs the official labelled citation evaluation corpus against deterministic engines.
 * Validates PRD & Testing Strategy targets:
 * - Real Bible references: ≥99% VALID
 * - Fabricated Bible references: ≥98% correctly flagged
 * - Ordinary prose non-references: ≤2% false detection
 * - Real EGW citations: ≥97% matched
 * - Fabricated EGW titles: ≥95% flagged (TITLE_NOT_IN_CATALOGUE)
 * - Implausible EGW pages: ≥90% flagged (PAGE_IMPLAUSIBLE)
 */

import { describe, it, expect } from 'vitest';
import corpus from '../../data/evaluation/citation-corpus.v1.json';
import { detectBibleRefs } from '../../packages/citations/src/bible';
import { detectEgwCitations } from '../../packages/citations/src/egw';

describe('Citation Validator Evaluation Corpus (Testing Strategy §9)', () => {
  it('detects and validates real Bible references with >= 99% accuracy', () => {
    let validCount = 0;
    const total = corpus.realBibleRefs.length;

    for (const refText of corpus.realBibleRefs) {
      const detected = detectBibleRefs(refText);
      if (detected.length > 0 && detected.some(r => r.status === 'VALID')) {
        validCount++;
      }
    }

    const accuracy = (validCount / total) * 100;
    // Release gate target: >= 99%
    expect(accuracy).toBeGreaterThanOrEqual(99);
  });

  it('correctly flags fabricated Bible references with >= 98% detection', () => {
    let flaggedCount = 0;
    const total = corpus.fabricatedBibleRefs.length;

    for (const badRef of corpus.fabricatedBibleRefs) {
      const detected = detectBibleRefs(badRef);
      // Either flagged as invalid status OR not detected as valid 66-book canon reference
      const isFlagged =
        detected.length === 0 ||
        detected.some(r =>
          ['BOOK_UNKNOWN', 'CHAPTER_OUT_OF_RANGE', 'VERSE_OUT_OF_RANGE', 'RANGE_INVALID'].includes(
            r.status
          )
        );

      if (isFlagged) {
        flaggedCount++;
      }
    }

    const flagRate = (flaggedCount / total) * 100;
    // Release gate target: >= 98%
    expect(flagRate).toBeGreaterThanOrEqual(98);
  });

  it('keeps ordinary prose false positive detection <= 2%', () => {
    let falsePositiveCount = 0;
    const total = corpus.ordinaryProseNonRefs.length;

    for (const prose of corpus.ordinaryProseNonRefs) {
      const detected = detectBibleRefs(prose);
      const hasFalsePositive = detected.some(r => r.status === 'VALID');
      if (hasFalsePositive) {
        falsePositiveCount++;
      }
    }

    const falsePositiveRate = (falsePositiveCount / total) * 100;
    // Target: <= 2%
    expect(falsePositiveRate).toBeLessThanOrEqual(2);
  });

  it('matches real EGW citations with >= 97% accuracy', () => {
    let matchedCount = 0;
    const total = corpus.realEgwCitations.length;

    for (const citation of corpus.realEgwCitations) {
      const detected = detectEgwCitations(citation);
      const isMatched = detected.some(
        c => c.status === 'TITLE_MATCHED' || c.status === 'ABBREVIATION_MATCHED'
      );
      if (isMatched) {
        matchedCount++;
      }
    }

    const accuracy = (matchedCount / total) * 100;
    // Target: >= 97%
    expect(accuracy).toBeGreaterThanOrEqual(97);
  });

  it('flags fabricated EGW titles with >= 95% detection', () => {
    let flaggedCount = 0;
    const total = corpus.fabricatedEgwTitles.length;

    for (const fakeTitle of corpus.fabricatedEgwTitles) {
      const detected = detectEgwCitations(fakeTitle);
      // Fabricated title should either not match or be flagged as TITLE_NOT_IN_CATALOGUE
      const isFlagged =
        detected.length === 0 ||
        detected.every(c => c.status === 'TITLE_NOT_IN_CATALOGUE');

      if (isFlagged) {
        flaggedCount++;
      }
    }

    const flagRate = (flaggedCount / total) * 100;
    // Target: >= 95%
    expect(flagRate).toBeGreaterThanOrEqual(95);
  });

  it('flags real EGW titles with implausible pages with >= 90% detection', () => {
    let flaggedCount = 0;
    const total = corpus.implausibleEgwPages.length;

    for (const implausible of corpus.implausibleEgwPages) {
      const detected = detectEgwCitations(implausible);
      const isFlagged = detected.some(c => c.status === 'PAGE_IMPLAUSIBLE');
      if (isFlagged) {
        flaggedCount++;
      }
    }

    const flagRate = (flaggedCount / total) * 100;
    // Target: >= 90%
    expect(flagRate).toBeGreaterThanOrEqual(90);
  });
});
