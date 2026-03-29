/**
 * FocusSetup — Setup/pre-session UI for FocusScreen
 *
 * Extracted from FocusScreen.tsx to reduce orchestrator size.
 * Contains: progress strip, ADHD tip, bookmark anchor, task picker,
 * duration presets, sound anchor, medication badge, room status,
 * start button, breathwork overlay, and room sheet.
 *
 * All business logic remains in useFocusSession.ts — this is pure UI.
 */

import { useState, useMemo, useCallback } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BreathworkRitual } from './BreathworkRitual'
import { FocusRoomSheet } from './FocusRoomSheet'
import { clearBookmark } from './useFocusSession'
import { useStore } from '@/store'
import { useAudioEngine } from '@/shared/hooks/useAudioEngine'
import { useMotion } from '@/shared/hooks/useMotion'
import type { Task, AudioPreset } from '@/types'
import type { FocusRoomState } from '@/shared/hooks/useFocusRoom'
import { FeatureHint } from '@/shared/ui/FeatureHint'

// ── Sound preset metadata ─────────────────────────────────────────────────────
const SOUND_PRESETS: { key: AudioPreset; emoji: string; labelKey: string }[] = [
  { key: 'brown',   emoji: '🌊', labelKey: 'settings.soundBrown' },
  { key: 'pink',    emoji: '🌧️', labelKey: 'settings.soundPink' },
  { key: 'nature',  emoji: '🌿', labelKey: 'settings.soundNature' },
  { key: 'lofi',    emoji: '🎵', labelKey: 'settings.soundLofi' },
  { key: 'gamma',   emoji: '⚡',  labelKey: 'settings.soundGamma' },
  { key: 'gamma60', emoji: '🧠', labelKey: 'settings.soundGamma60' },
]

// ── Medication peak window helper (B-12) ──────────────────────────────────────
const MED_PEAK_HOURS: Record<string, [number, number]> = {
  morning:   [8,  11],
  afternoon: [13, 16],
  evening:   [17, 20],
}
function getMedPeakLabel(medicationTime: string | null): string | null {
  if (!medicationTime) return null
  const [start, end] = MED_PEAK_HOURS[medicationTime] ?? []
  if (!start) return null
  const h = new Date().getHours()
  if (h >= start && h <= end) {
    const fmt = (n: number) => `${n > 12 ? n - 12 : n}${n >= 12 ? 'pm' : 'am'}`
    return `⚡ Med peak window: ${fmt(start)}–${fmt(end)}`
  }
  return null
}

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
  const [soundPickerOpen, setSoundPickerOpen] = useState(false)
  const [previewingKey, setPreviewingKey] = useState<AudioPreset | null>(null)
  const { t } = useTranslation()
  const { shouldAnimate } = useMotion()
  const { play, stop, isPlaying } = useAudioEngine()

  // Store values for setup-specific UI
  const { medicationEnabled, medicationTime, timeBlindness, emotionalReactivity, weeklyIntention, weeklyStats, completedTotal, setFocusAnchor, audioVolume } = useStore()

  // ── Sound picker handlers ────────────────────────────────────────────────────
  const handleSoundPick = useCallback((key: AudioPreset | null) => {
    setFocusAnchor(key)
    if (key) {
      if (isPlaying) stop()
      play(key)
      setPreviewingKey(key)
      setTimeout(() => { stop(); setPreviewingKey(null) }, 2000)
    } else {
      if (isPlaying) stop()
      setPreviewingKey(null)
    }
    setSoundPickerOpen(false)
  }, [setFocusAnchor, play, stop, isPlaying])

  // ── Medication peak window (B-12) ──────────────────────────────────────────
  const medPeakLabel = useMemo(
    () => medicationEnabled ? getMedPeakLabel(medicationTime ?? null) : null,
    [medicationEnabled, medicationTime],
  )

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

  // ── Today's progress strip (W) ────────────────────────────────────────────
  const todayFocusMin = useMemo(() => {
    const idx = (new Date().getDay() + 6) % 7 // Mon=0…Sun=6
    return weeklyStats?.dailyMinutes?.[idx] ?? 0
  }, [weeklyStats])

  return (
    <>
    <div className="flex flex-col pb-28" style={{ background: 'var(--color-bg)' }}>
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
              style={{ background: 'rgba(123,114,255,0.10)', color: '#C8C0FF' }}
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
            {savedBookmark.taskId && allTasks.find(t => t.id === savedBookmark.taskId) && (
              <button
                onClick={() => {
                  const task = allTasks.find(t => t.id === savedBookmark.taskId)
                  if (task) setSelectedTask(task)
                  clearBookmark()
                }}
                className="flex-1 py-2 rounded-xl text-xs font-semibold"
                style={{ background: 'var(--color-primary-alpha)', border: '1.5px solid var(--color-primary)', color: 'var(--color-primary)' }}
              >
                {t('focus.continueTask')}
              </button>
            )}
            <button
              onClick={clearBookmark}
              className="py-2 px-4 rounded-xl text-xs"
              style={{ color: 'var(--color-muted)', border: '1px solid var(--color-border-subtle)' }}
            >
              {t('focus.dismiss')}
            </button>
          </div>
        </div>
      )}

      {/* Task picker / empty state */}
      {allTasks.length === 0 ? (
        <div className="mx-5 mb-6 p-6 rounded-2xl flex flex-col items-center text-center"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border-subtle)' }}
        >
          <span style={{ fontSize: 40 }} className="mb-3">🎯</span>
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>{t('focus.noTasksYet')}</p>
          <p className="text-xs mb-4 leading-relaxed" style={{ color: 'var(--color-muted)' }}>
            {t('focus.pickATask')}
          </p>
          <Link
            to="/tasks"
            className="px-5 py-2.5 rounded-xl text-xs font-semibold transition-all"
            style={{ background: 'var(--color-primary-alpha)', border: '1.5px solid var(--color-primary)', color: 'var(--color-primary)' }}
          >
            {t('focus.goToTasks')}
          </Link>
        </div>
      ) : (
        <div className="px-5 mb-6">
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-muted)' }}>{t('focus.taskOptional')}</p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setSelectedTask(null)}
              aria-pressed={selectedTask === null}
              aria-label="Open focus — no specific task"
              className="flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200"
              style={{
                background: selectedTask === null ? 'var(--color-primary-alpha)' : 'var(--color-card)',
                border: `1.5px solid ${selectedTask === null ? 'var(--color-primary)' : 'var(--color-border-subtle)'}`,
              }}
            >
              <span>🧠</span>
              <span className="text-sm" style={{ color: selectedTask === null ? 'var(--color-primary)' : 'var(--color-text)' }}>
                {t('focus.openFocus')}
              </span>
            </button>

            {allTasks.slice(0, 5).map(task => {
              const isSelected = selectedTask?.id === task.id
              return (
                <button
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  aria-pressed={isSelected}
                  aria-label={`Focus on: ${task.title}`}
                  className="flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200"
                  style={{
                    background: isSelected ? 'var(--color-primary-alpha)' : 'var(--color-card)',
                    border: `1.5px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border-subtle)'}`,
                  }}
                >
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-md font-medium"
                    style={{ background: 'var(--color-elevated)', color: 'var(--color-muted)' }}
                  >
                    {task.pool === 'now' ? t('tasks.now') : t('tasks.next')}
                  </span>
                  <span className="text-sm flex-1" style={{ color: isSelected ? 'var(--color-primary)' : 'var(--color-text)' }}>
                    {task.title}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Duration presets — hidden in surprise mode (O-9: full time-blindness) */}
      {timerStyle === 'surprise' && (
        <div
          className="mx-5 mb-6 px-4 py-3 rounded-2xl flex items-center gap-3"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border-subtle)' }}
        >
          <span className="text-xl">🎲</span>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{t('focus.surpriseMode')}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
              {t('focus.surpriseDesc')}
            </p>
          </div>
        </div>
      )}
      {timerStyle !== 'surprise' && (
      <div className="px-5 mb-6">
        <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-muted)' }}>
          {t('focus.duration')}
          <span className="ml-2 font-normal" style={{ color: 'var(--color-primary)' }}>
            ({t('focus.smart')}: {smartDuration}m)
          </span>
        </p>
        <div className="flex gap-2">
          {TIMER_PRESETS.map(min => {
            const isActive = selectedDuration === min && !showCustom
            const isRecommended = min === smartDuration
            return (
              <button
                key={min}
                onClick={() => { setSelectedDuration(min); setShowCustom(false) }}
                aria-pressed={isActive}
                aria-label={`${min} minutes${isRecommended ? ' (recommended)' : ''}`}
                className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all duration-200 relative"
                style={{
                  background:  isActive ? 'var(--color-primary-alpha)' : 'var(--color-card)',
                  border:      `1.5px solid ${isActive ? 'var(--color-primary)' : 'var(--color-border-subtle)'}`,
                  color:       isActive ? 'var(--color-primary)' : 'var(--color-text)',
                }}
              >
                {min}m
                {isRecommended && (
                  <span
                    className="absolute -top-1.5 -right-1.5 text-xs w-4 h-4 flex items-center justify-center rounded-full"
                    style={{ background: 'var(--color-primary)', color: 'white', fontSize: '8px' }}
                  >
                    ✦
                  </span>
                )}
              </button>
            )
          })}
          <button
            onClick={() => setShowCustom(true)}
            aria-label="Custom duration"
            className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all duration-200"
            style={{
              background: showCustom ? 'var(--color-primary-alpha)' : 'var(--color-card)',
              border:     `1.5px solid ${showCustom ? 'var(--color-primary)' : 'var(--color-border-subtle)'}`,
              color:      showCustom ? 'var(--color-primary)' : 'var(--color-muted)',
            }}
          >
            ✎
          </button>
        </div>

        {showCustom && (
          <div className="mt-3 flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="180"
              value={customDuration}
              onChange={e => setCustomDuration(e.target.value)}
              placeholder={t('focus.minutesPlaceholder')}
              autoFocus
              className="flex-1 px-4 py-2.5 rounded-xl text-sm focus:outline-none"
              style={{ background: 'var(--color-card)', border: '1.5px solid var(--color-primary)', color: 'var(--color-text)' }}
            />
            <span className="text-sm" style={{ color: 'var(--color-muted)' }}>min</span>
          </div>
        )}
      </div>
      )} {/* end timerStyle !== 'surprise' */}

      {/* Sound picker */}
      <div className="mx-5 mb-4">
        <button
          onClick={() => setSoundPickerOpen(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl focus-visible:ring-2 focus-visible:ring-ms-primary/50 focus-visible:outline-none"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border-subtle)' }}
          aria-expanded={soundPickerOpen}
          aria-label={t('focus.soundPicker')}
        >
          <div className="flex items-center gap-2">
            <span className="text-base">
              {focusAnchor
                ? (SOUND_PRESETS.find(p => p.key === focusAnchor)?.emoji ?? '🔊')
                : '🔇'}
            </span>
            <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
              {focusAnchor
                ? t(SOUND_PRESETS.find(p => p.key === focusAnchor)?.labelKey ?? 'focus.soundNone')
                : t('focus.soundNone')}
            </span>
            {previewingKey && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(78,205,196,0.15)', color: 'var(--color-teal)' }}>
                ♪
              </span>
            )}
          </div>
          <motion.span
            animate={shouldAnimate ? { rotate: soundPickerOpen ? 180 : 0 } : { rotate: soundPickerOpen ? 180 : 0 }}
            transition={shouldAnimate ? { duration: 0.2 } : { duration: 0 }}
            className="text-xs"
            style={{ color: 'var(--color-muted)' }}
          >
            ▾
          </motion.span>
        </button>
        <AnimatePresence>
          {soundPickerOpen && (
            <motion.div
              initial={shouldAnimate ? { opacity: 0, height: 0 } : false}
              animate={shouldAnimate ? { opacity: 1, height: 'auto' } : false}
              exit={shouldAnimate ? { opacity: 0, height: 0 } : undefined}
              className="overflow-hidden"
            >
              <div className="pt-2 grid grid-cols-3 gap-2">
                {SOUND_PRESETS.map(preset => (
                  <button
                    key={preset.key}
                    onClick={() => handleSoundPick(preset.key)}
                    className="flex flex-col items-center gap-1 py-2.5 rounded-xl text-center focus-visible:ring-2 focus-visible:ring-ms-primary/50 focus-visible:outline-none"
                    style={{
                      background: focusAnchor === preset.key ? 'rgba(78,205,196,0.15)' : 'var(--color-card)',
                      border: focusAnchor === preset.key ? '1px solid rgba(78,205,196,0.4)' : '1px solid var(--color-border-subtle)',
                    }}
                    aria-pressed={focusAnchor === preset.key}
                    aria-label={t(preset.labelKey)}
                  >
                    <span className="text-lg">{preset.emoji}</span>
                    <span className="text-[11px] font-medium" style={{ color: focusAnchor === preset.key ? 'var(--color-teal)' : 'var(--color-muted)' }}>
                      {t(preset.labelKey)}
                    </span>
                  </button>
                ))}
                <button
                  onClick={() => handleSoundPick(null)}
                  className="flex flex-col items-center gap-1 py-2.5 rounded-xl text-center focus-visible:ring-2 focus-visible:ring-ms-primary/50 focus-visible:outline-none"
                  style={{
                    background: !focusAnchor ? 'rgba(139,139,167,0.15)' : 'var(--color-card)',
                    border: !focusAnchor ? '1px solid rgba(139,139,167,0.4)' : '1px solid var(--color-border-subtle)',
                  }}
                  aria-pressed={!focusAnchor}
                  aria-label={t('focus.soundNone')}
                >
                  <span className="text-lg">🔇</span>
                  <span className="text-[11px] font-medium" style={{ color: !focusAnchor ? 'var(--color-text-muted)' : 'var(--color-muted)' }}>
                    {t('focus.soundNone')}
                  </span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {focusAnchor && audioVolume === 0 && (
          <p className="mt-1.5 text-[11px] text-center" style={{ color: 'var(--color-muted)' }}>
            {t('focus.soundMutedHint')}
          </p>
        )}
      </div>

      {/* Medication peak window badge — B-12 */}
      {medPeakLabel && (
        <div
          className="mx-5 mb-4 px-3 py-2 rounded-xl flex items-center gap-2"
          style={{ background: 'rgba(123,114,255,0.10)', border: '1px solid rgba(123,114,255,0.20)' }}
        >
          <span className="text-xs font-medium" style={{ color: 'var(--color-primary)' }}>{medPeakLabel}</span>
        </div>
      )}

      {/* Focus Room — active room status chip */}
      {room.status === 'connected' && room.code && (
        <div
          className="mx-5 mb-4 px-4 py-2.5 rounded-2xl flex items-center gap-3"
          style={{ background: 'rgba(78,205,196,0.08)', border: '1px solid rgba(78,205,196,0.20)' }}
        >
          <span className="text-base">🤝</span>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold" style={{ color: 'var(--color-teal)' }}>
              Room {room.code} · {room.peers.length + 1} focusing
            </p>
            {room.peers.length === 0 && (
              <p className="text-[10px]" style={{ color: '#5A5B72' }}>{t('focus.waitingForPartner')}</p>
            )}
          </div>
          <button
            onClick={() => setShowRoomSheet(true)}
            className="text-[10px] px-2 py-1 rounded-lg"
            style={{ background: 'rgba(78,205,196,0.12)', color: 'var(--color-teal)' }}
          >
            View
          </button>
        </div>
      )}

      {/* No-task hint — subtle label when focusing freely */}
      {allTasks.length > 0 && selectedTask === null && (
        <div className="mx-5 mb-3 flex items-center gap-2">
          <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            {t('focus.noTaskSelected')}
          </span>
        </div>
      )}

      {/* Start button */}
      <div className="px-5 space-y-2">
        <button
          onClick={() => setShowBreathwork(true)}
          aria-label="Start focus session with breathing ritual"
          className="w-full py-4 rounded-2xl font-bold text-base transition-all duration-200"
          style={{
            background: 'linear-gradient(135deg, #7B72FF, #8B7FF7)',
            color: 'white',
            boxShadow: '0 8px 32px rgba(123,114,255,0.3)',
          }}
        >
          {t('focus.startFocus')}
        </button>
        <button
          onClick={() => handleStart()}
          aria-label="Skip breathing ritual and start focus session"
          className="w-full py-2 text-[12px]"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {t('focus.skipRitual')}
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
            className="w-full py-1.5 text-[12px] flex items-center justify-center gap-1.5"
            style={{ color: '#5A5B72' }}
          >
            {t('focus.focusWithSomeone')}
          </button>
        )}
      </div>
    </div>

    {/* Breathwork ritual overlay */}
    <AnimatePresence>
      {showBreathwork && (
        <div className="fixed inset-0 z-50">
          <BreathworkRitual
            onComplete={() => {
              setShowBreathwork(false)
              handleStart()
            }}
            onSkip={() => {
              setShowBreathwork(false)
              handleStart()
            }}
          />
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
