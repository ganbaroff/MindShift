/**
 * OnboardingPage — 5-step setup wizard.
 *
 * Step 0: Intent (appMode)
 * Step 1: Time blindness — how user experiences time
 * Step 2: Emotional reactivity — response to setbacks
 * Step 3: Current energy
 * Step 4: Ready screen — "Let's start"
 *
 * O-11 Revisit mode: when onboardingCompleted is already true (user came from
 * Settings → "Re-run setup wizard"), show a gentle banner, skip re-seeding
 * sample tasks, navigate back on finish instead of to '/'.
 */
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMotion } from '@/shared/hooks/useMotion';
import EnergyPicker from '@/components/EnergyPicker';
import { useStore } from '@/store';
import type { EnergyLevel, AppMode } from '@/types';

// ── Maps ──────────────────────────────────────────────────────────────────────
const modeMap = ['minimal', 'habit', 'system'] as const
const tbMap   = ['often', 'sometimes', 'rarely'] as const
const erMap   = ['high', 'moderate', 'steady'] as const

const TOTAL_STEPS = 5

// ── Steps definition ──────────────────────────────────────────────────────────
interface Step {
  title: string
  subtitle?: string
  options: { emoji: string; label: string; desc: string }[]
}

function useSteps(): Step[] {
  const { t } = useTranslation()
  return useMemo(() => [
    // 0 — Intent (appMode)
    {
      title: t('onboarding.whatBrings'),
      options: [
        { emoji: '🎯', label: t('onboarding.oneThingLabel'),    desc: t('onboarding.oneThingDesc') },
        { emoji: '🌱', label: t('onboarding.buildHabitsLabel'), desc: t('onboarding.buildHabitsDesc') },
        { emoji: '🗂️', label: t('onboarding.fullPictureLabel'), desc: t('onboarding.fullPictureDesc') },
      ],
    },
    // 1 — Time blindness
    {
      title: t('onboarding.timeExperience'),
      subtitle: t('onboarding.timeSubtitle'),
      options: [
        { emoji: '⏰', label: t('onboarding.timeVanishesLabel'), desc: t('onboarding.timeVanishesDesc') },
        { emoji: '🕰️', label: t('onboarding.timeSlipsLabel'),   desc: t('onboarding.timeSlipsDesc') },
        { emoji: '🧭', label: t('onboarding.timeNaturalLabel'), desc: t('onboarding.timeNaturalDesc') },
      ],
    },
    // 2 — Emotional reactivity
    {
      title: t('onboarding.plansChange'),
      subtitle: t('onboarding.plansSubtitle'),
      options: [
        { emoji: '🌊', label: t('onboarding.throwsOffLabel'),    desc: t('onboarding.throwsOffDesc') },
        { emoji: '💫', label: t('onboarding.recoverLabel'),      desc: t('onboarding.recoverDesc') },
        { emoji: '🌿', label: t('onboarding.rarelyPhasesLabel'), desc: t('onboarding.rarelyPhasesDesc') },
      ],
    },
    // 3 — Energy (rendered separately, no options)
    { title: t('onboarding.howsBrain'), options: [] },
    // 4 — Ready (rendered separately, no options)
    { title: t('onboarding.readyTitle'), options: [] },
  ], [t])
}

// ── Revisit pre-fill helpers ──────────────────────────────────────────────────
function modeToIdx(m: AppMode | string | undefined): number | null {
  const i = modeMap.indexOf(m as typeof modeMap[number])
  return i >= 0 ? i : null
}
function tbToIdx(v: typeof tbMap[number] | null | undefined): number | null {
  if (!v) return null
  const i = tbMap.indexOf(v)
  return i >= 0 ? i : null
}
function erToIdx(v: typeof erMap[number] | null | undefined): number | null {
  if (!v) return null
  const i = erMap.indexOf(v)
  return i >= 0 ? i : null
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const navigate = useNavigate()
  const { shouldAnimate } = useMotion()
  const { t } = useTranslation()
  const steps = useSteps()
  const {
    setAppMode, setEnergyLevel, setOnboardingCompleted,
    setTimeBlindness, setEmotionalReactivity,
    appMode, timeBlindness, emotionalReactivity, onboardingCompleted,
  } = useStore()

  // O-11: revisit mode — user came from Settings "Re-run setup wizard"
  const isRevisit = onboardingCompleted

  // Pre-fill from store if revisiting (snapshot at mount)
  const initialSelections = useMemo<(number | null)[]>(() => {
    if (!isRevisit) return [null, null, null, null, null]
    return [
      modeToIdx(appMode),
      tbToIdx(timeBlindness),
      erToIdx(emotionalReactivity),
      null, // energy is always fresh
      null, // ready screen has no selection
    ]
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally once — revisit pre-fill uses snapshot at mount

  const [step,       setStep]       = useState(0)
  const [selections, setSelections] = useState<(number | null)[]>(initialSelections)
  const [energy,     setEnergy]     = useState(2)

  const current      = steps[step]
  const isEnergyStep = step === 3
  const isReadyStep  = step === 4

  const canContinue =
    isEnergyStep ? true :
    isReadyStep  ? true :
    selections[step] !== null

  const finish = () => {
    if (selections[0] !== null) setAppMode(modeMap[selections[0]])
    if (selections[1] !== null) setTimeBlindness(tbMap[selections[1]])
    if (selections[2] !== null) setEmotionalReactivity(erMap[selections[2]])
    setEnergyLevel((energy + 1) as EnergyLevel)

    if (!isRevisit) {
      setOnboardingCompleted()
      navigate('/')
    } else {
      navigate(-1)
    }
  }

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) setStep(step + 1)
    else finish()
  }

  const select = (i: number, isPointerClick: boolean) => {
    const s = [...selections]
    s[step] = i
    setSelections(s)
    // Auto-advance on single-select steps after brief delay (except energy/ready)
    if (!isEnergyStep && !isReadyStep && isPointerClick) {
      setTimeout(() => {
        if (step < TOTAL_STEPS - 1) setStep(step + 1)
        else finish()
      }, 160)
    }
  }

  // Quick Start — skip setup, use smart defaults, get into app immediately
  const handleQuickStart = () => {
    setAppMode('minimal')
    setEnergyLevel(3 as EnergyLevel)
    setOnboardingCompleted()
    navigate('/')
  }

  return (
    <div className="min-h-screen px-5 flex flex-col" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* Quick start — try before you configure */}
      {!isRevisit && step === 0 && (
        <button
          onClick={handleQuickStart}
          className="mt-safe mt-4 self-end text-[13px] px-3 py-1.5 rounded-xl focus-visible:ring-2 focus-visible:ring-[#7B72FF]"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {t('onboarding.skipSetup')}
        </button>
      )}

      {/* Revisit banner */}
      {isRevisit && (
        <div
          className="mx-0 mt-safe mt-8 mb-0 px-4 py-2.5 rounded-2xl flex items-center gap-2"
          style={{ background: 'rgba(123,114,255,0.10)', border: '1px solid rgba(123,114,255,0.20)' }}
        >
          <span className="text-base">✦</span>
          <p className="text-xs" style={{ color: '#C8C0FF' }}>
            {t('onboarding.recalibrate')}
          </p>
        </div>
      )}

      {/* Progress bar */}
      <div className={isRevisit ? 'pt-4 mb-6' : 'pt-10 mb-6'}>
        <div className="flex gap-1.5 mb-2">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} className="flex-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-surface-raised)' }}>
              {i <= step && (
                <motion.div
                  initial={shouldAnimate ? { width: 0 } : false}
                  animate={{ width: '100%' }}
                  transition={shouldAnimate ? undefined : { duration: 0 }}
                  className="h-full gradient-primary"
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between">
          {step > 0
            ? <button onClick={() => setStep(step - 1)} className="text-[13px]" style={{ color: 'var(--color-text-muted)' }}>{t('onboarding.back')}</button>
            : <div />
          }
          <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{t('onboarding.step', { current: step + 1, total: TOTAL_STEPS })}</span>
        </div>
      </div>

      {/* Screen content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={shouldAnimate ? { opacity: 0, x: 30, scale: 0.98 } : false}
          animate={shouldAnimate ? { opacity: 1, x: 0, scale: 1 } : false}
          exit={shouldAnimate ? { opacity: 0, x: -20, scale: 0.98 } : undefined}
          transition={shouldAnimate ? { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] } : { duration: 0 }}
          className="flex-1"
        >
          <h1 className="text-[24px] font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>{current.title}</h1>
          {current.subtitle && (
            <p className="text-[13px] mb-1" style={{ color: 'var(--color-text-muted)' }}>{current.subtitle}</p>
          )}

          {/* Step 3: Energy picker */}
          {isEnergyStep && (
            <div className="mt-6">
              <EnergyPicker selected={energy} onSelect={setEnergy} size={56} />
            </div>
          )}

          {/* Step 4: Ready screen */}
          {isReadyStep && (
            <div className="mt-6 flex flex-col items-center text-center">
              <div className="text-[64px] mb-6">🌱</div>
              <p className="text-[15px] leading-relaxed max-w-xs" style={{ color: 'var(--color-text-muted)' }}>
                {t('onboarding.readyDesc')}
              </p>
            </div>
          )}

          {/* Steps 0-2: Option cards (auto-advance on tap) */}
          {!isEnergyStep && !isReadyStep && (
            <div className="space-y-2 mt-5">
              {current.options?.map((opt, i) => (
                <motion.button
                  key={i}
                  whileTap={shouldAnimate ? { scale: 0.97 } : undefined}
                  onClick={(e) => select(i, e.detail > 0)}
                  className="w-full text-left p-3.5 rounded-2xl"
                  style={{
                    backgroundColor: selections[step] === i ? 'rgba(123,114,255,0.15)' : 'var(--color-surface-raised)',
                    borderWidth: selections[step] === i ? 1.5 : 1,
                    borderStyle: 'solid',
                    borderColor: selections[step] === i ? 'var(--color-primary)' : 'rgba(255,255,255,0.06)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[28px]">{opt.emoji}</span>
                    <div>
                      <p className="text-[15px] font-semibold" style={{ color: selections[step] === i ? 'var(--color-primary)' : 'var(--color-text-primary)' }}>{opt.label}</p>
                      <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{opt.desc}</p>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Continue button — shown on energy + ready steps */}
      {(isEnergyStep || isReadyStep) && (
        <div className="py-6">
          <motion.button
            whileTap={shouldAnimate ? { scale: 0.97 } : undefined}
            onClick={handleNext}
            disabled={!canContinue}
            className="w-full h-[48px] rounded-xl gradient-primary font-semibold text-[15px] shadow-primary disabled:opacity-40"
            style={{ color: '#fff' }}
          >
            {isReadyStep ? t('onboarding.letsStart') : t('onboarding.continue')}
          </motion.button>
        </div>
      )}

      {/* Step indicator dots */}
      <div className="flex items-center justify-center gap-2 py-4">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <motion.div
            key={i}
            animate={shouldAnimate ? {
              width: i === step ? 20 : 8,
              backgroundColor: i === step ? 'var(--color-teal)' : i < step ? 'var(--color-primary)' : 'var(--color-surface-raised)',
            } : undefined}
            transition={shouldAnimate ? { duration: 0.25, ease: 'easeOut' } : { duration: 0 }}
            className="h-2 rounded-full"
            style={{
              width: i === step ? 20 : 8,
              backgroundColor: i === step ? 'var(--color-teal)' : i < step ? 'var(--color-primary)' : 'var(--color-surface-raised)',
            }}
          />
        ))}
      </div>
    </div>
  )
}
