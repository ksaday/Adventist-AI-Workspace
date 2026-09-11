/**
 * Safety Screener (Component Architecture §2.6).
 *
 * Invariants:
 * 1. Runs client-side before transmission.
 * 2. Never returns or logs the matched text span (privacy).
 * 3. Non-blocking, matches against versioned risk lexicon.
 */

import riskEn from '../../../data/risk-lexicon/risk-lexicon.v1.en.json';
import riskKo from '../../../data/risk-lexicon/risk-lexicon.v1.ko.json';
import emergencyDir from '../../../data/emergency/emergency-directory.v1.json';

export type RiskCategory =
  | 'imminent_harm'
  | 'self_harm'
  | 'abuse'
  | 'violence'
  | 'medical_emergency';

export interface RiskMatch {
  category: RiskCategory;
  severity: 1 | 2 | 3;
  locale: string;
}

export interface EmergencyResource {
  region: string;
  category: string;
  name: string;
  contact: string;
  available: string;
  verifiedAt: string;
  verifiedBy: string;
  verificationMethod: string;
}

export function screenSafety(text: string, locales: string[] = ['en', 'ko']): RiskMatch[] {
  const normalized = text.toLowerCase();
  const matches: RiskMatch[] = [];

  if (locales.includes('en')) {
    for (const entry of riskEn.entries) {
      if (normalized.includes(entry.term.toLowerCase())) {
        matches.push({
          category: entry.category as RiskCategory,
          severity: entry.severity as 1 | 2 | 3,
          locale: 'en',
        });
      }
    }
  }

  if (locales.includes('ko')) {
    for (const entry of riskKo.entries) {
      if (normalized.includes(entry.term.toLowerCase())) {
        matches.push({
          category: entry.category as RiskCategory,
          severity: entry.severity as 1 | 2 | 3,
          locale: 'ko',
        });
      }
    }
  }

  return matches;
}

export function getEmergencyResources(category?: RiskCategory): EmergencyResource[] {
  if (!category) return emergencyDir.directory;
  return emergencyDir.directory.filter(r => r.category === category);
}
