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

import { lazy, Suspense, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useMotion } from '@/shared/hooks/useMotion'
import { useGridSync } from '@/shared/hooks/useGridSync'
import { Plus } from 'lucide-react'
import { useStore } from '@/store'
import { AddTaskModal } from '@/features/tasks/AddTaskModal'
import { Mascot } from '@/shared/ui/Mascot'
import { BurnoutAlert } from './BurnoutAlert'
import { BurnoutNudgeCard } from './BurnoutNudgeCard'

// BentoGrid pulls in dnd-kit (~45 KB gzip) — lazy-load so it only lands in the
// HomeScreen chunk, not the shared vendor bundle.
const BentoGrid = lazy(() => import('./BentoGrid').then(m => ({ default: m.BentoGrid })))
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
      style={{ background: 'var(--color-card)', border: '1px solid var(--color-border-subtle)' }}
    >
      <div className="p-4 pb-3">
        <div className="flex items-center gap-2 mb-1">
          <span>👋</span>
          <h2 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>Welcome to MindShift</h2>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-muted)' }}>
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
                background: isSelected ? 'var(--color-primary-alpha)' : 'var(--color-elevated)',
                border: `1.5px solid ${isSelected ? 'var(--color-primary)' : 'transparent'}`,
              }}
            >
              <span className="text-lg mt-0.5 shrink-0">{emoji}</span>
              <div>
                <p className="text-sm font-semibold" style={{ color: isSelected ? 'var(--color-primary)' : 'var(--color-text)' }}>
                  {label}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>{sub}</p>
              </div>
            </button>
          )
        })}
      </div>

      <div className="px-4 pb-4">
        <button
          onClick={handleSkip}
          className="w-full py-2 text-xs text-center transition-colors duration-200"
          style={{ color: 'var(--color-muted)' }}
        >
          Skip — I'll explore on my own →
        </button>
      </div>
    </motion.div>
  )
}

// ── First-task prompt (Research #4: blank slate prevention, TTFV < 3 min) ─────
// Shows when the NOW pool is empty after onboarding. One tap → AddTaskModal.
// Dismissible so it never becomes a nagging obligation.
function FirstTaskPrompt({ onAdd, onDismiss }: { onAdd: () => void; onDismiss: () => void }) {
  const { t } = useMotion()
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={t()}
      className="mx-5 mb-4 rounded-2xl p-4"
      style={{
        background: 'linear-gradient(135deg, var(--color-primary-alpha) 0%, rgba(123,114,255,0.04) 100%)',
        border: '1.5px solid var(--color-border-accent)',
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
          🧠 What's one thing on your mind right now?
        </p>
        <button
          onClick={onDismiss}
          className="shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2 -mt-1 rounded-lg text-xs transition-opacity hover:opacity-70"
          style={{ color: '#5A5B72' }}
          aria-label="Dismiss suggestion"
        >
          ✕
        </button>
      </div>
      <p className="text-xs mb-3" style={{ color: 'var(--color-muted)' }}>
        Capture it — we'll help you break it down into steps.
      </p>
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onAdd}
        className="w-full py-3 rounded-xl text-sm font-semibold"
        style={{
          background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
          color: '#fff',
          boxShadow: '0 4px 20px rgba(123,114,255,0.3)',
        }}
      >
        ✨ Add my first task →
      </motion.button>
    </motion.div>
  )
}

// ── BentoGrid skeleton — shown while the lazy chunk loads (~50 ms) ────────────
function BentoGridSkeleton() {
  return (
    <div className="px-4 grid grid-cols-2 gap-3 mt-2">
      {[1, 2, 3, 4].map(i => (
        <div
          key={i}
          className="rounded-2xl animate-pulse"
          style={{ height: 120, background: 'var(--color-card)', border: '1px solid rgba(255,255,255,0.04)' }}
        />
      ))}
    </div>
  )
}

// ── Main HomeScreen ────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const {
    energyLevel, appMode, activeSession,
    onboardingCompleted, nowPool, gridWidgets, setGridWidgets,
    burnoutScore,
  } = useStore()
  const { t, shouldAnimate } = useMotion()
  useGridSync()   // two-tier persistence: IndexedDB (offline) + Supabase (cross-device)

  const [setupDone,             setSetupDone]             = useState(false)
  const [addOpen,               setAddOpen]               = useState(false)
  const [mascotState,           setMascotState]           = useState<MascotState>('idle')
  const [firstTaskDismissed,    setFirstTaskDismissed]    = useState(false)

  const showQuickSetup = !onboardingCompleted && !setupDone

  // Research #4: blank slate prevention — show when NOW pool is empty post-onboarding
  const activeNowTasks = nowPool.filter(t => t.status === 'active')
  const showFirstTaskPrompt =
    onboardingCompleted &&
    !showQuickSetup &&
    activeNowTasks.length === 0 &&
    !firstTaskDismissed

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
    'Everything visible at once. What needs attention first?'

  return (
    <div className="flex flex-col min-h-full pb-[calc(128px+env(safe-area-inset-bottom))]">

      {/* ── Header + Mochi ──────────────────────────────────────────────── */}
      <div className="px-5 pt-10 pb-2 flex items-end justify-between gap-4">
        <div className="flex-1 min-w-0">
          <motion.h1
            initial={shouldAnimate ? { opacity: 0, y: -8 } : {}}
            animate={{ opacity: 1, y: 0 }}
            transition={t()}
            className="text-2xl font-bold mb-0.5"
            style={{ color: 'var(--color-text)' }}
          >
            {greeting}
          </motion.h1>
          <motion.p
            initial={shouldAnimate ? { opacity: 0 } : {}}
            animate={{ opacity: 1 }}
            transition={{ ...t(), delay: 0.1 }}
            className="text-sm"
            style={{ color: 'var(--color-muted)' }}
          >
            {subtitle}
          </motion.p>
        </div>

        {/* Mochi — emotional anchor, body double concept (Finch model) */}
        <motion.div
          initial={shouldAnimate ? { opacity: 0, scale: 0.8 } : {}}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...t(), delay: 0.15 }}
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

      {/* ── First-task prompt (Research #4: blank slate prevention) ─────── */}
      <AnimatePresence>
        {showFirstTaskPrompt && (
          <FirstTaskPrompt
            onAdd={() => { hapticTap(); setAddOpen(true) }}
            onDismiss={() => setFirstTaskDismissed(true)}
          />
        )}
      </AnimatePresence>

      {/* Burnout nudge card — Block 5b (shows when burnoutScore ≥ 60 + 24h no session) */}
      <BurnoutNudgeCard burnoutScore={burnoutScore} />

      {/* Burnout alert — Block 2 (shows when burnoutScore ≥ 41) */}
      <BurnoutAlert score={burnoutScore} />

      {/* ── Bento Grid (sortable, psychotype-driven, dnd-kit) ───────────── */}
      <motion.div
        initial={shouldAnimate ? { opacity: 0, y: 10 } : {}}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...t(), delay: 0.2 }}
        className="mt-2"
      >
        <Suspense fallback={<BentoGridSkeleton />}>
          <BentoGrid
            widgets={gridWidgets}
            onReorder={setGridWidgets}
          />
        </Suspense>
      </motion.div>

      {/* ── Add Task FAB ────────────────────────────────────────────────── */}
      <motion.button
        initial={shouldAnimate ? { scale: 0.8, opacity: 0 } : {}}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ ...t(), delay: 0.3 }}
        whileTap={shouldAnimate ? { scale: 0.94 } : {}}
        onClick={() => { hapticTap(); setAddOpen(true) }}
        className="fixed bottom-24 flex items-center gap-2 px-5 py-3.5 rounded-full shadow-lg z-30"
        style={{ background: 'var(--color-primary)', right: 'calc(max(0px, (100vw - 480px) / 2) + 20px)' }}
        aria-label="Add task"
      >
        <Plus size={20} color="white" />
        <span className="text-sm font-semibold text-white">Add task</span>
      </motion.button>

      <AddTaskModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}
