/**
 * Ellen G. White Citation Normalisation & Validation Engine (Component Architecture §2.3).
 *
 * Invariants:
 * 1. Works against metadata-only catalogue (no EGW text corpus).
 * 2. TITLE_NOT_IN_CATALOGUE renders as "not found in our catalogue", never "does not exist".
 * 3. Page plausibility: page > referenceEdition.pageCount => PAGE_IMPLAUSIBLE.
 * 4. Fuzzy title suggestions (edit distance <= 2) offer suggestions, NEVER rewrite silently.
 */

import egwCatalogue from '../../../data/egw-catalogue/egw-works.v1.json';

export type EgwStatus =
  | 'TITLE_MATCHED'
  | 'ABBREVIATION_MATCHED'
  | 'TITLE_NOT_IN_CATALOGUE'
  | 'PAGE_IMPLAUSIBLE'
  | 'PAGE_UNKNOWN';

export interface EgwCitation {
  raw: string;
  offset: number;
  length: number;
  workId?: string;
  canonicalTitle?: string;
  page?: number;
  status: EgwStatus;
  officialUrl?: string;
  suggestion?: string; // Fuzzy match suggestion, never silently applied
}

interface CatalogueEntry {
  workId: string;
  canonicalTitle: string;
  abbreviations: string[];
  referenceEdition: {
    year: number;
    pageCount: number;
  };
  officialUrlTemplate: string;
  localisedTitles?: Record<string, string>;
}

const CATALOGUE_ENTRIES: CatalogueEntry[] = egwCatalogue.works;

/**
 * Standard Levenshtein distance for fuzzy suggestion.
 */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1].toLowerCase() === b[j - 1].toLowerCase()) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

interface SearchCandidate {
  phrase: string;
  isAbbr: boolean;
  work: CatalogueEntry;
}

function getSearchCandidates(): SearchCandidate[] {
  const candidates: SearchCandidate[] = [];

  for (const work of CATALOGUE_ENTRIES) {
    // Canonical title
    candidates.push({ phrase: work.canonicalTitle, isAbbr: false, work });
    // Title without leading "The "
    if (work.canonicalTitle.startsWith('The ')) {
      candidates.push({ phrase: work.canonicalTitle.slice(4), isAbbr: false, work });
    }
    // Localised Korean title
    if (work.localisedTitles?.ko) {
      candidates.push({ phrase: work.localisedTitles.ko, isAbbr: false, work });
    }
    // Abbreviations
    for (const abbr of work.abbreviations) {
      candidates.push({ phrase: abbr, isAbbr: true, work });
    }
  }

  // Sort longest first to prioritize longer title phrases over short abbreviations
  candidates.sort((a, b) => b.phrase.length - a.phrase.length);
  return candidates;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Detects potential EGW citations in text.
 * Matches patterns like "DA 123", "Steps to Christ, p. 45", "시대의 소망 250", "GC 650".
 */
export function detectEgwCitations(text: string): EgwCitation[] {
  const results: EgwCitation[] = [];
  const candidates = getSearchCandidates();
  const occupiedRanges: [number, number][] = [];

  // Match known catalogue entries (titles, abbreviations, Korean names) followed by page
  for (const candidate of candidates) {
    const escaped = escapeRegex(candidate.phrase);
    // Boundary check: not preceded/followed by letters/numbers/hangul
    // Page separator: optional comma, optional p./page., followed by 1-4 digits
    const pattern = new RegExp(
      `(?<![a-zA-Z0-9가-힣])${escaped}(?![a-zA-Z0-9가-힣])(?:\\s*,\\s*(?:(?:p\\.|page)\\s*)?|\\s+(?:(?:p\\.|page)\\s*)?)(\\d{1,4})\\b`,
      'gi'
    );

    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const raw = match[0];
      const matchStart = match.index;
      const matchEnd = matchStart + raw.length;

      // Skip if it overlaps with an existing longer match
      if (occupiedRanges.some(([s, e]) => matchStart < e && matchEnd > s)) {
        continue;
      }

      // Skip if followed immediately by colon (looks like Bible verse, e.g. "사도행전 1:8")
      if (text.slice(matchEnd, matchEnd + 2).startsWith(':')) {
        continue;
      }

      const page = parseInt(match[1], 10);
      let status: EgwStatus = candidate.isAbbr ? 'ABBREVIATION_MATCHED' : 'TITLE_MATCHED';
      if (page > candidate.work.referenceEdition.pageCount) {
        status = 'PAGE_IMPLAUSIBLE';
      }

      const officialUrl = candidate.work.officialUrlTemplate.replace('{page}', String(page));

      occupiedRanges.push([matchStart, matchEnd]);
      results.push({
        raw,
        offset: matchStart,
        length: raw.length,
        workId: candidate.work.workId,
        canonicalTitle: candidate.work.canonicalTitle,
        page,
        status,
        officialUrl,
      });
    }
  }

  // Check fuzzy matching for titles with typos (edit distance <= 2)
  const generalPattern =
    /([A-Z가-힣][a-zA-Z가-힣\s,']+?)(?:\s*,\s*(?:(?:p\.|page)\s*)?|\s+(?:(?:p\.|page)\s*)?)(\d{1,4})\b/g;
  let generalMatch: RegExpExecArray | null;
  while ((generalMatch = generalPattern.exec(text)) !== null) {
    const raw = generalMatch[0];
    const matchStart = generalMatch.index;
    const matchEnd = matchStart + raw.length;

    if (occupiedRanges.some(([s, e]) => matchStart < e && matchEnd > s)) {
      continue;
    }

    const candidateTitle = generalMatch[1].trim();
    const page = parseInt(generalMatch[2], 10);

    for (const work of CATALOGUE_ENTRIES) {
      if (levenshtein(candidateTitle, work.canonicalTitle) <= 2) {
        occupiedRanges.push([matchStart, matchEnd]);
        results.push({
          raw,
          offset: matchStart,
          length: raw.length,
          status: 'TITLE_NOT_IN_CATALOGUE',
          suggestion: work.canonicalTitle,
          page,
        });
        break;
      }
    }
  }

  // Return results sorted by offset
  results.sort((a, b) => a.offset - b.offset);
  return results;
}

/**
 * Validates an existing EgwCitation object.
 */
export function validateEgwCitation(c: EgwCitation): EgwCitation {
  const work = CATALOGUE_ENTRIES.find(
    w => w.workId === c.workId || w.canonicalTitle.toLowerCase() === c.canonicalTitle?.toLowerCase()
  );
  if (!work) {
    return { ...c, status: 'TITLE_NOT_IN_CATALOGUE' };
  }

  if (c.page !== undefined && c.page > work.referenceEdition.pageCount) {
    return { ...c, status: 'PAGE_IMPLAUSIBLE' };
  }

  const isAbbr =
    c.status === 'ABBREVIATION_MATCHED' ||
    work.abbreviations.some(a => a.toLowerCase() === c.raw.split(/[\s,]/)[0].toLowerCase());

  return { ...c, status: isAbbr ? 'ABBREVIATION_MATCHED' : 'TITLE_MATCHED' };
}
