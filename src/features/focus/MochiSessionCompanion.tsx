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

import { useState, useEffect, useRef, memo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Mascot } from '@/shared/ui/Mascot'
import { useMotion } from '@/shared/hooks/useMotion'
import type { SessionPhase } from '@/types'

interface Props {
  elapsedSeconds: number
  sessionPhase: SessionPhase
}

// ── Message pools — randomized responses per trigger ────────────────────────

const MOCHI_MESSAGES: Record<string, string[]> = {
  phase_release: [
    "Getting into it... you're past the hardest part 🌊",
    "The resistance is lifting. You're finding your rhythm.",
    "Past the tough part. Let it flow. 🌊",
    "Struggle phase done. You showed up — that's everything.",
  ],
  phase_flow: [
    "Deep focus. I'm here if you need me 🌙",
    "You're in flow. Beautiful. I'll stay quiet. 🌙",
    "Full flow mode. Nothing to do but keep going.",
    "This is it. Deep work happening right now. 🌙",
  ],
  milestone_7: [
    "Made it past the toughest part 💪",
    "7 minutes in. The hard part is behind you. 💪",
    "Past the first wall. Nice. 💪",
    "7 minutes. You pushed through resistance. 💪",
  ],
  milestone_15: [
    "Fifteen minutes — this is real focus ✨",
    "15 minutes deep. This counts. ✨",
    "Quarter hour of real work. You did that. ✨",
    "15 minutes. Not nothing. This is something. ✨",
  ],
  milestone_30: [
    "Half an hour. Seriously solid session 🔥",
    "30 minutes. That's a real session. 🔥",
    "30 in. Still here with you. 🔥",
    "Half hour of focus. You kept going. 🔥",
  ],
  milestone_60: [
    "An hour. That's extraordinary 🌟",
    "60 minutes. Genuine deep work. 🌟",
    "One full hour. This is rare. 🌟",
    "One hour. This was real. 🌟",
  ],
}

const getRandomMessage = (messages: string[]): string =>
  messages[Math.floor(Math.random() * messages.length)]

// ── Bubble triggers ───────────────────────────────────────────────────────────

interface BubbleTrigger {
  id: string
  minElapsed: number  // seconds — earliest this can fire
  messagePool: string  // key into MOCHI_MESSAGES
  mascotState: 'focused' | 'celebrating' | 'resting'
}

const BUBBLE_TRIGGERS: BubbleTrigger[] = [
  {
    id: 'phase_release',
    minElapsed: 7 * 60,   // 7 min — struggle → release phase
    messagePool: 'phase_release',
    mascotState: 'focused',
  },
  {
    id: 'phase_flow',
    minElapsed: 15 * 60,  // 15 min — release → flow phase
    messagePool: 'phase_flow',
    mascotState: 'focused',
  },
  {
    id: 'milestone_7',
    minElapsed: 7 * 60,   // 7 min milestone
    messagePool: 'milestone_7',
    mascotState: 'focused',
  },
  {
    id: 'milestone_15',
    minElapsed: 15 * 60,  // 15 min milestone
    messagePool: 'milestone_15',
    mascotState: 'celebrating',
  },
  {
    id: 'milestone_30',
    minElapsed: 30 * 60,  // 30 min milestone
    messagePool: 'milestone_30',
    mascotState: 'celebrating',
  },
  {
    id: 'milestone_60',
    minElapsed: 60 * 60,  // 60 min milestone
    messagePool: 'milestone_60',
    mascotState: 'resting',
  },
]

const MIN_GAP_SECONDS = 20 * 60  // max 1 bubble per 20 min

// ── Component ──────────────────────────────────────────────────────────────────

function MochiSessionCompanionInner({ elapsedSeconds, sessionPhase }: Props) {
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
              {getRandomMessage(MOCHI_MESSAGES[activeBubble.messagePool] || ['Keep going!'])}
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

// memo: Mochi only updates when elapsedSeconds or sessionPhase change — not
// on every timer tick if those values haven't actually changed.
export const MochiSessionCompanion = memo(MochiSessionCompanionInner)
