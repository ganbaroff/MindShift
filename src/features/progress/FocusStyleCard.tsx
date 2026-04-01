import { useMemo } from 'react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useMotion } from '@/shared/hooks/useMotion'
import { useStore } from '@/store'
import { deriveFromSessions } from '@/shared/lib/psychotype'
import { isVolauraConfigured, sendPsychotype } from '@/shared/lib/volaura-bridge'
import { supabase } from '@/shared/lib/supabase'
import type { FocusSessionRow } from '@/types/database'

const PSYCHOTYPE_EMOJI = {
  achiever:  '🎯',
  explorer:  '🗺️',
  connector: '💙',
  planner:   '📋',
} as const

interface FocusStyleCardProps {
  sessions: FocusSessionRow[]
}

export function FocusStyleCard({ sessions }: FocusStyleCardProps) {
  const { shouldAnimate } = useMotion()
  const { t } = useTranslation()
  const {
    psychotype,
    setPsychotype,
    psychotypeLastDerived,
    setPsychotypeLastDerived,
    resetGridToDefaults,
  } = useStore()

  const derivationCooldown = (() => {
    if (!psychotypeLastDerived) return false
    const daysSince = (Date.now() - new Date(psychotypeLastDerived).getTime()) / 86_400_000
    return daysSince < 7
  })()

  const derivedPsychotype = useMemo(
    () => (derivationCooldown ? null : deriveFromSessions(sessions)),
    [sessions, derivationCooldown],
  )

  const psychotypeEvolved =
    derivedPsychotype !== null &&
    psychotype !== null &&
    derivedPsychotype !== psychotype

  const handleAcceptEvolution = () => {
    if (!derivedPsychotype) return
    setPsychotype(derivedPsychotype)
    setPsychotypeLastDerived(new Date().toISOString().slice(0, 10))
    resetGridToDefaults()
    if (isVolauraConfigured()) {
      void supabase.auth.getSession().then(({ data }) => {
        const token = data.session?.access_token
        if (token) void sendPsychotype(token, derivedPsychotype)
      })
    }
  }

  if (!psychotype) return null

  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
      animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
      transition={shouldAnimate ? { delay: 0.19 } : undefined}
      className="rounded-2xl p-3"
      style={{
        backgroundColor: 'var(--color-surface-card)',
        border: psychotypeEvolved
          ? '1px solid rgba(245,158,11,0.30)'
          : '1px solid rgba(123,114,255,0.12)',
      }}
    >
      <p
        className="text-[11px] uppercase tracking-widest mb-2"
        style={{ color: 'var(--color-primary)' }}
      >
        {t('progress.yourFocusStyle')}
      </p>
      <div className="flex items-center gap-3">
        <span className="text-[28px]">{PSYCHOTYPE_EMOJI[psychotype]}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {t(`progress.${psychotype}Label`)}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {t(`progress.${psychotype}Desc`)}
          </p>
        </div>
      </div>

      {psychotypeEvolved && derivedPsychotype && (
        <div
          className="mt-3 pt-3 flex items-center justify-between gap-3"
          style={{ borderTop: '1px solid rgba(245,158,11,0.15)' }}
        >
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-medium" style={{ color: 'var(--color-gold)' }}>
              {t('progress.patternsSuggest', {
                type: t(`progress.${derivedPsychotype}Label`),
                emoji: PSYCHOTYPE_EMOJI[derivedPsychotype],
              })}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {t('progress.basedOnSessions', { count: sessions.length })}
            </p>
          </div>
          <button
            onClick={handleAcceptEvolution}
            aria-label={t('progress.update')}
            className="text-[11px] font-semibold px-3 py-1.5 rounded-xl shrink-0 transition-all duration-150 focus-visible:ring-2 focus-visible:ring-[#7B72FF]"
            style={{
              background: 'rgba(245,158,11,0.15)',
              border: '1px solid rgba(245,158,11,0.30)',
              color: 'var(--color-gold)',
            }}
          >
            {t('progress.update')}
          </button>
        </div>
      )}
    </motion.div>
  )
}
