/**
 * useI18n — React wrapper around the i18n engine.
 *
 * Reads userLocale from store (if set), falls back to navigator.language.
 * Returns t(key, vars?) and the resolved locale code.
 */

import { useMemo } from 'react'
import { useStore } from '@/store'
import { resolveLocale, t as translate, type I18nKey } from '@/shared/lib/i18n'

export function useI18n() {
  const userLocale = useStore(s => s.userLocale)

  const locale = useMemo(
    () => userLocale ? resolveLocale(userLocale) : resolveLocale(navigator.language),
    [userLocale],
  )

  const t = useMemo(
    () =>
      (key: I18nKey, vars?: Record<string, string>) =>
        translate(key, locale, vars),
    [locale],
  )

  return { t, locale }
}
