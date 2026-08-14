import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import bnAuth from './locales/bn/auth.json';
import bnCommon from './locales/bn/common.json';
import bnEnums from './locales/bn/enums.json';
import bnErrors from './locales/bn/errors.json';
import enAuth from './locales/en/auth.json';
import enCommon from './locales/en/common.json';
import enEnums from './locales/en/enums.json';
import enErrors from './locales/en/errors.json';

/**
 * i18n.
 *
 * **Bangla is the default and the fallback**, not English. That ordering is the whole
 * point of the decision in DESIGN.md §14: with English as fallback, a missing Bangla key
 * silently renders English and nobody notices for months. With Bangla as fallback, a
 * missing key shows up immediately in the language the app is actually used in.
 *
 * Bundles are imported statically rather than lazy-loaded. Two languages of UI strings
 * is a few KB, and lazy-loading them would mean a flash of untranslated keys on first
 * paint — a bad trade for the size saved.
 */

export type Language = 'bn' | 'en';

export const LANGUAGES: Language[] = ['bn', 'en'];
export const DEFAULT_LANGUAGE: Language = 'bn';

const STORAGE_KEY = 'tg.lang';

export function readStoredLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'bn' || stored === 'en') return stored;
  } catch {
    // Private browsing can throw on localStorage access.
  }
  return DEFAULT_LANGUAGE;
}

void i18n.use(initReactI18next).init({
  resources: {
    bn: { common: bnCommon, enums: bnEnums, auth: bnAuth, errors: bnErrors },
    en: { common: enCommon, enums: enEnums, auth: enAuth, errors: enErrors },
  },
  lng: readStoredLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  defaultNS: 'common',
  ns: ['common', 'enums', 'auth', 'errors'],
  interpolation: {
    // React escapes for us; double-escaping mangles Bangla punctuation.
    escapeValue: false,
  },
  returnNull: false,
});

/**
 * Switches language and updates `<html lang>`.
 *
 * The lang attribute is load-bearing beyond translation: `:lang(bn)` drives the type
 * adjustment in index.css, and screen readers use it to choose a pronunciation. Setting
 * i18next's language without it gives Bangla text read aloud in an English voice.
 */
export function setLanguage(language: Language): void {
  void i18n.changeLanguage(language);
  document.documentElement.lang = language;

  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Non-fatal: the change still applies for this session.
  }
}

// Keeps the attribute correct when i18next changes language by any other path.
i18n.on('languageChanged', (language) => {
  document.documentElement.lang = language;
});

export default i18n;
