/**
 * Lightweight i18n engine — no external deps.
 *
 * Strategy:
 *   1. Detect locale from navigator.language (e.g. "ru-RU" → "ru").
 *   2. Look up key in locale bundle; fall back to `en` if missing.
 *   3. Supports simple {{placeholder}} interpolation.
 *
 * Deliberately NOT using React context at the top level — the hook
 * `useI18n` is thin and re-evaluates locale per component mount,
 * which is fine for a single-language session.
 */

import { en, type I18nKey } from './en'
import { ru } from './ru'

type Bundle = Partial<Record<I18nKey, string>>

const BUNDLES: Record<string, Bundle> = { en, ru }

/**
 * Resolve the locale string to a supported two-letter code.
 * Falls back to 'en' if the locale is not in BUNDLES.
 */
export function resolveLocale(raw: string = navigator.language): string {
  const lang = raw.split('-')[0].toLowerCase()
  return lang in BUNDLES ? lang : 'en'
}

/**
 * Core translate function — used both directly and via hook.
 *
 * @param key     - dot-separated i18n key
 * @param locale  - BCP-47 base language ('en' | 'ru' | …)
 * @param vars    - optional interpolation map: { name: 'Alice' }
 *
 * @example
 *   t('home.greeting.morning', 'ru')  // → 'Доброе утро ☀️'
 *   t('generic.done', 'de')           // → 'Done'  (falls back to en)
 */
export function t(key: I18nKey, locale: string, vars?: Record<string, string>): string {
  const bundle = BUNDLES[locale] ?? en
  let str = (bundle as Bundle)[key] ?? en[key] ?? key

  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replaceAll(`{{${k}}}`, v)
    }
  }

  return str
}

export type { I18nKey }
