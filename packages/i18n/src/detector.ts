/**
 * Language Detector for SDA AI Workspace (Component Architecture §2).
 *
 * Distinguishes Korean ('ko') from English ('en') with confidence scoring.
 */

export interface LanguageDetectionResult {
  detectedLocale: 'en' | 'ko';
  confidence: number;
}

/**
 * Detects whether the input text is primarily Korean or English.
 */
export function detectLanguage(text: string): LanguageDetectionResult {
  if (!text || text.trim().length === 0) {
    return { detectedLocale: 'en', confidence: 0.5 };
  }

  // Count Hangul syllables (AC00-D7AF) and Jamo (1100-11FF, 3130-318F)
  const hangulMatches = text.match(/[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/g) || [];
  const latinMatches = text.match(/[a-zA-Z]/g) || [];

  const hangulCount = hangulMatches.length;
  const latinCount = latinMatches.length;
  const totalLetters = hangulCount + latinCount;

  if (totalLetters === 0) {
    return { detectedLocale: 'en', confidence: 0.5 };
  }

  if (hangulCount > latinCount) {
    const ratio = hangulCount / totalLetters;
    return {
      detectedLocale: 'ko',
      confidence: Math.min(1.0, 0.5 + ratio * 0.5),
    };
  }

  const ratio = latinCount / totalLetters;
  return {
    detectedLocale: 'en',
    confidence: Math.min(1.0, 0.5 + ratio * 0.5),
  };
}
