/**
 * useI18n — thin React wrapper around the i18n engine.
 *
 * Returns:
 *   - `t(key, vars?)` — translate a key with optional interpolation
 *   - `locale`        — resolved two-letter locale code ('en' | 'ru' | …)
 *
 * Locale is resolved once per mount from `navigator.language`.
 * No state updates — the locale doesn't change within a session.
 *
 * @example
 *   const { t } = useI18n()
 *   <h1>{t('home.greeting.morning')}</h1>
 */

import { useMemo } from 'react'
import { resolveLocale, t as translate, type I18nKey } from '@/shared/lib/i18n'

export function useI18n() {
  const locale = useMemo(() => resolveLocale(navigator.language), [])

  const t = useMemo(
    () =>
      (key: I18nKey, vars?: Record<string, string>) =>
        translate(key, locale, vars),
    [locale],
  )

  return { t, locale }
}
