/**
 * Bible Citation Engine (Component Architecture §2.2).
 *
 * Implements:
 * 1. Bible reference detection across English and Korean.
 * 2. Canon validation against Protestant 66-book index.
 * 3. Invariant 5 / ADR-0021 / SR-5.8: compareVerbatim ALWAYS returns UNAVAILABLE
 *    because no verse text is bundled.
 */

import bibleCanon from '../../../data/canon/bible-canon.v1.json';

export type RefStatus =
  | 'VALID'
  | 'BOOK_UNKNOWN'
  | 'CHAPTER_OUT_OF_RANGE'
  | 'VERSE_OUT_OF_RANGE'
  | 'RANGE_INVALID'
  | 'UNPARSEABLE';

export interface BibleRef {
  raw: string;
  offset: number;
  length: number;
  bookId?: string;
  chapter?: number;
  verseStart?: number;
  verseEnd?: number;
  status: RefStatus;
  canonicalEn: string;
  canonicalLocalised: string;
}

interface CanonBook {
  id: string;
  nameEn: string;
  abbreviationsEn: string[];
  nameKo: string;
  abbreviationsKo: string[];
  chapters: number;
  maxVersesPerChapter: number;
}

const CANON_BOOKS: CanonBook[] = bibleCanon.books;

/**
 * Builds a fast lookup map from name/abbreviation to CanonBook.
 */
function buildLookupMap(): Map<string, CanonBook> {
  const map = new Map<string, CanonBook>();
  for (const book of CANON_BOOKS) {
    map.set(book.id.toLowerCase(), book);
    map.set(book.nameEn.toLowerCase(), book);
    for (const abbr of book.abbreviationsEn) {
      map.set(abbr.toLowerCase(), book);
    }
    map.set(book.nameKo.toLowerCase(), book);
    if (
      !book.nameKo.endsWith('서') &&
      !book.nameKo.endsWith('기') &&
      !book.nameKo.endsWith('복음') &&
      !book.nameKo.endsWith('전') &&
      !book.nameKo.endsWith('시편')
    ) {
      map.set(`${book.nameKo}서`.toLowerCase(), book);
    }
    for (const abbr of book.abbreviationsKo) {
      map.set(abbr.toLowerCase(), book);
    }
  }
  return map;
}

const BOOK_LOOKUP = buildLookupMap();

/**
 * Detects Bible references in text (English & Korean).
 * Matches patterns like "John 3:16", "Genesis 1:1-3", "요한복음 3:16", "창 1:1".
 */
export function detectBibleRefs(text: string): BibleRef[] {
  const results: BibleRef[] = [];

  // Regex matching [Book Name/Abbr] [Chapter]:[VerseStart](-[VerseEnd])?
  // Handles multi-word English books (e.g. Song of Solomon), numbered books (e.g. 1 Corinthians, 1 Maccabees, 3 Hezekiah),
  // apocryphal candidates (e.g. Gospel of Thomas), and Korean (e.g. 요한복음 3:16, 계 22:20, 다니엘서 15:1)
  const pattern =
    /((?:Song\s+of\s+Solomon|Song\s+of\s+Songs|Gospel\s+of\s+[a-zA-Z]+|(?:[1-3]\s+)?[a-zA-Z가-힣]+))\s*(\d+)[:：](\d+)(?:[-~](\d+))?/g;

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const raw = match[0];
    const bookToken = match[1].trim().toLowerCase();
    const chapter = parseInt(match[2], 10);
    const verseStart = parseInt(match[3], 10);
    const verseEnd = match[4] ? parseInt(match[4], 10) : undefined;

    const book = BOOK_LOOKUP.get(bookToken);

    let status: RefStatus = 'VALID';
    let canonicalEn = 'Unknown';
    let canonicalLocalised = '미확인';

    if (!book) {
      status = 'BOOK_UNKNOWN';
    } else {
      canonicalEn = `${book.nameEn} ${chapter}:${verseStart}${verseEnd ? `-${verseEnd}` : ''}`;
      canonicalLocalised = `${book.nameKo} ${chapter}:${verseStart}${verseEnd ? `-${verseEnd}` : ''}`;

      if (chapter < 1 || chapter > book.chapters) {
        status = 'CHAPTER_OUT_OF_RANGE';
      } else if (verseStart < 1 || verseStart > book.maxVersesPerChapter) {
        status = 'VERSE_OUT_OF_RANGE';
      } else if (verseEnd !== undefined && verseEnd < verseStart) {
        status = 'RANGE_INVALID';
      } else if (verseEnd !== undefined && verseEnd > book.maxVersesPerChapter) {
        status = 'VERSE_OUT_OF_RANGE';
      }
    }

    results.push({
      raw,
      offset: match.index,
      length: raw.length,
      bookId: book?.id,
      chapter,
      verseStart,
      verseEnd,
      status,
      canonicalEn,
      canonicalLocalised,
    });
  }

  return results;
}

/**
 * Validates a single Bible reference object against the canon index.
 */
export function validateBibleRef(ref: BibleRef): BibleRef {
  if (!ref.bookId) {
    return { ...ref, status: 'BOOK_UNKNOWN' };
  }

  const book = CANON_BOOKS.find(b => b.id === ref.bookId);
  if (!book) {
    return { ...ref, status: 'BOOK_UNKNOWN' };
  }

  if (!ref.chapter || ref.chapter < 1 || ref.chapter > book.chapters) {
    return { ...ref, status: 'CHAPTER_OUT_OF_RANGE' };
  }

  if (!ref.verseStart || ref.verseStart < 1 || ref.verseStart > book.maxVersesPerChapter) {
    return { ...ref, status: 'VERSE_OUT_OF_RANGE' };
  }

  if (ref.verseEnd !== undefined && ref.verseEnd < ref.verseStart) {
    return { ...ref, status: 'RANGE_INVALID' };
  }

  return { ...ref, status: 'VALID' };
}

/**
 * Invariant 5 / ADR-0021 / SR-5.8:
 * No Bible verse text is bundled in any translation.
 * Therefore verbatim comparison ALWAYS returns 'UNAVAILABLE'.
 */
export function compareVerbatim(
  _ref: BibleRef,
  _quoted: string
): { result: 'UNAVAILABLE'; notice: string } {
  return {
    result: 'UNAVAILABLE',
    notice: 'No verse text is bundled or stored. Please verify against an official Bible reader.',
  };
}
