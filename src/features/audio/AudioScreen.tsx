// Phase 7 — Audio Engine (coming in next phase)
// Will include: brown noise default, 4 presets, Sound Anchor, 2-min nature buffer

import { useStore } from '@/store'

const PRESETS = [
  { id: 'brown', emoji: '🟤', name: 'Deep Focus', subtitle: 'Brown noise — ADHD default', color: '#8B6F47' },
  { id: 'lofi',  emoji: '🎵', name: 'Flow State',  subtitle: 'Lo-fi 60–70 BPM',          color: '#6C63FF' },
  { id: 'nature',emoji: '🌿', name: 'Nature Restore', subtitle: '1/f nature sounds',     color: '#4ECDC4' },
  { id: 'pink',  emoji: '🩷', name: 'Light Masking',  subtitle: 'Pink noise — reading',  color: '#FFB5C8' },
] as const

export default function AudioScreen() {
  const { activePreset, focusAnchor, setPreset, setFocusAnchor } = useStore()

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
          const isActive = activePreset === preset.id
          const isAnchor = focusAnchor === preset.id
          return (
            <button
              key={preset.id}
              onClick={() => setPreset(isActive ? null : preset.id)}
              className="flex flex-col gap-2 p-4 rounded-2xl text-left transition-all duration-200"
              style={{
                background: isActive ? `${preset.color}20` : '#1A1D2E',
                border: `1.5px solid ${isActive ? preset.color : '#2D3150'}`,
              }}
            >
              <div className="flex items-start justify-between">
                <span className="text-2xl">{preset.emoji}</span>
                {isAnchor && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#FFE66D20', color: '#FFE66D' }}>
                    🎯 Anchor
                  </span>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: '#E8E8F0' }}>{preset.name}</p>
                <p className="text-xs mt-0.5" style={{ color: '#8B8BA7' }}>{preset.subtitle}</p>
              </div>
              {isActive && (
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: preset.color }} />
                  <span className="text-xs" style={{ color: preset.color }}>Playing</span>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Sound Anchor */}
      <div className="mx-5 p-4 rounded-2xl mb-4" style={{ background: '#1A1D2E', border: '1.5px solid #2D3150' }}>
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-sm font-semibold" style={{ color: '#E8E8F0' }}>🎯 Sound Anchor</p>
            <p className="text-xs mt-0.5" style={{ color: '#8B8BA7' }}>
              Train your brain to focus on demand (1–2 weeks)
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {PRESETS.map(preset => (
            <button
              key={preset.id}
              onClick={() => setFocusAnchor(focusAnchor === preset.id ? null : preset.id)}
              className="flex items-center gap-3 p-2 rounded-xl transition-all duration-200"
              style={{
                background: focusAnchor === preset.id ? `${preset.color}15` : 'transparent',
                border: `1px solid ${focusAnchor === preset.id ? preset.color : 'transparent'}`,
              }}
            >
              <span>{preset.emoji}</span>
              <span className="text-sm flex-1 text-left" style={{ color: '#E8E8F0' }}>{preset.name}</span>
              {focusAnchor === preset.id && (
                <span className="text-xs" style={{ color: '#FFE66D' }}>★ Set as anchor</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Full audio engine note */}
      <div className="mx-5 p-4 rounded-2xl" style={{ background: '#1A1D2E', border: '1.5px dashed #2D3150' }}>
        <p className="text-xs text-center" style={{ color: '#8B8BA7' }}>
          🔧 Full Web Audio API engine (brown/pink noise generation, volume control, 2-min nature buffer) coming in Phase 7
        </p>
      </div>
    </div>
  )
}
