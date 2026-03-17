import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { useStore } from '@/store';
import { ENERGY_EMOJI } from '@/shared/lib/constants';
import { useSessionHistory } from '@/shared/hooks/useSessionHistory';
import { nativeShare, canShare } from '@/shared/lib/native';
import { deriveFromSessions } from '@/shared/lib/psychotype';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const PSYCHOTYPE_META = {
  achiever:  { emoji: '🎯', label: 'Achiever',  desc: 'You dive deep and finish what you start' },
  explorer:  { emoji: '🗺️', label: 'Explorer',  desc: 'You thrive on variety and follow curiosity' },
  connector: { emoji: '💙', label: 'Connector', desc: 'You build momentum through consistency' },
  planner:   { emoji: '📋', label: 'Planner',   desc: 'You focus best with a predictable rhythm' },
} as const

export default function ProgressPage() {
  const {
    xpTotal, completedTotal, achievements, weeklyStats, burnoutScore,
    psychotype, setPsychotype, setPsychotypeLastDerived, resetGridToDefaults,
  } = useStore();
  const { energyTrend, weeklyInsight, loading, sessions } = useSessionHistory();

  const xpSafe = xpTotal ?? 0;
  const shareSupported = canShare();

  // O-7: Derive psychotype from usage patterns once sessions load
  const derivedPsychotype = useMemo(() => deriveFromSessions(sessions), [sessions])
  const psychotypeEvolved =
    derivedPsychotype !== null &&
    psychotype !== null &&
    derivedPsychotype !== psychotype

  const handleAcceptEvolution = () => {
    if (!derivedPsychotype) return
    setPsychotype(derivedPsychotype)
    setPsychotypeLastDerived(new Date().toISOString().slice(0, 10))
    resetGridToDefaults()
  }

  const handleShareWeek = async () => {
    const mins = weeklyStats?.totalFocusMinutes ?? 0;
    const tasks = completedTotal;
    await nativeShare({
      title: 'My MindShift week 🌱',
      text: `This week I focused for ${mins} minutes and completed ${tasks} tasks with MindShift — ADHD-aware productivity. 💙`,
      url: 'https://mindshift.app',
    });
  };
  const level = Math.floor(xpSafe / 1000) + 1;
  const xpInLevel = xpSafe % 1000;
  const xpToNext = 1000;

  // Named XP tiers — calm growth language, no competitive framing
  const LEVEL_NAMES = ['Seedling', 'Sprout', 'Grower', 'Bloomer', 'Flourisher',
    'Cultivator', 'Nurturer', 'Luminary', 'Pathfinder', 'Sage'] as const
  const levelName = LEVEL_NAMES[Math.min(level - 1, LEVEL_NAMES.length - 1)]

  // Focus score — composite metric (0-100): sessions + tasks + consistency
  const focusScore = useMemo(() => {
    const sessionScore = Math.min(30, (weeklyStats?.tasksCompleted ?? 0) * 6)
    const consistencyScore = Math.round((weeklyStats?.consistencyScore ?? 0) * 40)
    const taskScore = Math.min(30, completedTotal * 3)
    return Math.min(100, sessionScore + consistencyScore + taskScore)
  }, [weeklyStats, completedTotal])

  const weekData = DAY_LABELS.map((day, i) => ({
    day,
    mins: weeklyStats?.dailyMinutes?.[i] ?? 0,
  }));

  const maxMins = Math.max(...weekData.map(d => d.mins), 1);

  const achievementList = achievements.map(a => ({
    emoji: a.emoji,
    name: a.name,
    unlocked: !!a.unlockedAt,
  }));

  const unlockedCount = achievements.filter(a => a.unlockedAt).length;
  const [focusedAchievement, setFocusedAchievement] = useState<string | null>(null);

  // Show last 5 energy_after values as emojis (most recent first)
  const energyTrendEmojis = energyTrend
    .slice(0, 5)
    .map(e => ENERGY_EMOJI[Math.min(4, Math.max(0, e - 1))]);

  return (
    <div className="min-h-screen px-5 pb-36 pt-10" style={{ backgroundColor: '#0F1120' }}>
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-[24px] font-bold" style={{ color: '#E8E8F0' }}>Your Progress 🌱</h1>
        <p className="text-[13px] mt-0.5" style={{ color: '#8B8BA7' }}>Every step counts, no matter how small.</p>
      </motion.div>

      <div className="space-y-4 mt-5">
        {/* XP Card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-3" style={{ backgroundColor: '#1E2136' }}>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-[24px] shrink-0" style={{ background: 'linear-gradient(135deg, #7B72FF, #4ECDC4)', padding: 2 }}>
              <div className="w-full h-full rounded-full flex items-center justify-center" style={{ backgroundColor: '#1E2136' }}>🧠</div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold" style={{ color: '#E8E8F0' }}>
                Level {level} · {levelName}
              </p>
              <p className="text-[13px]" style={{ color: '#7B72FF' }}>{xpSafe.toLocaleString()} XP</p>
              <div className="w-full h-1.5 rounded-full mt-1.5 overflow-hidden" style={{ backgroundColor: '#252840' }}>
                <div className="h-full rounded-full gradient-primary-teal" style={{ width: `${(xpInLevel / xpToNext) * 100}%` }} />
              </div>
              <p className="text-[11px] mt-0.5" style={{ color: '#8B8BA7' }}>{xpInLevel}/{xpToNext} XP to Level {level + 1}</p>
            </div>
          </div>
        </motion.div>

        {/* Weekly Bars */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl p-3" style={{ backgroundColor: '#1E2136' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-widest" style={{ color: '#8B8BA7' }}>This week</span>
            <span className="text-[13px]" style={{ color: '#E8E8F0' }}>
              {loading ? 'Loading…' : 'Great week 💪'}
            </span>
          </div>
          <div className="flex items-end justify-between h-20 gap-1.5">
            {weekData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max((d.mins / maxMins) * 100, 4)}%` }}
                  transition={{ delay: 0.1 + i * 0.05, duration: 0.4 }}
                  className="w-full rounded-t gradient-primary-teal"
                  style={{ minHeight: d.mins > 0 ? 4 : 2 }}
                />
                <span className="text-[10px]" style={{ color: '#8B8BA7' }}>{d.day}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] mt-1.5 text-center" style={{ color: '#8B8BA7' }}>
            {weeklyStats ? `${weeklyStats.totalFocusMinutes}m focus this week` : 'No data yet'}
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: String(unlockedCount), emoji: '🏆', label: 'Achievements' },
            { value: String(completedTotal), emoji: '✅', label: 'Tasks Done' },
            { value: String(burnoutScore), emoji: '🧠', label: 'Burnout score' },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.03 }} className="rounded-2xl p-2.5 flex flex-col items-center" style={{ backgroundColor: '#1E2136' }}>
              <span className="text-[18px] font-bold" style={{ color: '#E8E8F0' }}>{s.value}</span>
              <span className="text-[14px]">{s.emoji}</span>
              <span className="text-[10px]" style={{ color: '#8B8BA7' }}>{s.label}</span>
            </motion.div>
          ))}
        </div>

        {/* Focus Score — composite health metric */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.13 }}
          className="rounded-2xl p-3"
          style={{ backgroundColor: '#1E2136' }}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] uppercase tracking-widest" style={{ color: '#8B8BA7' }}>Focus health score</p>
            <span
              className="text-[12px] font-semibold px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: focusScore >= 70 ? 'rgba(78,205,196,0.15)' : focusScore >= 40 ? 'rgba(123,114,255,0.12)' : 'rgba(245,158,11,0.10)',
                color: focusScore >= 70 ? '#4ECDC4' : focusScore >= 40 ? '#7B72FF' : '#F59E0B',
              }}
            >
              {focusScore >= 70 ? '🌿 Thriving' : focusScore >= 40 ? '🌱 Growing' : '🌾 Planting'}
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
            <motion.div
              className="h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${focusScore}%` }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
              style={{
                background: focusScore >= 70
                  ? 'linear-gradient(90deg, #4ECDC4, #7B72FF)'
                  : 'linear-gradient(90deg, #7B72FF, #9B8EFF)',
              }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <p className="text-[11px]" style={{ color: '#8B8BA7' }}>Sessions · Consistency · Tasks</p>
            <p className="text-[11px] font-medium" style={{ color: '#E8E8F0' }}>{focusScore}/100</p>
          </div>
        </motion.div>

        {/* Energy Trends */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-2xl p-3" style={{ backgroundColor: '#1E2136' }}>
          <p className="text-[11px] uppercase tracking-widest mb-1.5" style={{ color: '#4ECDC4' }}>Energy after sessions</p>
          {energyTrendEmojis.length > 0 ? (
            <>
              <div className="flex gap-1 text-[22px]">
                {energyTrendEmojis.map((emoji, i) => (
                  <span key={i}>{emoji}</span>
                ))}
              </div>
              <p className="text-[11px] mt-1" style={{ color: '#8B8BA7' }}>Last {energyTrendEmojis.length} sessions (most recent first)</p>
            </>
          ) : (
            <>
              <p className="text-[13px]" style={{ color: '#4ECDC4' }}>No post-session energy data yet</p>
              <p className="text-[11px] mt-0.5" style={{ color: '#8B8BA7' }}>Complete a focus session to track your trend</p>
            </>
          )}
        </motion.div>

        {/* Peak Focus Window (O-12) — derived from session history */}
        {weeklyStats && weeklyStats.peakFocusTime !== 'Not enough data' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.17 }}
            className="rounded-2xl p-3"
            style={{ backgroundColor: '#1E2136', border: '1px solid rgba(78,205,196,0.12)' }}
          >
            <p className="text-[11px] uppercase tracking-widest mb-2" style={{ color: '#4ECDC4' }}>⚡ Peak focus window</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[20px] font-bold" style={{ color: '#4ECDC4' }}>{weeklyStats.peakFocusTime}</p>
                <p className="text-[11px] mt-0.5" style={{ color: '#8B8BA7' }}>
                  Your most productive time this week
                </p>
              </div>
              {weeklyStats.consistencyScore > 0 && (
                <div className="text-right">
                  <p className="text-[18px] font-bold" style={{ color: '#7B72FF' }}>
                    {Math.round(weeklyStats.consistencyScore * 7)}/7
                  </p>
                  <p className="text-[10px]" style={{ color: '#8B8BA7' }}>days active</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Your Focus Style — O-7 psychotype re-derivation */}
        {psychotype && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.19 }}
            className="rounded-2xl p-3"
            style={{
              backgroundColor: '#1E2136',
              border: psychotypeEvolved
                ? '1px solid rgba(245,158,11,0.30)'
                : '1px solid rgba(123,114,255,0.12)',
            }}
          >
            <p className="text-[11px] uppercase tracking-widest mb-2" style={{ color: '#7B72FF' }}>
              Your focus style
            </p>
            <div className="flex items-center gap-3">
              <span className="text-[28px]">{PSYCHOTYPE_META[psychotype].emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold" style={{ color: '#E8E8F0' }}>
                  {PSYCHOTYPE_META[psychotype].label}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: '#8B8BA7' }}>
                  {PSYCHOTYPE_META[psychotype].desc}
                </p>
              </div>
            </div>

            {/* Evolution nudge — shown when usage patterns suggest a different type */}
            {psychotypeEvolved && derivedPsychotype && (
              <div
                className="mt-3 pt-3 flex items-center justify-between gap-3"
                style={{ borderTop: '1px solid rgba(245,158,11,0.15)' }}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium" style={{ color: '#F59E0B' }}>
                    Your patterns suggest {PSYCHOTYPE_META[derivedPsychotype].label} {PSYCHOTYPE_META[derivedPsychotype].emoji}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: '#8B8BA7' }}>
                    Based on your last {sessions.length} sessions
                  </p>
                </div>
                <button
                  onClick={handleAcceptEvolution}
                  className="text-[11px] font-semibold px-3 py-1.5 rounded-xl shrink-0 transition-all duration-150"
                  style={{
                    background: 'rgba(245,158,11,0.15)',
                    border: '1px solid rgba(245,158,11,0.30)',
                    color: '#F59E0B',
                  }}
                >
                  Update
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* Share this week — Web Share API / Capacitor Share */}
        {shareSupported && (
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => void handleShareWeek()}
            className="w-full py-3 rounded-2xl text-sm font-medium flex items-center justify-center gap-2 transition-all duration-200"
            style={{
              background: 'rgba(123,114,255,0.10)',
              border: '1px solid rgba(123,114,255,0.20)',
              color: '#C8C0FF',
            }}
          >
            <span>🔗</span>
            Share this week
          </motion.button>
        )}

        {/* Session Log link */}
        <Link
          to="/history"
          className="flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-200"
          style={{ backgroundColor: '#1E2136', border: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-base">📋</span>
            <span className="text-[14px] font-medium" style={{ color: '#E8E8F0' }}>Session Log</span>
          </div>
          <span className="text-[12px]" style={{ color: '#8B8BA7' }}>→</span>
        </Link>

        {/* AI Insights */}
        <div>
          <p className="text-[11px] uppercase tracking-widest mb-2" style={{ color: '#F59E0B' }}>✨ Weekly insight</p>
          <div className="space-y-1.5">
            {weeklyInsight.map((insight, i) => (
              <div key={i} className="rounded-xl p-2.5" style={{ backgroundColor: '#1E2136' }}>
                <p className="text-[13px]" style={{ color: '#E8E8F0' }}>{insight}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Achievements */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] uppercase tracking-widest" style={{ color: '#8B8BA7' }}>Achievements</p>
            <p className="text-[11px]" style={{ color: '#7B72FF' }}>{unlockedCount}/{achievementList.length}</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {achievements.map((a, i) => {
              const unlocked = !!a.unlockedAt
              const isFocused = focusedAchievement === a.key
              return (
                <div key={a.key} className="relative">
                  <motion.button
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 + i * 0.03 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setFocusedAchievement(isFocused ? null : a.key)}
                    className="w-full rounded-2xl p-2.5 flex flex-col items-center"
                    style={{
                      backgroundColor: isFocused ? 'rgba(123,114,255,0.12)' : '#1E2136',
                      border: `1px solid ${isFocused ? 'rgba(123,114,255,0.30)' : 'transparent'}`,
                      opacity: unlocked ? 1 : 0.38,
                      filter: unlocked ? 'none' : 'grayscale(1)',
                    }}
                    aria-label={`${a.name}: ${a.description}`}
                  >
                    <span className="text-[24px]">{a.emoji}</span>
                    <span className="text-[10px] text-center mt-0.5" style={{ color: '#8B8BA7' }}>{a.name}</span>
                  </motion.button>
                  <AnimatePresence>
                    {isFocused && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        className="absolute left-0 right-0 top-full mt-1 z-10 rounded-xl px-2.5 py-2"
                        style={{ backgroundColor: '#252840', border: '1px solid rgba(123,114,255,0.20)' }}
                      >
                        <p className="text-[11px] leading-relaxed" style={{ color: unlocked ? '#E8E8F0' : '#8B8BA7' }}>
                          {a.description}
                        </p>
                        {unlocked && a.unlockedAt && (
                          <p className="text-[10px] mt-0.5" style={{ color: '#7B72FF' }}>
                            ✓ {new Date(a.unlockedAt).toLocaleDateString()}
                          </p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
