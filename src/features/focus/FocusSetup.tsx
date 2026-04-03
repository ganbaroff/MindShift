/**
 * FocusSetup — Setup/pre-session orchestrator for FocusScreen
 *
 * Extracted from FocusScreen.tsx (Sprint BC decomposition).
 * Further decomposed in Sprint BC+1:
 *   - FocusSetupHeader  — heading, progress strip, ADHD tip, bookmark anchor
 *   - FocusTaskPicker   — task list / empty-state CTA
 *   - FocusDurationPicker — duration presets + surprise mode + custom input
 *   - FocusSoundPicker  — sound accordion + medication peak badge
 *
 * All business logic lives in useFocusSession.ts — this is pure UI composition.
 */

import { useState, useEffect, lazy, Suspense } from 'react'
import { AnimatePresence } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { logEvent } from '@/shared/lib/logger'

const LazyBreathworkRitual = lazy(() =>
  import('./BreathworkRitual').then(m => ({ default: m.BreathworkRitual }))
)
import { FocusRoomSheet } from './FocusRoomSheet'
import { FocusSetupHeader } from './FocusSetupHeader'
import { FocusTaskPicker } from './FocusTaskPicker'
import { FocusDurationPicker } from './FocusDurationPicker'
import { FocusSoundPicker } from './FocusSoundPicker'
import { FeatureHint } from '@/shared/ui/FeatureHint'
import type { Task, AudioPreset } from '@/types'
import type { FocusRoomState } from '@/shared/hooks/useFocusRoom'

// ── Props ─────────────────────────────────────────────────────────────────────

export interface FocusSetupProps {
  // Setup state from useFocusSession
  selectedTask: Task | null
  setSelectedTask: (t: Task | null) => void
  selectedDuration: number
  setSelectedDuration: (d: number) => void
  customDuration: string
  setCustomDuration: (d: string) => void
  showCustom: boolean
  setShowCustom: (v: boolean) => void
  smartDuration: number
  allTasks: Task[]
  savedBookmark: { text: string; taskId: string | null } | null
  timerStyle: string
  energyLabel: { text: string; color: string }
  focusAnchor: AudioPreset | null
  TIMER_PRESETS: readonly number[]
  // Handlers
  handleStart: () => void
  // Focus Room
  room: FocusRoomState
}

export function FocusSetup({
  selectedTask, setSelectedTask,
  selectedDuration, setSelectedDuration,
  customDuration, setCustomDuration,
  showCustom, setShowCustom,
  smartDuration, allTasks, savedBookmark,
  timerStyle, energyLabel, focusAnchor,
  TIMER_PRESETS,
  handleStart,
  room,
}: FocusSetupProps) {
  const [showBreathwork, setShowBreathwork] = useState(false)
  const [showRoomSheet, setShowRoomSheet] = useState(false)
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()

  // Analytics: setup-to-start conversion rate denominator + source attribution
  useEffect(() => {
    const source = searchParams.get('from') ?? 'direct'
    logEvent('focus_setup_viewed', {
      has_tasks: allTasks.filter(t => t.status === 'active').length > 0 ? 1 : 0,
      source,
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <div className="flex flex-col pb-28" style={{ background: 'var(--color-bg)' }}>

        {/* Header: title, progress strip, ADHD tip, bookmark anchor */}
        <FocusSetupHeader
          energyLabel={energyLabel}
          savedBookmark={savedBookmark}
          allTasks={allTasks}
          setSelectedTask={setSelectedTask}
        />

        {/* Task picker / empty-state CTA */}
        <FocusTaskPicker
          allTasks={allTasks}
          selectedTask={selectedTask}
          setSelectedTask={setSelectedTask}
        />

        {/* Duration presets (hidden in surprise mode) */}
        <FocusDurationPicker
          timerStyle={timerStyle}
          selectedDuration={selectedDuration}
          setSelectedDuration={setSelectedDuration}
          customDuration={customDuration}
          setCustomDuration={setCustomDuration}
          showCustom={showCustom}
          setShowCustom={setShowCustom}
          smartDuration={smartDuration}
          TIMER_PRESETS={TIMER_PRESETS}
        />

        {/* Sound accordion + medication badge */}
        <FocusSoundPicker focusAnchor={focusAnchor} />

        {/* Focus Room — active room status chip */}
        {room.status === 'connected' && room.code && (
          <div
            className="mx-5 mb-4 px-4 py-2.5 rounded-2xl flex items-center gap-3"
            style={{ background: 'rgba(78,205,196,0.08)', border: '1px solid rgba(78,205,196,0.20)' }}
          >
            <span className="text-base">🤝</span>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold" style={{ color: 'var(--color-teal)' }}>
                {t('focusRoom.activeRoomLabel', { code: room.code, count: room.peers.length + 1 })}
              </p>
              {room.peers.length === 0 && (
                <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                  {t('focus.waitingForPartner')}
                </p>
              )}
            </div>
            <button
              onClick={() => setShowRoomSheet(true)}
              className="text-[10px] px-2 py-1 rounded-lg focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none"
              style={{ background: 'rgba(78,205,196,0.12)', color: 'var(--color-teal)' }}
            >
              {t('focus.viewRoom')}
            </button>
          </div>
        )}

        {/* No-task hint */}
        {allTasks.length > 0 && selectedTask === null && (
          <div className="mx-5 mb-3 flex items-center gap-2">
            <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
              {t('focus.noTaskSelected')}
            </span>
          </div>
        )}

        {/* Start button + breathwork opt-in + rooms discovery */}
        <div className="px-5 space-y-2">
          <button
            onClick={() => handleStart()}
            aria-label="Start focus session"
            className="w-full py-4 rounded-2xl font-bold text-base transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none"
            style={{
              background: 'linear-gradient(135deg, #7B72FF, #8B7FF7)',
              color: 'white',
              boxShadow: '0 8px 32px rgba(123,114,255,0.3)',
            }}
          >
            {t('focus.startFocus')}
          </button>
          <button
            onClick={() => setShowBreathwork(true)}
            aria-label="Start focus session with breathing ritual"
            className="w-full py-2 text-[12px] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {t('focus.breatheFirst')}
          </button>

          {/* Focus Rooms discovery hint */}
          <FeatureHint
            id="hint_focus_rooms"
            icon="🤝"
            text={t('focus.focusRoomsHint')}
            delay={3000}
          />

          {/* Focus with someone — S-3/S-4 */}
          {room.status === 'idle' && (
            <button
              onClick={() => setShowRoomSheet(true)}
              className="w-full py-1.5 text-[12px] flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {t('focus.focusWithSomeone')}
            </button>
          )}
        </div>
      </div>

      {/* Breathwork ritual overlay — lazy loaded, only when user opts in */}
      <AnimatePresence>
        {showBreathwork && (
          <div className="fixed inset-0 z-50">
            <Suspense fallback={null}>
              <LazyBreathworkRitual
                onComplete={() => { setShowBreathwork(false); handleStart() }}
                onSkip={() => { setShowBreathwork(false); handleStart() }}
              />
            </Suspense>
          </div>
        )}
      </AnimatePresence>

      {/* Focus Room sheet */}
      <AnimatePresence>
        {showRoomSheet && (
          <FocusRoomSheet
            room={room}
            onClose={() => setShowRoomSheet(false)}
            onReady={() => handleStart()}
          />
        )}
      </AnimatePresence>
    </>
  )
}
