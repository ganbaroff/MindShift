/**
 * i18next initialization — runtime i18n for MindShift.
 *
 * Supports: en, ru, az, tr, de, es (and any new locale added to /locales)
 * Locale resolution: store.userLocale → navigator.language → 'en'
 *
 * To add a new language:
 *   1. Run: node scripts/translate.mjs <lang>
 *   2. Import the generated JSON below
 *   3. Add to resources + SUPPORTED_LOCALES
 *   Done.
 */

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

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

function resolveLocale(userLocale?: string | null): string {
  if (userLocale && SUPPORTED_LOCALES.includes(userLocale as SupportedLocale)) return userLocale
  const browserLang = navigator.language.split('-')[0]
  return SUPPORTED_LOCALES.includes(browserLang as SupportedLocale) ? browserLang : 'en'
}

// Initial language from browser only — store may not be initialized yet.
// The subscribe() below syncs to store.userLocale after IDB hydration completes.
const initialLng = resolveLocale(null)

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ru: { translation: ru },
    az: { translation: az },
    tr: { translation: tr },
    de: { translation: de },
    es: { translation: es },
  },
  lng: initialLng,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
})

// Defer store subscription until after all modules finish initializing.
// Static import of useStore here causes a circular-init ReferenceError because
// store/index.ts imports i18n indirectly. Dynamic import + setTimeout(0) breaks the cycle.
setTimeout(() => {
  import('@/store').then(({ useStore }) => {
    // Sync once immediately in case IDB has already hydrated
    const resolved = resolveLocale(useStore.getState().userLocale)
    if (i18n.language !== resolved) i18n.changeLanguage(resolved)

    // Then keep in sync with future store changes (e.g. user changes language in Settings)
    useStore.subscribe(
      (state) => state.userLocale,
      (userLocale) => {
        const r = resolveLocale(userLocale)
        if (i18n.language !== r) i18n.changeLanguage(r)
      },
    )
  })
}, 0)

export default i18n
