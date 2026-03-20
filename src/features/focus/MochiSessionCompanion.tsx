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
import type { UITone } from '@/shared/lib/uiTone'
import type { UserBehaviorProfile } from '@/shared/hooks/useUserBehavior'

type MascotState = 'focused' | 'celebrating' | 'resting' | 'encouraging'

interface Props {
  elapsedSeconds: number
  sessionPhase: SessionPhase
  /** Behavior profile from useUserBehavior — enables AI personalization */
  behaviorProfile?: UserBehaviorProfile | null
}

// ── Hardcoded fallback pools (used instantly, offline, or guest) ──────────────
// Neutral tone — warm, ADHD-aware, body-doubling comfort. 8-10 per trigger.

const MOCHI_MESSAGES: Record<string, string[]> = {
  phase_release: [
    "Getting into it... you're past the hardest part 🌊",
    "The resistance is lifting. You're finding your rhythm.",
    "Past the tough part. Let it flow. 🌊",
    "Struggle phase done. You showed up — that's everything.",
    "Starting is the hardest part. You already did it.",
    "Your brain needed a minute to warm up. That's normal. 🌊",
    "Still here with you. The gears are turning.",
    "The friction is fading. You're settling in.",
    "That stuck feeling? It passed. You're through it. 🌊",
    "We're in this together. Keep going at your pace.",
  ],
  phase_flow: [
    "Deep focus. I'm here if you need me 🌙",
    "You're in flow. I'll stay quiet. 🌙",
    "Full flow mode. Nothing to do but keep going.",
    "This is it. Deep work happening right now. 🌙",
    "Still here with you. No rush.",
    "Your brain found its groove. Ride it. 🌙",
    "Flow state. Your pace, your way.",
    "Quietly here. You don't need me right now. 🌙",
    "This focus is yours. I'm just keeping you company.",
    "Deep in it. That's what this feels like. 🌙",
  ],
  milestone_7: [
    "7 minutes in. The hard part is behind you. 💪",
    "Past the first wall. Nice. 💪",
    "Starting is the hardest part. You already did it. 💪",
    "Your brain works differently. That's not a bug. 💪",
    "7 minutes. You showed up — that counts.",
    "The first few minutes are always the toughest. Done. 💪",
    "Still here. Still going. That's the whole thing.",
    "No rush. Your pace is valid. 💪",
    "7 minutes of choosing to focus. That's real.",
    "Past resistance. The rest gets easier from here. 💪",
  ],
  milestone_15: [
    "Fifteen minutes — this is real focus ✨",
    "15 minutes deep. This counts. ✨",
    "Quarter hour of real work. You did that. ✨",
    "15 minutes. Not nothing. This is something. ✨",
    "Your brain needed time to settle. It settled. ✨",
    "15 minutes of showing up. That's what it looks like.",
    "Still here with you. Steady. ✨",
    "Quarter hour in. No one can take this from you.",
    "This is focus. Not perfect, not forced. Just real. ✨",
    "15 minutes. Your brain is doing its thing.",
  ],
  milestone_30: [
    "Half an hour. Solid session 🌿",
    "30 minutes. That's a real session. 🌿",
    "30 in. Still here with you. 🌿",
    "Half hour of focus. You kept going. 🌿",
    "30 minutes. Your brain stuck with it.",
    "Half an hour. No matter what happens next, this counted. 🌿",
    "We're in this together. 30 minutes deep.",
    "30 minutes of real work. That's not small. 🌿",
    "Half hour. Your focus showed up today.",
    "30 minutes. Steady, sustained, real. 🌿",
  ],
  milestone_60: [
    "An hour. That was real. 🌟",
    "60 minutes. Genuine deep work. 🌟",
    "One full hour. 🌟",
    "One hour done. Your brain did that. 🌟",
    "60 minutes of focus. That's something to sit with. 🌟",
    "An hour. No tricks, no hacks. Just you showing up.",
    "One hour. Still here with you. 🌟",
    "60 minutes. This is what sustained focus looks like.",
    "An hour of deep work. Your pace got you here. 🌟",
    "One hour. That's real, and it's yours. 🌟",
  ],
}

// ── Tone-specific message overlays ──────────────────────────────────────────
// When the user has a derived UI tone, these replace the neutral defaults.

const TONE_MESSAGES: Record<Exclude<UITone, 'neutral'>, Record<string, string[]>> = {
  gen_z: {
    phase_release: [
      "past the hard part 🌊",
      "brain finally loading lol",
      "ok we're moving now 🌊",
      "the resistance left the chat",
      "warming up is valid 🌊",
      "struggle phase cleared 💜",
      "we're in this together",
      "the gears are turning now",
    ],
    phase_flow: [
      "you're locked in 🌙",
      "flow mode activated",
      "deep in it rn 🌙",
      "brain doing its thing",
      "quietly here w you 🌙",
      "main character focus energy",
      "this is the zone 🌙",
      "ur brain found its groove",
    ],
    milestone_7: [
      "7 min in 💪",
      "past the wall, nice",
      "starting was the hard part 💪",
      "ur brain works different, that's valid",
      "7 min of showing up 💪",
      "still here, still going",
      "no rush, ur pace is valid 💪",
      "resistance cleared 💪",
    ],
    milestone_15: [
      "15 min deep ✨",
      "quarter hour, this counts",
      "real focus happening rn ✨",
      "15 min. not nothing.",
      "brain settled in ✨",
      "this is it, fr",
      "still here w you ✨",
      "15 min of real work 💜",
    ],
    milestone_30: [
      "30 min 🌿 solid",
      "half hour, you kept going",
      "30 in, still here w you 🌿",
      "real session tbh",
      "30 min of showing up 🌿",
      "brain stuck with it 💜",
      "this counted, no cap 🌿",
      "half hour deep 🌿",
    ],
    milestone_60: [
      "one hour 🌟 fr",
      "60 min, genuine work",
      "an hour, that was real 🌟",
      "ur brain did that",
      "one whole hour 🌟",
      "60 min, no tricks, just you",
      "still here 🌟",
      "this is what focus looks like 🌟",
    ],
  },
  millennial: {
    phase_release: [
      "Past the hard part. You found your rhythm. 🌊",
      "The resistance is lifting. This is how it starts.",
      "Struggle phase done. You showed up for yourself. 🌊",
      "Your brain needed a minute to engage. That's how it works.",
      "The friction is fading. You're settling into it. 🌊",
      "Starting was the hard part. You already did that.",
      "Getting into it now. The warmup is over. 🌊",
      "We're past the tough part together.",
    ],
    phase_flow: [
      "You're in flow. I'll be here quietly. 🌙",
      "Deep focus mode. This is your time.",
      "You found your groove. Ride it. 🌙",
      "Flow state. Your way, your pace.",
      "Deep in it. That's what sustained focus feels like. 🌙",
      "This focus is yours. I'm just here for company.",
      "Your brain's doing what it does best right now. 🌙",
      "Quietly here. You've got this.",
    ],
    milestone_7: [
      "7 minutes in. The hardest part is behind you. 💪",
      "Past the first wall. That took real effort.",
      "Your brain works differently. That's your strength. 💪",
      "7 minutes of choosing focus. That's not nothing.",
      "The first few minutes are always toughest. You got through them. 💪",
      "Starting is the hardest part. You already handled it.",
      "7 minutes. You made a choice and stuck with it. 💪",
      "Still here. Still going. That's what matters.",
    ],
    milestone_15: [
      "15 minutes of real focus. You built this. ✨",
      "Quarter hour. This is what progress looks like.",
      "15 minutes deep. This counts more than you think. ✨",
      "Your brain needed time to settle. It did.",
      "15 minutes of showing up for yourself. ✨",
      "Quarter hour in. You earned this momentum.",
      "This is focus. Not perfect, just real. ✨",
      "15 minutes. Your brain is doing its thing.",
    ],
    milestone_30: [
      "Half an hour. You built real momentum. 🌿",
      "30 minutes of sustained focus. That's a session.",
      "30 in. Still here with you. 🌿",
      "Half hour. No matter what, this counted.",
      "30 minutes. Your focus showed up today. 🌿",
      "Half an hour of real work. That adds up.",
      "30 minutes. Steady and sustained. 🌿",
      "We're in this together. 30 minutes deep.",
    ],
    milestone_60: [
      "An hour. That was genuine deep work. 🌟",
      "60 minutes. You should sit with that for a second.",
      "One full hour of focus. That's yours. 🌟",
      "An hour. No shortcuts, just you showing up.",
      "60 minutes of sustained focus. That's something. 🌟",
      "One hour. Your pace got you here.",
      "An hour of deep work. Real and earned. 🌟",
      "60 minutes. This is what it looks like. 🌟",
    ],
  },
  gen_x: {
    phase_release: [
      "Past the hard part.",
      "Resistance clearing. Finding your rhythm.",
      "Warmup done. Getting into it.",
      "Settled in. Moving forward.",
      "The friction passed. Steady now.",
      "Past resistance. The rest is easier.",
      "Engaging now.",
      "Struggle phase cleared. Onward.",
    ],
    phase_flow: [
      "Deep focus. Still here.",
      "Flow mode. Staying quiet.",
      "In the zone. Keep going.",
      "Your groove. Your pace.",
      "Focused. Nothing else needed.",
      "Locked in. I'll be here.",
      "Deep work happening.",
      "Steady focus. Carry on.",
    ],
    milestone_7: [
      "7 minutes. Past the hard part.",
      "First wall cleared.",
      "7 minutes in. Moving now.",
      "Started. That was the hard part.",
      "7 minutes of focus. Solid start.",
      "Past initial resistance.",
      "Still going. Good.",
      "7 in. Rest gets easier.",
    ],
    milestone_15: [
      "15 minutes. Real focus.",
      "Quarter hour. This counts.",
      "15 in. Steady.",
      "15 minutes of work done.",
      "Quarter hour. On track.",
      "15 minutes. Settled in.",
      "Focused for 15. Solid.",
      "Quarter hour of real work.",
    ],
    milestone_30: [
      "30 minutes. Real session.",
      "Half hour. Solid work.",
      "30 in. Still here.",
      "Half hour done.",
      "30 minutes. Counted.",
      "Halfway to an hour.",
      "30 minutes. Sustained focus.",
      "Half hour. Steady.",
    ],
    milestone_60: [
      "One hour. Done.",
      "60 minutes. Real work.",
      "One hour of focus.",
      "60 in. Solid.",
      "An hour. That counted.",
      "One hour. Sustained effort.",
      "60 minutes of deep work.",
      "Hour done.",
    ],
  },
}

const getRandomMessage = (messages: string[]): string =>
  messages[Math.floor(Math.random() * messages.length)]

// Psychotype flavor overlays — personalize fallback messages for neutral tone
const PSYCHOTYPE_MESSAGES: Record<Psychotype, Record<string, string[]>> = {
  achiever: {
    milestone_7:  ["7 minutes in the books 💪", "Past the hard part. Keep building."],
    milestone_15: ["15 minutes of real progress. ✨", "Quarter hour down. Solid."],
    milestone_30: ["Half an hour. That's a real session. 🌿", "30 minutes done. Momentum."],
    milestone_60: ["One hour. Genuine deep work. 🌟", "60 minutes. That was real."],
  },
  explorer: {
    milestone_7:  ["7 minutes in — warming up 🔍", "Getting into it. Curiosity loading."],
    milestone_15: ["15 minutes of following that thread. ✨", "Still exploring. Good."],
    milestone_30: ["Half an hour deep. 🌿", "30 minutes of exploration."],
    milestone_60: ["An hour. Where did it take you? 🌟", "60 minutes. What did you find?"],
  },
  connector: {
    milestone_7:  ["7 minutes. Steady. 🌱", "Still here with you."],
    milestone_15: ["15 minutes of focused work. ✨", "Quarter hour. That counts."],
    milestone_30: ["Half an hour. We're in this together. 🌿", "30 minutes of showing up."],
    milestone_60: ["One hour. 🌟", "60 minutes. Real work, together."],
  },
  planner: {
    milestone_7:  ["7 minutes — on track. 🌱", "The plan is working."],
    milestone_15: ["15 minutes. On schedule. ✨", "Quarter hour in. Steady."],
    milestone_30: ["Half an hour. Right on pace. 🌿", "30 minutes as planned."],
    milestone_60: ["One hour. Plan delivered. 🌟", "60 minutes done."],
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
  const { psychotype, userId, energyLevel, currentStreak, seasonalMode, timeBlindness, emotionalReactivity, locale, uiTone } = useStore()

  const [activeBubble, setActiveBubble] = useState<ActiveBubble | null>(null)
  const shownRef      = useRef<Set<string>>(new Set())
  const lastShownAtRef = useRef<number>(0)
  const dismissTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isGuest = !userId || userId.startsWith('guest_')

  // Get fallback message from hardcoded pools — tone-aware, then psychotype, then neutral
  const getFallbackMessage = useCallback((trigger: BubbleTrigger): ActiveBubble => {
    // 1. Try tone-specific pool (gen_z / millennial / gen_x)
    const tonePool = uiTone !== 'neutral'
      ? TONE_MESSAGES[uiTone]?.[trigger.messagePool]
      : undefined

    // 2. Try psychotype overlay (only for neutral tone — tone-specific already personalizes)
    const psychoPool = uiTone === 'neutral' && psychotype
      ? PSYCHOTYPE_MESSAGES[psychotype]?.[trigger.messagePool]
      : undefined

    // 3. Fall back to neutral MOCHI_MESSAGES
    const pool = tonePool ?? psychoPool ?? MOCHI_MESSAGES[trigger.messagePool] ?? ['Still here with you.']

    return {
      id: trigger.id,
      message: getRandomMessage(pool),
      mascotState: trigger.fallbackState,
    }
  }, [psychotype, uiTone])

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
