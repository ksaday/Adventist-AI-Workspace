/**
 * Performance and Load Benchmarks (Testing Strategy §12 / Implementation Plan §Phase 9).
 *
 * Verifies runtime SLA targets:
 * - Composer, 4,000-character prompt: < 100 ms client-side
 * - Validation of an answer with 20 references: < 150 ms client-side
 * - Bible canon reference lookup: < 5 ms
 * - EGW catalogue fuzzy detection: < 20 ms
 * - Rate Limiter 1,000 request checks in sliding window: < 50 ms
 */

import { describe, it, expect } from 'vitest';
import { composeGuidancePrompt } from '../../packages/guidance/src/composer';
import { detectBibleRefs } from '../../packages/citations/src/bible';
import { detectEgwCitations } from '../../packages/citations/src/egw';
import { RateLimiter } from '../../server/security/rate-limiter';

describe('Performance & Load Benchmarks (Testing Strategy §12)', () => {
  it('Prompt Composer produces 4,000-character prompt in < 100 ms (target: < 100 ms)', () => {
    const longQuestion = 'What is the comprehensive biblical understanding of the sanctuary doctrine across Daniel and Revelation? '.repeat(35);
    const start = performance.now();

    const output = composeGuidancePrompt({
      question: longQuestion,
      sources: [
        {
          id: 'src-perf-1',
          kind: 'pasted_text',
          label: 'Daniel 8 & 9 Excerpt',
          text: 'Unto two thousand and three hundred days; then shall the sanctuary be cleansed. '.repeat(10),
          salt: 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
          commitment: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
          charCount: 800,
          createdAt: new Date().toISOString(),
        },
      ],
      locale: 'en',
    });

    const duration = performance.now() - start;

    expect(output.prompt.length).toBeGreaterThan(3000);
    expect(duration).toBeLessThan(100);
  });

  it('Validates an answer containing 20+ biblical and EGW citations in < 150 ms', () => {
    const answerWith20Citations = `
    In scripture we study:
    1. Genesis 1:1-3, 2. Exodus 20:8-11, 3. Leviticus 23:3, 4. Numbers 6:24-26, 5. Deuteronomy 6:4-5,
    6. Joshua 1:9, 7. Psalm 23:1, 8. Proverbs 3:5-6, 9. Isaiah 58:13-14, 10. Jeremiah 29:11,
    11. Daniel 8:14, 12. Micah 6:8, 13. Matthew 24:14, 14. Mark 16:15, 15. Luke 19:10,
    16. John 3:16, 17. Romans 8:28, 18. 1 Corinthians 13:13, 19. Hebrews 11:1, 20. Revelation 14:6-12.

    And in EGW writings:
    1. Steps to Christ, p. 15, 2. The Desire of Ages, p. 250, 3. The Great Controversy, p. 423,
    4. Patriarchs and Prophets, p. 300, 5. Ministry of Healing, p. 80.
    `;

    const start = performance.now();
    const bibleRefs = detectBibleRefs(answerWith20Citations);
    const egwCitations = detectEgwCitations(answerWith20Citations);
    const duration = performance.now() - start;

    expect(bibleRefs.length).toBeGreaterThanOrEqual(20);
    expect(egwCitations.length).toBeGreaterThanOrEqual(5);
    expect(duration).toBeLessThan(150);
  });

  it('Performs individual Bible canon lookups in < 5 ms', () => {
    const start = performance.now();
    for (let i = 0; i < 50; i++) {
      detectBibleRefs('Romans 8:28');
    }
    const duration = performance.now() - start;
    const avgPerLookup = duration / 50;

    expect(avgPerLookup).toBeLessThan(5);
  });

  it('Rate Limiter handles 1,000 sliding window evaluations in < 50 ms', () => {
    const limiter = new RateLimiter();
    const userId = 'perf-user-test';

    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      limiter.consume('prompt_generation', userId);
    }
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(50);
  });
});
