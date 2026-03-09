/**
 * TaskCard
 *
 * Research-validated redesign (March 2025):
 * - Removed countdown timer from task creation time (shame trigger per CBT/ADHD research)
 * - Removed color progression teal→yellow→coral/red (anxiety trigger)
 * - Added calm left-border difficulty accent (teal=easy, purple=medium, gold=hard — never red)
 * - Added subtle "carry-over" badge for tasks older than 24h (non-urgent, non-shaming)
 * - Timer in FocusScreen (ArcTimer) is the correct place for time visualization (Time Timer concept)
 */

import { useState } from 'react'
import { motion } from 'motion/react'
import { useMotion } from '@/shared/hooks/useMotion'
import { usePalette } from '@/shared/hooks/usePalette'
import { useStore } from '@/store'
import { Confetti } from '@/shared/ui/Confetti'
import { notifyXP, notifyXPBonus, notifyAchievement, notifyTaskDone } from '@/shared/lib/notify'
import { hapticDone } from '@/shared/lib/haptic'
import type { Task } from '@/types'
import { ACHIEVEMENT_DEFINITIONS } from '@/types'

// ── Difficulty accent color labels (Research #8: teal/indigo/gold — never red) ─

const DIFFICULTY_LABELS: Record<number, string> = { 1: 'Easy', 2: 'Medium', 3: 'Hard' }

// getDifficultyAccent: returns palette-aware color (desaturated in calm mode)
function getDifficultyAccent(difficulty: number, palette: ReturnType<typeof usePalette>): string {
  if (difficulty === 1) return palette.teal
  if (difficulty === 3) return palette.gold
  return palette.primary   // difficulty 2 — medium, steady
}

// ── Task age helper (non-urgency, non-shaming) ────────────────────────────────

function getTaskAgeBadge(task: Task): string | null {
  const ageHours = (Date.now() - new Date(task.createdAt).getTime()) / 3_600_000
  if (ageHours < 24) return null                    // fresh — no badge needed
  if (ageHours < 72) return 'carry-over'             // 1-2 days — gentle note
  return 'carry-over'                                // 3+ days — still just "carry-over", no shame escalation
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  task: Task
  index?: number
  onComplete?: () => void
  onSnooze?: () => void
}

export function TaskCard({ task, index = 0, onComplete, onSnooze }: Props) {
  const { completeTask, snoozeTask, addXP, energyLevel, unlockAchievement, hasAchievement } = useStore()
  const { shouldAnimate, t } = useMotion()
  const palette = usePalette()

  const [confettiActive, setConfettiActive] = useState(false)
  const [isDone, setIsDone] = useState(false)

  // Research #8: palette-aware accent — desaturated in calm mode
  const difficultyAccent = getDifficultyAccent(task.difficulty, palette)
  const ageBadge = getTaskAgeBadge(task)

  const handleComplete = () => {
    if (isDone) return
    setIsDone(true)
    setConfettiActive(true)
    hapticDone()  // [80ms, 40ms gap, 120ms] — satisfying confirmation pattern

    // XP: base × difficulty × energy multiplier
    const energyMultiplier = energyLevel <= 2 ? 1.2 : energyLevel >= 4 ? 0.8 : 1.0
    const baseXp = Math.round(10 * task.difficulty * energyMultiplier)

    // Variable Ratio bonus — Research #5: VR schedule bridges Dopamine Transfer Deficit
    // 8% = double burst, 17% = 1.5× burst, 75% = normal (slot-machine effect, no punishment)
    const roll = Math.random()
    const vrMultiplier = roll < 0.08 ? 2.0 : roll < 0.25 ? 1.5 : 1.0
    const xp = Math.round(baseXp * vrMultiplier)
    const isBonus = vrMultiplier > 1.0

    addXP(xp)
    if (isBonus) {
      notifyXPBonus(xp)
    } else {
      notifyXP(xp)
    }
    notifyTaskDone(task.title)

    // Achievements (with toast)
    const tryUnlock = (key: string) => {
      if (!hasAchievement(key)) {
        unlockAchievement(key)
        const def = ACHIEVEMENT_DEFINITIONS.find(a => a.key === key)
        if (def) notifyAchievement(def.name, def.emoji, def.description)
      }
    }
    tryUnlock('first_seed')
    if (energyLevel <= 2) tryUnlock('gentle_start')
    const hour = new Date().getHours()
    if (hour >= 21) tryUnlock('night_owl')
    if (hour < 9)  tryUnlock('morning_mind')

    setTimeout(() => {
      completeTask(task.id)
      onComplete?.()
    }, 600)
  }

  const handleSnooze = () => {
    snoozeTask(task.id)
    onSnooze?.()
  }

  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, y: 16 } : {}}
      animate={{
        opacity: isDone ? 0 : 1,
        y: 0,
        x: isDone ? -40 : 0,
        scale: isDone ? 0.96 : 1,
      }}
      transition={{ ...t(), delay: index * 0.06 }}
      className="relative overflow-hidden rounded-2xl"
      style={{
        background: '#1A1D2E',
        // Calm left accent strip = difficulty indicator (no countdown, no urgency)
        borderTop:    '1.5px solid #2D3150',
        borderRight:  '1.5px solid #2D3150',
        borderBottom: '1.5px solid #2D3150',
        borderLeft:   `3px solid ${difficultyAccent}`,
      }}
    >
      <Confetti active={confettiActive} onComplete={() => setConfettiActive(false)} />

      <div className="p-4">
        {/* Header: difficulty dots + time estimate + optional carry-over badge */}
        <div className="flex items-center gap-2 mb-2">
          {/* Difficulty dots */}
          <div className="flex gap-1" aria-label={`Difficulty: ${DIFFICULTY_LABELS[task.difficulty]}`}>
            {[1, 2, 3].map(dot => (
              <div
                key={dot}
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: dot <= task.difficulty ? difficultyAccent : '#2D3150',
                }}
              />
            ))}
          </div>

          {/* Time estimate — informational only, not a countdown */}
          <span className="text-xs" style={{ color: '#8B8BA7' }}>
            ~{task.estimatedMinutes}m
          </span>

          {/* Carry-over badge — warm amber, non-shaming (Research #8: amber not neon yellow) */}
          {ageBadge && (
            <span
              className="ml-auto text-xs px-2 py-0.5 rounded-lg font-medium"
              style={{
                background: `${palette.gold}20`,
                color: palette.gold,
              }}
            >
              carry-over
            </span>
          )}
        </div>

        {/* Task title */}
        <p
          className="text-base font-semibold leading-snug mb-4"
          style={{ color: '#E8E8F0' }}
        >
          {task.title}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Complete button */}
          <motion.button
            whileTap={shouldAnimate ? { scale: 0.94 } : {}}
            onClick={handleComplete}
            disabled={isDone}
            className="flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200"
            style={{
              background:   isDone ? '#2D3150' : `${palette.teal}26`,   // 15% alpha
              border:       '1.5px solid',
              borderColor:  isDone ? '#2D3150' : palette.teal,
              color:        isDone ? '#8B8BA7' : palette.teal,
            }}
          >
            {isDone ? '✓ Done!' : '✓ Complete'}
          </motion.button>

          {/* Guilt-free snooze — park for later, no penalty, calming copy */}
          {task.pool === 'now' && (
            <motion.button
              whileTap={shouldAnimate ? { scale: 0.94 } : {}}
              onClick={handleSnooze}
              className="px-4 py-2.5 rounded-xl text-sm transition-all duration-200"
              style={{
                background: '#252840',
                border: '1.5px solid #2D3150',
                color: '#8B8BA7',
              }}
              title="Parked for later. No rush."
            >
              Park it →
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
