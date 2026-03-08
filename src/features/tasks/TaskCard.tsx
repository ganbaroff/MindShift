import { useRef, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useReducedMotion } from 'framer-motion'
import { useStore } from '@/store'
import { Confetti } from '@/shared/ui/Confetti'
import { notifyXP, notifyAchievement, notifyTaskDone } from '@/shared/lib/notify'
import type { Task } from '@/types'
import { ACHIEVEMENT_DEFINITIONS } from '@/types'

// ── Helpers ────────────────────────────────────────────────────────────────────

function getTimePct(task: Task): number {
  if (task.estimatedMinutes <= 0) return 100
  const elapsedMs = Date.now() - new Date(task.createdAt).getTime()
  const totalMs = task.estimatedMinutes * 60 * 1000
  return Math.max(0, Math.min(100, ((totalMs - elapsedMs) / totalMs) * 100))
}

function getBarColor(pct: number): string {
  if (pct > 50) return '#4ECDC4'  // teal – plenty of time
  if (pct > 25) return '#FFE66D'  // yellow – getting close
  return '#FF6B6B'                 // soft coral – last stretch (NEVER bright red)
}

const DIFFICULTY_LABELS: Record<number, string> = { 1: 'Easy', 2: 'Medium', 3: 'Hard' }

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  task: Task
  index?: number
  onComplete?: () => void
  onSnooze?: () => void
}

export function TaskCard({ task, index = 0, onComplete, onSnooze }: Props) {
  const { completeTask, snoozeTask, addXP, energyLevel, unlockAchievement, hasAchievement } = useStore()
  const reducedMotion = useReducedMotion()

  const [confettiActive, setConfettiActive] = useState(false)
  const [isDone, setIsDone] = useState(false)
  const [pct, setPct] = useState(() => getTimePct(task))
  const animFrameRef = useRef<number | null>(null)

  // Update bar color live — throttled to ~1/s via rAF frame counter
  useEffect(() => {
    if (task.status !== 'active') return
    let frameCount = 0
    function throttled() {
      frameCount++
      if (frameCount % 60 === 0) setPct(getTimePct(task))
      animFrameRef.current = requestAnimationFrame(throttled)
    }
    animFrameRef.current = requestAnimationFrame(throttled)
    return () => {
      if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current)
    }
  }, [task])

  const remainingMs = Math.max(0, task.estimatedMinutes * 60 * 1000 - (Date.now() - new Date(task.createdAt).getTime()))

  const handleComplete = () => {
    if (isDone) return
    setIsDone(true)
    setConfettiActive(true)

    // XP: base × difficulty × energy multiplier
    const energyMultiplier = energyLevel <= 2 ? 1.2 : energyLevel >= 4 ? 0.8 : 1.0
    const xp = Math.round(10 * task.difficulty * energyMultiplier)
    addXP(xp)
    notifyXP(xp)
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
    if (hour < 9) tryUnlock('morning_mind')

    setTimeout(() => {
      completeTask(task.id)
      onComplete?.()
    }, 600)
  }

  const handleSnooze = () => {
    snoozeTask(task.id)
    onSnooze?.()
  }

  const barColor = getBarColor(pct)

  return (
    <motion.div
      initial={reducedMotion ? {} : { opacity: 0, y: 16 }}
      animate={{ opacity: isDone ? 0 : 1, y: 0, scale: isDone ? 0.96 : 1 }}
      transition={{ delay: index * 0.07, duration: 0.25 }}
      className="relative overflow-hidden rounded-2xl"
      style={{ background: '#1A1D2E', border: '1.5px solid #2D3150' }}
    >
      <Confetti active={confettiActive} onComplete={() => setConfettiActive(false)} />

      {/* Shrinking time bar */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5"
        style={{ background: '#2D3150' }}
        aria-hidden="true"
      >
        <motion.div
          className="h-full"
          initial={{ width: `${pct}%` }}
          animate={{ width: '0%' }}
          transition={{
            duration: reducedMotion ? 0 : remainingMs / 1000,
            ease: 'linear',
          }}
          style={{ background: barColor }}
        />
      </div>

      <div className="p-4 pt-5">
        {/* Header: difficulty + pool badge */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex gap-1" aria-label={`Difficulty: ${DIFFICULTY_LABELS[task.difficulty]}`}>
            {[1, 2, 3].map(dot => (
              <div
                key={dot}
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: dot <= task.difficulty ? '#6C63FF' : '#2D3150',
                }}
              />
            ))}
          </div>
          <span className="text-xs" style={{ color: '#8B8BA7' }}>
            {task.estimatedMinutes}m
          </span>
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
            whileTap={reducedMotion ? {} : { scale: 0.94 }}
            onClick={handleComplete}
            disabled={isDone}
            className="flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200"
            style={{
              background: isDone ? '#2D3150' : 'rgba(78, 205, 196, 0.15)',
              border: '1.5px solid',
              borderColor: isDone ? '#2D3150' : '#4ECDC4',
              color: isDone ? '#8B8BA7' : '#4ECDC4',
            }}
          >
            {isDone ? '✓ Done!' : '✓ Complete'}
          </motion.button>

          {/* Snooze button */}
          {task.pool === 'now' && (
            <motion.button
              whileTap={reducedMotion ? {} : { scale: 0.94 }}
              onClick={handleSnooze}
              className="px-4 py-2.5 rounded-xl text-sm transition-all duration-200"
              style={{
                background: '#252840',
                border: '1.5px solid #2D3150',
                color: '#8B8BA7',
              }}
              title="Move to Next — no penalty"
            >
              Not now →
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
