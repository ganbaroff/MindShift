import { motion } from 'motion/react'
import { useMotion } from '@/shared/hooks/useMotion'
import { useStore } from '@/store'
import { useAudioEngine } from '@/shared/hooks/useAudioEngine'
import { CoachMark } from '@/shared/ui/CoachMark'
import { AUDIO_WARNING_VOLUME } from '@/shared/lib/constants'
import type { AudioPreset } from '@/types'

// ── Preset config (Research #3: scientifically renamed) ─────────────────────

const PRESETS: { id: AudioPreset; emoji: string; name: string; subtitle: string; color: string; tag?: string }[] = [
  { id: 'brown',  emoji: '🟤', name: 'Calm Focus',     subtitle: 'Brown noise — silences racing thoughts', color: '#8B6F47', tag: 'ADHD default' },
  { id: 'pink',   emoji: '🩷', name: 'Deep Work',      subtitle: 'Pink noise — strongest clinical evidence', color: '#E879A0', tag: 'Validated' },
  { id: 'lofi',   emoji: '🎵', name: 'Flow State',     subtitle: 'Lo-fi beats — 70-90 BPM, no lyrics',     color: '#6C63FF' },
  { id: 'nature', emoji: '🌿', name: 'Nature Restore', subtitle: 'Organic soundscape — parasympathetic calm', color: '#4ECDC4' },
  { id: 'gamma',  emoji: '⚡', name: 'Gamma Focus',    subtitle: '40 Hz binaural — narrows attention spotlight', color: '#FFE66D', tag: 'Headphones' },
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
  const pct = Math.round(volume * 100)
  const isWarning = volume > AUDIO_WARNING_VOLUME

  // Approximate dBA mapping for user reference
  const approxDba = Math.round(40 + volume * 30) // 40-70 dBA range

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: '#8B8BA7' }}>VOLUME</span>
        <span className="text-xs font-mono" style={{ color: isWarning ? '#FFE66D' : '#8B8BA7' }}>
          {pct}%{isWarning ? '  — getting loud' : ''}
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
        ~{approxDba} dBA — {approxDba < 55 ? 'quiet background' : approxDba < 65 ? 'comfortable focus zone' : 'optimal for deep work (65-75 dBA)'} 🎧
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
  const { shouldAnimate, t } = useMotion()

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
      <motion.div
        className="px-5 pt-10 pb-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={t()}
      >
        <h1 className="text-2xl font-bold" style={{ color: '#E8E8F0' }}>
          Focus Audio 🎧
        </h1>
        <p className="text-sm mt-1" style={{ color: '#8B8BA7' }}>
          Science-backed sound for your brain. Pick what feels right.
        </p>
      </motion.div>

      {/* Preset cards — 2-col grid, gamma spans full width */}
      <div className="px-5 grid grid-cols-2 gap-3 mb-6">
        {PRESETS.map((preset, idx) => {
          const isActive = isPlaying && activePreset === preset.id
          const isAnchor = focusAnchor === preset.id
          const isWide = preset.id === 'gamma' // last one spans full width

          return (
            <motion.button
              key={preset.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...t(), delay: idx * 0.06 }}
              whileTap={shouldAnimate ? { scale: 0.97 } : {}}
              onClick={() => handlePresetClick(preset.id)}
              className={`flex flex-col gap-2 p-4 rounded-2xl text-left relative overflow-hidden ${isWide ? 'col-span-2' : ''}`}
              style={{
                background: isActive ? `${preset.color}18` : '#1A1D2E',
                border: `1.5px solid ${isActive ? preset.color : '#2D3150'}`,
                boxShadow: isActive ? `0 0 20px ${preset.color}20` : 'none',
              }}
            >
              {/* Active glow ring */}
              {isActive && (
                <div
                  className="absolute inset-0 rounded-2xl pointer-events-none"
                  style={{
                    background: `radial-gradient(circle at 30% 30%, ${preset.color}12, transparent 70%)`,
                  }}
                />
              )}

              {/* Top row */}
              <div className="flex items-start justify-between relative z-10">
                <span className="text-2xl">{preset.emoji}</span>
                <div className="flex gap-1.5">
                  {preset.tag && (
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: `${preset.color}20`,
                        color: preset.color,
                      }}
                    >
                      {preset.tag}
                    </span>
                  )}
                  {isAnchor && (
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: '#FFE66D20', color: '#FFE66D' }}
                    >
                      🎯
                    </span>
                  )}
                </div>
              </div>

              {/* Label */}
              <div className="relative z-10">
                <p className="text-sm font-semibold" style={{ color: '#E8E8F0' }}>
                  {preset.name}
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#8B8BA7' }}>
                  {preset.subtitle}
                </p>
              </div>

              {/* Playing indicator */}
              {isActive ? (
                <div className="flex items-center gap-2 relative z-10">
                  {shouldAnimate && <EqBars color={preset.color} />}
                  <span className="text-xs font-medium" style={{ color: preset.color }}>Playing</span>
                </div>
              ) : (
                <span className="text-xs relative z-10" style={{ color: '#8B8BA7' }}>Tap to play</span>
              )}
            </motion.button>
          )
        })}
      </div>

      {/* Volume control */}
      <motion.div
        className="mx-5 p-4 rounded-2xl mb-4"
        style={{ background: '#1A1D2E', border: '1.5px solid #2D3150' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ ...t(), delay: 0.3 }}
      >
        <VolumeBar volume={audioVolume} onChange={handleVolume} />
      </motion.div>

      {/* Sound Anchor */}
      <motion.div
        className="mx-5 p-4 rounded-2xl mb-4"
        style={{ background: '#1A1D2E', border: '1.5px solid #2D3150' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ ...t(), delay: 0.35 }}
      >
        <div className="mb-3">
          <p className="text-sm font-semibold" style={{ color: '#E8E8F0' }}>
            🎯 Sound Anchor
          </p>
          <p className="text-xs mt-0.5" style={{ color: '#8B8BA7' }}>
            Your brain learns this sound = focus time. Pavlovian conditioning — 1-2 weeks of daily use.
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
      </motion.div>

      {/* Progressive disclosure: Sound Anchor hint on first visit */}
      <CoachMark
        hintId="audio_anchor_hint"
        emoji="🎯"
        message="Set a Sound Anchor below — your brain learns this sound = focus time in 1-2 weeks."
      />

      {/* Science note */}
      <motion.div
        className="mx-5 p-4 rounded-2xl"
        style={{ background: '#1A1D2E', border: '1.5px dashed #2D3150' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ ...t(), delay: 0.4 }}
      >
        <p className="text-xs leading-relaxed" style={{ color: '#8B8BA7' }}>
          🧬{' '}
          <strong style={{ color: '#E8E8F0' }}>Research-backed sound.</strong>
          {' '}Pink noise has the strongest clinical evidence for ADHD (OHSU meta-analysis, g=0.249, p{'<'}0.0001).
          Brown noise (1/f²) is anecdotally #1 for silencing racing thoughts.
          40 Hz gamma binaural beats narrow the attentional spotlight and enhance working memory
          (Leiden Institute; MIT Tsai Lab) — requires stereo headphones.
          Optimal volume: 65–75 dBA. Silence is counterproductive for ADHD brains.
        </p>
      </motion.div>
    </div>
  )
}
