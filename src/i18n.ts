/**
 * i18next initialization — runtime i18n for MindShift.
 *
 * Supports: en, ru, az, tr, de, es (and any new locale added to /locales)
 * Locale resolution: store.userLocale → navigator.language → 'en'
 * Translations loaded synchronously at startup (bundled JSON).
 *
 * To add a new language:
 *   1. Run: node scripts/translate.mjs <lang>  (e.g. "fr", "ja", "ko")
 *   2. Import the generated JSON below
 *   3. Add to resources object
 *   4. Add to SUPPORTED_LOCALES
 *   Done. No other changes needed.
 */

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { useStore } from '@/store'

// Translation bundles
import en from './locales/en.json'
import ru from './locales/ru.json'
import az from './locales/az.json'
import tr from './locales/tr.json'
import de from './locales/de.json'
import es from './locales/es.json'

export const SUPPORTED_LOCALES = ['en', 'ru', 'az', 'tr', 'de', 'es'] as const
export type SupportedLocale = typeof SUPPORTED_LOCALES[number]

export const LOCALE_LABELS: Record<string, string> = {
  en: 'English',
  ru: 'Русский',
  az: 'Azərbaycanca',
  tr: 'Türkçe',
  de: 'Deutsch',
  es: 'Español',
}

const userLocale = useStore.getState().userLocale
const browserLang = navigator.language.split('-')[0]
const lng = userLocale ?? (SUPPORTED_LOCALES.includes(browserLang as SupportedLocale) ? browserLang : 'en')

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ru: { translation: ru },
    az: { translation: az },
    tr: { translation: tr },
    de: { translation: de },
    es: { translation: es },
  },
  lng,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
})

export default i18n
