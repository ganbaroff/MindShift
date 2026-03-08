/**
 * HomeScreen
 *
 * Progressive disclosure + Bento Grid redesign (March 2025):
 *
 * Research basis (Research #1 — Adaptive UX for Neurodivergent):
 * - No forced onboarding wizard (decision fatigue → 3–5 setup choices max)
 * - BentoGrid: sortable widget cards, psychotype-driven defaults
 * - 3–5 visible widgets: optimal for ADHD cognitive load (CLT research)
 * - Mochi mascot: emotional anchor + body double concept (Finch model)
 * - Progressive disclosure: QuickSetupCard inline, dismissible
 *
 * Mochi states:
 *   - low-energy (energy 1–2): droopy, calm
 *   - focused (during active session): narrowed eyes, glow
 *   - idle (default): gentle float
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useReducedMotion } from '@/shared/hooks/useReducedMotion'
import { Plus } from 'lucide-react'
import { useStore } from '@/store'
import { AddTaskModal } from '@/features/tasks/AddTaskModal'
import { Mascot } from '@/shared/ui/Mascot'
import { BentoGrid } from './BentoGrid'
import { hapticTap } from '@/shared/lib/haptic'
import type { MascotState } from '@/shared/ui/Mascot'
import type { AppMode } from '@/types'

// ── Quick Setup Card (progressive disclosure — no forced wizard) ───────────────

const MODE_OPTIONS: { mode: AppMode; emoji: string; label: string; sub: string }[] = [
  { mode: 'minimal', emoji: '🎯', label: 'One thing at a time',    sub: 'Just need to focus on one task right now' },
  { mode: 'habit',   emoji: '🌱', label: 'Build daily habits',     sub: 'Consistency without overwhelm' },
  { mode: 'system',  emoji: '🗂️', label: 'Manage everything',      sub: 'Full visibility over my projects' },
]

interface QuickSetupCardProps { onDone: () => void }

function QuickSetupCard({ onDone }: QuickSetupCardProps) {
  const {
    setAppMode, setCognitiveMode, setOnboardingCompleted,
    userId, resetGridToDefaults,
  } = useStore()
  const [selected, setSelected] = useState<AppMode | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSelect = async (mode: AppMode) => {
    setSelected(mode)
    setSaving(true)
    setAppMode(mode)
    setCognitiveMode(mode === 'system' ? 'overview' : 'focused')
    setOnboardingCompleted()
    resetGridToDefaults()   // Apply psychotype-driven widget layout immediately

    if (userId) {
      const { supabase } = await import('@/shared/lib/supabase')
      await supabase.from('users').upsert({
        id: userId,
        app_mode: mode,
        cognitive_mode: mode === 'system' ? 'overview' : 'focused',
        onboarding_completed: true,
      } as never)
    }
    setSaving(false)
    onDone()
  }

  const handleSkip = () => { setOnboardingCompleted(); onDone() }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.35 }}
      className="mx-5 mb-4 rounded-2xl overflow-hidden"
      style={{ background: '#1A1D2E', border: '1.5px solid #2D3150' }}
    >
      <div className="p-4 pb-3">
        <div className="flex items-center gap-2 mb-1">
          <span>👋</span>
          <h2 className="text-base font-bold" style={{ color: '#E8E8F0' }}>Welcome to MindShift</h2>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: '#8B8BA7' }}>
          Pick a style to personalise your widget layout — or skip and explore.
        </p>
      </div>

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

// ── Main HomeScreen ────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const {
    energyLevel, appMode, activeSession,
    onboardingCompleted, gridWidgets, setGridWidgets,
  } = useStore()
  const reducedMotion = useReducedMotion()

  const [setupDone, setSetupDone]     = useState(false)
  const [addOpen,   setAddOpen]       = useState(false)
  const [mascotState, setMascotState] = useState<MascotState>('idle')

  const showQuickSetup = !onboardingCompleted && !setupDone

  // ── Mochi: driven by energy level + active session ──────────────────────────
  useEffect(() => {
    if (activeSession) {
      setMascotState('focused')
    } else if (energyLevel <= 2) {
      setMascotState('low-energy')
    } else {
      setMascotState('idle')
    }
  }, [energyLevel, activeSession])

  // Greeting
  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'Good morning ☀️' :
    hour < 17 ? 'Good afternoon 🌤️' :
    'Good evening 🌙'

  const subtitle =
    appMode === 'minimal' ? 'One task at a time. What matters most?' :
    appMode === 'habit'   ? "Let's build your routine, one step at a time." :
    'Full system view — your pools are ready.'

  return (
    <div className="flex flex-col min-h-full pb-32">

      {/* ── Header + Mochi ──────────────────────────────────────────────── */}
      <div className="px-5 pt-10 pb-2 flex items-end justify-between gap-4">
        <div className="flex-1 min-w-0">
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
            {subtitle}
          </motion.p>
        </div>

        {/* Mochi — emotional anchor, body double concept (Finch model) */}
        <motion.div
          initial={reducedMotion ? {} : { opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 300 }}
          className="shrink-0"
        >
          <Mascot
            state={mascotState}
            size={72}
            label={`Mochi your focus buddy is ${mascotState}`}
          />
        </motion.div>
      </div>

      {/* ── Quick Setup Card (new users only) ───────────────────────────── */}
      <AnimatePresence>
        {showQuickSetup && (
          <QuickSetupCard onDone={() => setSetupDone(true)} />
        )}
      </AnimatePresence>

      {/* ── Bento Grid (sortable, psychotype-driven, dnd-kit) ───────────── */}
      <motion.div
        initial={reducedMotion ? {} : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-2"
      >
        <BentoGrid
          widgets={gridWidgets}
          onReorder={setGridWidgets}
        />
      </motion.div>

      {/* ── Add Task FAB ────────────────────────────────────────────────── */}
      <motion.button
        initial={reducedMotion ? {} : { scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3 }}
        whileTap={reducedMotion ? {} : { scale: 0.94 }}
        onClick={() => { hapticTap(); setAddOpen(true) }}
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
