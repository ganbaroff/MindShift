/**
 * AudioWidget — compact audio control for the bento grid.
 * Play/stop + preset selector in a single card row.
 */
import { motion } from 'motion/react'
import { useStore } from '@/store'
import { useAudioEngine } from '@/shared/hooks/useAudioEngine'
import type { AudioPreset } from '@/types'

const PRESETS: { id: AudioPreset; emoji: string; label: string; color: string }[] = [
  { id: 'brown',  emoji: '🟤', label: 'Deep',   color: '#8B6F47' },
  { id: 'pink',   emoji: '🩷', label: 'Light',  color: '#FFB5C8' },
  { id: 'nature', emoji: '🌿', label: 'Nature', color: '#4ECDC4' },
  { id: 'lofi',   emoji: '🎵', label: 'Lo-fi',  color: '#7B72FF' },
]

// Minimal animated bars for playing indicator
function MiniEq({ color }: { color: string }) {
  return (
    <div className="flex items-end gap-px" style={{ height: 10 }}>
      {[3, 6, 4, 8, 5].map((h, i) => (
        <motion.div
          key={i}
          animate={{ scaleY: [1, 1 + h * 0.1, 0.7, 1] }}
          transition={{ duration: 0.4 + i * 0.08, repeat: Infinity, ease: 'easeInOut', delay: i * 0.05 }}
          style={{ width: 2, height: h, background: color, borderRadius: 1, transformOrigin: 'bottom' }}
        />
      ))}
    </div>
  )
}

export function AudioWidget() {
  const { activePreset, setPreset } = useStore()
  const { play, stop, isPlaying } = useAudioEngine()

  const handlePreset = (id: AudioPreset) => {
    if (isPlaying && activePreset === id) {
      stop()
      setPreset(null)
    } else {
      void play(id)
      setPreset(id)
    }
  }

  const activeConfig = PRESETS.find(p => p.id === activePreset)

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium tracking-widest uppercase" style={{ color: '#8B8BA7' }}>
          Focus Audio
        </p>
        {isPlaying && activeConfig && (
          <div className="flex items-center gap-1.5">
            <MiniEq color={activeConfig.color} />
            <span className="text-xs" style={{ color: activeConfig.color }}>
              {activeConfig.label}
            </span>
          </div>
        )}
        {!isPlaying && (
          <span className="text-xs" style={{ color: '#8B8BA7' }}>Off</span>
        )}
      </div>

      {/* Preset buttons */}
      <div className="grid grid-cols-4 gap-1.5">
        {PRESETS.map(preset => {
          const isActive = isPlaying && activePreset === preset.id
          return (
            <motion.button
              key={preset.id}
              onClick={() => handlePreset(preset.id)}
              whileTap={{ scale: 0.91 }}
              className="flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all duration-150"
              style={{
                background: isActive ? `${preset.color}20` : '#252840',
                border: `1.5px solid ${isActive ? preset.color : 'transparent'}`,
              }}
            >
              <span className="text-base leading-none">{preset.emoji}</span>
              <span className="text-xs" style={{ color: isActive ? preset.color : '#8B8BA7' }}>
                {preset.label}
              </span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
