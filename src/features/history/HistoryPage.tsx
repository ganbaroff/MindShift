/**
 * HistoryPage — session history log.
 *
 * Shows the last 30 days of focus sessions in a timeline.
 * For each session: date, duration, phase reached, energy before/after.
 *
 * Guest users see a friendly prompt to sign in.
 * No data = encouraging empty state, not shaming.
 */

import { useMemo } from 'react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useMotion } from '@/shared/hooks/useMotion'
import { useStore } from '@/store'
import { ENERGY_EMOJI } from '@/shared/lib/constants'
import { useSessionHistory } from '@/shared/hooks/useSessionHistory'

const PHASE_COLORS: Record<string, string> = {
  flow:     '#4ECDC4',
  release:  '#F59E0B',
  struggle: '#7B72FF',
  recovery: '#9B8EFF',
}

const PHASE_LABEL_KEYS: Record<string, string> = {
  flow:     'history.phaseFlow',
  release:  'history.phaseRelease',
  struggle: 'history.phaseStruggle',
  recovery: 'history.phaseRecovery',
}

function formatDate(iso: string, todayLabel: string, yesterdayLabel: string): string {
  const d = new Date(iso)
  const today = new Date()
  const diff = Math.floor((today.getTime() - d.getTime()) / 86400000)
  if (diff === 0) return todayLabel
  if (diff === 1) return yesterdayLabel
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatDuration(ms: number | null): string {
  if (!ms) return '—'
  const min = Math.round(ms / 60000)
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

export default function HistoryPage() {
  const { shouldAnimate } = useMotion()
  const { t } = useTranslation()
  const { userId } = useStore()
  const { sessions, loading } = useSessionHistory()

  const isGuest = !userId || userId.startsWith('guest_')

  // Group sessions by calendar date (descending)
  const grouped = useMemo(() => {
    const map = new Map<string, typeof sessions>()
    for (const s of sessions) {
      const day = s.started_at.slice(0, 10)
      if (!map.has(day)) map.set(day, [])
      map.get(day)!.push(s)
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [sessions])

  // Total stats
  const totalMin = useMemo(() =>
    sessions.reduce((sum, s) => sum + Math.round((s.duration_ms ?? 0) / 60000), 0),
    [sessions]
  )
  const flowSessions = sessions.filter(s => s.phase_reached === 'flow').length

  return (
    <div className="min-h-screen px-5 pb-36 pt-10" style={{ backgroundColor: 'var(--color-bg)' }}>
      <motion.div initial={shouldAnimate ? { opacity: 0, y: -8 } : false} animate={shouldAnimate ? { opacity: 1, y: 0 } : false}>
        <h1 className="text-[24px] font-bold" style={{ color: 'var(--color-text-primary)' }}>{t('history.title')}</h1>
        <p className="text-[13px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{t('history.subtitle')}</p>
      </motion.div>

      {isGuest ? (
        <motion.div
          initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
          animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
          transition={shouldAnimate ? { delay: 0.1 } : undefined}
          className="mt-8 rounded-2xl p-6 text-center"
          style={{ backgroundColor: 'var(--color-surface-card)', border: '1px solid rgba(123,114,255,0.12)' }}
        >
          <div className="text-4xl mb-3">📊</div>
          <p className="text-[15px] font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>{t('history.signInTitle')}</p>
          <p className="text-[13px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
            {t('history.signInDesc')}
          </p>
        </motion.div>
      ) : loading ? (
        <div className="mt-12 flex justify-center">
          <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin motion-reduce:animate-none motion-reduce:opacity-60"
            style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
        </div>
      ) : sessions.length === 0 ? (
        <motion.div
          initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
          animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
          transition={shouldAnimate ? { delay: 0.1 } : undefined}
          className="mt-8 rounded-2xl p-6 text-center"
          style={{ backgroundColor: 'var(--color-surface-card)' }}
        >
          <div className="text-4xl mb-3">🌱</div>
          <p className="text-[15px] font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>{t('history.noSessionsTitle')}</p>
          <p className="text-[13px]" style={{ color: 'var(--color-text-muted)' }}>{t('history.noSessionsDesc')}</p>
        </motion.div>
      ) : (
        <>
          {/* Summary row */}
          <motion.div
            initial={shouldAnimate ? { opacity: 0, y: 8 } : false}
            animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
            transition={shouldAnimate ? { delay: 0.05 } : undefined}
            className="flex gap-2 mt-5 mb-6"
          >
            {[
              { value: String(sessions.length), label: t('history.sessions'), color: 'var(--color-primary)' },
              { value: `${totalMin}m`,          label: t('history.focused'),  color: 'var(--color-teal)' },
              { value: String(flowSessions),    label: t('history.flow'),     color: 'var(--color-gold)' },
            ].map((s, i) => (
              <div key={i} className="flex-1 rounded-2xl p-2.5 text-center" style={{ backgroundColor: 'var(--color-surface-card)' }}>
                <p className="text-[18px] font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{s.label}</p>
              </div>
            ))}
          </motion.div>

          {/* Timeline */}
          <div className="space-y-5">
            {grouped.map(([day, daySessions], gi) => (
              <motion.div
                key={day}
                initial={shouldAnimate ? { opacity: 0, y: 10 } : false}
                animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
                transition={shouldAnimate ? { delay: 0.05 + gi * 0.03 } : undefined}
              >
                <p className="text-[11px] uppercase tracking-widest mb-2 font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                  {formatDate(day, t('history.today'), t('history.yesterday'))}
                </p>
                <div className="space-y-2">
                  {daySessions.map((s, si) => {
                    const phase = s.phase_reached ?? 'struggle'
                    const phaseColor = PHASE_COLORS[phase] ?? 'var(--color-primary)'
                    const energyBefore = s.energy_before
                      ? ENERGY_EMOJI[Math.min(4, Math.max(0, s.energy_before - 1))]
                      : null
                    const energyAfter = s.energy_after
                      ? ENERGY_EMOJI[Math.min(4, Math.max(0, s.energy_after - 1))]
                      : null

                    return (
                      <div
                        key={s.id ?? si}
                        className="rounded-2xl p-3 flex items-center gap-3"
                        style={{
                          backgroundColor: 'var(--color-surface-card)',
                          borderLeft: `3px solid ${phaseColor}`,
                        }}
                      >
                        {/* Duration */}
                        <div className="min-w-[44px] text-center">
                          <p className="text-[15px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
                            {formatDuration(s.duration_ms)}
                          </p>
                          <p className="text-[9px] mt-0.5" style={{ color: '#5A5B72' }}>
                            {new Date(s.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>

                        {/* Phase */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-medium" style={{ color: phaseColor }}>
                            {PHASE_LABEL_KEYS[phase] ? t(PHASE_LABEL_KEYS[phase]) : phase}
                          </p>
                          {s.audio_preset && (
                            <p className="text-[10px] mt-0.5 capitalize" style={{ color: '#5A5B72' }}>
                              🎧 {s.audio_preset}
                            </p>
                          )}
                        </div>

                        {/* Energy delta */}
                        {(energyBefore || energyAfter) && (
                          <div className="flex items-center gap-1 text-[14px]">
                            {energyBefore && <span title={t('history.energyBefore')}>{energyBefore}</span>}
                            {energyBefore && energyAfter && (
                              <span style={{ color: '#3A3B52', fontSize: 10 }}>→</span>
                            )}
                            {energyAfter && <span title={t('history.energyAfter')}>{energyAfter}</span>}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
