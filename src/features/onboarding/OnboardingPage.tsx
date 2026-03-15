import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import EnergyPicker from '@/components/EnergyPicker';
import { useStore } from '@/store';
import type { EnergyLevel } from '@/types';

const modeMap = ['minimal', 'habit', 'system'] as const;
const timerMap = ['countdown', 'countup', 'surprise'] as const;

const steps = [
  {
    title: 'What brings you here today?',
    options: [
      { emoji: '🎯', label: 'One thing at a time', desc: 'Just need to focus on one task right now' },
      { emoji: '🌱', label: 'Build daily habits', desc: 'Consistency without overwhelm' },
      { emoji: '🗂️', label: 'Full picture', desc: 'Full visibility over my projects' },
    ],
  },
  { title: "How's your brain right now?" },
  {
    title: 'How do you want to see your timer?',
    options: [
      { emoji: '⏱', label: 'Countdown', desc: 'Classic timer counting down to zero' },
      { emoji: '⬆️', label: 'Count-up', desc: 'See how long you can stay in flow' },
      { emoji: '🎲', label: 'Surprise', desc: "Random — you'll focus until it rings" },
    ],
  },
  {
    title: 'One last question 🧠',
    subtitle: 'Do tasks disappear from your mind when off-screen?',
    options: [
      { emoji: '🎯', label: 'Yes — one at a time', desc: 'Show me only what I need right now' },
      { emoji: '🗺️', label: 'No — show everything', desc: 'I like to see the full picture' },
    ],
  },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { setAppMode, setEnergyLevel, setTimerStyle, setOnboardingCompleted } = useStore();
  const [step, setStep] = useState(0);
  const [selections, setSelections] = useState<(number | null)[]>([null, null, null, null]);
  const [energy, setEnergy] = useState(2);

  const current = steps[step];
  const canContinue = step === 1 ? true : selections[step] !== null;

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      if (selections[0] !== null) setAppMode(modeMap[selections[0]]);
      setEnergyLevel((energy + 1) as EnergyLevel);
      if (selections[2] !== null) setTimerStyle(timerMap[selections[2]]);
      setOnboardingCompleted();
      navigate('/');
    }
  };

  const select = (i: number) => {
    const s = [...selections];
    s[step] = i;
    setSelections(s);
  };

  return (
    <div className="min-h-screen px-5 flex flex-col" style={{ backgroundColor: '#0F1120' }}>
      {/* Progress bar */}
      <div className="pt-10 mb-6">
        <div className="flex gap-1.5 mb-2">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="flex-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor: '#252840' }}>
              {i <= step && <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} className="h-full gradient-primary" />}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between">
          {step > 0 ? <button onClick={() => setStep(step - 1)} className="text-[13px]" style={{ color: '#8B8BA7' }}>← Back</button> : <div />}
          <span className="text-[11px]" style={{ color: '#8B8BA7' }}>Step {step + 1} of 4</span>
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

          {step === 1 ? (
            <div className="mt-6">
              <EnergyPicker selected={energy} onSelect={setEnergy} size={56} />
            </div>
          ) : (
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

      <div className="py-6">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleNext}
          disabled={!canContinue}
          className="w-full h-[48px] rounded-xl gradient-primary font-semibold text-[15px] shadow-primary disabled:opacity-40"
          style={{ color: '#fff' }}
        >
          {step === 3 ? "Let's go ✨" : 'Continue →'}
        </motion.button>
      </div>
    </div>
  );
}
