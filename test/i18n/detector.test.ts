import { describe, it, expect } from 'vitest';
import { detectLanguage } from '../../packages/i18n/src/detector.js';

describe('Language Detector: Korean vs English (Phase 3)', () => {
  it('detects Korean input with high confidence', () => {
    const koreanText = '안식일 교리와 재림 신앙에 대해 질문하고 싶습니다.';
    const result = detectLanguage(koreanText);

    expect(result.detectedLocale).toBe('ko');
    expect(result.confidence).toBeGreaterThan(0.7);
  });

  it('detects English input with high confidence', () => {
    const englishText = 'Please provide a study on the investigative judgment and Daniel 8:14.';
    const result = detectLanguage(englishText);

    expect(result.detectedLocale).toBe('en');
    expect(result.confidence).toBeGreaterThan(0.7);
  });

  it('handles mixed language with dominance ratio', () => {
    const mixedKo = '로마서 8장 28절에 나타난 하나님의 providence(섭리)를 설명해주세요.';
    const result = detectLanguage(mixedKo);

    expect(result.detectedLocale).toBe('ko');
  });
});
