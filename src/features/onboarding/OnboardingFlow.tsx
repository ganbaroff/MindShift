import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronLeft } from 'lucide-react'
import { useStore } from '@/store'
import { supabase } from '@/shared/lib/supabase'
import type { AppMode, EnergyLevel, CognitiveMode, Task } from '@/types'
import { EnergyCheckin } from '@/features/home/EnergyCheckin'
import { useMotion } from '@/shared/hooks/useMotion'

// ── Sample tasks (Research #4: blank-slate anxiety prevention) ────────────────
// Pre-populated per AppMode so first-timers see a meaningful starting point.
// 1 task in 'now' (actionable today), 1 in 'next' (low pressure queue).
// All difficulty=1, short estimates — avoid intimidating new users.

const SAMPLE_TASKS: Record<AppMode, { title: string; pool: Task['pool']; difficulty: Task['difficulty']; estimatedMinutes: number }[]> = {
  minimal: [
    { title: 'Pick ONE thing that matters today', pool: 'now',  difficulty: 1, estimatedMinutes: 5  },
    { title: 'Write down anything stuck in your head', pool: 'next', difficulty: 1, estimatedMinutes: 10 },
  ],
  habit: [
    { title: 'Do 2 minutes of your top habit', pool: 'now',  difficulty: 1, estimatedMinutes: 2  },
    { title: 'Review your routine for tomorrow', pool: 'next', difficulty: 1, estimatedMinutes: 5  },
  ],
  system: [
    { title: 'Brain dump: list everything on your mind', pool: 'now',  difficulty: 1, estimatedMinutes: 10 },
    { title: 'Pick 3 priorities for this week', pool: 'next', difficulty: 2, estimatedMinutes: 15 },
  ],
}

function makeSampleTask(
  fields: { title: string; pool: Task['pool']; difficulty: Task['difficulty']; estimatedMinutes: number },
  index: number,
): Task {
  return {
    id: `sample-${Date.now()}-${index}`,
    title: fields.title,
    pool: fields.pool,
    status: 'active',
    difficulty: fields.difficulty,
    estimatedMinutes: fields.estimatedMinutes,
    createdAt: new Date().toISOString(),
    completedAt: null,
    snoozeCount: 0,
    parentTaskId: null,
    position: index,
  }
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ step, total }: { step: number; total: number }) {
  const { t } = useMotion()
  return (
    <div className="px-5 pt-safe pt-10">
      {/* Step label */}
      <div className="flex items-center justify-between mb-3">
        <motion.p
          key={step}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={t()}
          className="text-xs font-semibold tracking-widest uppercase"
          style={{ color: '#7B72FF' }}
        >
          Step {step + 1} of {total}
        </motion.p>
        <p className="text-xs" style={{ color: '#6B7280' }}>
          {Math.round(((step + 1) / total) * 100)}% complete
        </p>
      </div>
      {/* Segmented bar */}
      <div className="flex gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: '#252840' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: i <= step ? '#7B72FF' : 'transparent' }}
              initial={false}
              animate={{ width: i <= step ? '100%' : '0%' }}
              transition={t()}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Back button ───────────────────────────────────────────────────────────────
function BackBtn({ onBack }: { onBack: () => void }) {
  return (
    <button
      onClick={onBack}
      className="flex items-center gap-1 text-xs mt-2 ml-1 transition-opacity hover:opacity-80 min-h-[44px] px-2"
      style={{ color: '#5A5B72' }}
    >
      <ChevronLeft size={14} />
      Back
    </button>
  )
}

// ── Screen 1: Intent ──────────────────────────────────────────────────────────
const MODE_CARDS: {
  mode: AppMode
  emoji: string
  title: string
  subtitle: string
  accent: string
}[] = [
  {
    mode: 'minimal',
    emoji: '🎯',
    title: 'Close ONE important task',
    subtitle: 'I need to focus on a single thing right now',
    accent: '#7B72FF',
  },
  {
    mode: 'habit',
    emoji: '🌱',
    title: 'Build a daily routine',
    subtitle: "I want consistent habits that don't overwhelm me",
    accent: '#4ECDC4',
  },
  {
    mode: 'system',
    emoji: '🗂️',
    title: 'Organize my whole system',
    subtitle: 'I want full visibility and control over my projects',
    accent: '#F59E0B',
  },
]

function IntentScreen({ onNext }: { onNext: (mode: AppMode) => void }) {
  const { t } = useMotion()
  const [hovered, setHovered] = useState<AppMode | null>(null)

  return (
    <div className="flex flex-col px-4 pt-8 pb-6 min-h-full">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={t()}
        className="mb-5"
      >
        <h1 className="text-2xl font-bold mb-1.5" style={{ color: '#E8E8F0' }}>
          What brings you here today?
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: '#8B8BA7' }}>
          Choose your mental mode — you can change this anytime.
        </p>
      </motion.div>

      <div className="flex flex-col gap-3">
        {MODE_CARDS.map(({ mode, emoji, title, subtitle, accent }, i) => {
          const isHovered = hovered === mode
          return (
            <motion.button
              key={mode}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...t(), delay: 0.06 + i * 0.07 }}
              whileTap={{ scale: 0.985 }}
              onClick={() => onNext(mode)}
              onHoverStart={() => setHovered(mode)}
              onHoverEnd={() => setHovered(null)}
              className="text-left p-5 rounded-2xl transition-all duration-200 relative overflow-hidden"
              style={{
                background: isHovered
                  ? `linear-gradient(135deg, ${accent}18 0%, ${accent}08 100%)`
                  : '#1E2136',
                border: `1.5px solid ${isHovered ? `${accent}60` : 'rgba(255,255,255,0.06)'}`,
                boxShadow: isHovered ? `0 4px 20px ${accent}18` : 'none',
              }}
            >
              {/* Glow spot */}
              {isHovered && (
                <motion.div
                  className="absolute -top-8 -right-8 w-24 h-24 rounded-full pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ background: `radial-gradient(circle, ${accent}25 0%, transparent 70%)` }}
                />
              )}
              <div className="text-3xl mb-2">{emoji}</div>
              <div
                className="font-semibold text-base mb-0.5 transition-colors duration-200"
                style={{ color: isHovered ? '#F0F0F8' : '#E8E8F0' }}
              >
                {title}
              </div>
              <div className="text-sm" style={{ color: '#8B8BA7' }}>{subtitle}</div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

// ── Screen 2: Energy check-in (wrapper) ──────────────────────────────────────
function EnergyScreen({ onNext, onBack }: { onNext: (e: EnergyLevel) => void; onBack: () => void }) {
  const { t } = useMotion()
  return (
    <div className="flex flex-col px-5 pt-8 pb-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={t()}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold mb-1.5" style={{ color: '#E8E8F0' }}>
          How's your brain right now?
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: '#8B8BA7' }}>
          No wrong answer — this helps us show tasks at the right pace.
        </p>
      </motion.div>
      <EnergyCheckin onSelect={onNext} />
      <div className="mt-6">
        <BackBtn onBack={onBack} />
      </div>
    </div>
  )
}

// ── Screen 3: ADHD Signal ─────────────────────────────────────────────────────
function ADHDSignalScreen({
  onNext,
  onBack,
}: {
  onNext: (mode: CognitiveMode) => void
  onBack: () => void
}) {
  const { t } = useMotion()
  const [hovered, setHovered] = useState<CognitiveMode | null>(null)

  const options: { mode: CognitiveMode; emoji: string; title: string; subtitle: string; accent: string }[] = [
    {
      mode: 'focused',
      emoji: '🎯',
      title: 'Yes — show me one task at a time',
      subtitle: 'Focused mode: zero distractions, one thing at a time',
      accent: '#7B72FF',
    },
    {
      mode: 'overview',
      emoji: '🗺️',
      title: 'No — I like seeing the full picture',
      subtitle: 'Overview mode: all pools visible at once',
      accent: '#4ECDC4',
    },
  ]

  return (
    <div className="flex flex-col gap-5 px-5 pt-8 pb-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={t()}
      >
        <h1 className="text-2xl font-bold mb-2" style={{ color: '#E8E8F0' }}>
          One last question 🧠
        </h1>
        <p className="text-base leading-relaxed" style={{ color: '#8B8BA7' }}>
          Do you ever feel like your brain forgets tasks exist
          if they're out of sight?
        </p>
      </motion.div>

      <div className="flex flex-col gap-2.5">
        {options.map(({ mode, emoji, title, subtitle, accent }, i) => {
          const isHovered = hovered === mode
          return (
            <motion.button
              key={mode}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...t(), delay: 0.06 + i * 0.07 }}
              whileTap={{ scale: 0.985 }}
              onClick={() => onNext(mode)}
              onHoverStart={() => setHovered(mode)}
              onHoverEnd={() => setHovered(null)}
              className="p-5 rounded-2xl text-left relative overflow-hidden transition-all duration-200"
              style={{
                background: isHovered
                  ? `linear-gradient(135deg, ${accent}18 0%, ${accent}06 100%)`
                  : '#1E2136',
                border: `1.5px solid ${isHovered ? `${accent}60` : 'rgba(255,255,255,0.06)'}`,
                boxShadow: isHovered ? `0 4px 20px ${accent}18` : 'none',
              }}
            >
              {isHovered && (
                <motion.div
                  className="absolute -top-6 -right-6 w-20 h-20 rounded-full pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ background: `radial-gradient(circle, ${accent}25 0%, transparent 70%)` }}
                />
              )}
              <div className="text-3xl mb-2">{emoji}</div>
              <div className="font-semibold mb-0.5" style={{ color: '#E8E8F0' }}>{title}</div>
              <div className="text-sm" style={{ color: '#8B8BA7' }}>{subtitle}</div>
            </motion.button>
          )
        })}
      </div>

      <BackBtn onBack={onBack} />
    </div>
  )
}

// ── Main flow ─────────────────────────────────────────────────────────────────
const TOTAL_STEPS = 3

export default function OnboardingFlow() {
  const navigate = useNavigate()
  const { t } = useMotion()
  const { setAppMode, setEnergyLevel, setCognitiveMode, setOnboardingCompleted, addTask, userId } = useStore()
  const [step, setStep] = useState(0)
  const [appMode, setLocalMode] = useState<AppMode>('minimal')
  const [prevStep, setPrevStep] = useState(0)

  const goTo = (next: number) => {
    setPrevStep(step)
    setStep(next)
  }

  const handleIntent = (mode: AppMode) => {
    setLocalMode(mode)
    setAppMode(mode)
    goTo(1)
  }

  const handleEnergy = (level: EnergyLevel) => {
    setEnergyLevel(level)
    goTo(2)
  }

  const handleCognitive = async (mode: CognitiveMode) => {
    setCognitiveMode(mode)
    setOnboardingCompleted()

    // Seed sample tasks — Research #4: prevent blank-slate anxiety on first launch
    SAMPLE_TASKS[appMode].forEach((fields, i) => addTask(makeSampleTask(fields, i)))

    if (userId) {
      await supabase.from('users').upsert({
        id: userId,
        cognitive_mode: mode,
        app_mode: appMode,
        onboarding_completed: true,
      } as never)
    }
    navigate('/', { replace: true })
  }

  const direction = step > prevStep ? 1 : -1
  const screens = [
    <IntentScreen key="intent" onNext={handleIntent} />,
    <EnergyScreen key="energy" onNext={handleEnergy} onBack={() => goTo(0)} />,
    <ADHDSignalScreen key="adhd" onNext={handleCognitive} onBack={() => goTo(1)} />,
  ]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0F1117' }}>
      {/* Progress */}
      <ProgressBar step={step} total={TOTAL_STEPS} />

      {/* Screen */}
      <div className="flex-1 relative overflow-hidden flex flex-col">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            initial={{ opacity: 0, x: direction * 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -24 }}
            transition={t()}
            className="flex-1 flex flex-col"
          >
            {screens[step]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
