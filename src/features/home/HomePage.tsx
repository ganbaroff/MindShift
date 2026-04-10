import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useMotion } from '@/shared/hooks/useMotion';
import TaskCard from '@/components/TaskCard';
import MochiAvatar from '@/components/MochiAvatar';
import EnergyPicker from '@/components/EnergyPicker';
import Fab from '@/components/Fab';
import AddTaskModal from '@/components/AddTaskModal';
import { useStore } from '@/store';
import type { EnergyLevel } from '@/types';
import { getNowPoolMax, APP_MODE_CONFIG } from '@/shared/lib/constants';
import { useTranslation } from 'react-i18next';
import { useUITone } from '@/shared/hooks/useUITone';
import { BurnoutNudgeCard } from './BurnoutNudgeCard';
import { DailyBriefCard } from './DailyBriefCard';
import { StreakBadge } from './StreakBadge';
import { HomeDailyBrief } from './HomeDailyBrief';
import { PageTransition } from '@/shared/ui/PageTransition';
import { getMochiMessage } from './mochiMessages';
import { toast } from 'sonner';
import { supabase } from '@/shared/lib/supabase';

export default function HomePage() {
  const nowPool = useStore(s => s.nowPool)
  const nextPool = useStore(s => s.nextPool)
  const energyLevel = useStore(s => s.energyLevel)
  const setEnergyLevel = useStore(s => s.setEnergyLevel)
  const appMode = useStore(s => s.appMode)
  const seasonalMode = useStore(s => s.seasonalMode)
  const completedTotal = useStore(s => s.completedTotal)
  const xpTotal = useStore(s => s.xpTotal)
  const burnoutScore = useStore(s => s.burnoutScore)
  const weeklyStats = useStore(s => s.weeklyStats)
  const currentStreak = useStore(s => s.currentStreak)
  const longestStreak = useStore(s => s.longestStreak)
  const dailyFocusGoalMin = useStore(s => s.dailyFocusGoalMin)
  const goalCelebratedDate = useStore(s => s.goalCelebratedDate)
  const setGoalCelebratedDate = useStore(s => s.setGoalCelebratedDate)
  const timeBlindness = useStore(s => s.timeBlindness)
  const emotionalReactivity = useStore(s => s.emotionalReactivity)
  const medicationEnabled = useStore(s => s.medicationEnabled)
  const medicationTime = useStore(s => s.medicationTime)
  const completeTask = useStore(s => s.completeTask)
  const snoozeTask = useStore(s => s.snoozeTask)

  const navigate = useNavigate();
  const { copy } = useUITone();
  const { shouldAnimate } = useMotion();
  const [showAddTask, setShowAddTask] = useState(false);
  const [mochiMsg, setMochiMsg] = useState<{ text: string; emoji: string } | null>(null);
  const [briefDismissed, setBriefDismissed] = useState(false);
  const [tinyActionLoading, setTinyActionLoading] = useState(false);
  const prevEnergy = useRef<EnergyLevel>(energyLevel);

  const nowTasks = useMemo(() => nowPool.filter(t => t.status === 'active' && t.taskType === 'task'), [nowPool]);
  const nextTasks = useMemo(() => nextPool.filter(t => t.status === 'active'), [nextPool]);

  const [lastRefreshed] = useState(() => new Date());
  const nowMax = getNowPoolMax(appMode, seasonalMode);
  const { showNextOnHome, homeSubtitle } = APP_MODE_CONFIG[appMode];
  const focusMinutes = weeklyStats?.totalFocusMinutes ?? null;

  // Low-energy mode — Research #3: dynamic contextual adaptation
  const isLowEnergy = energyLevel <= 2 || burnoutScore > 60;

  // Mochi energy reaction — acknowledge shift, never judge
  const handleEnergySelect = (i: number) => {
    const newLevel = (i + 1) as EnergyLevel;
    setEnergyLevel(newLevel);
    if (newLevel !== prevEnergy.current) {
      prevEnergy.current = newLevel;
      setMochiMsg(getMochiMessage(newLevel));
    }
  };

  // Research #3 (burnout prevention): Next Tiny Action
  // decompose-task with max spiciness (5) = 2-minute micro-step
  // Bypasses executive function paralysis — pre-decided action
  const handleTinyAction = useCallback(async () => {
    if (tinyActionLoading || nowTasks.length === 0) return;
    const topTask = nowTasks[0];
    setTinyActionLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    try {
      const locale = navigator.language?.split('-')[0] ?? 'en';
      const invokePromise = supabase.functions.invoke('decompose-task', {
        body: { taskTitle: topTask.title, spiciness: 5, locale },
      });
      const timeoutPromise = new Promise<never>((_, reject) =>
        controller.signal.addEventListener('abort', () => reject(new Error('timeout')))
      );
      const { data } = await Promise.race([invokePromise, timeoutPromise]);
      const firstStep = data?.steps?.[0] as string | undefined;
      if (firstStep) {
        setMochiMsg({ text: firstStep, emoji: '⚡' });
      }
    } catch {
      // silent fail — ADHD users don't need error noise
    } finally {
      clearTimeout(timeoutId);
      setTinyActionLoading(false);
    }
  }, [tinyActionLoading, nowTasks]);

  useEffect(() => {
    if (!mochiMsg) return;
    const timer = setTimeout(() => setMochiMsg(null), 8000);
    return () => clearTimeout(timer);
  }, [mochiMsg]);

  // Invisible streak — show only when growing
  const showStreak = currentStreak >= 2;

  const hour = new Date().getHours();
  const { t } = useTranslation();

  // Daily brief — personalised ADHD tip (Sprint T)
  const briefTip = useMemo(() => {
    if (timeBlindness === 'often') return { emoji: '⏰', text: t('home.briefTimeOften') }
    if (timeBlindness === 'sometimes') return { emoji: '⏰', text: t('home.briefTimeSometimes') }
    if (emotionalReactivity === 'high') return { emoji: '🛡️', text: t('home.briefEmotionHigh') }
    if (emotionalReactivity === 'moderate') return { emoji: '🌿', text: t('home.briefEmotionModerate') }
    if (medicationEnabled && medicationTime === 'morning') return { emoji: '⚡', text: t('home.briefMedMorning') }
    return { emoji: '🎯', text: t('home.briefDefault') }
  }, [timeBlindness, emotionalReactivity, medicationEnabled, medicationTime, t])
  const topNowTask = nowTasks[0] ?? null
  const showBrief = !briefDismissed && hour < 17 && !isLowEnergy

  // Daily focus goal progress (P-1)
  const todayDayIdx = (new Date().getDay() + 6) % 7
  const todayMin = weeklyStats?.dailyMinutes?.[todayDayIdx] ?? 0
  const goalProgress = dailyFocusGoalMin > 0 ? Math.min(1, todayMin / dailyFocusGoalMin) : 0
  const goalReached = todayMin >= dailyFocusGoalMin && dailyFocusGoalMin > 0
  const todayISO = new Date().toISOString().split('T')[0]

  useEffect(() => {
    if (goalReached && goalCelebratedDate !== todayISO) {
      setGoalCelebratedDate(todayISO)
      toast.success(`🎯 ${t('home.goalReachedToast', { min: dailyFocusGoalMin })}`, { duration: 4000 })
    }
  }, [goalReached, goalCelebratedDate, todayISO, dailyFocusGoalMin, setGoalCelebratedDate])

  const greeting =
    hour < 5  ? t('home.greeting.night') :
    hour < 12 ? t('home.greeting.morning') :
    hour < 17 ? t('home.greeting.afternoon') :
    hour < 21 ? t('home.greeting.evening') : t('home.greeting.night');

  return (
    <PageTransition>
    <div className="min-h-screen px-5 pb-36 pt-10" style={{ backgroundColor: 'var(--color-bg)' }}>
      <p className="text-[10px] mb-1" style={{ color: 'var(--color-text-muted)' }}>
        Updated {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </p>

      {/* Header */}
      <motion.div initial={shouldAnimate ? { opacity: 0, y: -8 } : false} animate={shouldAnimate ? { opacity: 1, y: 0 } : false} className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-[24px] font-bold" style={{ color: 'var(--color-text-primary)' }}>{greeting}</h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {isLowEnergy ? copy.lowEnergyNudge : t(`appMode.${appMode}Subtitle`, homeSubtitle)}
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
                style={{ backgroundColor: 'var(--color-surface-card)', border: '1px solid rgba(123,114,255,0.25)', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}
              >
                <p className="text-[12px]" style={{ color: 'var(--color-text-primary)' }}>
                  {mochiMsg.emoji} {mochiMsg.text}
                </p>
                <button
                  onClick={() => setMochiMsg(null)}
                  className="absolute top-1.5 right-2 text-[10px]"
                  style={{ color: 'var(--color-text-muted)' }}
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
        {/* Invisible streak — only show when growing */}
        <AnimatePresence>
          {showStreak && <StreakBadge currentStreak={currentStreak} longestStreak={longestStreak} />}
        </AnimatePresence>

        {/* Daily Brief — personalised ADHD tip (Sprint T) */}
        <AnimatePresence>
          {showBrief && (
            <DailyBriefCard
              emoji={briefTip.emoji}
              text={briefTip.text}
              topTask={topNowTask}
              onDismiss={() => setBriefDismissed(true)}
            />
          )}
        </AnimatePresence>

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
              <p className="text-[13px]" style={{ color: 'var(--color-teal)' }}>
                🌿 {t('home.lowEnergyDetected')}
                {burnoutScore > 60 ? t('home.burnoutProtection') : ''}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <BurnoutNudgeCard score={burnoutScore} />

        {/* Empty state */}
        {nowTasks.length === 0 && nextTasks.length === 0 && (
          <motion.button
            initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
            animate={{ opacity: 1, y: 0 }}
            whileTap={shouldAnimate ? { scale: 0.97 } : undefined}
            onClick={() => setShowAddTask(true)}
            aria-label={t('home.whatsOnMind')}
            className="w-full rounded-2xl p-5 border text-left focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none"
            style={{ backgroundColor: 'var(--color-surface-card)', borderColor: 'rgba(123,114,255,0.25)', boxShadow: '0 0 20px rgba(123,114,255,0.08)' }}
          >
            <div className="flex items-center gap-3">
              <MochiAvatar size={36} />
              <div>
                <p className="text-[15px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>{t('home.whatsOnMind')}</p>
                <p className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>{t('home.tapToAdd')}</p>
              </div>
            </div>
          </motion.button>
        )}

        {/* Energy Check-in */}
        <motion.div initial={shouldAnimate ? { opacity: 0, y: 12 } : false} animate={{ opacity: 1, y: 0 }} transition={shouldAnimate ? { delay: 0.1 } : undefined}>
          <p className="text-[15px] font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>{t('home.howsEnergy')}</p>
          <EnergyPicker selected={energyLevel - 1} onSelect={handleEnergySelect} />
        </motion.div>

        {/* NOW Pool — low energy shows only 1 task */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: 'var(--color-primary)' }}>NOW</span>
            <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{nowTasks.length}/{nowMax}</span>
            {isLowEnergy && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(78,205,196,0.12)', color: 'var(--color-teal)' }}>
                {t('home.gentleMode')}
              </span>
            )}
          </div>
          <div className="space-y-2">
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
              <p className="text-[12px] py-1" style={{ color: 'var(--color-text-muted)' }}>
                {t('home.moreRest', { count: nowTasks.length - 1 })} 🌙
              </p>
            )}
          </div>

          {/* Next Tiny Action — Research #3: pre-decided micro-step bypasses ADHD paralysis */}
          {nowTasks.length > 0 && !isLowEnergy && (
            <motion.button
              initial={shouldAnimate ? { opacity: 0 } : false}
              animate={{ opacity: 1 }}
              whileTap={shouldAnimate ? { scale: 0.97 } : undefined}
              onClick={handleTinyAction}
              disabled={tinyActionLoading}
              aria-label={t('home.tinyActionBtn')}
              className="mt-2 w-full text-left px-3 py-2.5 rounded-xl border focus-visible:ring-2 focus-visible:ring-[var(--color-teal)] focus-visible:outline-none disabled:opacity-50 transition-opacity"
              style={{
                backgroundColor: 'rgba(78,205,196,0.06)',
                borderColor: 'rgba(78,205,196,0.2)',
              }}
            >
              <span className="text-[13px]" style={{ color: 'var(--color-teal)' }}>
                {tinyActionLoading ? `⏳ ${t('home.tinyActionLoading')}` : `⚡ ${t('home.tinyActionBtn')}`}
              </span>
            </motion.button>
          )}
        </div>

        {/* Up Next Preview — hidden in low-energy mode */}
        {showNextOnHome && !isLowEnergy && (
          <motion.div
            initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
            animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
            transition={shouldAnimate ? { delay: 0.15 } : undefined}
            className="rounded-2xl p-3"
            style={{ backgroundColor: 'var(--color-surface-card)' }}
          >
            <p className="text-[15px] font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>📋 {t('home.upNext', { count: nextTasks.length })}</p>
            {nextTasks.slice(0, 2).map(t => (
              <p key={t.id} className="text-[13px] truncate" style={{ color: 'var(--color-text-muted)' }}>{t.title}</p>
            ))}
            <button
              onClick={() => navigate('/tasks')}
              className="text-[13px] font-medium mt-1 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded"
              style={{ color: 'var(--color-primary)' }}
              aria-label={t('home.seeAllTasks')}
            >
              {t('home.seeAll')}
            </button>
          </motion.div>
        )}

        {/* Stats panel: focus goal + bento grid + low-energy card */}
        <HomeDailyBrief
          completedTotal={completedTotal ?? 0}
          focusMinutes={focusMinutes}
          xpTotal={xpTotal ?? 0}
          energyLevel={energyLevel}
          burnoutScore={burnoutScore ?? 0}
          isLowEnergy={isLowEnergy}
          goalReached={goalReached}
          goalProgress={goalProgress}
          todayMin={todayMin}
          dailyFocusGoalMin={dailyFocusGoalMin}
          weeklyStats={weeklyStats}
        />
      </div>

      <Fab onClick={() => setShowAddTask(true)} />
      <AddTaskModal open={showAddTask} onClose={() => setShowAddTask(false)} />
    </div>
    </PageTransition>
  );
}
