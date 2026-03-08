import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/store'
import { supabase } from '@/shared/lib/supabase'
import type { AppMode, EnergyLevel, CognitiveMode } from '@/types'
import { EnergyCheckin } from '@/features/home/EnergyCheckin'

// ── Screen 1: Intent / App Mode ───────────────────────────────────────────────

const MODE_CARDS: { mode: AppMode; emoji: string; title: string; subtitle: string }[] = [
  {
    mode: 'minimal',
    emoji: '🎯',
    title: 'Close ONE important task',
    subtitle: 'I need to focus on a single thing right now',
  },
  {
    mode: 'habit',
    emoji: '🌱',
    title: 'Build a daily routine',
    subtitle: "I want consistent habits that don't overwhelm me",
  },
  {
    mode: 'system',
    emoji: '🗂️',
    title: 'Organize my whole system',
    subtitle: 'I want full visibility and control over my projects',
  },
]

function IntentScreen({ onNext }: { onNext: (mode: AppMode) => void }) {
  return (
    <div className="flex flex-col gap-4 px-5 pt-12 pb-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-xs font-medium tracking-widest uppercase mb-2" style={{ color: '#6C63FF' }}>
          Step 1 of 3
        </p>
        <h1 className="text-2xl font-bold mb-1.5" style={{ color: '#E8E8F0' }}>
          What brings you here today?
        </h1>
        <p className="text-sm" style={{ color: '#8B8BA7' }}>
          Choose your mental mode — you can change this anytime.
        </p>
      </motion.div>

      <div className="flex flex-col gap-3 mt-2">
        {MODE_CARDS.map(({ mode, emoji, title, subtitle }, i) => (
          <motion.button
            key={mode}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNext(mode)}
            className="text-left p-5 rounded-2xl transition-all duration-200 hover:border-primary"
            style={{
              background: '#1A1D2E',
              border: '1.5px solid #2D3150',
            }}
          >
            <div className="text-3xl mb-2">{emoji}</div>
            <div className="font-semibold text-base mb-0.5" style={{ color: '#E8E8F0' }}>{title}</div>
            <div className="text-sm" style={{ color: '#8B8BA7' }}>{subtitle}</div>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

// ── Screen 3: ADHD Signal ─────────────────────────────────────────────────────

function ADHDSignalScreen({ onNext }: { onNext: (mode: CognitiveMode) => void }) {
  return (
    <div className="flex flex-col gap-6 px-5 pt-12 pb-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-xs font-medium tracking-widest uppercase mb-2" style={{ color: '#6C63FF' }}>
          Step 3 of 3
        </p>
        <h1 className="text-2xl font-bold mb-1.5" style={{ color: '#E8E8F0' }}>
          One last question 🧠
        </h1>
        <p className="text-base leading-relaxed" style={{ color: '#8B8BA7' }}>
          Do you ever feel like your brain forgets tasks exist
          if they're out of sight?
        </p>
      </motion.div>

      <div className="flex flex-col gap-3">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => onNext('focused')}
          className="p-5 rounded-2xl text-left"
          style={{ background: 'rgba(108, 99, 255, 0.12)', border: '1.5px solid rgba(108, 99, 255, 0.35)' }}
        >
          <div className="font-semibold mb-0.5" style={{ color: '#E8E8F0' }}>
            Yes — show me one task at a time 🎯
          </div>
          <div className="text-sm" style={{ color: '#8B8BA7' }}>
            Focused mode: one thing, no distractions
          </div>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => onNext('overview')}
          className="p-5 rounded-2xl text-left"
          style={{ background: '#1A1D2E', border: '1.5px solid #2D3150' }}
        >
          <div className="font-semibold mb-0.5" style={{ color: '#E8E8F0' }}>
            No — I like seeing the full picture 🗺️
          </div>
          <div className="text-sm" style={{ color: '#8B8BA7' }}>
            Overview mode: all pools visible
          </div>
        </motion.button>
      </div>
    </div>
  )
}

// ── Main flow ─────────────────────────────────────────────────────────────────

export default function OnboardingFlow() {
  const navigate = useNavigate()
  const { setAppMode, setEnergyLevel, setCognitiveMode, setOnboardingCompleted, userId } = useStore()
  const [step, setStep] = useState(0)
  const [appMode, setLocalMode] = useState<AppMode>('minimal')

  const handleIntent = (mode: AppMode) => {
    setLocalMode(mode)
    setAppMode(mode)
    setStep(1)
  }

  const handleEnergy = (level: EnergyLevel) => {
    setEnergyLevel(level)
    setStep(2)
  }

  const handleCognitive = async (mode: CognitiveMode) => {
    setCognitiveMode(mode)
    setOnboardingCompleted()

    // Persist to Supabase
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

  const screens = [
    <IntentScreen onNext={handleIntent} />,
    <div className="px-5 pt-12">
      <p className="text-xs font-medium tracking-widest uppercase mb-2" style={{ color: '#6C63FF' }}>
        Step 2 of 3
      </p>
      <h1 className="text-2xl font-bold mb-6" style={{ color: '#E8E8F0' }}>
        How's your brain right now?
      </h1>
      <EnergyCheckin onSelect={handleEnergy} />
    </div>,
    <ADHDSignalScreen onNext={handleCognitive} />,
  ]

  return (
    <div className="min-h-screen" style={{ background: '#0F1117' }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.25 }}
        >
          {screens[step]}
        </motion.div>
      </AnimatePresence>

      {/* Progress dots */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-2 h-2 rounded-full transition-all duration-300"
               style={{ background: i === step ? '#6C63FF' : '#2D3150' }} />
        ))}
      </div>
    </div>
  )
}
