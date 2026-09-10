import { describe, it, expect } from 'vitest';
import {
  detectBibleRefs,
  validateBibleRef,
  compareVerbatim,
} from '../../packages/citations/src/bible.js';
import {
  detectEgwCitations,
  validateEgwCitation,
} from '../../packages/citations/src/egw.js';

describe('Citation Validator Evaluation Set (Phase 3 Exit Criterion 2)', () => {
  describe('Bible Reference Validation Evaluation Set (Target: ≥98% flagged)', () => {
    const fabricatedBibleReferences = [
      '3 Hezekiah 4:12',
      'Gospel of Thomas 2:15',
      '1 Maccabees 1:1',
      'Enoch 14:8',
      'Tobit 3:5',
      'John 25:1', // John has 21 chapters
      'Genesis 1:99', // Gen 1 has 31 verses
      'Mark 17:1', // Mark has 16 chapters
      'Romans 17:5', // Romans has 16 chapters
      'Revelation 23:1', // Revelation has 22 chapters
      'Jude 2:1', // Jude has 1 chapter
      'Philemon 2:4', // Philemon has 1 chapter
      '2 John 2:1', // 2 John has 1 chapter
      '3 John 2:1', // 3 John has 1 chapter
      'Obadiah 2:1', // Obadiah has 1 chapter
      'Galatians 7:1', // Galatians has 6 chapters
      'Ephesians 7:1', // Ephesians has 6 chapters
      'Philippians 5:1', // Philippians has 4 chapters
      'Colossians 5:1', // Colossians has 4 chapters
      'Titus 4:1', // Titus has 3 chapters
      '다니엘서 15:1', // 다니엘 has 12 chapters
      '요한복음 30:5',
      '창세기 60:1',
      '출애굽기 50:1',
      '마태복음 35:1',
      '히브리서 15:1',
      '야고보서 7:1',
      '베드로전서 7:1',
      '베드로후서 5:1',
      '요한일서 7:1',
      '시편 160:1', // Psalms has 150
      '잠언 35:1',
      '전도서 15:1',
      '이사야 70:1',
      '예레미야 60:1',
      '사도행전 35:1',
      '고린도전서 20:1',
      '고린도후서 16:1',
      '데살로니가전서 7:1',
      '디모데전서 8:1',
      '디모데후서 6:1',
      '사무엘상 40:1',
      '열왕기상 30:1',
      '역대상 35:1',
      '에스라 15:1',
      '느헤미야 16:1',
      '에스더 15:1',
      '욥기 50:1',
      '호세아 16:1',
      '스가랴 16:1',
    ];

    it('flags ≥98% of fabricated Bible references as invalid/out of range', () => {
      let flaggedCount = 0;

      for (const sample of fabricatedBibleReferences) {
        const detected = detectBibleRefs(`As written in ${sample}, take heed.`);
        if (detected.length === 0) {
          // Unrecognized candidate was not treated as valid
          flaggedCount++;
        } else {
          const validated = validateBibleRef(detected[0]);
          if (validated.status !== 'VALID') {
            flaggedCount++;
          }
        }
      }

      const detectionRate = (flaggedCount / fabricatedBibleReferences.length) * 100;
      expect(detectionRate).toBeGreaterThanOrEqual(98.0);
    });

    it('correctly validates genuine Bible references in English and Korean', () => {
      const validSamples = [
        'John 3:16',
        'Genesis 1:1',
        'Romans 8:28',
        '요한복음 3:16',
        '창세기 1:1',
        '시편 23:1',
        '계 22:20',
        'Rev 22:20',
      ];

      for (const sample of validSamples) {
        const detected = detectBibleRefs(`Read ${sample} today.`);
        expect(detected.length).toBeGreaterThanOrEqual(1);
        expect(detected[0].status).toBe('VALID');
      }
    });

    it('INVARIANT 5: compareVerbatim ALWAYS returns UNAVAILABLE (no verse text bundled)', () => {
      const detected = detectBibleRefs('John 3:16')[0];
      const result = compareVerbatim(detected, 'For God so loved the world...');

      expect(result.result).toBe('UNAVAILABLE');
      expect(result.notice).toContain('No verse text is bundled or stored');
    });
  });

  describe('EGW Citation Validation Evaluation Set (Target: ≥95% flagged)', () => {
    const fabricatedEgwTitles = [
      'The Cosmic Conflict of Angels 45',
      'Visions of Glory 112',
      'The Lost Prophecies 88',
      'Whispers of Heaven 204',
      'Counsel on Air Travel 55',
      'Memories of Portland 32',
      'Letters to the Astronauts 19',
      'Steps to Peace in Modern Life 80',
      'The Secret Doctrine of Ellen 12',
      'Angelic Hierarchies Revealed 99',
      'The Midnight Cry Chronicles 140',
      'The Remnant Diet Book 22',
      'Apocryphal Insights 105',
      'Writings from Battle Creek Sanitarium 300',
      'Sermons in Australia vol 9 40',
      'Signs of Our Digital Times 77',
      'The Final Warning to Babylon 150',
      'Walking with the Pioneers 210',
      'Meditations on the Sanctuary Vault 66',
      'Reflections on Elmshaven Hills 84',
    ];

    it('flags ≥95% of fabricated EGW titles as not in catalogue or implausible', () => {
      let flaggedCount = 0;

      for (const sample of fabricatedEgwTitles) {
        const detected = detectEgwCitations(sample);
        if (detected.length === 0) {
          flaggedCount++;
        } else {
          const validated = validateEgwCitation(detected[0]);
          if (validated.status === 'TITLE_NOT_IN_CATALOGUE' || validated.status === 'PAGE_IMPLAUSIBLE') {
            flaggedCount++;
          }
        }
      }

      const detectionRate = (flaggedCount / fabricatedEgwTitles.length) * 100;
      expect(detectionRate).toBeGreaterThanOrEqual(95.0);
    });

    it('correctly matches valid EGW works and detects implausible pages', () => {
      // Valid Desire of Ages page
      const daValid = detectEgwCitations('The Desire of Ages, p. 250')[0];
      expect(daValid.status).toBe('TITLE_MATCHED');
      expect(daValid.workId).toBe('DA');

      // Implausible Steps to Christ page (SC has only 126 pages)
      const scImplausible = detectEgwCitations('Steps to Christ 950')[0];
      expect(scImplausible.status).toBe('PAGE_IMPLAUSIBLE');

      // Korean title match
      const koMatch = detectEgwCitations('시대의 소망 150')[0];
      expect(koMatch.status).toBe('TITLE_MATCHED');
      expect(koMatch.workId).toBe('DA');
    });
  });
});
