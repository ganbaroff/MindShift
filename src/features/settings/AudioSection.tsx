/**
 * AudioSection — Focus sound presets + volume
 *
 * Preview each sound, lock one as focus anchor, set volume.
 */

import { useState } from 'react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useMotion } from '@/shared/hooks/useMotion'
import { useStore } from '@/store'
import { useAudioEngine } from '@/shared/hooks/useAudioEngine'
import { Section } from './SettingsPrimitives'
import type { AudioPreset } from '@/types'

const AUDIO_PRESET_KEYS: { key: AudioPreset; emoji: string; labelKey: string; descKey: string }[] = [
  { key: 'brown',   emoji: '🌊', labelKey: 'settings.soundBrown',   descKey: 'settings.soundBrownDesc' },
  { key: 'pink',    emoji: '🌧️', labelKey: 'settings.soundPink',    descKey: 'settings.soundPinkDesc' },
  { key: 'nature',  emoji: '🌿', labelKey: 'settings.soundNature',  descKey: 'settings.soundNatureDesc' },
  { key: 'lofi',    emoji: '🎵', labelKey: 'settings.soundLofi',    descKey: 'settings.soundLofiDesc' },
  { key: 'gamma',   emoji: '⚡',  labelKey: 'settings.soundGamma',   descKey: 'settings.soundGammaDesc' },
  { key: 'gamma60', emoji: '🧠', labelKey: 'settings.soundGamma60', descKey: 'settings.soundGamma60Desc' },
]

export function AudioSection() {
  const { t } = useTranslation()
  const { shouldAnimate } = useMotion()
  const { focusAnchor, setFocusAnchor, audioVolume, setVolume: setStoreVolume } = useStore()
  const { play, stop, isPlaying, setVolume: setEngineVolume } = useAudioEngine()

  const [previewPreset, setPreviewPreset] = useState<AudioPreset | null>(null)

  const handlePresetPreview = (preset: AudioPreset) => {
    if (previewPreset === preset && isPlaying) {
      stop()
      setPreviewPreset(null)
    } else {
      void play(preset)
      setPreviewPreset(preset)
    }
  }

  const handleSetFocusAnchor = (preset: AudioPreset) => {
    setFocusAnchor(focusAnchor === preset ? null : preset)
  }

  return (
    <Section label={t('settings.sound')}>
      <p className="text-[11px] mb-2" style={{ color: 'var(--color-text-muted)' }}>
        {t('settings.soundPreviewHint')}
      </p>
      <div className="space-y-1.5">
        {AUDIO_PRESET_KEYS.map((p) => {
          const isAnchor = focusAnchor === p.key
          const isPreviewing = previewPreset === p.key && isPlaying
          const label = t(p.labelKey)
          return (
            <div key={p.key} className="flex items-center gap-2">
              <motion.button
                whileTap={shouldAnimate ? { scale: 0.97 } : undefined}
                onClick={() => handlePresetPreview(p.key)}
                className="flex-1 flex items-center gap-2 h-10 rounded-xl px-3 text-left focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none"
                style={{
                  backgroundColor: isPreviewing ? 'rgba(123,114,255,0.15)' : 'var(--color-surface-raised)',
                  borderWidth: isPreviewing ? 1.5 : 1,
                  borderStyle: 'solid',
                  borderColor: isPreviewing ? 'var(--color-primary)' : 'var(--color-border-subtle)',
                }}
                aria-label={`${isPreviewing ? 'Stop' : 'Preview'} ${label} noise`}
                aria-pressed={isPreviewing}
              >
                <span className="text-[16px]">{p.emoji}</span>
                <div className="flex-1">
                  <p className="text-[13px] font-medium leading-none" style={{ color: isPreviewing ? 'var(--color-primary)' : 'var(--color-text-primary)' }}>
                    {label}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{t(p.descKey)}</p>
                </div>
                {isPreviewing && (
                  <span className="text-[10px]" style={{ color: 'var(--color-primary)' }}>▶ {t('settings.soundPlaying')}</span>
                )}
              </motion.button>
              <motion.button
                whileTap={shouldAnimate ? { scale: 0.9 } : undefined}
                onClick={() => handleSetFocusAnchor(p.key)}
                className="w-9 h-10 rounded-xl flex items-center justify-center text-[16px] focus-visible:ring-2 focus-visible:ring-[var(--color-teal)] focus-visible:outline-none"
                style={{
                  backgroundColor: isAnchor ? 'rgba(78,205,196,0.15)' : 'var(--color-surface-raised)',
                  borderWidth: isAnchor ? 1.5 : 1,
                  borderStyle: 'solid',
                  borderColor: isAnchor ? 'var(--color-teal)' : 'var(--color-border-subtle)',
                }}
                aria-label={isAnchor ? `Remove ${label} as focus anchor` : `Set ${label} as focus anchor`}
                aria-pressed={isAnchor}
              >
                🔒
              </motion.button>
            </div>
          )
        })}
      </div>
      {/* Volume slider */}
      <div className="mt-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[11px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
            {t('settings.volume')}
          </p>
          <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{Math.round(audioVolume * 100)}%</p>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={audioVolume}
          onChange={(e) => {
            const v = parseFloat(e.target.value)
            setStoreVolume(v)
            setEngineVolume(v)
          }}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{ accentColor: 'var(--color-primary)' }}
          aria-label="Audio volume"
        />
      </div>
    </Section>
  )
}
