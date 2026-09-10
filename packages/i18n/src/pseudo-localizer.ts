/**
 * Pseudo-Localisation Engine (Phase 2 deliverable / Exit Criterion).
 *
 * Converts strings into accented glyphs with brackets and ~30% expansion
 * to reveal hardcoded raw strings and text truncation/overflow issues.
 */

const CHAR_MAP: Record<string, string> = {
  a: 'á',
  b: 'ḅ',
  c: 'ç',
  d: 'ḍ',
  e: 'é',
  f: 'ƒ',
  g: 'ĝ',
  h: 'ĥ',
  i: 'í',
  j: 'ĵ',
  k: 'ḳ',
  l: 'ļ',
  m: 'ɱ',
  n: 'ñ',
  o: 'ó',
  p: 'ƥ',
  q: 'ʠ',
  r: 'ř',
  s: 'š',
  t: 'ţ',
  u: 'ú',
  v: 'ṽ',
  w: 'ŵ',
  x: 'ẋ',
  y: 'ý',
  z: 'ž',
  A: 'Á',
  B: 'Ḅ',
  C: 'Ç',
  D: 'Ḍ',
  E: 'É',
  F: 'Ƒ',
  G: 'Ĝ',
  H: 'Ĥ',
  I: 'Í',
  J: 'Ĵ',
  K: 'Ḳ',
  L: 'Ļ',
  M: 'Ṃ',
  N: 'Ñ',
  O: 'Ó',
  P: 'Ƥ',
  Q: 'Ǫ',
  R: 'Ř',
  S: 'Š',
  T: 'Ţ',
  U: 'Ú',
  V: 'Ṽ',
  W: 'Ŵ',
  X: 'Ẋ',
  Y: 'Ý',
  Z: 'Ž',
};

/**
 * Transforms an input text string into a pseudo-localized version.
 * Skips placeholders like `{locale}`, `{provider}`.
 */
export function pseudoLocalize(text: string): string {
  const parts = text.split(/(\{[a-zA-Z0-9_]+\})/g);

  const transformed = parts
    .map(part => {
      if (part.startsWith('{') && part.endsWith('}')) {
        return part; // keep placeholder intact
      }
      return part
        .split('')
        .map(char => CHAR_MAP[char] ?? char)
        .join('');
    })
    .join('');

  return `[!!! ${transformed} !!!]`;
}

/**
 * Checks whether a rendered string originates from the pseudo-localisation build.
 */
export function isPseudoLocalized(text: string): boolean {
  return text.startsWith('[!!! ') && text.endsWith(' !!!]');
}
