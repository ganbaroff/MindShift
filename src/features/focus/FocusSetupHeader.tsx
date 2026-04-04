/**
 * FocusSetupHeader — Header, progress strip, ADHD tip, and bookmark anchor
 *
 * Extracted from FocusSetup.tsx (Sprint BC+1 decomposition).
 * Reads its own store slices directly; no store prop-drilling.
 */

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from '@/store'
import { useMotion } from '@/shared/hooks/useMotion'
import { clearBookmark } from './useFocusSession'
import type { Task } from '@/types'

// ── Props ─────────────────────────────────────────────────────────────────────

export interface FocusSetupHeaderProps {
  energyLabel: { text: string; color: string }
  savedBookmark: { text: string; taskId: string | null } | null
  allTasks: Task[]
  setSelectedTask: (t: Task | null) => void
}

export function FocusSetupHeader({
  energyLabel,
  savedBookmark,
  allTasks,
  setSelectedTask,
}: FocusSetupHeaderProps) {
  const { t } = useTranslation()
  const { shouldAnimate: _shouldAnimate } = useMotion()
  void _shouldAnimate // consumed for future animation gates; keep import alive

  const {
    weeklyStats,
    completedTotal,
    weeklyIntention,
    timeBlindness,
    emotionalReactivity,
  } = useStore()

  // ── Today's focused minutes (W) ───────────────────────────────────────────
  const todayFocusMin = useMemo(() => {
    const idx = (new Date().getDay() + 6) % 7 // Mon=0…Sun=6
    return weeklyStats?.dailyMinutes?.[idx] ?? 0
  }, [weeklyStats])

  // ── Adaptive ADHD tip (W) ─────────────────────────────────────────────────
  const adaptiveTip = useMemo<{ emoji: string; text: string } | null>(() => {
    if (timeBlindness === 'often')
      return { emoji: '⏰', text: t('focus.tipTimeOften') }
    if (timeBlindness === 'sometimes')
      return { emoji: '🕐', text: t('focus.tipTimeSometimes') }
    if (emotionalReactivity === 'high')
      return { emoji: '🛡️', text: t('focus.tipEmotionHigh') }
    if (emotionalReactivity === 'moderate')
      return { emoji: '🌿', text: t('focus.tipEmotionModerate') }
    return null
  }, [timeBlindness, emotionalReactivity, t])

  return (
    <>
      {/* Page heading + energy label */}
      <div className="px-5 pt-10 pb-4">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
          {t('focus.title')} ⏱️
        </h1>
        <p className="text-sm mt-1" style={{ color: energyLabel.color }}>
          {energyLabel.text}
        </p>
      </div>

      {/* Today's progress strip + weekly intention (W) */}
      {(todayFocusMin > 0 || completedTotal > 0 || weeklyIntention) && (
        <div
          className="mx-5 mb-3 px-4 py-2.5 rounded-2xl flex items-center gap-3 flex-wrap"
          style={{ background: 'var(--color-card)', border: '1px solid rgba(255,255,255,0.05)' }}
        >
          {completedTotal > 0 && (
            <span className="text-[11px]" style={{ color: 'var(--color-teal)' }}>
              ✓ {t('focus.doneAllTime', { count: completedTotal })}
            </span>
          )}
          {todayFocusMin > 0 && (
            <span className="text-[11px]" style={{ color: 'var(--color-primary)' }}>
              {t('focus.focusedToday', { min: todayFocusMin })}
            </span>
          )}
          {weeklyIntention && (
            <span
              className="text-[11px] px-2 py-0.5 rounded-full ml-auto"
              style={{ background: 'rgba(123,114,255,0.10)', color: 'var(--color-primary-light)' }}
            >
              {weeklyIntention}
            </span>
          )}
        </div>
      )}

      {/* Adaptive ADHD tip (W) */}
      {adaptiveTip && (
        <div
          className="mx-5 mb-4 px-4 py-2.5 rounded-2xl flex items-center gap-2"
          style={{ background: 'rgba(78,205,196,0.06)', border: '1px solid rgba(78,205,196,0.12)' }}
        >
          <span className="text-base">{adaptiveTip.emoji}</span>
          <p className="text-[12px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
            {adaptiveTip.text}
          </p>
        </div>
      )}

      {/* Interrupt bookmark anchor */}
      {savedBookmark && (
        <div
          className="mx-5 mb-5 p-4 rounded-2xl"
          style={{ background: 'var(--color-card)', border: '1.5px solid var(--color-primary-alpha)' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span>📌</span>
            <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
              {t('focus.pickUpWhere')}
            </p>
          </div>
          <p className="text-sm font-medium mb-3" style={{ color: 'var(--color-text)' }}>
            {savedBookmark.text}
          </p>
          <div className="flex gap-2">
            {savedBookmark.taskId && allTasks.find(tk => tk.id === savedBookmark.taskId) && (
              <button
                onClick={() => {
                  const task = allTasks.find(tk => tk.id === savedBookmark.taskId)
                  if (task) setSelectedTask(task)
                  clearBookmark()
                }}
                className="flex-1 py-2 rounded-xl text-xs font-semibold focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none"
                style={{
                  background: 'var(--color-primary-alpha)',
                  border: '1.5px solid var(--color-primary)',
                  color: 'var(--color-primary)',
                }}
              >
                {t('focus.continueTask')}
              </button>
            )}
            <button
              onClick={clearBookmark}
              className="py-2 px-4 rounded-xl text-xs focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none"
              style={{ color: 'var(--color-muted)', border: '1px solid var(--color-border-subtle)' }}
            >
              {t('focus.dismiss')}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
