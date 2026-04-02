/**
 * SessionControls — Block 2b refactor
 *
 * Controls visible during an active focus session:
 *  - Audio toggle (sound on/off)
 *  - End session button (→ interrupt confirm)
 *  - "Park the thought" FAB + popover (quick capture without leaving focus)
 *
 * Fades out entirely in flow phase (≥ 15 min) — ambient, distraction-free.
 */

import { memo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Volume2, VolumeX } from 'lucide-react'
import { toast } from 'sonner'
import i18n from '@/i18n'
import { useMotion } from '@/shared/hooks/useMotion'

interface Props {
  isFlow: boolean
  isPlaying: boolean
  audioVolume: number
  onVolumeChange: (volume: number) => void
  parkOpen: boolean
  parkText: string
  onAudioToggle: () => void
  onStop: () => void
  onParkToggle: () => void
  onParkTextChange: (text: string) => void
  onParkSave: () => void
  onParkDismiss: () => void
}

export const SessionControls = memo(function SessionControls({
  isFlow,
  isPlaying,
  audioVolume,
  onVolumeChange,
  parkOpen,
  parkText,
  onAudioToggle,
  onStop,
  onParkToggle,
  onParkTextChange,
  onParkSave,
  onParkDismiss,
}: Props) {
  const { shouldAnimate, t } = useMotion()

  return (
    <>
      {/* Controls — fade out in flow phase */}
      <AnimatePresence>
        {!isFlow && (
          <motion.div
            initial={shouldAnimate ? { opacity: 0, y: 16 } : {}}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={t()}
            className="flex flex-col items-center gap-4 mt-8"
          >
            {/* Audio toggle */}
            <button
              onClick={onAudioToggle}
              aria-pressed={isPlaying}
              aria-label={isPlaying ? 'Sound on — tap to mute' : 'Sound off — tap to enable'}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[#4ECDC4] focus-visible:outline-none"
              style={{
                background: isPlaying ? 'rgba(78,205,196,0.12)' : 'var(--color-surface-card)',
                border: `1.5px solid ${isPlaying ? 'var(--color-teal)' : 'rgba(255,255,255,0.06)'}`,
                color: isPlaying ? 'var(--color-teal)' : 'var(--color-text-muted)',
              }}
            >
              {isPlaying ? '🔊 Sound on' : '🔇 Sound off'}
            </button>

            {/* Volume slider — visible when audio is playing */}
            {isPlaying && (
              <div className="flex items-center gap-2.5 w-52">
                <VolumeX size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={audioVolume}
                  onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                  aria-label="Audio volume"
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: 'var(--color-teal)' }}
                />
                <Volume2 size={14} style={{ color: 'var(--color-teal)', flexShrink: 0 }} />
              </div>
            )}

            {/* End session */}
            <button
              onClick={onStop}
              className="px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[#4ECDC4] focus-visible:outline-none"
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.06)',
                color: 'var(--color-text-muted)',
              }}
            >
              End session
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* "Park the thought" FAB + popover ─────────────────────────────────── */}
      <div className="fixed bottom-8 z-30" style={{ right: 'calc(max(0px, (100vw - 480px) / 2) + 20px)' }}>
        <AnimatePresence>
          {parkOpen && (
            <motion.div
              initial={shouldAnimate ? { opacity: 0, y: 10, scale: 0.95 } : {}}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="mb-3 p-3 rounded-2xl w-64"
              style={{ background: 'var(--color-surface-card)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>
                💭 Park a thought (goes to Someday)
              </p>
              <input
                value={parkText}
                onChange={e => onParkTextChange(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') onParkSave() }}
                placeholder="Quick note..."
                autoFocus
                className="w-full px-3 py-2 rounded-xl text-sm outline-none mb-2"
                style={{ background: 'var(--color-surface-raised)', border: '1px solid rgba(255,255,255,0.06)', color: 'var(--color-text-primary)' }}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (parkText.trim()) {
                      onParkSave()
                      toast(i18n.t('focus.thoughtSaved'))
                    }
                  }}
                  disabled={!parkText.trim()}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium"
                  style={{ background: parkText.trim() ? 'var(--color-primary)' : 'var(--color-surface-raised)', color: 'white' }}
                >
                  Save
                </button>
                <button
                  onClick={onParkDismiss}
                  className="py-1.5 px-3 rounded-lg text-xs"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  ✕
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={onParkToggle}
          aria-pressed={parkOpen}
          aria-expanded={parkOpen}
          className="w-11 h-11 rounded-full flex items-center justify-center text-lg shadow-lg focus-visible:ring-2 focus-visible:ring-[#4ECDC4] focus-visible:outline-none"
          style={{
            background: parkOpen ? 'var(--color-primary)' : 'var(--color-surface-card)',
            border: `1.5px solid ${parkOpen ? 'var(--color-primary)' : 'rgba(255,255,255,0.06)'}`,
          }}
          aria-label="Park a thought"
        >
          💭
        </button>
      </div>
    </>
  )
})
