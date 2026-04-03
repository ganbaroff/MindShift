/**
 * FocusSoundPicker — Sound accordion + medication peak badge
 *
 * Extracted from FocusSetup.tsx (Sprint BC+1 decomposition).
 * Reads its own store slices directly; no store prop-drilling.
 * Contains: SOUND_PRESETS constant, MED_PEAK_HOURS helper,
 *           accordion toggle, preview playback, muted-volume hint,
 *           and the medication peak window badge (B-12).
 */

import { useState, useMemo, useCallback } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import i18n from '@/i18n'
import { useStore } from '@/store'
import { useAudioEngine } from '@/shared/hooks/useAudioEngine'
import { useMotion } from '@/shared/hooks/useMotion'
import type { AudioPreset } from '@/types'

// ── Sound preset metadata ─────────────────────────────────────────────────────
export const SOUND_PRESETS: { key: AudioPreset; emoji: string; labelKey: string }[] = [
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
    return i18n.t('focus.medPeakWindow', { start: fmt(start), end: fmt(end) })
  }
  return null
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface FocusSoundPickerProps {
  focusAnchor: AudioPreset | null
}

export function FocusSoundPicker({ focusAnchor }: FocusSoundPickerProps) {
  const { t } = useTranslation()
  const { shouldAnimate } = useMotion()
  const { play, stop, isPlaying } = useAudioEngine()

  const { medicationEnabled, medicationTime, setFocusAnchor, audioVolume } = useStore()

  const [soundPickerOpen, setSoundPickerOpen] = useState(false)
  const [previewingKey, setPreviewingKey] = useState<AudioPreset | null>(null)

  // ── Sound pick handler ───────────────────────────────────────────────────
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

  // ── Medication peak window (B-12) ─────────────────────────────────────────
  const medPeakLabel = useMemo(
    () => medicationEnabled ? getMedPeakLabel(medicationTime ?? null) : null,
    [medicationEnabled, medicationTime],
  )

  return (
    <>
      {/* Sound accordion */}
      <div className="mx-5 mb-4">
        <button
          onClick={() => setSoundPickerOpen(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none"
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
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(78,205,196,0.15)', color: 'var(--color-teal)' }}
              >
                ♪
              </span>
            )}
          </div>
          <motion.span
            animate={{ rotate: soundPickerOpen ? 180 : 0 }}
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
                    className="flex flex-col items-center gap-1 py-2.5 rounded-xl text-center focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none"
                    style={{
                      background: focusAnchor === preset.key ? 'rgba(78,205,196,0.15)' : 'var(--color-card)',
                      border: focusAnchor === preset.key
                        ? '1px solid rgba(78,205,196,0.4)'
                        : '1px solid var(--color-border-subtle)',
                    }}
                    aria-pressed={focusAnchor === preset.key}
                    aria-label={t(preset.labelKey)}
                  >
                    <span className="text-lg">{preset.emoji}</span>
                    <span
                      className="text-[11px] font-medium"
                      style={{ color: focusAnchor === preset.key ? 'var(--color-teal)' : 'var(--color-muted)' }}
                    >
                      {t(preset.labelKey)}
                    </span>
                  </button>
                ))}

                {/* None / off option */}
                <button
                  onClick={() => handleSoundPick(null)}
                  className="flex flex-col items-center gap-1 py-2.5 rounded-xl text-center focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none"
                  style={{
                    background: !focusAnchor ? 'rgba(139,139,167,0.15)' : 'var(--color-card)',
                    border: !focusAnchor
                      ? '1px solid rgba(139,139,167,0.4)'
                      : '1px solid var(--color-border-subtle)',
                  }}
                  aria-pressed={!focusAnchor}
                  aria-label={t('focus.soundNone')}
                >
                  <span className="text-lg">🔇</span>
                  <span
                    className="text-[11px] font-medium"
                    style={{ color: !focusAnchor ? 'var(--color-text-muted)' : 'var(--color-muted)' }}
                  >
                    {t('focus.soundNone')}
                  </span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Muted volume hint */}
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
          <span className="text-xs font-medium" style={{ color: 'var(--color-primary)' }}>
            {medPeakLabel}
          </span>
        </div>
      )}
    </>
  )
}
