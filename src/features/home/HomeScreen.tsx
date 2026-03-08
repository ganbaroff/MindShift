/**
 * HomeScreen
 *
 * Progressive disclosure redesign (March 2025):
 * - New users see a QuickSetupCard instead of being redirected to forced /onboarding tutorial
 * - App is immediately usable: tasks, energy check-in, pools all work without setup
 * - QuickSetupCard is dismissible ("Start exploring" skips setup)
 * - Behaviorally activated: users learn by doing, not by reading wizard steps
 * - /onboarding route still exists for explicit deep-setup (accessible from Settings)
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useReducedMotion } from '@/shared/hooks/useReducedMotion'
import { Plus } from 'lucide-react'
import { useStore } from '@/store'
import { EnergyCheckin } from './EnergyCheckin'
import { TaskCard } from '@/features/tasks/TaskCard'
import { AddTaskModal } from '@/features/tasks/AddTaskModal'
import { hapticTap } from '@/shared/lib/haptic'
import type { EnergyLevel, AppMode } from '@/types'
import { NOW_POOL_MAX } from '@/shared/lib/constants'

// ── Quick Setup Card (progressive disclosure — replaces forced onboarding) ─────

const MODE_OPTIONS: { mode: AppMode; emoji: string; label: string; sub: string }[] = [
  { mode: 'minimal', emoji: '🎯', label: 'One thing at a time',    sub: 'I just need to focus on one task right now' },
  { mode: 'habit',   emoji: '🌱', label: 'Build daily habits',     sub: 'I want consistency without overwhelm' },
  { mode: 'system',  emoji: '🗂️', label: 'Manage everything',      sub: 'I want full visibility over my projects' },
]

interface QuickSetupCardProps {
  onDone: () => void
}

function QuickSetupCard({ onDone }: QuickSetupCardProps) {
  const { setAppMode, setCognitiveMode, setOnboardingCompleted, userId } = useStore()
  const [selected, setSelected] = useState<AppMode | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSelect = async (mode: AppMode) => {
    setSelected(mode)
    setSaving(true)

    setAppMode(mode)
    // Sensible default: minimal+habit → focused mode; system → overview
    setCognitiveMode(mode === 'system' ? 'overview' : 'focused')
    setOnboardingCompleted()

    // Non-blocking Supabase persist
    if (userId) {
      const { supabase } = await import('@/shared/lib/supabase')
      await supabase.from('users').upsert({
        id: userId,
        app_mode: mode,
        cognitive_mode: mode === 'system' ? 'overview' : 'focused',
        onboarding_completed: true,
      } as never).then(() => { /* non-blocking */ })
    }

    setSaving(false)
    onDone()
  }

  const handleSkip = () => {
    // Sensible defaults — user can change in Settings anytime
    setOnboardingCompleted()
    onDone()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.35 }}
      className="mx-5 mb-6 rounded-2xl overflow-hidden"
      style={{ background: '#1A1D2E', border: '1.5px solid #2D3150' }}
    >
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-center gap-2 mb-1">
          <span>👋</span>
          <h2 className="text-base font-bold" style={{ color: '#E8E8F0' }}>
            Welcome to MindShift
          </h2>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: '#8B8BA7' }}>
          The app is ready to use. Pick a style to personalise your experience — or skip and explore.
        </p>
      </div>

      {/* Mode options */}
      <div className="px-4 flex flex-col gap-2 pb-3">
        {MODE_OPTIONS.map(({ mode, emoji, label, sub }) => {
          const isSelected = selected === mode
          return (
            <button
              key={mode}
              onClick={() => void handleSelect(mode)}
              disabled={saving}
              className="flex items-start gap-3 p-3 rounded-xl text-left transition-all duration-150"
              style={{
                background: isSelected ? 'rgba(108,99,255,0.15)' : '#252840',
                border: `1.5px solid ${isSelected ? '#6C63FF' : 'transparent'}`,
              }}
            >
              <span className="text-lg mt-0.5 shrink-0">{emoji}</span>
              <div>
                <p className="text-sm font-semibold" style={{ color: isSelected ? '#6C63FF' : '#E8E8F0' }}>
                  {label}
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#8B8BA7' }}>{sub}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Skip */}
      <div className="px-4 pb-4">
        <button
          onClick={handleSkip}
          className="w-full py-2 text-xs text-center transition-colors duration-200"
          style={{ color: '#8B8BA7' }}
        >
          Skip — I'll explore on my own →
        </button>
      </div>
    </motion.div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const {
    nowPool, nextPool, energyLevel, setEnergyLevel,
    cognitiveMode, appMode, focusAnchor,
    startSession, setPhase,
    onboardingCompleted,
  } = useStore()
  const reducedMotion = useReducedMotion()
  const navigate = useNavigate()

  const [energySet, setEnergySet]       = useState(false)
  const [nextExpanded, setNextExpanded] = useState(false)
  const [addOpen, setAddOpen]           = useState(false)
  // Local state to animate away the QuickSetupCard after completion
  const [setupDone, setSetupDone]       = useState(false)

  // Show setup card for users who haven't completed setup yet
  const showQuickSetup = !onboardingCompleted && !setupDone

  // ── "Just 5 Minutes" — behavioural activation (CBT-backed) ─────────────────
  const handleQuickFocus = () => {
    hapticTap()
    startSession(null, 5, focusAnchor ?? 'brown')
    setPhase('struggle')
    navigate('/focus?quick=1')
  }

  // Active tasks only
  const activeTasks = nowPool.filter(t => t.status === 'active')
  const nextTasks   = nextPool.filter(t => t.status === 'active')

  // Focused mode: show one task at a time; overview/system: all
  const visibleNow = cognitiveMode === 'focused' ? activeTasks.slice(0, 1) : activeTasks.slice(0, NOW_POOL_MAX)

  const handleEnergySelect = (level: EnergyLevel) => {
    setEnergyLevel(level)
    setEnergySet(true)
  }

  // Greeting based on time of day
  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'Good morning ☀️' :
    hour < 17 ? 'Good afternoon 🌤️' :
    'Good evening 🌙'

  return (
    <div className="flex flex-col min-h-full pb-28">
      {/* Header */}
      <div className="px-5 pt-10 pb-4">
        <motion.h1
          initial={reducedMotion ? {} : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold mb-0.5"
          style={{ color: '#E8E8F0' }}
        >
          {greeting}
        </motion.h1>
        <motion.p
          initial={reducedMotion ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-sm"
          style={{ color: '#8B8BA7' }}
        >
          {appMode === 'minimal'
            ? 'One task at a time. What matters most?'
            : appMode === 'habit'
            ? "Let's build your routine, one step at a time."
            : 'Full system view — your pools are ready.'}
        </motion.p>
      </div>

      {/* ── Quick Setup Card — progressive disclosure for new users ──────────── */}
      <AnimatePresence>
        {showQuickSetup && (
          <QuickSetupCard onDone={() => setSetupDone(true)} />
        )}
      </AnimatePresence>

      {/* Energy Check-in */}
      <motion.div
        initial={reducedMotion ? {} : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mx-5 mb-5 p-4 rounded-2xl"
        style={{ background: '#1A1D2E', border: '1.5px solid #2D3150' }}
      >
        <p className="text-xs font-medium tracking-widest uppercase mb-3" style={{ color: '#6C63FF' }}>
          {energySet ? '⚡ Energy today' : "How's your brain right now?"}
        </p>
        <EnergyCheckin
          onSelect={handleEnergySelect}
          selected={energyLevel}
          compact={energySet}
        />
      </motion.div>

      {/* ── JUST 5 MINUTES — behavioural activation (CBT-backed, Gemini research) */}
      <motion.button
        initial={reducedMotion ? {} : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
        whileTap={reducedMotion ? {} : { scale: 0.97 }}
        onClick={handleQuickFocus}
        className="mx-5 mb-5 flex items-center gap-4 p-4 rounded-2xl text-left"
        style={{
          background: 'linear-gradient(135deg, rgba(78,205,196,0.12), rgba(108,99,255,0.08))',
          border: '1.5px solid #4ECDC4',
          boxShadow: '0 4px 24px rgba(78,205,196,0.10)',
        }}
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0"
          style={{ background: 'rgba(78,205,196,0.2)' }}
        >
          ⚡
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold" style={{ color: '#4ECDC4' }}>
            Just 5 minutes
          </p>
          <p className="text-xs mt-0.5" style={{ color: '#8B8BA7' }}>
            Can't start? One tap. No decisions. Just begin.
          </p>
        </div>
        <span className="text-lg" style={{ color: '#4ECDC4' }}>→</span>
      </motion.button>

      {/* NOW Pool */}
      <div className="px-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-medium tracking-widest uppercase" style={{ color: '#8B8BA7' }}>
            Now
          </h2>
          <span className="text-xs" style={{ color: '#6C63FF' }}>
            {activeTasks.length}/{NOW_POOL_MAX}
          </span>
        </div>

        <AnimatePresence mode="popLayout">
          {visibleNow.length === 0 ? (
            <motion.div
              key="empty-now"
              initial={reducedMotion ? {} : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-8 text-center rounded-2xl"
              style={{ background: '#1A1D2E', border: '1.5px dashed #2D3150' }}
            >
              <p className="text-2xl mb-2">🎉</p>
              <p className="text-sm font-medium" style={{ color: '#E8E8F0' }}>
                NOW pool is clear!
              </p>
              <p className="text-xs mt-1" style={{ color: '#8B8BA7' }}>
                Add a task or pull one from Next
              </p>
            </motion.div>
          ) : (
            visibleNow.map((task, i) => (
              <TaskCard key={task.id} task={task} index={i} />
            ))
          )}
        </AnimatePresence>

        {/* Show more indicator for focused mode */}
        {cognitiveMode === 'focused' && activeTasks.length > 1 && (
          <p className="text-xs text-center" style={{ color: '#8B8BA7' }}>
            +{activeTasks.length - 1} more in queue
          </p>
        )}
      </div>

      {/* NEXT Pool (collapsible) */}
      {nextTasks.length > 0 && (
        <div className="px-5 mt-6 flex flex-col gap-2">
          <button
            onClick={() => setNextExpanded(v => !v)}
            className="flex items-center justify-between py-2"
            aria-expanded={nextExpanded}
          >
            <h2 className="text-xs font-medium tracking-widest uppercase" style={{ color: '#8B8BA7' }}>
              Next
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: '#8B8BA7' }}>
                {nextTasks.length} task{nextTasks.length !== 1 ? 's' : ''}
              </span>
              <motion.span
                animate={{ rotate: nextExpanded ? 180 : 0 }}
                style={{ color: '#8B8BA7', display: 'inline-block' }}
              >
                ▾
              </motion.span>
            </div>
          </button>

          <AnimatePresence>
            {nextExpanded && (
              <motion.div
                initial={reducedMotion ? {} : { height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={reducedMotion ? {} : { height: 0, opacity: 0 }}
                className="flex flex-col gap-3 overflow-hidden"
              >
                {nextTasks.map((task, i) => (
                  <TaskCard key={task.id} task={task} index={i} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Add Task FAB */}
      <motion.button
        initial={reducedMotion ? {} : { scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3 }}
        whileTap={reducedMotion ? {} : { scale: 0.94 }}
        onClick={() => setAddOpen(true)}
        className="fixed bottom-24 right-5 flex items-center gap-2 px-5 py-3.5 rounded-full shadow-lg z-30"
        style={{ background: '#6C63FF' }}
        aria-label="Add task"
      >
        <Plus size={20} color="white" />
        <span className="text-sm font-semibold text-white">Add task</span>
      </motion.button>

      <AddTaskModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}
