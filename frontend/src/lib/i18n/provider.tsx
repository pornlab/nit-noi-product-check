'use client';

import * as React from 'react';

import { LOCALE_STORAGE_KEY, defaultLocale, locales, type Locale } from './config';
import { en, type Dictionary } from './dictionaries/en';
import { ru } from './dictionaries/ru';
import { th } from './dictionaries/th';

const dictionaries: Record<Locale, Dictionary> = { en, ru, th };

type PathsToLeaves<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : PathsToLeaves<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type I18nKey = PathsToLeaves<Dictionary>;

export type TParams = Record<string, string | number>;

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: I18nKey, params?: TParams) => string;
  /** Возвращает `{count}` подставленной формы для правильной русской плюрализации.
   *  Использование: `t('receivings.positionsWord', { n: plural(count) })`. */
  formatNumber: (n: number) => string;
}

const I18nContext = React.createContext<I18nContextValue | null>(null);

function isLocale(v: unknown): v is Locale {
  return typeof v === 'string' && (locales as readonly string[]).includes(v);
}

function resolve(dict: Dictionary, key: string): string {
  const parts = key.split('.');
  let cur: unknown = dict;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in cur) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return key;
    }
  }
  return typeof cur === 'string' ? cur : key;
}

function interpolate(template: string, params?: TParams): string {
  if (!params) return template;
  return template.replaceAll(/\{(\w+)\}/g, (_m, k: string) =>
    params[k] === undefined ? `{${k}}` : String(params[k]),
  );
}

export function I18nProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [locale, setLocaleState] = React.useState<Locale>(defaultLocale);

  // Гидрируем локаль из localStorage после mount'а — SSR всегда рендерит на defaultLocale,
  // чтобы избежать hydration mismatch.
  React.useEffect(() => {
    try {
      const stored = globalThis.localStorage?.getItem(LOCALE_STORAGE_KEY);
      if (isLocale(stored)) setLocaleState(stored);
    } catch {
      // localStorage может быть недоступен (SSR / приватный режим) — молча игнорируем
    }
  }, []);

  const setLocale = React.useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      globalThis.localStorage?.setItem(LOCALE_STORAGE_KEY, l);
      globalThis.document?.documentElement?.setAttribute('lang', l);
    } catch {
      // no-op
    }
  }, []);

  React.useEffect(() => {
    try {
      globalThis.document?.documentElement?.setAttribute('lang', locale);
    } catch {
      // no-op
    }
  }, [locale]);

  const value = React.useMemo<I18nContextValue>(() => {
    const dict = dictionaries[locale];
    return {
      locale,
      setLocale,
      t: (key, params) => interpolate(resolve(dict, key), params),
      formatNumber: (n) => n.toLocaleString(locale === 'ru' ? 'ru-RU' : locale === 'th' ? 'th-TH' : 'en-US'),
    };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = React.useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within <I18nProvider>');
  return ctx;
}
