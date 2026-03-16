import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TaskCard from '@/components/TaskCard';
import MochiAvatar from '@/components/MochiAvatar';
import EnergyPicker from '@/components/EnergyPicker';
import Fab from '@/components/Fab';
import AddTaskModal from '@/components/AddTaskModal';
import { useStore } from '@/store';
import type { EnergyLevel } from '@/types';
import { getNowPoolMax, APP_MODE_CONFIG, ENERGY_EMOJI } from '@/shared/lib/constants';
import { useI18n } from '@/shared/hooks/useI18n';

// ── Mochi energy reaction messages ────────────────────────────────────────────
// Research #3: state-aware apps adapt to user's real-time neurological capacity.
// Mochi reacts when energy changes to acknowledge the shift, never judge.

const MOCHI_ENERGY_MESSAGES: Record<number, { text: string; emoji: string }[]> = {
  1: [
    { text: "Rest is productive. One tiny thing today is enough.", emoji: '🌙' },
    { text: "Drained days happen. I'm here. Take it slow.", emoji: '🛋️' },
    { text: "Low fuel? Park the big stuff. Just breathe.", emoji: '💤' },
  ],
  2: [
    { text: "Gentle energy — pick something easy to start.", emoji: '🌱' },
    { text: "Small moves count. Let's find your lightest task.", emoji: '🌿' },
    { text: "Not your sharpest day? Easy tasks still matter.", emoji: '🍃' },
  ],
  3: [
    { text: "Steady. Classic focus mode. You've got this.", emoji: '🎯' },
    { text: "Okay energy is still energy. Let's roll.", emoji: '🙂' },
    { text: "Middle-ground day — great for consistent progress.", emoji: '⚖️' },
  ],
  4: [
    { text: "Good energy! This is your window. Use it.", emoji: '✨' },
    { text: "You're on. Tackle something that matters today.", emoji: '🚀' },
    { text: "Riding a wave — ride it towards something real.", emoji: '🌊' },
  ],
  5: [
    { text: "Wired! Channel this before it fades. Deep work time.", emoji: '⚡' },
    { text: "Peak energy — a rare gift. Honour it with your hardest task.", emoji: '🔥' },
    { text: "Full tank. You know what to do.", emoji: '💪' },
  ],
};

function getMochiMessage(energy: EnergyLevel) {
  const pool = MOCHI_ENERGY_MESSAGES[energy] ?? MOCHI_ENERGY_MESSAGES[3];
  return pool[Math.floor(Math.random() * pool.length)];
}

export default function HomePage() {
  const {
    nowPool, nextPool,
    energyLevel, setEnergyLevel,
    appMode,
    seasonalMode,
    completedTotal, xpTotal,
    burnoutScore,
    weeklyStats,
    currentStreak, longestStreak,
  } = useStore();

  const [showAddTask, setShowAddTask] = useState(false);
  const [mochiMsg, setMochiMsg] = useState<{ text: string; emoji: string } | null>(null);
  const prevEnergy = useRef<EnergyLevel>(energyLevel);

  const nowTasks = useMemo(() => nowPool.filter(t => t.status === 'active'), [nowPool]);
  const nextTasks = useMemo(() => nextPool.filter(t => t.status === 'active'), [nextPool]);
  const nowMax = getNowPoolMax(appMode, seasonalMode);
  const { showNextOnHome, homeSubtitle } = APP_MODE_CONFIG[appMode];

  const { completeTask, snoozeTask } = useStore();

  const focusMinutes = weeklyStats?.totalFocusMinutes ?? null;

  // ── Low-energy mode — Research #3: dynamic contextual adaptation ─────────────
  // When energy ≤ 2 OR burnout > 60: simplify the view to reduce cognitive load.
  const isLowEnergy = energyLevel <= 2 || burnoutScore > 60;

  // ── Mochi energy reactions ────────────────────────────────────────────────────
  // Show speech bubble when energy level changes. Auto-dismiss after 5s.
  const handleEnergySelect = (i: number) => {
    const newLevel = (i + 1) as EnergyLevel;
    setEnergyLevel(newLevel);
    if (newLevel !== prevEnergy.current) {
      prevEnergy.current = newLevel;
      setMochiMsg(getMochiMessage(newLevel));
    }
  };

  // Auto-dismiss Mochi message after 5s
  useEffect(() => {
    if (!mochiMsg) return;
    const t = setTimeout(() => setMochiMsg(null), 5000);
    return () => clearTimeout(t);
  }, [mochiMsg]);

  // ── Invisible streak ─────────────────────────────────────────────────────────
  // Research #3: show only when growing — celebrate consistency, never shame gaps.
  const showStreak = currentStreak >= 2;

  // Time-based greeting (i18n-aware)
  const { t } = useI18n();
  const hour = new Date().getHours();
  const greeting =
    hour < 5  ? t('home.greeting.night') :
    hour < 12 ? t('home.greeting.morning') :
    hour < 17 ? t('home.greeting.afternoon') :
    hour < 21 ? t('home.greeting.evening') : t('home.greeting.night');

  return (
    <div className="min-h-screen px-5 pb-36 pt-10" style={{ backgroundColor: '#0F1120' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-[24px] font-bold" style={{ color: '#E8E8F0' }}>{greeting}</h1>
          <p className="text-[13px] mt-0.5" style={{ color: '#8B8BA7' }}>
            {isLowEnergy ? 'Just one thing today — that\'s enough 🌿' : homeSubtitle}
          </p>
        </div>
        {/* Mochi with speech bubble */}
        <div className="relative">
          <MochiAvatar size={44} />
          <AnimatePresence>
            {mochiMsg && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 8 }}
                className="absolute right-0 bottom-full mb-2 w-52 rounded-2xl rounded-br-sm p-3 z-10"
                style={{ backgroundColor: '#1E2136', border: '1px solid rgba(123,114,255,0.25)', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}
              >
                <p className="text-[12px]" style={{ color: '#E8E8F0' }}>
                  {mochiMsg.emoji} {mochiMsg.text}
                </p>
                <button
                  onClick={() => setMochiMsg(null)}
                  className="absolute top-1.5 right-2 text-[10px]"
                  style={{ color: '#8B8BA7' }}
                  aria-label="Dismiss Mochi message"
                >
                  ✕
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <div className="space-y-5">
        {/* Invisible streak — only show when growing, never shame */}
        <AnimatePresence>
          {showStreak && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div
                className="rounded-2xl px-4 py-2.5 flex items-center gap-3"
                style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}
              >
                <span className="text-[20px]">🔥</span>
                <div>
                  <p className="text-[13px] font-semibold" style={{ color: '#F59E0B' }}>
                    {currentStreak} day{currentStreak !== 1 ? 's' : ''} — you keep showing up
                  </p>
                  {longestStreak > currentStreak && (
                    <p className="text-[11px]" style={{ color: '#8B8BA7' }}>Best: {longestStreak} days</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Low-energy banner */}
        <AnimatePresence>
          {isLowEnergy && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-2xl p-3 border"
              style={{ backgroundColor: 'rgba(78,205,196,0.06)', borderColor: 'rgba(78,205,196,0.15)' }}
            >
              <p className="text-[13px]" style={{ color: '#4ECDC4' }}>
                🌿 Low energy detected — showing only what matters most.
                {burnoutScore > 60 ? ' Burnout protection mode active.' : ''}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State — prompt to add first task */}
        {nowTasks.length === 0 && nextTasks.length === 0 && (
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowAddTask(true)}
            className="w-full rounded-2xl p-5 border text-left"
            style={{ backgroundColor: '#1E2136', borderColor: 'rgba(123,114,255,0.25)', boxShadow: '0 0 20px rgba(123,114,255,0.08)' }}
          >
            <div className="flex items-center gap-3">
              <MochiAvatar size={36} />
              <div>
                <p className="text-[15px] font-semibold" style={{ color: '#E8E8F0' }}>What's on your mind?</p>
                <p className="text-[12px]" style={{ color: '#8B8BA7' }}>Tap to add your first task — just one is enough</p>
              </div>
            </div>
          </motion.button>
        )}

        {/* Energy Check-in */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <p className="text-[15px] font-semibold mb-2" style={{ color: '#E8E8F0' }}>How's your energy right now?</p>
          <EnergyPicker
            selected={energyLevel - 1}
            onSelect={handleEnergySelect}
          />
        </motion.div>

        {/* NOW Pool — low energy shows only 1 task */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: '#7B72FF' }}>NOW</span>
            <span className="text-[11px]" style={{ color: '#8B8BA7' }}>{nowTasks.length}/{nowMax}</span>
            {isLowEnergy && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(78,205,196,0.12)', color: '#4ECDC4' }}>
                gentle mode
              </span>
            )}
          </div>
          <div className="space-y-2">
            {/* Low energy: show only 1 task. Normal: show up to 2. */}
            {nowTasks.slice(0, isLowEnergy ? 1 : 2).map((t, i) => (
              <TaskCard
                key={t.id}
                task={t}
                index={i}
                onDone={(id) => completeTask(id)}
                onPark={(id) => snoozeTask(id)}
              />
            ))}
            {isLowEnergy && nowTasks.length > 1 && (
              <p className="text-[12px] py-1" style={{ color: '#8B8BA7' }}>
                +{nowTasks.length - 1} more — rest first, they'll wait 🌙
              </p>
            )}
          </div>
        </div>

        {/* Up Next Preview — hidden in low-energy mode */}
        {showNextOnHome && !isLowEnergy && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl p-3"
            style={{ backgroundColor: '#1E2136' }}
          >
            <p className="text-[15px] font-semibold mb-1" style={{ color: '#E8E8F0' }}>📋 Up next · {nextTasks.length} tasks queued</p>
            {nextTasks.slice(0, 2).map(t => (
              <p key={t.id} className="text-[13px] truncate" style={{ color: '#8B8BA7' }}>{t.title}</p>
            ))}
            <button className="text-[13px] font-medium mt-1" style={{ color: '#7B72FF' }}>See all →</button>
          </motion.div>
        )}

        {/* Bento Grid — simplified in low-energy mode */}
        {!isLowEnergy && (
          <div className="grid grid-cols-2 gap-2">
            {[
              {
                content: (
                  <>
                    <span className="text-[20px] font-bold" style={{ color: '#E8E8F0' }}>{completedTotal ?? 0}</span>
                    <span className="text-[11px] ml-1" style={{ color: '#8B8BA7' }}>done</span>
                    {focusMinutes !== null && (
                      <>
                        <span className="text-[11px] mx-1" style={{ color: '#8B8BA7' }}>·</span>
                        <span className="text-[20px] font-bold" style={{ color: '#E8E8F0' }}>{(focusMinutes / 60).toFixed(1)}h</span>
                      </>
                    )}
                  </>
                ),
                sub: `⚡ ${(xpTotal ?? 0).toLocaleString()} XP`,
              },
              {
                content: <span className="text-[28px]">{ENERGY_EMOJI[energyLevel - 1]}</span>,
                sub: 'Tap to update',
              },
              {
                content: <span className="text-[20px] font-bold" style={{ color: '#E8E8F0' }}>✅ {completedTotal}</span>,
                sub: 'tasks completed',
              },
              {
                content: <BurnoutGauge score={isNaN(burnoutScore) ? 0 : (burnoutScore ?? 0)} />,
                sub: 'Burnout gauge',
              },
            ].map((card, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
                className="rounded-2xl p-3 flex flex-col items-center justify-center min-h-[80px]"
                style={{ backgroundColor: '#1E2136' }}
              >
                <div className="flex items-baseline">{card.content}</div>
                <p className="text-[11px] mt-0.5" style={{ color: '#8B8BA7' }}>{card.sub}</p>
              </motion.div>
            ))}
          </div>
        )}

        {/* Low-energy gentle card — replaces dense bento grid */}
        {isLowEnergy && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-4"
            style={{ backgroundColor: '#1E2136' }}
          >
            <div className="flex items-center gap-3">
              <span className="text-[32px]">{ENERGY_EMOJI[energyLevel - 1]}</span>
              <div>
                <p className="text-[15px] font-semibold" style={{ color: '#E8E8F0' }}>
                  ⚡ {(xpTotal ?? 0).toLocaleString()} XP · {completedTotal ?? 0} done
                </p>
                <p className="text-[12px]" style={{ color: '#8B8BA7' }}>
                  {burnoutScore > 60
                    ? 'You\'ve been working hard. Take care of yourself first.'
                    : 'Easy does it today. Small steps still count.'}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <Fab onClick={() => setShowAddTask(true)} />
      <AddTaskModal open={showAddTask} onClose={() => setShowAddTask(false)} />
    </div>
  );
}

function BurnoutGauge({ score }: { score: number }) {
  const angle = (score / 100) * 180;
  const r = 28;
  const cx = 36;
  const cy = 36;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const endX = cx + r * Math.cos(toRad(180 - angle));
  const endY = cy - r * Math.sin(toRad(180 - angle));
  const largeArc = angle > 180 ? 1 : 0;
  return (
    <div className="relative">
      <svg width="72" height="44" viewBox="0 0 72 44">
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" strokeLinecap="round" />
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 ${largeArc} 1 ${endX} ${endY}`} fill="none" stroke="#4ECDC4" strokeWidth="5" strokeLinecap="round" />
      </svg>
      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[15px] font-bold" style={{ color: '#4ECDC4' }}>{score}</span>
    </div>
  );
}
