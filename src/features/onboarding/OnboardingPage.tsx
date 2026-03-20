/**
 * OnboardingPage — 6-step setup wizard.
 *
 * Step 0: Intent (appMode)
 * Step 1: Current energy
 * Step 2: Timer preference
 * Step 3: Time blindness — O-6 ADHD signal
 * Step 4: Emotional reactivity — O-6 ADHD signal
 * Step 5: Notification permission
 *
 * O-11 Revisit mode: when onboardingCompleted is already true (user came from
 * Settings → "Re-run setup wizard"), show a gentle banner, skip re-seeding
 * sample tasks, navigate back on finish instead of to '/'.
 */
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useMotion } from '@/shared/hooks/useMotion';
import EnergyPicker from '@/components/EnergyPicker';
import { useStore } from '@/store';
import type { EnergyLevel, AppMode } from '@/types';

// ── Maps ──────────────────────────────────────────────────────────────────────
const modeMap  = ['minimal', 'habit', 'system']       as const;
const timerMap = ['countdown', 'countup', 'surprise'] as const;

type TimeBlindness       = 'often' | 'sometimes' | 'rarely'
type EmotionalReactivity = 'high'  | 'moderate'  | 'steady'

const TIME_BLINDNESS_MAP: TimeBlindness[]       = ['often', 'sometimes', 'rarely']
const EMOTIONAL_REACTIVITY_MAP: EmotionalReactivity[] = ['high', 'moderate', 'steady']

const TOTAL_STEPS = 6;

const steps = [
  // 0 — Intent
  {
    title: 'What brings you here today?',
    options: [
      { emoji: '🎯', label: 'One thing at a time', desc: 'Just need to focus on one task right now' },
      { emoji: '🌱', label: 'Build daily habits',  desc: 'Consistency without overwhelm' },
      { emoji: '🗂️', label: 'Full picture',        desc: 'Full visibility over my projects' },
    ],
  },
  // 1 — Energy (rendered separately)
  { title: "How's your brain right now?", options: [] },
  // 2 — Timer style
  {
    title: 'How do you want to see your timer?',
    options: [
      { emoji: '⏱',  label: 'Countdown', desc: 'Classic timer counting down to zero' },
      { emoji: '⬆️', label: 'Count-up',  desc: 'See how long you can stay in flow' },
      { emoji: '🎲', label: 'Surprise',  desc: "Random — you'll focus until it rings" },
    ],
  },
  // 3 — Time blindness (O-6)
  {
    title: 'How do you experience time? 🕰️',
    subtitle: "There's no wrong answer — this helps us personalise your timer.",
    options: [
      { emoji: '😵', label: 'Time vanishes on me',          desc: 'An hour can feel like five minutes' },
      { emoji: '🤔', label: 'I notice time slipping sometimes', desc: "Depends on what I'm doing" },
      { emoji: '✅', label: 'I track time naturally',       desc: 'I usually know how long things take' },
    ],
  },
  // 4 — Emotional reactivity (O-6)
  {
    title: 'When plans change unexpectedly... 🌊',
    subtitle: 'How you respond helps us support you better on tough days.',
    options: [
      { emoji: '🌀', label: 'Throws me off completely', desc: 'Hard to refocus — RSD can hit hard' },
      { emoji: '🌊', label: 'I notice it, then recover', desc: 'Some friction, but I bounce back' },
      { emoji: '🌱', label: 'Rarely phases me',          desc: 'I adapt pretty smoothly' },
    ],
  },
  // 5 — Notifications (rendered separately)
  {
    title: 'Want gentle reminders? 🔔',
    subtitle: "We'll nudge you before tasks are due — nothing aggressive, just friendly taps.",
    options: [],
  },
];

// ── Helpers to pre-fill from store (revisit mode) ─────────────────────────────
function modeToIdx(m: AppMode | string | undefined): number | null {
  const i = modeMap.indexOf(m as typeof modeMap[number])
  return i >= 0 ? i : null
}
function tbToIdx(v: TimeBlindness | null): number | null {
  if (!v) return null
  const i = TIME_BLINDNESS_MAP.indexOf(v)
  return i >= 0 ? i : null
}
function erToIdx(v: EmotionalReactivity | null): number | null {
  if (!v) return null
  const i = EMOTIONAL_REACTIVITY_MAP.indexOf(v)
  return i >= 0 ? i : null
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const navigate = useNavigate();
  const { shouldAnimate } = useMotion();
  const {
    setAppMode, setEnergyLevel, setTimerStyle, setOnboardingCompleted,
    setTimeBlindness, setEmotionalReactivity,
    appMode, timeBlindness, emotionalReactivity, timerStyle,
    onboardingCompleted,
  } = useStore();

  // O-11: revisit mode — user came from Settings "Re-run setup wizard"
  const isRevisit = onboardingCompleted;

  // Pre-fill from store if revisiting
  const initialSelections = useMemo<(number | null)[]>(() => {
    if (!isRevisit) return [null, null, null, null, null, null];
    const timerIdx = timerMap.indexOf(timerStyle as typeof timerMap[number])
    return [
      modeToIdx(appMode),
      null, // energy is always fresh
      timerIdx >= 0 ? timerIdx : null,
      tbToIdx(timeBlindness),
      erToIdx(emotionalReactivity),
      null,
    ]
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally once — revisit pre-fill uses snapshot at mount

  const [step,       setStep]       = useState(0);
  const [selections, setSelections] = useState<(number | null)[]>(initialSelections);
  const [energy,     setEnergy]     = useState(2);
  const [notifState, setNotifState] = useState<'idle' | 'granted' | 'denied'>('idle');

  const current = steps[step];
  const isEnergyStep = step === 1;
  const isNotifStep  = step === 5;

  const canContinue =
    isEnergyStep  ? true :
    isNotifStep   ? true :
    selections[step] !== null;

  const finish = () => {
    // Persist all selections to store
    if (selections[0] !== null) setAppMode(modeMap[selections[0]]);
    setEnergyLevel((energy + 1) as EnergyLevel);
    if (selections[2] !== null) setTimerStyle(timerMap[selections[2]]);
    if (selections[3] !== null) setTimeBlindness(TIME_BLINDNESS_MAP[selections[3]]);
    if (selections[4] !== null) setEmotionalReactivity(EMOTIONAL_REACTIVITY_MAP[selections[4]]);

    if (!isRevisit) {
      setOnboardingCompleted();
      navigate('/');
    } else {
      // Revisit: already completed — just go back
      navigate(-1);
    }
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) setStep(step + 1);
    else finish();
  };

  const requestNotifications = async () => {
    if (!('Notification' in window)) { setNotifState('denied'); return; }
    try {
      const result = await Notification.requestPermission();
      setNotifState(result === 'granted' ? 'granted' : 'denied');
    } catch {
      setNotifState('denied');
    }
  };

  const select = (i: number, isPointerClick: boolean) => {
    const s = [...selections];
    s[step] = i;
    setSelections(s);
    // Auto-advance on single-select steps after brief delay (except energy/notif)
    // Only auto-advance on pointer/touch clicks, not keyboard Enter
    if (!isEnergyStep && !isNotifStep && isPointerClick) {
      setTimeout(() => {
        if (step < TOTAL_STEPS - 1) setStep(step + 1);
        else finish();
      }, 160);
    }
  };

  return (
    <div className="min-h-screen px-5 flex flex-col" style={{ backgroundColor: '#0F1120' }}>
      {/* Revisit banner */}
      {isRevisit && (
        <div
          className="mx-0 mt-safe mt-8 mb-0 px-4 py-2.5 rounded-2xl flex items-center gap-2"
          style={{ background: 'rgba(123,114,255,0.10)', border: '1px solid rgba(123,114,255,0.20)' }}
        >
          <span className="text-base">🔧</span>
          <p className="text-xs" style={{ color: '#C8C0FF' }}>
            Refreshing your profile — changes apply immediately
          </p>
        </div>
      )}

      {/* Progress bar */}
      <div className={isRevisit ? 'pt-4 mb-6' : 'pt-10 mb-6'}>
        <div className="flex gap-1.5 mb-2">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} className="flex-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor: '#252840' }}>
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
            ? <button onClick={() => setStep(step - 1)} className="text-[13px]" style={{ color: '#8B8BA7' }}>← Back</button>
            : <div />
          }
          <span className="text-[11px]" style={{ color: '#8B8BA7' }}>Step {step + 1} of {TOTAL_STEPS}</span>
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
          <h1 className="text-[24px] font-bold mb-1" style={{ color: '#E8E8F0' }}>{current.title}</h1>
          {'subtitle' in current && current.subtitle && (
            <p className="text-[13px] mb-5" style={{ color: '#8B8BA7' }}>{current.subtitle}</p>
          )}

          {/* Step 1: Energy picker */}
          {isEnergyStep && (
            <div className="mt-6">
              <EnergyPicker selected={energy} onSelect={setEnergy} size={56} />
            </div>
          )}

          {/* Step 5: Notification permission */}
          {isNotifStep && (
            <div className="mt-8 space-y-3">
              {notifState === 'idle' && (
                <motion.button
                  whileTap={shouldAnimate ? { scale: 0.97 } : undefined}
                  onClick={requestNotifications}
                  className="w-full p-4 rounded-2xl text-left"
                  style={{ backgroundColor: 'rgba(78,205,196,0.12)', border: '1.5px solid rgba(78,205,196,0.35)' }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[28px]">🔔</span>
                    <div>
                      <p className="text-[15px] font-semibold" style={{ color: '#4ECDC4' }}>Enable reminders</p>
                      <p className="text-[11px]" style={{ color: '#8B8BA7' }}>15 min before tasks are due</p>
                    </div>
                  </div>
                </motion.button>
              )}
              {notifState === 'granted' && (
                <div className="p-4 rounded-2xl" style={{ backgroundColor: 'rgba(78,205,196,0.12)', border: '1.5px solid rgba(78,205,196,0.35)' }}>
                  <p className="text-[15px] font-semibold" style={{ color: '#4ECDC4' }}>✅ Reminders enabled</p>
                  <p className="text-[13px] mt-0.5" style={{ color: '#8B8BA7' }}>We'll give you a gentle nudge before each due task.</p>
                </div>
              )}
              {notifState === 'denied' && (
                <div className="p-4 rounded-2xl" style={{ backgroundColor: '#252840' }}>
                  <p className="text-[15px] font-semibold" style={{ color: '#E8E8F0' }}>No worries 👋</p>
                  <p className="text-[13px] mt-0.5" style={{ color: '#8B8BA7' }}>You can enable reminders later in Settings.</p>
                </div>
              )}
              <button
                onClick={finish}
                className="w-full text-center py-2 text-[13px]"
                style={{ color: '#8B8BA7' }}
              >
                Skip for now
              </button>
            </div>
          )}

          {/* Steps 0, 2, 3, 4: Option cards (auto-advance on tap) */}
          {!isEnergyStep && !isNotifStep && (
            <div className="space-y-2 mt-5">
              {current.options?.map((opt, i) => (
                <motion.button
                  key={i}
                  whileTap={shouldAnimate ? { scale: 0.97 } : undefined}
                  onClick={(e) => select(i, e.detail > 0)}
                  className="w-full text-left p-3.5 rounded-2xl"
                  style={{
                    backgroundColor: selections[step] === i ? 'rgba(123,114,255,0.15)' : '#252840',
                    borderWidth: selections[step] === i ? 1.5 : 1,
                    borderStyle: 'solid',
                    borderColor: selections[step] === i ? '#7B72FF' : 'rgba(255,255,255,0.06)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[28px]">{opt.emoji}</span>
                    <div>
                      <p className="text-[15px] font-semibold" style={{ color: selections[step] === i ? '#7B72FF' : '#E8E8F0' }}>{opt.label}</p>
                      <p className="text-[11px]" style={{ color: '#8B8BA7' }}>{opt.desc}</p>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Continue button — hidden on notification step (has its own CTA + skip) */}
      {/* Also hidden on option-card steps since they auto-advance */}
      {(isEnergyStep) && (
        <div className="py-6">
          <motion.button
            whileTap={shouldAnimate ? { scale: 0.97 } : undefined}
            onClick={handleNext}
            disabled={!canContinue}
            className="w-full h-[48px] rounded-xl gradient-primary font-semibold text-[15px] shadow-primary disabled:opacity-40"
            style={{ color: '#fff' }}
          >
            Continue →
          </motion.button>
        </div>
      )}

      {/* Step indicator dots — always visible at bottom */}
      <div className="flex items-center justify-center gap-2 py-4">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <motion.div
            key={i}
            animate={shouldAnimate ? {
              width: i === step ? 20 : 8,
              backgroundColor: i === step ? '#4ECDC4' : i < step ? '#7B72FF' : '#252840',
            } : undefined}
            transition={shouldAnimate ? { duration: 0.25, ease: 'easeOut' } : { duration: 0 }}
            className="h-2 rounded-full"
            style={{
              width: i === step ? 20 : 8,
              backgroundColor: i === step ? '#4ECDC4' : i < step ? '#7B72FF' : '#252840',
            }}
          />
        ))}
      </div>
    </div>
  );
}
