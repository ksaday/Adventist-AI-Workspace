// packages/i18n - Internationalization catalogues and language detection
import { CATALOGUES, type TranslationKey } from './catalogues.js';
import { pseudoLocalize } from './pseudo-localizer.js';

export * from './catalogues.js';
export * from './pseudo-localizer.js';
export * from './detector.js';

export type SupportedLocale = 'en' | 'ko';
export type Locale = SupportedLocale;
export const SUPPORTED_LOCALES: readonly SupportedLocale[] = ['en', 'ko'] as const;

export interface I18nOptions {
  locale?: SupportedLocale;
  pseudo?: boolean;
}

/**
 * Translates a key with parameters, supporting pseudo-localisation mode.
 */
export function t(
  key: TranslationKey,
  params: Record<string, string | number> = {},
  options: I18nOptions = {}
): string {
  const locale = options.locale ?? 'en';
  const dict = CATALOGUES[locale] ?? CATALOGUES.en;
  let text: string = dict[key] ?? CATALOGUES.en[key] ?? key;

  if (options.pseudo) {
    text = pseudoLocalize(text);
  }

  for (const [paramKey, paramVal] of Object.entries(params)) {
    text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
  }

  return text;
}
