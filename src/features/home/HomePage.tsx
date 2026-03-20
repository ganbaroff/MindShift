import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useMotion } from '@/shared/hooks/useMotion';
import TaskCard from '@/components/TaskCard';
import MochiAvatar from '@/components/MochiAvatar';
import EnergyPicker from '@/components/EnergyPicker';
import Fab from '@/components/Fab';
import AddTaskModal from '@/components/AddTaskModal';
import { useStore } from '@/store';
import type { EnergyLevel } from '@/types';
import { getNowPoolMax, APP_MODE_CONFIG, ENERGY_EMOJI } from '@/shared/lib/constants';
import { useI18n } from '@/shared/hooks/useI18n';
import { useUITone } from '@/shared/hooks/useUITone';
import { BurnoutGauge } from './BurnoutGauge';
import { PageTransition } from '@/shared/ui/PageTransition';
import { toast } from 'sonner';

// ── Mochi energy reaction messages ────────────────────────────────────────────
// Research #3: state-aware apps adapt to user's real-time neurological capacity.
// Mochi reacts when energy changes to acknowledge the shift, never judge.

const MOCHI_ENERGY_MESSAGES: Record<number, { text: string; emoji: string }[]> = {
  1: [
    { text: "One tiny thing today is enough.", emoji: '🌙' },
    { text: "Drained days happen. Take it slow.", emoji: '🛋️' },
    { text: "Low fuel? Park the big stuff.", emoji: '💤' },
  ],
  2: [
    { text: "Gentle energy — pick something easy.", emoji: '🌱' },
    { text: "Small moves count.", emoji: '🌿' },
    { text: "Not your sharpest day? Easy tasks still count.", emoji: '🍃' },
  ],
  3: [
    { text: "Steady energy. Good for focused work.", emoji: '🎯' },
    { text: "Okay energy is still energy.", emoji: '🙂' },
    { text: "Middle-ground day. Consistent work fits here.", emoji: '⚖️' },
  ],
  4: [
    { text: "Good energy. This is your window.", emoji: '✨' },
    { text: "Good day for something that matters.", emoji: '🚀' },
    { text: "Solid energy. Pick something real.", emoji: '🌊' },
  ],
  5: [
    { text: "High energy. Good time for deep work.", emoji: '⚡' },
    { text: "Peak energy. Try your hardest task.", emoji: '🔥' },
    { text: "Full tank. Pick something big.", emoji: '💪' },
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
    dailyFocusGoalMin,
    goalCelebratedDate, setGoalCelebratedDate,
    timeBlindness, emotionalReactivity, medicationEnabled, medicationTime,
    completeTask, snoozeTask,
  } = useStore();

  const { copy } = useUITone();
  const { shouldAnimate } = useMotion();
  const [showAddTask, setShowAddTask] = useState(false);
  const [mochiMsg, setMochiMsg] = useState<{ text: string; emoji: string } | null>(null);
  const [briefDismissed, setBriefDismissed] = useState(false);
  const prevEnergy = useRef<EnergyLevel>(energyLevel);

  // Only 'task' type items in NOW — meetings/reminders/ideas don't appear here
  const nowTasks = useMemo(() => nowPool.filter(t => t.status === 'active' && t.taskType === 'task'), [nowPool]);
  const nextTasks = useMemo(() => nextPool.filter(t => t.status === 'active'), [nextPool]);

  // "Last refreshed" timestamp — gives a sense of data freshness
  const [lastRefreshed] = useState(() => new Date());
  const nowMax = getNowPoolMax(appMode, seasonalMode);
  const { showNextOnHome, homeSubtitle } = APP_MODE_CONFIG[appMode];

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

  // hour declared early — used by greeting AND daily brief
  const hour = new Date().getHours();

  // ── Daily brief (Sprint T) ────────────────────────────────────────────────────
  // A personalised tip based on the user's ADHD profile, shown once per session.
  // Visible in the morning (before 12) or afternoon; dismissed by user.
  const briefTip = useMemo(() => {
    if (timeBlindness === 'often') return { emoji: '⏰', text: 'Time blindness day? Set one visible timer before you start.' }
    if (timeBlindness === 'sometimes') return { emoji: '⏰', text: 'Check the clock before diving in — surprises are harder to handle today.' }
    if (emotionalReactivity === 'high') return { emoji: '🛡️', text: 'High-reactivity mode: protect your first 30 min from interruptions.' }
    if (emotionalReactivity === 'moderate') return { emoji: '🌿', text: 'Start slow today. Emotions affect focus more than usual.' }
    if (medicationEnabled && medicationTime === 'morning') return { emoji: '⚡', text: 'Morning window — good time for harder tasks.' }
    return { emoji: '🎯', text: 'Pick one task you\'d regret not starting. Just one.' }
  }, [timeBlindness, emotionalReactivity, medicationEnabled, medicationTime])
  const topNowTask = nowTasks[0] ?? null
  const showBrief = !briefDismissed && hour < 17 && !isLowEnergy

  // ── Daily focus goal progress (P-1) ──────────────────────────────────────────
  // dailyMinutes[0]=Mon…[6]=Sun; today's index from JS getDay (0=Sun)
  const todayDayIdx = (new Date().getDay() + 6) % 7
  const todayMin = weeklyStats?.dailyMinutes?.[todayDayIdx] ?? 0
  const goalProgress = dailyFocusGoalMin > 0 ? Math.min(1, todayMin / dailyFocusGoalMin) : 0
  const goalReached = todayMin >= dailyFocusGoalMin && dailyFocusGoalMin > 0
  const todayISO = new Date().toISOString().split('T')[0]

  // One-time celebration per day when goal is first crossed
  useEffect(() => {
    if (goalReached && goalCelebratedDate !== todayISO) {
      setGoalCelebratedDate(todayISO)
      toast.success(`🎯 Daily goal reached! ${dailyFocusGoalMin} min focused today`, { duration: 4000 })
    }
  }, [goalReached, goalCelebratedDate, todayISO, dailyFocusGoalMin, setGoalCelebratedDate])

  // ── Bento grid cards (memoized) ──────────────────────────────────────────────
  const bentoCards = useMemo(() => [
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
  ], [completedTotal, focusMinutes, xpTotal, energyLevel, burnoutScore]);

  // Time-based greeting (i18n-aware)
  const { t } = useI18n();
  const greeting =
    hour < 5  ? t('home.greeting.night') :
    hour < 12 ? t('home.greeting.morning') :
    hour < 17 ? t('home.greeting.afternoon') :
    hour < 21 ? t('home.greeting.evening') : t('home.greeting.night');

  return (
    <PageTransition>
    <div className="min-h-screen px-5 pb-36 pt-10" style={{ backgroundColor: '#0F1120' }}>
      {/* Last synced indicator */}
      <p className="text-[10px] mb-1" style={{ color: '#5A5B72' }}>
        Updated {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </p>

      {/* Header */}
      <motion.div initial={shouldAnimate ? { opacity: 0, y: -8 } : false} animate={shouldAnimate ? { opacity: 1, y: 0 } : false} className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-[24px] font-bold" style={{ color: '#E8E8F0' }}>{greeting}</h1>
          <p className="text-[13px] mt-0.5" style={{ color: '#8B8BA7' }}>
            {isLowEnergy ? copy.lowEnergyNudge : homeSubtitle}
          </p>
        </div>
        {/* Mochi with speech bubble */}
        <div className="relative">
          <MochiAvatar size={44} />
          <AnimatePresence>
            {mochiMsg && (
              <motion.div
                initial={shouldAnimate ? { opacity: 0, scale: 0.8, y: 8 } : false}
                animate={shouldAnimate ? { opacity: 1, scale: 1, y: 0 } : false}
                exit={shouldAnimate ? { opacity: 0, scale: 0.8, y: 8 } : undefined}
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
              initial={shouldAnimate ? { opacity: 0, height: 0 } : false}
              animate={shouldAnimate ? { opacity: 1, height: 'auto' } : false}
              exit={shouldAnimate ? { opacity: 0, height: 0 } : undefined}
              className="overflow-hidden"
            >
              <div
                className="rounded-2xl px-4 py-2.5 flex items-center gap-3"
                style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}
              >
                <span className="text-[20px]">🔥</span>
                <div>
                  <p className="text-[13px] font-semibold" style={{ color: '#F59E0B' }}>
                    {copy.streakGoing(currentStreak)}
                  </p>
                  {longestStreak > currentStreak && (
                    <p className="text-[11px]" style={{ color: '#8B8BA7' }}>Best: {longestStreak} days</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Daily Brief (Sprint T) — personalised ADHD tip + top task */}
        <AnimatePresence>
          {showBrief && (
            <motion.div
              initial={shouldAnimate ? { opacity: 0, y: 8 } : false}
              animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
              exit={shouldAnimate ? { opacity: 0, height: 0 } : undefined}
              className="rounded-2xl p-3"
              style={{ backgroundColor: '#1E2136', border: '1px solid rgba(123,114,255,0.12)' }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                  <span className="text-[18px] shrink-0">{briefTip.emoji}</span>
                  <p className="text-[13px] leading-relaxed" style={{ color: '#E8E8F0' }}>
                    {briefTip.text}
                  </p>
                </div>
                <button
                  onClick={() => setBriefDismissed(true)}
                  className="text-[11px] shrink-0 mt-0.5"
                  style={{ color: '#8B8BA7' }}
                  aria-label="Dismiss daily brief"
                >
                  ✕
                </button>
              </div>
              {topNowTask && (
                <div
                  className="mt-2 pt-2 flex items-center gap-2"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <span className="text-[11px]" style={{ color: '#8B8BA7' }}>Start with →</span>
                  <span className="text-[12px] font-medium truncate" style={{ color: '#7B72FF' }}>
                    {topNowTask.title}
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Daily focus goal progress (P-1) — only show when we have session data */}
        {weeklyStats && (
          <motion.div
            initial={shouldAnimate ? { opacity: 0, y: 8 } : false}
            animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
            className="rounded-2xl px-4 py-3"
            style={{ backgroundColor: '#1E2136' }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-semibold" style={{ color: goalReached ? '#4ECDC4' : '#E8E8F0' }}>
                {goalReached ? '🎯 Goal reached!' : '🎯 Today\'s focus'}
              </span>
              <span className="text-[12px]" style={{ color: '#8B8BA7' }}>
                {todayMin} / {dailyFocusGoalMin} min
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
              <motion.div
                className="h-full rounded-full"
                initial={shouldAnimate ? { width: 0 } : false}
                animate={{ width: `${goalProgress * 100}%` }}
                transition={shouldAnimate ? { duration: 0.8, ease: 'easeOut' } : { duration: 0 }}
                style={{ background: goalReached ? '#4ECDC4' : 'linear-gradient(90deg, #7B72FF, #9B8EFF)' }}
              />
            </div>
          </motion.div>
        )}

        {/* Low-energy banner */}
        <AnimatePresence>
          {isLowEnergy && (
            <motion.div
              initial={shouldAnimate ? { opacity: 0, y: 8 } : false}
              animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
              exit={shouldAnimate ? { opacity: 0, y: -8 } : undefined}
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
            initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
            animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
            whileTap={shouldAnimate ? { scale: 0.97 } : undefined}
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
        <motion.div initial={shouldAnimate ? { opacity: 0, y: 12 } : false} animate={shouldAnimate ? { opacity: 1, y: 0 } : false} transition={shouldAnimate ? { delay: 0.1 } : undefined}>
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
            initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
            animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
            transition={shouldAnimate ? { delay: 0.15 } : undefined}
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
            {bentoCards.map((card, i) => (
              <motion.div
                key={i}
                initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
                animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
                transition={shouldAnimate ? { delay: 0.2 + i * 0.05 } : undefined}
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
            initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
            animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
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
    </PageTransition>
  );
}
