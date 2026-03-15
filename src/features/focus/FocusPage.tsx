import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import MochiAvatar from '@/components/MochiAvatar';
import { useStore } from '@/store';
import { ENERGY_EMOJI, ENERGY_LABELS } from '@/shared/lib/constants';

const durationOptions = [5, 15, 25, 45, 60];

export default function FocusPage() {
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [duration, setDuration] = useState(25);

  const { nowPool, activeSession, startSession, endSession, timerSeconds, sessionPhase, energyLevel } = useStore();
  const availableTasks = useMemo(() => nowPool.filter(t => t.status === 'active').slice(0, 3), [nowPool]);

  if (activeSession) {
    const task = availableTasks.find(t => t.id === activeSession.taskId);
    return <FocusActive onEnd={endSession} task={task} timerSeconds={timerSeconds} phase={sessionPhase} />;
  }
  return (
    <div className="min-h-screen px-5 pb-36 pt-10" style={{ backgroundColor: '#0F1120' }}>
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-[24px] font-bold" style={{ color: '#E8E8F0' }}>Focus Session ⏱️</h1>
        <p className="text-[13px] mt-0.5" style={{ color: '#4ECDC4' }}>Energy: {ENERGY_LABELS[energyLevel - 1]} {ENERGY_EMOJI[energyLevel - 1]}</p>
      </motion.div>
      <div className="space-y-4 mt-5">
        {/* Bookmark */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-3 border" style={{ backgroundColor: '#1E2136', borderColor: 'rgba(123,114,255,0.2)' }}>
          <p className="text-[11px] uppercase tracking-widest mb-1" style={{ color: '#7B72FF' }}>📌 Pick up where you left off</p>
          <p className="text-[15px] font-semibold" style={{ color: '#E8E8F0' }}>Review project proposal</p>
          <div className="flex gap-2 mt-2">
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => startSession(selectedTask, duration, null)} className="px-3 h-8 rounded-lg gradient-primary text-[13px] font-medium" style={{ color: '#fff' }}>Continue →</motion.button>
            <button className="px-3 h-8 rounded-lg text-[13px]" style={{ backgroundColor: '#252840', color: '#8B8BA7' }}>Dismiss</button>
          </div>
        </motion.div>
        {/* Task picker */}
        <div>
          <label className="text-[11px] uppercase tracking-widest mb-2 block" style={{ color: '#8B8BA7' }}>Task (optional)</label>
          <div className="space-y-1.5">
            <TaskOption selected={selectedTask === null} onClick={() => setSelectedTask(null)} emoji="🧠" title="Open focus — no specific task" />
            {availableTasks.map(t => (
              <TaskOption key={t.id} selected={selectedTask === t.id} onClick={() => setSelectedTask(t.id)} emoji="" title={t.title} badge={t.pool.toUpperCase()} />
            ))}
          </div>
        </div>
        {/* Duration */}
        <div>
          <label className="text-[11px] uppercase tracking-widest mb-2 block" style={{ color: '#8B8BA7' }}>Duration (smart: 25m ⭐)</label>
          <div className="flex gap-1.5">
            {durationOptions.map(d => (
              <motion.button
                key={d}
                whileTap={{ scale: 0.97 }}
                onClick={() => setDuration(d)}
                className="flex-1 h-9 rounded-full text-[13px] font-medium flex items-center justify-center"
                style={{
                  background: duration === d ? 'linear-gradient(135deg, #7B72FF, #8B7FF7)' : '#252840',
                  color: duration === d ? '#fff' : '#8B8BA7',
                  border: duration === d ? 'none' : '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {d}{d === 25 && '⭐'}
              </motion.button>
            ))}
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => startSession(selectedTask, duration, null)}
          className="w-full h-[48px] rounded-xl gradient-primary font-semibold text-[15px] shadow-primary"
          style={{ color: '#fff' }}
        >
          Start Focus →
        </motion.button>
      </div>
    </div>
  );
}
function TaskOption({ selected, onClick, emoji, title, badge }: {
  selected: boolean; onClick: () => void; emoji: string; title: string; badge?: string;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="w-full text-left p-2.5 rounded-xl flex items-center gap-2.5"
      style={{
        backgroundColor: selected ? 'rgba(123,114,255,0.15)' : '#252840',
        borderWidth: selected ? 1.5 : 1,
        borderStyle: 'solid',
        borderColor: selected ? '#7B72FF' : 'rgba(255,255,255,0.06)',
      }}
    >
      {emoji && <span className="text-[18px]">{emoji}</span>}
      <span className="text-[14px] flex-1" style={{ color: selected ? '#7B72FF' : '#E8E8F0' }}>{title}</span>
      {badge && <span className="text-[11px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(123,114,255,0.15)', color: '#7B72FF' }}>{badge}</span>}
    </motion.button>
  );
}
function FocusActive({ onEnd, task, timerSeconds, phase }: { onEnd: () => void; task?: any; timerSeconds: number; phase: string }) {
  const { activeSession: session, timerSeconds: ts } = useStore();
  const progress = useMemo(() => {
    if (!session) return 0;
    const elapsed = session.durationMs / 1000 - ts;
    return elapsed / (session.durationMs / 1000);
  }, [session, ts]);
  const mins = Math.floor(timerSeconds / 60);
  const secs = timerSeconds % 60;
  const timeLeft = `${mins}:${String(secs).padStart(2, '0')}`;
  const r = 120;
  const circumference = Math.PI * r;
  const offset = circumference * (1 - progress);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 relative" style={{ backgroundColor: '#0F1120' }}>
      <p className="text-[13px] mb-4" style={{ color: '#4ECDC4' }}>{phase.charAt(0).toUpperCase() + phase.slice(1)}</p>
      <div className="relative w-[260px] h-[260px] flex items-center justify-center">
        <svg width="260" height="260" viewBox="0 0 260 260" className="absolute">
          <circle cx="130" cy="130" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
          <circle
            cx="130" cy="130" r={r} fill="none"
            stroke="url(#timerGrad)" strokeWidth="7" strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 130 130)"
            style={{ filter: 'drop-shadow(0 0 10px rgba(123,114,255,0.4))' }}
          />
          <defs>
            <linearGradient id="timerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7B72FF" />
              <stop offset="100%" stopColor="#4ECDC4" />
            </linearGradient>
          </defs>
        </svg>
        <span className="text-[30px] font-bold z-10" style={{ color: '#E8E8F0' }}>{timeLeft}</span>
      </div>
      {task && <p className="text-[15px] mt-4 text-center" style={{ color: '#8B8BA7' }}>{task.title}</p>}
      <div className="absolute bottom-24 right-5 flex items-end gap-2">
        <MochiAvatar size={28} />
        <div className="rounded-2xl rounded-br-sm px-3 py-1.5" style={{ backgroundColor: '#1E2136' }}>
          <p className="text-[13px]" style={{ color: '#E8E8F0' }}>You're in the zone! 🌊</p>
        </div>
      </div>
      <div className="flex items-center gap-6 mt-10">
        <motion.button whileTap={{ scale: 0.97 }} className="w-11 h-11 rounded-full flex items-center justify-center text-[18px]" style={{ backgroundColor: '#252840' }}>🔊</motion.button>
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => { onEnd(); }} className="w-11 h-11 rounded-full flex items-center justify-center text-[18px]" style={{ backgroundColor: '#252840' }}>⏹</motion.button>
        <motion.button whileTap={{ scale: 0.97 }} className="w-11 h-11 rounded-full flex items-center justify-center text-[18px]" style={{ backgroundColor: '#252840' }}>💭</motion.button>
      </div>
    </div>
  );
}