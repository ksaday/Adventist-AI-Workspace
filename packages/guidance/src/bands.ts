/**
 * Five-Band Answer Parser (PR-P3-02, PR-P3-05 / UX §6.2 / Template Library §5.1).
 *
 * Invariants:
 * 1. Segments external AI reply into 5 labelled bands:
 *    - Band 1: What you have told me (situation restatement)
 *    - Band 2: Scripture (relevant biblical passages)
 *    - Band 3: Ellen G. White (supplied text or marked recall)
 *    - Band 4: Reflection (AI synthesis marked as reasoning)
 *    - Band 5: What remains uncertain (unresolved questions, differences of view)
 * 2. Band 5 is mandatory. If absent or empty, missingBand5 is flagged true.
 * 3. Extracts and parses ```SDAWS-CLAIMS-V1 claim blocks.
 */

import { parseClaimBlock, type ParsedClaim } from '../../claims/src/index';
import type { FiveBandAnswer } from './types';

interface BandPattern {
  band: 1 | 2 | 3 | 4 | 5;
  regex: RegExp;
}

const BAND_PATTERNS: BandPattern[] = [
  {
    band: 1,
    regex: /(?:^|\n)(?:#{1,4}\s*|\*{0,2})?(?:1\.|\[1\]|Band\s*1:?)\s*(?:WHAT\s+YOU\s+(?:HAVE\s+)?TOLD\s+ME|USER\s+SITUATION|말씀해\s*주신\s*내용|내가\s*들은\s*내용|상황\s*요약)(?:\*{0,2}|:)?/i,
  },
  {
    band: 2,
    regex: /(?:^|\n)(?:#{1,4}\s*|\*{0,2})?(?:2\.|\[2\]|Band\s*2:?)\s*(?:SCRIPTURE|BIBLE\s+PASSAGES|성경\s*말씀|성경)(?:\*{0,2}|:)?/i,
  },
  {
    band: 3,
    regex: /(?:^|\n)(?:#{1,4}\s*|\*{0,2})?(?:3\.|\[3\]|Band\s*3:?)\s*(?:ELLEN\s*G\.?\s*WHITE|EGW(?:\s+MATERIAL)?|엘렌\s*G\.?\s*화잇|화잇\s*부인|예언의\s*신)(?:\*{0,2}|:)?/i,
  },
  {
    band: 4,
    regex: /(?:^|\n)(?:#{1,4}\s*|\*{0,2})?(?:4\.|\[4\]|Band\s*4:?)\s*(?:REFLECTION|AI\s+SYNTHESIS|SYNTHESIS|성찰\s*(?:및\s*묵상)?|AI\s*종합|신학적\s*고찰)(?:\*{0,2}|:)?/i,
  },
  {
    band: 5,
    regex: /(?:^|\n)(?:#{1,4}\s*|\*{0,2})?(?:5\.|\[5\]|Band\s*5:?)\s*(?:WHAT\s+REMAINS\s+UNCERTAIN|UNCERTAINTIES|POINTS\s+OF\s+DIFFERENCE|여전히\s*확실하지\s*않은\s*것|불확실한\s*점|미해결\s*질문)(?:\*{0,2}|:)?/i,
  },
];

/**
 * Parses raw external AI output into the 5 structured bands.
 */
export function parseFiveBandAnswer(rawText: string): FiveBandAnswer {
  // Strip claims block from body before parsing bands
  const claimsFenceRegex = /```SDAWS-CLAIMS-V1[\s\S]*?```/;
  const claimsMatch = claimsFenceRegex.exec(rawText);
  const claimsBlock = claimsMatch ? claimsMatch[0] : undefined;
  const contentWithoutClaims = rawText.replace(claimsFenceRegex, '').trim();

  // Find occurrences of band headers
  interface MatchPos {
    band: 1 | 2 | 3 | 4 | 5;
    index: number;
    headerLength: number;
  }

  const matches: MatchPos[] = [];
  for (const p of BAND_PATTERNS) {
    const m = p.regex.exec(contentWithoutClaims);
    if (m && m.index !== undefined) {
      matches.push({
        band: p.band,
        index: m.index,
        headerLength: m[0].length,
      });
    }
  }

  matches.sort((a, b) => a.index - b.index);

  const bands: Record<1 | 2 | 3 | 4 | 5, string> = {
    1: '',
    2: '',
    3: '',
    4: '',
    5: '',
  };

  if (matches.length > 0) {
    for (let i = 0; i < matches.length; i++) {
      const current = matches[i];
      const start = current.index + current.headerLength;
      const end = i + 1 < matches.length ? matches[i + 1].index : contentWithoutClaims.length;
      bands[current.band] = contentWithoutClaims.slice(start, end).trim();
    }
  } else {
    // If no band structure was recognized, put everything into band 4 (Reflection)
    bands[4] = contentWithoutClaims;
  }

  // Parse claims if present
  let parsedClaims: Array<{ id: string; type: string; source: string; confidence: string; text: string }> | undefined;
  if (claimsBlock) {
    const claimRes = parseClaimBlock(claimsBlock);
    if (claimRes.ok) {
      parsedClaims = claimRes.claims.map((c: ParsedClaim) => ({
        id: `C${c.index}`,
        type: c.type,
        source: c.assertedSource ?? 'NONE',
        confidence: c.modelConfidence ?? 'medium',
        text: c.text,
      }));
    }
  }

  const missingBand5 = bands[5].trim().length < 5;

  return {
    band1UserSituation: bands[1],
    band2Scripture: bands[2],
    band3Egw: bands[3],
    band4Reflection: bands[4],
    band5Uncertain: bands[5],
    rawText,
    missingBand5,
    claimsBlock,
    parsedClaims,
  };
}
