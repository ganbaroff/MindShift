/**
 * i18next initialization — runtime i18n for MindShift.
 *
 * Supports: en, ru, az, tr
 * Locale resolution: store.userLocale → navigator.language → 'en'
 * Translations loaded synchronously at startup (bundled JSON).
 */

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { useStore } from '@/store'

// Translation bundles — will grow as we wrap more strings
import en from './locales/en.json'
import ru from './locales/ru.json'

const userLocale = useStore.getState().userLocale
const browserLang = navigator.language.split('-')[0]
const lng = userLocale ?? (['en', 'ru', 'az', 'tr'].includes(browserLang) ? browserLang : 'en')

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ru: { translation: ru },
  },
  lng,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
})

export default i18n
