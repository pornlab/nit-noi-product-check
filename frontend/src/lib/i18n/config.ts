export const locales = ['en', 'ru', 'th'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const LOCALE_STORAGE_KEY = 'warehouse-locale';

export const localeLabels: Record<Locale, string> = {
  en: 'English',
  ru: 'Русский',
  th: 'ไทย',
};

export const localeShort: Record<Locale, string> = {
  en: 'EN',
  ru: 'RU',
  th: 'TH',
};
