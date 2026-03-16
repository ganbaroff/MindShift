import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import EnergyPicker from '@/components/EnergyPicker';
import { useStore } from '@/store';
import type { EnergyLevel } from '@/types';

const modeMap  = ['minimal', 'habit', 'system']    as const;
const timerMap = ['countdown', 'countup', 'surprise'] as const;
const TOTAL_STEPS = 5;

const steps = [
  {
    title: 'What brings you here today?',
    options: [
      { emoji: '🎯', label: 'One thing at a time', desc: 'Just need to focus on one task right now' },
      { emoji: '🌱', label: 'Build daily habits',  desc: 'Consistency without overwhelm' },
      { emoji: '🗂️', label: 'Full picture',        desc: 'Full visibility over my projects' },
    ],
  },
  { title: "How's your brain right now?" },
  {
    title: 'How do you want to see your timer?',
    options: [
      { emoji: '⏱',  label: 'Countdown', desc: 'Classic timer counting down to zero' },
      { emoji: '⬆️', label: 'Count-up',  desc: 'See how long you can stay in flow' },
      { emoji: '🎲', label: 'Surprise',  desc: "Random — you'll focus until it rings" },
    ],
  },
  {
    title: 'One last question 🧠',
    subtitle: 'Do tasks disappear from your mind when off-screen?',
    options: [
      { emoji: '🎯', label: 'Yes — one at a time',   desc: 'Show me only what I need right now' },
      { emoji: '🗺️', label: 'No — show everything', desc: 'I like to see the full picture' },
    ],
  },
  // Step 4 (index 4): notification permission — rendered separately
  {
    title: 'Want gentle reminders? 🔔',
    subtitle: "We'll nudge you before tasks are due — nothing aggressive, just friendly taps.",
    options: [],
  },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { setAppMode, setEnergyLevel, setTimerStyle, setOnboardingCompleted } = useStore();
  const [step,       setStep]       = useState(0);
  const [selections, setSelections] = useState<(number | null)[]>([null, null, null, null, null]);
  const [energy,     setEnergy]     = useState(2);
  const [notifState, setNotifState] = useState<'idle' | 'granted' | 'denied'>('idle');

  const current = steps[step];

  // Step 4 = notification step — always "continuable" (skip is valid)
  const canContinue =
    step === 1 ? true :
    step === 4 ? true :
    selections[step] !== null;

  const finish = () => {
    if (selections[0] !== null) setAppMode(modeMap[selections[0]]);
    setEnergyLevel((energy + 1) as EnergyLevel);
    if (selections[2] !== null) setTimerStyle(timerMap[selections[2]]);
    setOnboardingCompleted();
    navigate('/');
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    } else {
      finish();
    }
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

  const select = (i: number) => {
    const s = [...selections];
    s[step] = i;
    setSelections(s);
  };

  const isNotifStep = step === 4;

  return (
    <div className="min-h-screen px-5 flex flex-col" style={{ backgroundColor: '#0F1120' }}>
      {/* Progress bar */}
      <div className="pt-10 mb-6">
        <div className="flex gap-1.5 mb-2">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} className="flex-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor: '#252840' }}>
              {i <= step && <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} className="h-full gradient-primary" />}
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

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.2 }}
          className="flex-1"
        >
          <h1 className="text-[24px] font-bold mb-1" style={{ color: '#E8E8F0' }}>{current.title}</h1>
          {'subtitle' in current && current.subtitle && (
            <p className="text-[13px] mb-5" style={{ color: '#8B8BA7' }}>{current.subtitle}</p>
          )}

          {/* Step 1: Energy picker */}
          {step === 1 && (
            <div className="mt-6">
              <EnergyPicker selected={energy} onSelect={setEnergy} size={56} />
            </div>
          )}

          {/* Step 4: Notification permission */}
          {isNotifStep && (
            <div className="mt-8 space-y-3">
              {notifState === 'idle' && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
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

          {/* Steps 0, 2, 3: Option cards */}
          {!isNotifStep && step !== 1 && (
            <div className="space-y-2 mt-5">
              {current.options?.map((opt, i) => (
                <motion.button
                  key={i}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => select(i)}
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
      {!isNotifStep && (
        <div className="py-6">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleNext}
            disabled={!canContinue}
            className="w-full h-[48px] rounded-xl gradient-primary font-semibold text-[15px] shadow-primary disabled:opacity-40"
            style={{ color: '#fff' }}
          >
            Continue →
          </motion.button>
        </div>
      )}
    </div>
  );
}
