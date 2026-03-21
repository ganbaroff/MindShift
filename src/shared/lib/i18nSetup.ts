/**
 * LinguiJS setup — runtime i18n initialization.
 *
 * Loads the appropriate locale catalog and activates it.
 * Called once at app startup (main.tsx) and when user changes locale.
 */

import { i18n } from '@lingui/core'

export const SUPPORTED_LOCALES = ['en', 'ru', 'az', 'tr'] as const
export type SupportedLocale = typeof SUPPORTED_LOCALES[number]

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: 'English',
  ru: 'Русский',
  az: 'Azərbaycanca',
  tr: 'Türkçe',
}

/**
 * Resolve browser locale to a supported one.
 */
export function resolveLocale(raw?: string | null): SupportedLocale {
  const lang = (raw ?? navigator.language).split('-')[0].toLowerCase()
  return SUPPORTED_LOCALES.includes(lang as SupportedLocale)
    ? (lang as SupportedLocale)
    : 'en'
}

/**
 * Dynamically load and activate a locale catalog.
 */
export async function activateLocale(locale: SupportedLocale): Promise<void> {
  const { messages } = await import(`../../locales/${locale}.po`)
  i18n.load(locale, messages)
  i18n.activate(locale)
}

export { i18n }
