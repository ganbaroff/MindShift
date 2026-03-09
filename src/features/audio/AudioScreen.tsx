import { motion } from 'motion/react'
import { useReducedMotion } from '@/shared/hooks/useReducedMotion'
import { useStore } from '@/store'
import { useAudioEngine } from '@/shared/hooks/useAudioEngine'
import { AUDIO_WARNING_VOLUME } from '@/shared/lib/constants'
import type { AudioPreset } from '@/types'

// ── Preset config ──────────────────────────────────────────────────────────────

const PRESETS: { id: AudioPreset; emoji: string; name: string; subtitle: string; color: string }[] = [
  { id: 'brown',  emoji: '🟤', name: 'Deep Focus',     subtitle: 'Brown noise — ADHD default',  color: '#8B6F47' },
  { id: 'lofi',   emoji: '🎵', name: 'Flow State',     subtitle: 'Lo-fi ambiance, 60–70 BPM',  color: '#6C63FF' },
  { id: 'nature', emoji: '🌿', name: 'Nature Restore', subtitle: 'Organic pink noise',          color: '#4ECDC4' },
  { id: 'pink',   emoji: '🩷', name: 'Light Masking',  subtitle: 'Pink noise — reading mode',  color: '#FFB5C8' },
]

// ── Animated equalizer bars ────────────────────────────────────────────────────

const BAR_HEIGHTS = [4, 8, 6, 10, 5, 9, 6]

function EqBars({ color }: { color: string }) {
  return (
    <div className="flex items-end gap-0.5" style={{ height: 12 }}>
      {BAR_HEIGHTS.map((h, i) => (
        <motion.div
          key={i}
          animate={{ scaleY: [1, 1 + h * 0.05, 0.8, 1 + h * 0.03, 1] }}
          transition={{
            duration: 0.5 + i * 0.08,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.06,
          }}
          style={{
            width: 2,
            height: h,
            background: color,
            borderRadius: 1,
            transformOrigin: 'bottom',
          }}
        />
      ))}
    </div>
  )
}

// ── Volume bar ─────────────────────────────────────────────────────────────────

function VolumeBar({
  volume,
  onChange,
}: {
  volume: number
  onChange: (v: number) => void
}) {
  // volume is a 0–1 normalized value; engine maps it logarithmically to safe gain
  const pct = Math.round(volume * 100)
  const isWarning = volume > AUDIO_WARNING_VOLUME

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: '#8B8BA7' }}>VOLUME</span>
        <span className="text-xs font-mono" style={{ color: isWarning ? '#FFE66D' : '#8B8BA7' }}>
          {pct}%{isWarning ? '  ⚠️ getting loud' : ''}
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={volume}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right,
            ${isWarning ? '#FFE66D' : '#6C63FF'} ${pct}%,
            #2D3150 ${pct}%)`,
          accentColor: isWarning ? '#FFE66D' : '#6C63FF',
        }}
      />

      <p className="text-xs" style={{ color: '#8B8BA7' }}>
        Volume mapped logarithmically — 47% ≈ 50 dBA (all-day safe) 🎧
      </p>
    </div>
  )
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function AudioScreen() {
  const {
    activePreset, audioVolume, focusAnchor,
    setPreset, setFocusAnchor, setVolume,
  } = useStore()

  const { play, stop: stopAudio, setVolume: setEngineVolume, isPlaying } = useAudioEngine()
  const reducedMotion = useReducedMotion()

  // Click a preset card: toggle if same, switch if different
  const handlePresetClick = (presetId: AudioPreset) => {
    if (isPlaying && activePreset === presetId) {
      stopAudio()
      setPreset(null)
    } else {
      play(presetId)
      setPreset(presetId)
    }
  }

  const handleVolume = (v: number) => {
    setVolume(v)
    setEngineVolume(v)
  }

  return (
    <div className="flex flex-col pb-28">
      {/* Header */}
      <div className="px-5 pt-10 pb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#E8E8F0' }}>
          Focus Audio 🎧
        </h1>
        <p className="text-sm mt-1" style={{ color: '#8B8BA7' }}>
          Sound for your brain. Brown noise is the ADHD-tuned default.
        </p>
      </div>

      {/* Preset cards */}
      <div className="px-5 grid grid-cols-2 gap-3 mb-6">
        {PRESETS.map(preset => {
          const isActive = isPlaying && activePreset === preset.id
          const isAnchor = focusAnchor === preset.id

          return (
            <motion.button
              key={preset.id}
              whileTap={reducedMotion ? {} : { scale: 0.97 }}
              onClick={() => handlePresetClick(preset.id)}
              className="flex flex-col gap-2 p-4 rounded-2xl text-left transition-all duration-200"
              style={{
                background: isActive ? `${preset.color}20` : '#1A1D2E',
                border: `1.5px solid ${isActive ? preset.color : '#2D3150'}`,
              }}
            >
              {/* Top row */}
              <div className="flex items-start justify-between">
                <span className="text-2xl">{preset.emoji}</span>
                {isAnchor && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: '#FFE66D20', color: '#FFE66D' }}
                  >
                    🎯
                  </span>
                )}
              </div>

              {/* Label */}
              <div>
                <p className="text-sm font-semibold" style={{ color: '#E8E8F0' }}>
                  {preset.name}
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#8B8BA7' }}>
                  {preset.subtitle}
                </p>
              </div>

              {/* Playing indicator */}
              {isActive ? (
                <div className="flex items-center gap-2">
                  {!reducedMotion && <EqBars color={preset.color} />}
                  <span className="text-xs" style={{ color: preset.color }}>Playing</span>
                </div>
              ) : (
                <span className="text-xs" style={{ color: '#8B8BA7' }}>Tap to play</span>
              )}
            </motion.button>
          )
        })}
      </div>

      {/* Volume control */}
      <div
        className="mx-5 p-4 rounded-2xl mb-4"
        style={{ background: '#1A1D2E', border: '1.5px solid #2D3150' }}
      >
        <VolumeBar volume={audioVolume} onChange={handleVolume} />
      </div>

      {/* Sound Anchor */}
      <div
        className="mx-5 p-4 rounded-2xl mb-4"
        style={{ background: '#1A1D2E', border: '1.5px solid #2D3150' }}
      >
        <div className="mb-3">
          <p className="text-sm font-semibold" style={{ color: '#E8E8F0' }}>
            🎯 Sound Anchor
          </p>
          <p className="text-xs mt-0.5" style={{ color: '#8B8BA7' }}>
            Consistent use trains your brain to focus on demand (1–2 weeks)
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          {PRESETS.map(preset => {
            const isSelected = focusAnchor === preset.id
            return (
              <button
                key={preset.id}
                onClick={() => setFocusAnchor(isSelected ? null : preset.id)}
                className="flex items-center gap-3 p-2.5 rounded-xl text-left transition-all duration-200"
                style={{
                  background: isSelected ? `${preset.color}15` : 'transparent',
                  border: `1px solid ${isSelected ? preset.color : 'transparent'}`,
                }}
              >
                <span>{preset.emoji}</span>
                <span className="text-sm flex-1" style={{ color: '#E8E8F0' }}>
                  {preset.name}
                </span>
                {isSelected && (
                  <span className="text-xs" style={{ color: '#FFE66D' }}>★ Anchor</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Science note */}
      <div
        className="mx-5 p-4 rounded-2xl"
        style={{ background: '#1A1D2E', border: '1.5px dashed #2D3150' }}
      >
        <p className="text-xs leading-relaxed" style={{ color: '#8B8BA7' }}>
          🧬{' '}
          <strong style={{ color: '#E8E8F0' }}>Research-backed sound.</strong>
          {' '}Pink noise is the most validated for ADHD focus (meta-analysis, g=0.249).
          Brown noise (1/f²) is popular for mind-wandering reduction. Nature sounds
          activate the parasympathetic system — great for recovery. Lo-fi uses a gentle
          low-pass filter for a warm, vintage texture without binaural gimmicks.
        </p>
      </div>
    </div>
  )
}
