/**
 * i18next initialization — runtime i18n for MindShift.
 *
 * Supports: en, ru, az, tr, de, es (and any new locale added to /locales)
 * Locale resolution: store.userLocale → navigator.language → 'en'
 *
 * To add a new language:
 *   1. Run: node scripts/translate.mjs <lang>
 *   2. Add the new lang to SUPPORTED_LOCALES
 *   Done — Vite's import.meta.glob picks it up automatically.
 *
 * Bundle strategy:
 *   - English bundled eagerly (fallback, needed by all users)
 *   - All other locales lazy-loaded on demand via import.meta.glob
 *   - Saves ~95KB gzip for English users on initial load
 */

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './locales/en.json'

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

// Vite code-splits each locale JSON into a separate chunk
const localeModules = import.meta.glob('./locales/*.json')

async function loadLocale(lng: string): Promise<void> {
  if (lng === 'en' || i18n.hasResourceBundle(lng, 'translation')) return
  const loader = localeModules[`./locales/${lng}.json`]
  if (!loader) return
  const mod = await loader() as { default: Record<string, unknown> }
  i18n.addResourceBundle(lng, 'translation', mod.default)
}

function resolveLocale(userLocale?: string | null): string {
  if (userLocale && SUPPORTED_LOCALES.includes(userLocale as SupportedLocale)) return userLocale
  const browserLang = navigator.language.split('-')[0]
  return SUPPORTED_LOCALES.includes(browserLang as SupportedLocale) ? browserLang : 'en'
}

// Initial language from browser only — store may not be initialized yet.
const initialLng = resolveLocale(null)

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
  },
  lng: 'en', // Always start with English (bundled). Non-EN locale loads below.
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
})

// Load non-English initial locale before first render
if (initialLng !== 'en') {
  void loadLocale(initialLng).then(() => i18n.changeLanguage(initialLng))
}

// Defer store subscription until after all modules finish initializing.
// Static import of useStore here causes a circular-init ReferenceError because
// store/index.ts imports i18n indirectly. Dynamic import + setTimeout(0) breaks the cycle.
setTimeout(() => {
  import('@/store').then(({ useStore }) => {
    // Sync once immediately in case IDB has already hydrated
    const resolved = resolveLocale(useStore.getState().userLocale)
    void loadLocale(resolved).then(() => {
      if (i18n.language !== resolved) i18n.changeLanguage(resolved)
    })

    // Keep in sync with future store changes (e.g. user changes language in Settings)
    useStore.subscribe(
      (state) => state.userLocale,
      (userLocale) => {
        const r = resolveLocale(userLocale)
        void loadLocale(r).then(() => {
          if (i18n.language !== r) i18n.changeLanguage(r)
        })
      },
    )
  })
}, 0)

export default i18n
