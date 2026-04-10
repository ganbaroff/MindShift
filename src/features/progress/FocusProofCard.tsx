/**
 * FocusProofCard — Shareable visual weekly card (viral K-factor)
 *
 * A full-screen overlay showing the user's focus stats as a beautiful
 * shareable card. No canvas, no deps — users screenshot it.
 *
 * Design: dark purple card, teal accent, MindShift branding.
 * Psychotype-aware copy. Week date range. Shame-free framing.
 */

import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'motion/react'
import { X } from 'lucide-react'
import { useMotion } from '@/shared/hooks/useMotion'
import { useStore } from '@/store'
import type { Psychotype } from '@/types'

// ── Types ─────────────────────────────────────────────────────────────────────

interface FocusProofCardProps {
  open: boolean
  onClose: () => void
  weeklyMinutes: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PSYCHOTYPE_DATA: Record<Psychotype, { emoji: string; label: string; tagline: string }> = {
  achiever:  { emoji: '🎯', label: 'Achiever',  tagline: 'Deep work, done right.' },
  explorer:  { emoji: '🌿', label: 'Explorer',  tagline: 'Curious. Flexible. Alive.' },
  connector: { emoji: '🤝', label: 'Connector', tagline: 'People fuel the work.' },
  planner:   { emoji: '🗺️', label: 'Planner',   tagline: 'Systems over chaos.' },
}

function getWeekRange(): string {
  const now = new Date()
  const day = now.getDay() // 0=Sun
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((day + 6) % 7))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${fmt(monday)} – ${fmt(sunday)}, ${now.getFullYear()}`
}

function getMinsLabel(mins: number): { big: string; unit: string } {
  if (mins >= 60) {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return m > 0
      ? { big: `${h}h ${m}m`, unit: 'of real focus' }
      : { big: `${h}h`, unit: 'of deep work' }
  }
  return { big: `${mins}`, unit: mins === 1 ? 'minute focused' : 'minutes focused' }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function FocusProofCard({ open, onClose, weeklyMinutes }: FocusProofCardProps) {
  const { shouldAnimate } = useMotion()
  const { t } = useTranslation()
  const { psychotype, completedTotal, currentStreak } = useStore()

  const pt = psychotype ? PSYCHOTYPE_DATA[psychotype] : null
  const { big, unit } = getMinsLabel(weeklyMinutes)
  const weekRange = getWeekRange()

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="fpc-backdrop"
            initial={shouldAnimate ? { opacity: 0 } : {}}
            animate={{ opacity: 1 }}
            exit={shouldAnimate ? { opacity: 0 } : {}}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6"
            style={{ background: 'rgba(10, 10, 20, 0.92)', backdropFilter: 'blur(8px)' }}
            onClick={onClose}
          >
            {/* Instruction pill */}
            <motion.p
              initial={shouldAnimate ? { opacity: 0, y: -8 } : {}}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-xs mb-4 px-4 py-1.5 rounded-full"
              style={{
                background: 'rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.55)',
                letterSpacing: '0.04em',
              }}
            >
              {t('shareCard.screenshotHint')}
            </motion.p>

            {/* The Card */}
            <motion.div
              key="fpc-card"
              initial={shouldAnimate ? { opacity: 0, scale: 0.92, y: 16 } : {}}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={shouldAnimate ? { opacity: 0, scale: 0.94 } : {}}
              transition={shouldAnimate ? { type: 'spring', damping: 24, stiffness: 260 } : { duration: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-[340px] rounded-3xl overflow-hidden"
              style={{
                background: 'linear-gradient(145deg, var(--color-surface) 0%, var(--color-bg) 55%, var(--color-bg) 100%)',
                boxShadow: '0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(123,114,255,0.2)',
                minHeight: 440,
              }}
            >
              {/* Top accent bar */}
              <div
                className="h-1 w-full"
                style={{ background: 'linear-gradient(90deg, #4ECDC4, #7B72FF, #F59E0B)' }}
              />

              <div className="px-7 pt-6 pb-8 flex flex-col gap-5">
                {/* Week range */}
                <p
                  className="text-[11px] font-medium tracking-widest uppercase"
                  style={{ color: 'rgba(255,255,255,0.35)' }}
                >
                  {weekRange}
                </p>

                {/* Big stat */}
                <div>
                  <p
                    className="text-[56px] font-black leading-none"
                    style={{ color: '#4ECDC4', letterSpacing: '-0.03em' }}
                  >
                    {big}
                  </p>
                  <p
                    className="text-[15px] font-medium mt-1"
                    style={{ color: 'rgba(255,255,255,0.6)' }}
                  >
                    {unit}
                  </p>
                </div>

                {/* Secondary stats */}
                <div className="flex gap-4">
                  {completedTotal > 0 && (
                    <div
                      className="flex-1 rounded-xl px-3 py-2.5"
                      style={{ background: 'rgba(78,205,196,0.10)', border: '1px solid rgba(78,205,196,0.15)' }}
                    >
                      <p className="text-[22px] font-bold" style={{ color: '#4ECDC4' }}>
                        {completedTotal}
                      </p>
                      <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        {t('shareCard.tasksDone')}
                      </p>
                    </div>
                  )}
                  {currentStreak >= 2 && (
                    <div
                      className="flex-1 rounded-xl px-3 py-2.5"
                      style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.15)' }}
                    >
                      <p className="text-[22px] font-bold" style={{ color: '#F59E0B' }}>
                        {currentStreak}
                      </p>
                      <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        {t('shareCard.dayStreak')}
                      </p>
                    </div>
                  )}
                </div>

                {/* Psychotype badge */}
                {pt && (
                  <div
                    className="flex items-center gap-2 rounded-xl px-3 py-2.5 self-start"
                    style={{ background: 'rgba(123,114,255,0.12)', border: '1px solid rgba(123,114,255,0.18)' }}
                  >
                    <span className="text-[18px]">{pt.emoji}</span>
                    <div>
                      <p className="text-[12px] font-semibold" style={{ color: 'var(--color-primary-light)' }}>
                        {pt.label}
                      </p>
                      <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        {pt.tagline}
                      </p>
                    </div>
                  </div>
                )}

                {/* Divider */}
                <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />

                {/* Branding footer */}
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[16px] font-bold" style={{ color: 'rgba(255,255,255,0.9)' }}>
                      MindShift
                    </p>
                    <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      mindshift.app
                    </p>
                  </div>
                  <p
                    className="text-[10px] text-right max-w-[140px]"
                    style={{ color: 'rgba(255,255,255,0.25)', lineHeight: '1.4' }}
                  >
                    {t('shareCard.tagline')}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Close button */}
            <motion.button
              initial={shouldAnimate ? { opacity: 0 } : {}}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              onClick={onClose}
              className="mt-5 p-2.5 rounded-full focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
              aria-label={t('shareCard.close')}
            >
              <X size={20} />
            </motion.button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
