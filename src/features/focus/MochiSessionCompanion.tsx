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

import { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'motion/react'
import { Mascot } from '@/shared/ui/Mascot'
import { useMotion } from '@/shared/hooks/useMotion'
import { useStore } from '@/store'
import { supabase } from '@/shared/lib/supabase'
import { logError } from '@/shared/lib/logger'
import type { SessionPhase, Psychotype, Task } from '@/types'
import type { UserBehaviorProfile } from '@/shared/hooks/useUserBehavior'

type MascotState = 'focused' | 'celebrating' | 'resting' | 'encouraging'

interface Props {
  elapsedSeconds: number
  sessionPhase: SessionPhase
  /** Behavior profile from useUserBehavior — enables AI personalization */
  behaviorProfile?: UserBehaviorProfile | null
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const getRandomMessage = (messages: string[]): string =>
  messages[Math.floor(Math.random() * messages.length)]

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

interface MochiAIContext {
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
  activeTaskTypes?: Record<string, number> | null
  upcomingDeadlines?: { title: string; taskType: string; dueDate: string }[] | null
}

async function fetchMochiAISingle(
  trigger: string,
  context: MochiAIContext,
  locale: string,
): Promise<MochiAIResponse | null> {
  const { data, error } = await supabase.functions.invoke('mochi-respond', {
    body: { trigger, context, locale },
  })
  if (error) throw error
  const resp = data as MochiAIResponse | null
  if (resp?.message) return resp
  return null
}

async function fetchMochiAI(
  trigger: string,
  context: MochiAIContext,
  locale: string,
): Promise<MochiAIResponse | null> {
  try {
    return await fetchMochiAISingle(trigger, context, locale)
  } catch (err) {
    logError('MochiAI.fetch', err)
    // Single retry after 5 seconds — if it also fails, keep hardcoded fallback
    try {
      await new Promise(resolve => setTimeout(resolve, 5_000))
      return await fetchMochiAISingle(trigger, context, locale)
    } catch (retryErr) {
      logError('MochiAI.retry', retryErr)
      return null
    }
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
  const { t: translate } = useTranslation()
  const { psychotype, userId, energyLevel, currentStreak, seasonalMode, timeBlindness, emotionalReactivity, locale, uiTone, nowPool } = useStore()

  // Compute task context for AI — what the user is working on
  const activeNowTasks = useMemo(() => nowPool.filter((task: Task) => task.status === 'active'), [nowPool])

  const activeTaskTypes = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const task of activeNowTasks) {
      const type = task.taskType ?? 'task'
      counts[type] = (counts[type] ?? 0) + 1
    }
    return Object.keys(counts).length > 0 ? counts : null
  }, [activeNowTasks])

  const upcomingDeadlines = useMemo(() => {
    const now = Date.now()
    const in24h = now + 24 * 60 * 60 * 1000
    return activeNowTasks
      .filter((task: Task) => task.dueDate && new Date(task.dueDate).getTime() <= in24h)
      .slice(0, 5)
      .map((task: Task) => ({
        title: (task.title ?? '').slice(0, 40),
        taskType: task.taskType ?? 'task',
        dueDate: task.dueDate ?? '',
      }))
  }, [activeNowTasks])

  const [activeBubble, setActiveBubble] = useState<ActiveBubble | null>(null)
  const shownRef      = useRef<Set<string>>(new Set())
  const lastShownAtRef = useRef<number>(0)
  const dismissTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isGuest = !userId || userId.startsWith('guest_')

  // Resolve an i18n key that should be a string array; fall back to mochi.fallback
  const getPool = useCallback((key: string): string[] => {
    const result = translate(key, { returnObjects: true })
    if (Array.isArray(result)) return result as string[]
    return [translate('mochi.fallback')]
  }, [translate])

  // Get fallback message from i18n pools — tone-aware, then psychotype, then neutral
  const getFallbackMessage = useCallback((trigger: BubbleTrigger): ActiveBubble => {
    // 1. Try tone-specific pool (gen_z / millennial / gen_x)
    const tonePool = uiTone !== 'neutral'
      ? getPool(`mochi.${uiTone}.${trigger.messagePool}`)
      : undefined

    // 2. Try psychotype overlay (only for neutral tone — tone-specific already personalizes)
    const psychoPool = uiTone === 'neutral' && psychotype
      ? getPool(`mochi.psychotype.${psychotype}.${trigger.messagePool}`)
      : undefined

    // 3. Fall back to neutral pool
    const pool = (tonePool && tonePool.length > 1 ? tonePool : undefined)
      ?? (psychoPool && psychoPool.length > 1 ? psychoPool : undefined)
      ?? getPool(`mochi.neutral.${trigger.messagePool}`)

    return {
      id: trigger.id,
      message: getRandomMessage(pool),
      mascotState: trigger.fallbackState,
    }
  }, [psychotype, uiTone, getPool])

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
            activeTaskTypes,
            upcomingDeadlines: upcomingDeadlines.length > 0 ? upcomingDeadlines : null,
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
  }, [elapsedSeconds, getFallbackMessage, isGuest, psychotype, sessionPhase, energyLevel, currentStreak, behaviorProfile, timeBlindness, emotionalReactivity, seasonalMode, locale, activeTaskTypes, upcomingDeadlines])

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
    <div className="flex flex-col items-center gap-2 mt-6" aria-label="Mochi focus companion">
      {/* Screen reader: announce new Mochi messages when they appear */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {activeBubble ? `Mochi says: ${activeBubble.message}` : ''}
      </span>

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
              background: 'var(--color-surface-card)',
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
                borderTop:   '8px solid var(--color-surface-card)',
              }}
            />
            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
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
