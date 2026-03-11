/**
 * MochiSessionCompanion — Block 5a
 *
 * Mochi body-double speech bubbles during focus sessions.
 * Appears at phase transitions and milestone timestamps.
 *
 * Rules:
 * - Max 1 bubble per 20 min (1200 s)
 * - Auto-dismisses after 8 s; tap to dismiss early
 * - Calm, supportive copy — no "you should", no urgency
 * - Uses `useMotion()` for animation control
 */

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Mascot } from '@/shared/ui/Mascot'
import { useMotion } from '@/shared/hooks/useMotion'
import type { SessionPhase } from '@/types'

interface Props {
  elapsedSeconds: number
  sessionPhase: SessionPhase
}

// ── Bubble triggers ───────────────────────────────────────────────────────────

interface BubbleTrigger {
  id: string
  minElapsed: number  // seconds — earliest this can fire
  message: string
  mascotState: 'focused' | 'celebrating' | 'resting'
}

const BUBBLE_TRIGGERS: BubbleTrigger[] = [
  {
    id: 'phase_release',
    minElapsed: 7 * 60,   // 7 min — struggle → release phase
    message: "Made it past the toughest minute. I'm right here with you 💪",
    mascotState: 'focused',
  },
  {
    id: 'phase_flow',
    minElapsed: 15 * 60,  // 15 min — release → flow phase
    message: "You're in the groove — stay loose, I'll keep you company 🌊",
    mascotState: 'focused',
  },
  {
    id: 'milestone_30',
    minElapsed: 30 * 60,  // 30 min milestone
    message: "30 minutes! That's real, deep work. You're doing amazing 🎯",
    mascotState: 'celebrating',
  },
  {
    id: 'milestone_60',
    minElapsed: 60 * 60,  // 60 min milestone
    message: "An hour of focus — that's rare. Take a breath, you've got this 🧘",
    mascotState: 'resting',
  },
]

const MIN_GAP_SECONDS = 20 * 60  // max 1 bubble per 20 min

// ── Component ──────────────────────────────────────────────────────────────────

export function MochiSessionCompanion({ elapsedSeconds, sessionPhase }: Props) {
  const { shouldAnimate, t } = useMotion()

  const [activeBubble, setActiveBubble] = useState<BubbleTrigger | null>(null)
  const shownRef      = useRef<Set<string>>(new Set())
  const lastShownAtRef = useRef<number>(0)
  const dismissTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Trigger logic ───────────────────────────────────────────────────────────
  useEffect(() => {
    for (const trigger of BUBBLE_TRIGGERS) {
      if (shownRef.current.has(trigger.id)) continue
      if (elapsedSeconds < trigger.minElapsed) continue
      // Enforce max 1 per 20 min
      if (lastShownAtRef.current > 0 && elapsedSeconds - lastShownAtRef.current < MIN_GAP_SECONDS) continue

      shownRef.current.add(trigger.id)
      lastShownAtRef.current = elapsedSeconds
      setActiveBubble(trigger)

      // Auto-dismiss after 8 s
      if (dismissTimer.current) clearTimeout(dismissTimer.current)
      dismissTimer.current = setTimeout(() => setActiveBubble(null), 8_000)
      break  // one at a time
    }
  }, [elapsedSeconds])

  // Cleanup timer on unmount
  useEffect(() => () => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current)
  }, [])

  // In flow phase: Mochi is visible but very small (ambient companion)
  const isFlow = sessionPhase === 'flow'

  const handleDismiss = () => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current)
    setActiveBubble(null)
  }

  return (
    <div className="flex flex-col items-center gap-2 mt-6">
      {/* Speech bubble */}
      <AnimatePresence>
        {activeBubble && (
          <motion.button
            key={activeBubble.id}
            initial={shouldAnimate ? { opacity: 0, y: 8, scale: 0.95 } : {}}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={t()}
            onClick={handleDismiss}
            className="px-4 py-2.5 rounded-2xl max-w-[240px] text-center"
            style={{
              background: '#1E2136',
              border: '1px solid rgba(123,114,255,0.25)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            }}
            aria-label="Dismiss Mochi message"
          >
            {/* Speech tail (triangle) */}
            <div
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0"
              style={{
                borderLeft:  '8px solid transparent',
                borderRight: '8px solid transparent',
                borderTop:   '8px solid #1E2136',
              }}
            />
            <p className="text-xs leading-relaxed" style={{ color: '#E8E8F0' }}>
              {activeBubble.message}
            </p>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Mochi — small ambient presence in flow, normal in other phases */}
      <motion.div
        animate={{ opacity: isFlow ? 0.35 : 1, scale: isFlow ? 0.75 : 1 }}
        transition={t()}
        aria-hidden="true"
      >
        <Mascot
          state={activeBubble ? activeBubble.mascotState : isFlow ? 'resting' : 'focused'}
          size={48}
          label="Mochi focus companion"
        />
      </motion.div>
    </div>
  )
}
