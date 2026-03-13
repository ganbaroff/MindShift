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

import { useState, memo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { toast } from 'sonner'
import { useMotion } from '@/shared/hooks/useMotion'
import { usePalette } from '@/shared/hooks/usePalette'
import { useStore } from '@/store'
import { Confetti } from '@/shared/ui/Confetti'
import { notifyXP, notifyXPBonus, notifyAchievement, notifyTaskDone } from '@/shared/lib/notify'
import { hapticDone } from '@/shared/lib/haptic'
import type { Task } from '@/types'
import { ACHIEVEMENT_DEFINITIONS } from '@/types'
import {
  VR_BUCKET_SIZE, VR_JACKPOT_THRESHOLD, VR_BONUS_THRESHOLD,
  VR_MULTIPLIER_JACKPOT, VR_MULTIPLIER_BONUS,
} from '@/shared/lib/constants'

// ── Difficulty accent color labels (Research #8: teal/indigo/gold — never red) ─

const DIFFICULTY_LABELS: Record<number, string> = { 1: 'Easy', 2: 'Medium', 3: 'Hard' }

// Traffic Light difficulty level (Block 6a) — teal/amber/purple, NEVER red
const TRAFFIC_LIGHT: Record<string, { color: string; label: string }> = {
  easy:   { color: '#4ECDC4', label: '🟢 Easy' },
  medium: { color: '#F59E0B', label: '🟡 Medium' },
  hard:   { color: '#7B72FF', label: '🔵 Hard' },
}

// getDifficultyAccent: returns palette-aware color (desaturated in calm mode)
function getDifficultyAccent(difficulty: number, palette: ReturnType<typeof usePalette>): string {
  if (difficulty === 1) return palette.teal
  if (difficulty === 3) return palette.gold
  return palette.primary   // difficulty 2 — medium, steady
}

// ── Due date badge helper (Research #8: gold for overdue — NEVER red) ────────

interface DueDateBadge {
  label: string
  color: string
}

function getDueDateBadge(task: Task, palette: ReturnType<typeof usePalette>): DueDateBadge | null {
  if (!task.dueDate) return null
  const today    = new Date(); today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
  const due      = new Date(task.dueDate + 'T00:00:00')

  if (due < today) {
    // Overdue — gold (NEVER red, per ADHD UX research #8)
    const label = due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return { label, color: palette.gold }
  }
  if (due.getTime() === today.getTime()) {
    // Today — primary (indigo, engagement-positive)
    const label = task.dueTime ? `Today ${task.dueTime}` : 'Today'
    return { label, color: palette.primary }
  }
  if (due.getTime() === tomorrow.getTime()) {
    // Tomorrow — teal (calm, forward-looking)
    return { label: 'Tomorrow', color: palette.teal }
  }
  // Further future — muted (low urgency, informational)
  const label = due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return { label, color: '#8B8BA7' }
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

function TaskCardInner({ task, index = 0, onComplete, onSnooze }: Props) {
  const { completeTask, snoozeTask, moveTask, addXP, energyLevel, unlockAchievement, hasAchievement, completedTotal } = useStore()
  const { shouldAnimate, t } = useMotion()
  const palette = usePalette()

  const [confettiActive, setConfettiActive] = useState(false)
  const [isDone, setIsDone] = useState(false)
  const [isPendingComplete, setIsPendingComplete] = useState(false)
  const [carryOverOpen, setCarryOverOpen] = useState(false)
  const completeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastIdRef = useRef<string | number | null>(null)
  const carryOverRef = useRef<HTMLDivElement>(null)

  // Close carry-over menu on outside click
  useEffect(() => {
    if (!carryOverOpen) return
    const handler = (e: MouseEvent) => {
      if (carryOverRef.current && !carryOverRef.current.contains(e.target as Node)) {
        setCarryOverOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [carryOverOpen])

  // Research #8: palette-aware accent — desaturated in calm mode
  const difficultyAccent = getDifficultyAccent(task.difficulty, palette)
  const ageBadge     = getTaskAgeBadge(task)
  const dueDateBadge = getDueDateBadge(task, palette)

  const handleComplete = () => {
    if (isDone || isPendingComplete) return

    // Immediate visual + haptic feedback
    setIsPendingComplete(true)
    setConfettiActive(true)
    hapticDone()

    // XP: base × difficulty × energy multiplier
    const energyMultiplier = energyLevel <= 2 ? 1.2 : energyLevel >= 4 ? 0.8 : 1.0
    const baseXp = Math.round(10 * task.difficulty * energyMultiplier)

    // Research #5: Deterministic VR schedule — store applies multiplier based on completedTotal.
    // We preview the tier here (same bucket logic) to show the right notification.
    const bucket = completedTotal % VR_BUCKET_SIZE
    const vrMultiplier =
      bucket < VR_JACKPOT_THRESHOLD ? VR_MULTIPLIER_JACKPOT :
      bucket < VR_BONUS_THRESHOLD   ? VR_MULTIPLIER_BONUS :
                                      1
    const isBonus = vrMultiplier > 1
    const displayXp = Math.round(baseXp * vrMultiplier)

    // Fire XP + task done notifications immediately
    addXP(baseXp)
    if (isBonus) {
      notifyXPBonus(displayXp)
    } else {
      notifyXP(displayXp)
    }
    notifyTaskDone(task.title)

    // Achievements
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

    // Show undo toast with 4-second countdown
    const id = toast('Done! ✓', {
      duration: 4000,
      action: {
        label: 'Undo',
        onClick: () => {
          // Cancel the pending completion
          if (completeTimerRef.current) clearTimeout(completeTimerRef.current)
          setIsPendingComplete(false)
          setIsDone(false)
        },
      },
    })
    toastIdRef.current = id

    // After 4 seconds, actually commit the completion to store/DB
    if (completeTimerRef.current) clearTimeout(completeTimerRef.current)
    completeTimerRef.current = setTimeout(() => {
      setIsDone(true)
      completeTask(task.id)
      onComplete?.()
    }, 4000)
  }

  const handleSnooze = () => {
    snoozeTask(task.id)
    toast('Parked for later. No rush. 🌿')
    onSnooze?.()
  }

  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, y: 16 } : {}}
      animate={{
        opacity: isDone ? 0 : isPendingComplete ? 0.7 : 1,
        y: 0,
        x: isDone ? -40 : 0,
        scale: isPendingComplete ? 0.98 : isDone ? 0.96 : 1,
      }}
      transition={{ ...t(), delay: index * 0.06 }}
      className="relative overflow-hidden rounded-2xl"
      style={{
        background: '#1E2136',
        // Calm left accent strip = difficulty indicator (no countdown, no urgency)
        borderTop:    '1px solid rgba(255,255,255,0.06)',
        borderRight:  '1px solid rgba(255,255,255,0.06)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
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
                  background: dot <= task.difficulty ? difficultyAccent : '#252840',
                }}
              />
            ))}
          </div>

          {/* Traffic Light badge (Block 6a) — shown when difficultyLevel is set */}
          {task.difficultyLevel && TRAFFIC_LIGHT[task.difficultyLevel] && (
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-md"
              style={{
                background: `${TRAFFIC_LIGHT[task.difficultyLevel].color}1A`,
                color: TRAFFIC_LIGHT[task.difficultyLevel].color,
                border: `1px solid ${TRAFFIC_LIGHT[task.difficultyLevel].color}40`,
              }}
            >
              {TRAFFIC_LIGHT[task.difficultyLevel].label}
            </span>
          )}

          {/* Time estimate — informational only, not a countdown */}
          <span className="text-xs" style={{ color: '#8B8BA7' }}>
            ~{task.estimatedMinutes}m
          </span>

          {/* Due date badge — color-coded by urgency, NEVER red (Research #8) */}
          {dueDateBadge && (
            <span
              className="ml-auto text-xs px-2 py-0.5 rounded-lg font-medium"
              style={{
                background: `${dueDateBadge.color}20`,
                color: dueDateBadge.color,
              }}
            >
              {dueDateBadge.label}
            </span>
          )}

          {/* Carry-over badge — tappable, opens quick action menu */}
          {!dueDateBadge && ageBadge && (
            <div ref={carryOverRef} className="ml-auto relative">
              <button
                onClick={(e) => { e.stopPropagation(); setCarryOverOpen(v => !v) }}
                className="text-xs px-2 py-0.5 rounded-lg font-medium"
                style={{
                  background: `${palette.gold}20`,
                  color: palette.gold,
                }}
                aria-label="Carry-over options"
              >
                carry-over ›
              </button>
              <AnimatePresence>
                {carryOverOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-full mt-1 z-20 rounded-xl overflow-hidden"
                    style={{
                      background: '#252840',
                      border: '1px solid rgba(255,255,255,0.10)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                      minWidth: 160,
                    }}
                  >
                    <button
                      onClick={() => { snoozeTask(task.id); setCarryOverOpen(false); toast('Parked for later 🌿') }}
                      className="w-full text-left px-4 py-2.5 text-xs transition-colors duration-100 hover:bg-white/5"
                      style={{ color: '#E8E8F0' }}
                    >
                      Park it →
                    </button>
                    <button
                      onClick={() => { moveTask(task.id, 'someday'); setCarryOverOpen(false); toast('Moved to Someday 🗂️') }}
                      className="w-full text-left px-4 py-2.5 text-xs transition-colors duration-100 hover:bg-white/5"
                      style={{ color: '#E8E8F0' }}
                    >
                      Move to Someday
                    </button>
                    <button
                      onClick={() => setCarryOverOpen(false)}
                      className="w-full text-left px-4 py-2.5 text-xs transition-colors duration-100 hover:bg-white/5"
                      style={{ color: '#8B8BA7' }}
                    >
                      Still on it ✓
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Task title + type badge */}
        <p
          className="text-base font-semibold leading-snug mb-4 line-clamp-2"
          style={{ color: '#E8E8F0' }}
        >
          {task.taskType === 'idea' && (
            <span className="mr-1.5" aria-label="Idea" title="Idea">💡</span>
          )}
          {task.taskType === 'reminder' && (
            <span className="mr-1.5" aria-label="Reminder" title="Reminder">🔔</span>
          )}
          {task.title}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Complete button */}
          <motion.button
            whileTap={shouldAnimate ? { scale: 0.94 } : {}}
            onClick={handleComplete}
            disabled={isDone}
            className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all duration-200"
            style={{
              background:   isDone ? '#252840' : `${palette.teal}26`,   // 15% alpha
              border:       '1px solid',
              borderColor:  isDone ? 'rgba(255,255,255,0.06)' : palette.teal,
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
              className="px-4 py-3 rounded-xl text-sm transition-all duration-200"
              style={{
                background: '#252840',
                border: '1px solid rgba(255,255,255,0.06)',
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

// ── memo wrapper — prevents re-render when sibling tasks change in a list ────
// Custom comparator: re-render only when the task's own data or callbacks change.
// This avoids cascade re-renders when other tasks in the NOW pool are updated.
export const TaskCard = memo(TaskCardInner, (prev, next) =>
  prev.task.id === next.task.id &&
  prev.task.title === next.task.title &&
  prev.task.status === next.task.status &&
  prev.task.completedAt === next.task.completedAt &&
  prev.task.snoozeCount === next.task.snoozeCount &&
  prev.task.difficultyLevel === next.task.difficultyLevel &&
  prev.task.difficulty === next.task.difficulty &&
  prev.index === next.index &&
  prev.onComplete === next.onComplete &&
  prev.onSnooze === next.onSnooze
)
