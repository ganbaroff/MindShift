import { motion } from 'framer-motion';
import { useStore } from '@/store';
import { ENERGY_EMOJI } from '@/shared/lib/constants';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function ProgressPage() {
  const { xpTotal, completedTotal, achievements, weeklyStats, energyLevel, burnoutScore } = useStore();

  const xpSafe = xpTotal ?? 0;
  const level = Math.floor(xpSafe / 1000) + 1;
  const xpInLevel = xpSafe % 1000;
  const xpToNext = 1000;

  const weekData = DAY_LABELS.map((day, i) => ({
    day,
    mins: (weeklyStats as any)?.dailyMinutes?.[i] ?? 0,
  }));

  const maxMins = Math.max(...weekData.map(d => d.mins), 1);

  const achievementList = achievements.map(a => ({
    emoji: a.emoji,
    name: a.name,
    unlocked: !!a.unlockedAt,
  }));

  const unlockedCount = achievements.filter(a => a.unlockedAt).length;

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
              <p className="text-[15px] font-semibold" style={{ color: '#E8E8F0' }}>Level {level}</p>
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
            <span className="text-[13px]" style={{ color: '#E8E8F0' }}>Great week 💪</span>
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

        {/* Energy Trends */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-2xl p-3" style={{ backgroundColor: '#1E2136' }}>
          <p className="text-[11px] uppercase tracking-widest mb-1.5" style={{ color: '#4ECDC4' }}>Energy after sessions</p>
          <div className="flex gap-0.5 text-[28px]">{ENERGY_EMOJI[energyLevel - 1]}</div>
          <p className="text-[13px] mt-1" style={{ color: '#4ECDC4' }}>Current energy level</p>
        </motion.div>

        {/* AI Insights */}
        <div>
          <p className="text-[11px] uppercase tracking-widest mb-2" style={{ color: '#F59E0B' }}>✨ Weekly insight</p>
          <div className="space-y-1.5">
            {['🧠 Peak focus: 2-4pm', '💡 Try 15-min sessions on low days', '🎯 You finish 73% of tasks'].map((insight, i) => (
              <div key={i} className="rounded-xl p-2.5" style={{ backgroundColor: '#1E2136' }}>
                <p className="text-[13px]" style={{ color: '#E8E8F0' }}>{insight}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Achievements */}
        <div>
          <p className="text-[11px] uppercase tracking-widest mb-2" style={{ color: '#8B8BA7' }}>Achievements</p>
          <div className="grid grid-cols-3 gap-2">
            {achievementList.map((a, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + i * 0.03 }}
                className="rounded-2xl p-2.5 flex flex-col items-center"
                style={{ backgroundColor: '#1E2136', opacity: a.unlocked ? 1 : 0.4, filter: a.unlocked ? 'none' : 'grayscale(1)' }}
              >
                <span className="text-[24px]">{a.emoji}</span>
                <span className="text-[10px] text-center mt-0.5" style={{ color: '#8B8BA7' }}>{a.name}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
