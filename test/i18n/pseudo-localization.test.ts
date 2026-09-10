import { describe, it, expect } from 'vitest';
import { CATALOGUES, t, pseudoLocalize, isPseudoLocalized, type TranslationKey } from '../../packages/i18n/src/index.js';

describe('i18n Foundation & Pseudo-Localisation (Phase 2 Exit Criteria)', () => {
  it('ensures parity between English and Korean message catalogues', () => {
    const enKeys = Object.keys(CATALOGUES.en) as TranslationKey[];
    const koKeys = Object.keys(CATALOGUES.ko) as TranslationKey[];

    expect(enKeys.sort()).toEqual(koKeys.sort());
    expect(enKeys.length).toBeGreaterThan(15);
  });

  it('PSEUDO-LOCALISATION BUILD: transforms text with accents and expansion, preserving placeholders', () => {
    const original = 'Waiting for your answer from {provider}';
    const pseudo = pseudoLocalize(original);

    expect(isPseudoLocalized(pseudo)).toBe(true);
    // Placeholder must be preserved exactly
    expect(pseudo).toContain('{provider}');
    // Length must expand (~30% expansion or padded brackets)
    expect(pseudo.length).toBeGreaterThan(original.length);
    // Contains accented characters
    expect(pseudo).toMatch(/[áéíóú]/);
  });

  it('THE PSEUDO-LOCALISATION BUILD SHOWS NO RAW STRINGS: all keys render pseudo-localized', () => {
    const enKeys = Object.keys(CATALOGUES.en) as TranslationKey[];

    for (const key of enKeys) {
      const rendered = t(key, { locale: 'EN', provider: 'ChatGPT' }, { pseudo: true });

      // Every rendered string must carry the pseudo-localisation signature
      expect(isPseudoLocalized(rendered)).toBe(true);
      // Must not be empty or plain raw text
      expect(rendered.length).toBeGreaterThan(10);
    }
  });

  it('renders Korean catalogue strings properly without raw string leaks', () => {
    const koTitle = t('app_title', {}, { locale: 'ko' });
    expect(koTitle).toBe('재림교회 AI 워크스페이스');

    const koCompose = t('compose_button', {}, { locale: 'ko' });
    expect(koCompose).toBe('프롬프트 작성 →');
  });
});
