/**
 * MochiSessionCompanion — AI-powered body-double
 *
 * Mochi speech bubbles during focus sessions. Now backed by Gemini AI
 * via the `mochi-respond` edge function, with hardcoded fallback.
 *
 * Rules:
 * - Max 1 bubble per 20 min (1200 s)
 * - Auto-dismisses after 8 s; tap to dismiss early
 * - AI provides personalized, context-aware messages
 * - Hardcoded pools used as instant fallback (offline / rate limit / guest)
 * - Calm, supportive copy — no "you should", no urgency
 * - Uses `useMotion()` for animation control
 */

import { useState, useEffect, useRef, memo, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Mascot } from '@/shared/ui/Mascot'
import { useMotion } from '@/shared/hooks/useMotion'
import { useStore } from '@/store'
import { supabase } from '@/shared/lib/supabase'
import { logError } from '@/shared/lib/logger'
import type { SessionPhase, Psychotype } from '@/types'
import type { UserBehaviorProfile } from '@/shared/hooks/useUserBehavior'

type MascotState = 'focused' | 'celebrating' | 'resting' | 'encouraging'

interface Props {
  elapsedSeconds: number
  sessionPhase: SessionPhase
  /** Behavior profile from useUserBehavior — enables AI personalization */
  behaviorProfile?: UserBehaviorProfile | null
}

// ── Hardcoded fallback pools (used instantly, offline, or guest) ──────────────

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

// Psychotype flavor overlays — personalize fallback messages
const PSYCHOTYPE_MESSAGES: Record<Psychotype, Record<string, string[]>> = {
  achiever: {
    milestone_7:  ["7 minutes — another one in the books 💪", "You're crushing it. Keep the momentum."],
    milestone_15: ["15 minutes of real progress. That's what you do. ✨", "Quarter hour down. You're on a roll."],
    milestone_30: ["Half an hour. You showed up and delivered. 🔥", "30 minutes conquered. That's your style."],
    milestone_60: ["One hour. You set the bar and cleared it. 🌟", "60 minutes. Extraordinary output today."],
  },
  explorer: {
    milestone_7:  ["7 minutes in — what will you discover? 🔍", "Warming up the curiosity engine..."],
    milestone_15: ["15 minutes of following that thread. ✨", "Still exploring — that's the good stuff."],
    milestone_30: ["Half an hour deep in the rabbit hole. 🔥", "30 minutes of pure exploration."],
    milestone_60: ["An hour of discovery. Where did it take you? 🌟", "60 minutes. What did you find?"],
  },
  connector: {
    milestone_7:  ["7 minutes. Someone will appreciate this work 🌱", "Your consistency inspires."],
    milestone_15: ["15 minutes. Real work that touches people. ✨", "Your effort matters to others."],
    milestone_30: ["Half an hour of showing up. 🔥", "30 minutes. That's the kind of reliability people count on."],
    milestone_60: ["One hour. Your work helps others, even when they don't see it. 🌟", "60 minutes. Quietly remarkable."],
  },
  planner: {
    milestone_7:  ["7 minutes — right on track. ✅", "The plan is working. Keep going."],
    milestone_15: ["15 minutes. Just as planned. ✨", "Quarter hour in, still on schedule."],
    milestone_30: ["Half an hour. Steady and structured. 🔥", "30 minutes. Exactly where you planned to be."],
    milestone_60: ["One hour. Flawless execution. 🌟", "60 minutes — the plan, delivered."],
  },
}

// ── Bubble triggers ───────────────────────────────────────────────────────────

interface BubbleTrigger {
  id: string
  minElapsed: number  // seconds — earliest this can fire
  messagePool: string  // key into MOCHI_MESSAGES
  fallbackState: MascotState
}

const BUBBLE_TRIGGERS: BubbleTrigger[] = [
  { id: 'phase_release', minElapsed: 7 * 60,  messagePool: 'phase_release', fallbackState: 'focused' },
  { id: 'phase_flow',    minElapsed: 15 * 60, messagePool: 'phase_flow',    fallbackState: 'focused' },
  { id: 'milestone_7',   minElapsed: 7 * 60,  messagePool: 'milestone_7',   fallbackState: 'focused' },
  { id: 'milestone_15',  minElapsed: 15 * 60, messagePool: 'milestone_15',  fallbackState: 'celebrating' },
  { id: 'milestone_30',  minElapsed: 30 * 60, messagePool: 'milestone_30',  fallbackState: 'celebrating' },
  { id: 'milestone_60',  minElapsed: 60 * 60, messagePool: 'milestone_60',  fallbackState: 'resting' },
]

const MIN_GAP_SECONDS = 20 * 60  // max 1 bubble per 20 min

// ── AI fetch helper ──────────────────────────────────────────────────────────

interface MochiAIResponse {
  message: string
  mascotState: MascotState
}

async function fetchMochiAI(
  trigger: string,
  context: {
    psychotype: Psychotype | null
    sessionPhase: SessionPhase
    elapsedMinutes: number
    energyLevel: number
    totalSessions: number
    currentStreak: number
    completedToday: number
    timeBlindness: string | null
    emotionalReactivity: string | null
    recentStruggles: string | null
    seasonalMode: string
  },
  locale: string,
): Promise<MochiAIResponse | null> {
  try {
    const { data, error } = await supabase.functions.invoke('mochi-respond', {
      body: { trigger, context, locale },
    })
    if (error) throw error
    const resp = data as MochiAIResponse | null
    if (resp?.message) return resp
    return null
  } catch (err) {
    logError('MochiAI.fetch', err)
    return null
  }
}

// ── Component ──────────────────────────────────────────────────────────────────

interface ActiveBubble {
  id: string
  message: string
  mascotState: MascotState
}

function MochiSessionCompanionInner({ elapsedSeconds, sessionPhase, behaviorProfile }: Props) {
  const { shouldAnimate, t } = useMotion()
  const { psychotype, userId, energyLevel, currentStreak, seasonalMode, timeBlindness, emotionalReactivity, locale } = useStore()

  const [activeBubble, setActiveBubble] = useState<ActiveBubble | null>(null)
  const shownRef      = useRef<Set<string>>(new Set())
  const lastShownAtRef = useRef<number>(0)
  const dismissTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isGuest = !userId || userId.startsWith('guest_')

  // Get fallback message from hardcoded pools
  const getFallbackMessage = useCallback((trigger: BubbleTrigger): ActiveBubble => {
    const pool = (psychotype && PSYCHOTYPE_MESSAGES[psychotype]?.[trigger.messagePool])
      ?? MOCHI_MESSAGES[trigger.messagePool]
      ?? ['Keep going!']
    return {
      id: trigger.id,
      message: getRandomMessage(pool),
      mascotState: trigger.fallbackState,
    }
  }, [psychotype])

  // ── Trigger logic ───────────────────────────────────────────────────────────
  useEffect(() => {
    for (const trigger of BUBBLE_TRIGGERS) {
      if (shownRef.current.has(trigger.id)) continue
      if (elapsedSeconds < trigger.minElapsed) continue
      if (lastShownAtRef.current > 0 && elapsedSeconds - lastShownAtRef.current < MIN_GAP_SECONDS) continue

      shownRef.current.add(trigger.id)
      lastShownAtRef.current = elapsedSeconds

      // Show fallback immediately so user sees something fast
      const fallback = getFallbackMessage(trigger)
      setActiveBubble(fallback)

      // Auto-dismiss after 8s
      if (dismissTimer.current) clearTimeout(dismissTimer.current)
      dismissTimer.current = setTimeout(() => setActiveBubble(null), 8_000)

      // If authenticated, fire AI request to upgrade the message
      if (!isGuest) {
        const elapsedMin = Math.floor(elapsedSeconds / 60)
        fetchMochiAI(
          trigger.messagePool,
          {
            psychotype,
            sessionPhase,
            elapsedMinutes: elapsedMin,
            energyLevel,
            totalSessions: behaviorProfile?.totalSessions ?? 0,
            currentStreak,
            completedToday: behaviorProfile?.completedToday ?? 0,
            timeBlindness,
            emotionalReactivity,
            recentStruggles: behaviorProfile?.recentStruggles ?? null,
            seasonalMode,
          },
          locale,
        ).then(aiResp => {
          if (aiResp) {
            // Replace fallback with AI response (if bubble is still showing)
            setActiveBubble(prev => {
              if (prev?.id !== trigger.id) return prev // bubble already dismissed
              return { id: trigger.id, message: aiResp.message, mascotState: aiResp.mascotState }
            })
          }
        })
      }

      break  // one at a time
    }
  }, [elapsedSeconds, getFallbackMessage, isGuest, psychotype, sessionPhase, energyLevel, currentStreak, behaviorProfile, timeBlindness, emotionalReactivity, seasonalMode, locale])

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

// memo: Mochi only updates when elapsedSeconds or sessionPhase change — not
// on every timer tick if those values haven't actually changed.
export const MochiSessionCompanion = memo(MochiSessionCompanionInner)
