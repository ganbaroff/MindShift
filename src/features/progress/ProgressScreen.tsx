import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion } from 'motion/react'
import { useMotion } from '@/shared/hooks/useMotion'
import { useStore } from '@/store'
import { ACHIEVEMENT_DEFINITIONS } from '@/types'
import { supabase } from '@/shared/lib/supabase'
import Avatar, { STAGE_NAMES, stageFromLevel } from './Avatar'
import { BurnoutAlert } from '@/features/home/BurnoutAlert'
import type { FocusSessionRow } from '@/types'

// ── XP helpers ─────────────────────────────────────────────────────────────────

function xpToLevel(xp: number): { level: number; progress: number; needed: number } {
  const level = Math.floor(xp / 100) + 1
  const progress = xp % 100
  const needed = 100
  return { level, progress, needed }
}

// ── 7-day consistency data ──────────────────────────────────────────────────────

function getLast7Days(): { label: string; key: string }[] {
  const days = []
  const now = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    days.push({
      label: d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2),
      key: d.toISOString().slice(0, 10),
    })
  }
  return days
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProgressScreen() {
  const {
    xpTotal, achievements, completedTotal,
    weeklyStats, setWeeklyStats,
    userId, burnoutScore,
  } = useStore()

  const { t, shouldAnimate } = useMotion()
  const { level, progress, needed } = xpToLevel(xpTotal)
  const stage = stageFromLevel(level)
  const avatarName = STAGE_NAMES[stage] ?? 'Seedling'

  const unlocked = achievements.filter(a => a.unlockedAt !== null)
  const [consistencyData, setConsistencyData] = useState<Record<string, number>>({})
  const [insightLoading, setInsightLoading] = useState(false)
  const [insights, setInsights] = useState<string[]>([])

  const last7Days = useMemo(() => getLast7Days(), [])

  // ── Load consistency data (sessions per day for last 7 days) ────────────────
  useEffect(() => {
    if (!userId) return
    const loadConsistency = async () => {
      try {
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        const { data } = await supabase
          .from('focus_sessions')
          .select('started_at, duration_ms')
          .gte('started_at', sevenDaysAgo.toISOString())
          .order('started_at', { ascending: true })

        if (data) {
          const rows = data as Pick<FocusSessionRow, 'started_at' | 'duration_ms'>[]
          const byDay: Record<string, number> = {}
          rows.forEach(row => {
            const day = new Date(row.started_at).toISOString().slice(0, 10)
            const minutes = Math.round((row.duration_ms || 0) / 60_000)
            byDay[day] = (byDay[day] || 0) + minutes
          })
          setConsistencyData(byDay)
        }
      } catch { /* offline fallback — show empty */ }
    }
    loadConsistency()
  }, [userId])

  // ── Derived consistency stats ──────────────────────────────────────────────
  const activeDays = last7Days.filter(d => (consistencyData[d.key] || 0) > 0).length
  const consistencyMessage = useMemo(() => {
    if (activeDays === 7) return 'Perfect week! 🌟'
    if (activeDays >= 5) return 'Great week 💪'
    if (activeDays >= 3) return 'Solid progress 🎯'
    if (activeDays >= 1) return 'You showed up! 🌱'
    return 'Fresh start ahead ✨'
  }, [activeDays])

  // Max minutes in a day (for bar scaling)
  const maxMinutes = Math.max(1, ...last7Days.map(d => consistencyData[d.key] || 0))

  // ── Fetch weekly insight ────────────────────────────────────────────────────
  const fetchInsight = useCallback(async () => {
    if (insightLoading || !userId) return
    setInsightLoading(true)
    try {
      const { data: sessions } = await supabase
        .from('focus_sessions')
        .select('started_at, duration_ms, phase_reached, audio_preset')
        .gte('started_at', new Date(Date.now() - 7 * 86_400_000).toISOString())

      const sessionData = (sessions ?? []) as Pick<FocusSessionRow, 'started_at' | 'duration_ms' | 'phase_reached' | 'audio_preset'>[]
      const totalMinutes = Math.round(sessionData.reduce((sum, r) => sum + (r.duration_ms || 0), 0) / 60_000)

      // Call edge function for AI insights
      const { data } = await supabase.functions.invoke('weekly-insight', {
        body: {
          sessions: sessionData.map(s => ({
            started_at: s.started_at,
            duration_minutes: Math.round((s.duration_ms || 0) / 60_000),
            phase_reached: s.phase_reached,
            audio_preset: s.audio_preset,
          })),
          tasks_completed: unlocked.length,
          total_focus_minutes: totalMinutes,
        },
      })

      if (data?.insights && Array.isArray(data.insights)) {
        setInsights(data.insights)
      } else {
        setInsights(getFallbackInsights(totalMinutes, activeDays))
      }

      setWeeklyStats({
        peakFocusTime: 'afternoon',
        tasksCompleted: unlocked.length,
        mostUsedPreset: null,
        peakEnergyLevel: 3,
        consistencyScore: activeDays / 7,
        totalFocusMinutes: totalMinutes,
      })
    } catch {
      setInsights(getFallbackInsights(0, activeDays))
    }
    setInsightLoading(false)
  }, [insightLoading, userId, unlocked.length, activeDays, setWeeklyStats])

  return (
    <div className="flex flex-col pb-[calc(112px+env(safe-area-inset-bottom))]">
      {/* Header */}
      <div className="px-5 pt-10 pb-6">
        <motion.h1
          initial={shouldAnimate ? { opacity: 0, y: -8 } : {}}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold"
          style={{ color: '#E8E8F0' }}
        >
          Your Garden 🌱
        </motion.h1>
        <motion.p
          initial={shouldAnimate ? { opacity: 0 } : {}}
          animate={{ opacity: 1 }}
          transition={{ ...t(), delay: 0.1 }}
          className="text-sm mt-1"
          style={{ color: '#8B8BA7' }}
        >
          Every step counts, no matter how small.
        </motion.p>
      </div>

      {/* Burnout Alert — Block 2: shows only at caution (41–65) or burnout (66+) */}
      <BurnoutAlert score={burnoutScore} />

      {/* ── Avatar + XP card ──────────────────────────────────────────────────── */}
      <motion.div
        initial={shouldAnimate ? { opacity: 0, y: 10 } : {}}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...t(), delay: 0.15 }}
        className="mx-5 p-5 rounded-2xl mb-4"
        style={{ background: '#1E2136', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-4 mb-4">
          <motion.div
            initial={shouldAnimate ? { scale: 0.8 } : {}}
            animate={{ scale: 1 }}
            transition={{ ...t('expressive'), delay: 0.2 }}
            className="rounded-2xl flex items-center justify-center"
            style={{
              width: 72,
              height: 72,
              background: 'linear-gradient(135deg, rgba(123,114,255,0.12), rgba(78,205,196,0.08))',
              border: '1.5px solid rgba(123,114,255,0.25)',
            }}
          >
            <Avatar level={level} size={56} />
          </motion.div>
          <div className="flex-1">
            <p className="text-lg font-bold" style={{ color: '#E8E8F0' }}>
              Level {level} — {avatarName}
            </p>
            <p className="text-sm" style={{ color: '#8B8BA7' }}>
              {xpTotal} XP total
            </p>
          </div>
        </div>

        {/* XP Progress bar */}
        <div>
          <div className="flex justify-between text-xs mb-1.5" style={{ color: '#8B8BA7' }}>
            <span>{progress} / {needed} XP to Level {level + 1}</span>
            <span>{Math.round((progress / needed) * 100)}%</span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ background: '#252840' }}>
            <motion.div
              initial={shouldAnimate ? { width: 0 } : {}}
              animate={{ width: `${(progress / needed) * 100}%` }}
              transition={{ ...t(), delay: 0.3 }}
              className="h-full rounded-full"
              style={{
                background: 'linear-gradient(90deg, #7B72FF, #4ECDC4)',
              }}
            />
          </div>
        </div>

        {/* Avatar evolution hint */}
        {stage < STAGE_NAMES.length - 1 && (
          <p className="text-xs mt-3 text-center" style={{ color: '#8B8BA7' }}>
            Next level: {STAGE_NAMES[stage + 1]} at Level {stage + 2}
          </p>
        )}
      </motion.div>

      {/* ── 7-Day Consistency Flow ─────────────────────────────────────────────── */}
      <motion.div
        initial={shouldAnimate ? { opacity: 0, y: 10 } : {}}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...t(), delay: 0.25 }}
        className="mx-5 p-5 rounded-2xl mb-4"
        style={{ background: '#1E2136', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-medium tracking-widest uppercase" style={{ color: '#7B72FF' }}>
            This Week
          </p>
          <p className="text-xs font-medium" style={{ color: '#4ECDC4' }}>
            {consistencyMessage}
          </p>
        </div>

        {/* Bar chart — NOT a streak counter */}
        <div className="flex items-end justify-between gap-1.5" style={{ height: 80 }}>
          {last7Days.map((day, i) => {
            const minutes = consistencyData[day.key] || 0
            const height = minutes > 0 ? Math.max(8, (minutes / maxMinutes) * 64) : 4
            const isActive = minutes > 0
            const isToday = i === 6

            return (
              <div key={day.key} className="flex-1 flex flex-col items-center gap-1.5">
                <motion.div
                  initial={shouldAnimate ? { height: 0 } : {}}
                  animate={{ height }}
                  transition={{ ...t(), delay: 0.3 + i * 0.05 }}
                  className="w-full rounded-t-md"
                  style={{
                    background: isActive
                      ? isToday
                        ? 'linear-gradient(180deg, #7B72FF, #4ECDC4)'
                        : 'linear-gradient(180deg, rgba(123,114,255,0.6), rgba(78,205,196,0.4))'
                      : '#252840',
                    minHeight: 4,
                  }}
                  title={`${minutes}m`}
                />
                <span
                  className="text-xs font-medium"
                  style={{ color: isToday ? '#E8E8F0' : '#8B8BA7', fontSize: '10px' }}
                >
                  {day.label}
                </span>
              </div>
            )
          })}
        </div>

        {/* Summary */}
        <p className="text-xs mt-3 text-center" style={{ color: '#8B8BA7' }}>
          {activeDays} of 7 days active
          {weeklyStats?.totalFocusMinutes ? ` · ${weeklyStats.totalFocusMinutes}m total focus` : ''}
        </p>
      </motion.div>

      {/* ── Stats Grid ─────────────────────────────────────────────────────────── */}
      {/* Research #5: Show cumulative effort (task totals), not consecutive streaks */}
      <div className="mx-5 grid grid-cols-3 gap-3 mb-4">
        {[
          { label: 'Achievements', value: `${unlocked.length} unlocked`, emoji: '🏆', color: '#F59E0B' },
          { label: 'Tasks Done', value: completedTotal.toString(), emoji: '✅', color: '#4ECDC4' },
          { label: 'Active Days', value: `${activeDays} days`, emoji: '📅', color: '#7B72FF' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={shouldAnimate ? { opacity: 0, y: 10 } : {}}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...t(), delay: 0.35 + i * 0.05 }}
            className="p-3 rounded-2xl text-center"
            style={{ background: '#1E2136', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <p className="text-xl mb-1">{stat.emoji}</p>
            <p className="text-lg font-bold" style={{ color: stat.color }}>{stat.value}</p>
            <p className="text-xs mt-0.5" style={{ color: '#8B8BA7' }}>{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Weekly Insight ──────────────────────────────────────────────────────── */}
      <motion.div
        initial={shouldAnimate ? { opacity: 0, y: 10 } : {}}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...t(), delay: 0.5 }}
        className="mx-5 p-5 rounded-2xl mb-4"
        style={{ background: '#1E2136', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium tracking-widest uppercase" style={{ color: '#F59E0B' }}>
            ✨ Weekly Insight
          </p>
          {insights.length === 0 && (
            <button
              onClick={fetchInsight}
              disabled={insightLoading}
              className="text-xs px-4 py-2.5 rounded-lg transition-all duration-200 min-h-[44px]"
              style={{
                background: 'rgba(123,114,255,0.15)',
                color: '#7B72FF',
                opacity: insightLoading ? 0.5 : 1,
              }}
            >
              {insightLoading ? 'Loading...' : 'Get insights'}
            </button>
          )}
        </div>

        {insights.length > 0 ? (
          <div className="flex flex-col gap-3">
            {insights.map((insight, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-xl"
                style={{ background: 'rgba(255,230,109,0.05)' }}
              >
                <span className="text-sm mt-0.5">
                  {i === 0 ? '🧠' : i === 1 ? '💡' : '🎯'}
                </span>
                <p className="text-sm leading-relaxed" style={{ color: '#E8E8F0' }}>
                  {insight}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm leading-relaxed" style={{ color: '#8B8BA7' }}>
            Tap "Get insights" to see personalized insights based on your focus patterns this week.
          </p>
        )}
      </motion.div>

      {/* ── Achievements ──────────────────────────────────────────────────────── */}
      <div className="px-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-medium tracking-widest uppercase" style={{ color: '#8B8BA7' }}>
            Achievements
          </h2>
          <span className="text-xs" style={{ color: '#7B72FF' }}>
            {unlocked.length} of {ACHIEVEMENT_DEFINITIONS.length} unlocked
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {ACHIEVEMENT_DEFINITIONS.map((def, i) => {
            const achievement = achievements.find(a => a.key === def.key)
            const isUnlocked = !!achievement?.unlockedAt
            return (
              <motion.div
                key={def.key}
                initial={shouldAnimate ? { opacity: 0, scale: 0.9 } : {}}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ ...t(), delay: 0.6 + i * 0.03 }}
                className="flex flex-col items-center gap-1.5 p-3 rounded-2xl text-center"
                style={{
                  background: isUnlocked ? 'rgba(123, 114, 255, 0.12)' : '#1E2136',
                  border: `1.5px solid ${isUnlocked ? 'rgba(123, 114, 255, 0.4)' : 'rgba(255,255,255,0.06)'}`,
                  opacity: isUnlocked ? 1 : 0.45,
                }}
                title={def.description}
              >
                <span style={{ fontSize: '1.5rem', filter: isUnlocked ? 'none' : 'grayscale(100%)' }}>
                  {def.emoji}
                </span>
                <span className="text-xs font-medium leading-tight" style={{ color: isUnlocked ? '#E8E8F0' : '#8B8BA7' }}>
                  {def.name}
                </span>
                {isUnlocked && achievement?.unlockedAt && (
                  <span className="text-xs" style={{ color: '#7B72FF', fontSize: '9px' }}>
                    {new Date(achievement.unlockedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Fallback insights (no AI) ────────────────────────────────────────────────

function getFallbackInsights(totalMinutes: number, activeDays: number): string[] {
  const insights: string[] = []
  if (totalMinutes > 120) {
    insights.push(`You focused for ${totalMinutes} minutes this week. That's real progress!`)
  } else if (totalMinutes > 0) {
    insights.push(`${totalMinutes} minutes of focus this week. Every minute counts.`)
  } else {
    insights.push("A fresh week ahead. Start with just 5 minutes — that's all it takes.")
  }

  if (activeDays >= 5) {
    insights.push("You showed up consistently. Your brain is building stronger focus pathways.")
  } else if (activeDays >= 2) {
    insights.push("You showed up multiple days. Consistency builds naturally over time.")
  } else {
    insights.push("Try starting each session with your Sound Anchor to build a focus habit.")
  }

  insights.push("Remember: ADHD brains thrive on novelty. Try switching your audio preset next session.")

  return insights
}
