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
import { toast } from 'sonner'
import { useMotion } from '@/shared/hooks/useMotion'

interface Props {
  isFlow: boolean
  isPlaying: boolean
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
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm transition-all duration-200"
              style={{
                background: isPlaying ? 'rgba(78,205,196,0.12)' : '#1E2136',
                border: `1.5px solid ${isPlaying ? '#4ECDC4' : 'rgba(255,255,255,0.06)'}`,
                color: isPlaying ? '#4ECDC4' : '#8B8BA7',
              }}
            >
              {isPlaying ? '🔊 Sound on' : '🔇 Sound off'}
            </button>

            {/* End session */}
            <button
              onClick={onStop}
              className="px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.06)',
                color: '#8B8BA7',
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
              style={{ background: '#1E2136', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p className="text-xs font-medium mb-2" style={{ color: '#8B8BA7' }}>
                💭 Park a thought (goes to Someday)
              </p>
              <input
                value={parkText}
                onChange={e => onParkTextChange(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') onParkSave() }}
                placeholder="Quick note..."
                autoFocus
                className="w-full px-3 py-2 rounded-xl text-sm outline-none mb-2"
                style={{ background: '#252840', border: '1px solid rgba(255,255,255,0.06)', color: '#E8E8F0' }}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (parkText.trim()) {
                      onParkSave()
                      toast('Thought saved to Someday 💭')
                    }
                  }}
                  disabled={!parkText.trim()}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium"
                  style={{ background: parkText.trim() ? '#7B72FF' : '#252840', color: 'white' }}
                >
                  Save
                </button>
                <button
                  onClick={onParkDismiss}
                  className="py-1.5 px-3 rounded-lg text-xs"
                  style={{ color: '#8B8BA7' }}
                >
                  ✕
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={onParkToggle}
          className="w-11 h-11 rounded-full flex items-center justify-center text-lg shadow-lg"
          style={{
            background: parkOpen ? '#7B72FF' : '#1E2136',
            border: `1.5px solid ${parkOpen ? '#7B72FF' : 'rgba(255,255,255,0.06)'}`,
          }}
          aria-label="Park a thought"
        >
          💭
        </button>
      </div>
    </>
  )
})
