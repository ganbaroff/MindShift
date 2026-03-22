import { useMemo } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMotion } from '@/shared/hooks/useMotion';
import { useStore } from '@/store';
import { ENERGY_EMOJI } from '@/shared/lib/constants';
import { useSessionHistory } from '@/shared/hooks/useSessionHistory';
import { nativeShare, canShare } from '@/shared/lib/native';
import { deriveFromSessions } from '@/shared/lib/psychotype';
import { DISCOVERIES } from '@/shared/lib/mochiDiscoveries';
import { AchievementGrid } from './AchievementGrid';
import { BurnoutAlert } from '@/features/home/BurnoutAlert';
import { PageTransition } from '@/shared/ui/PageTransition';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const PSYCHOTYPE_EMOJI = {
  achiever:  '🎯',
  explorer:  '🗺️',
  connector: '💙',
  planner:   '📋',
} as const

export default function ProgressPage() {
  const { shouldAnimate } = useMotion();
  const { t } = useTranslation();
  const {
    xpTotal, completedTotal, achievements, weeklyStats, burnoutScore,
    psychotype, setPsychotype, psychotypeLastDerived, setPsychotypeLastDerived, resetGridToDefaults,
    mochiDiscoveries,
  } = useStore();
  const { energyTrend, weeklyInsight, loading, sessions } = useSessionHistory();

  const xpSafe = xpTotal ?? 0;
  const shareSupported = canShare();

  // O-7: Derive psychotype from usage patterns — max once per 7 days
  const derivationCooldown = (() => {
    if (!psychotypeLastDerived) return false
    const daysSince = (Date.now() - new Date(psychotypeLastDerived).getTime()) / 86_400_000
    return daysSince < 7
  })()
  const derivedPsychotype = useMemo(
    () => derivationCooldown ? null : deriveFromSessions(sessions),
    [sessions, derivationCooldown],
  )
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
  const LEVEL_KEYS = ['seedling', 'sprout', 'grower', 'bloomer', 'flourisher',
    'cultivator', 'nurturer', 'luminary', 'pathfinder', 'sage'] as const
  const levelKey = LEVEL_KEYS[Math.min(level - 1, LEVEL_KEYS.length - 1)]
  const levelName = t(`levels.${levelKey}`)

  // Focus score — composite metric (0-100): sessions + tasks + consistency
  const focusScore = useMemo(() => {
    const sessionScore = Math.min(30, (weeklyStats?.tasksCompleted ?? 0) * 6)
    const consistencyScore = Math.round((weeklyStats?.consistencyScore ?? 0) * 40)
    const taskScore = Math.min(30, completedTotal * 3)
    return Math.min(100, sessionScore + consistencyScore + taskScore)
  }, [weeklyStats, completedTotal])

  const unlockedCount = achievements.filter(a => a.unlockedAt).length

  const weekData = DAY_LABELS.map((day, i) => ({
    day,
    mins: weeklyStats?.dailyMinutes?.[i] ?? 0,
  }));

  const maxMins = Math.max(...weekData.map(d => d.mins), 1);

  // Show last 5 energy_after values as emojis (most recent first)
  const energyTrendEmojis = energyTrend
    .slice(0, 5)
    .map(e => ENERGY_EMOJI[Math.min(4, Math.max(0, e - 1))]);

  return (
    <PageTransition>
    <div className="min-h-screen px-5 pb-36 pt-10" style={{ backgroundColor: 'var(--color-bg)' }}>
      <motion.div initial={shouldAnimate ? { opacity: 0, y: -8 } : false} animate={shouldAnimate ? { opacity: 1, y: 0 } : false}>
        <h1 className="text-[24px] font-bold" style={{ color: 'var(--color-text-primary)' }}>{t('progress.title')}</h1>
        <p className="text-[13px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{t('progress.subtitle')}</p>
      </motion.div>

      <div className="space-y-4 mt-5">
        {/* Burnout Alert — amber (41-65) or purple (66+) */}
        <BurnoutAlert score={burnoutScore} />

        {/* XP Card */}
        <motion.div initial={shouldAnimate ? { opacity: 0, y: 12 } : false} animate={shouldAnimate ? { opacity: 1, y: 0 } : false} className="rounded-2xl p-3" style={{ backgroundColor: 'var(--color-surface-card)' }}>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-[24px] shrink-0" style={{ background: 'linear-gradient(135deg, #7B72FF, #4ECDC4)', padding: 2 }}>
              <div className="w-full h-full rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-surface-card)' }}>🧠</div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {t('progress.level', { level, name: levelName })}
              </p>
              <p className="text-[13px]" style={{ color: 'var(--color-primary)' }}>{xpSafe.toLocaleString()} XP</p>
              <div className="w-full h-1.5 rounded-full mt-1.5 overflow-hidden" style={{ backgroundColor: 'var(--color-surface-raised)' }}>
                <div className="h-full rounded-full gradient-primary-teal" style={{ width: `${(xpInLevel / xpToNext) * 100}%` }} />
              </div>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{t('progress.xpToNext', { current: xpInLevel, next: xpToNext, level: level + 1 })}</p>
            </div>
          </div>
        </motion.div>

        {/* Weekly Bars */}
        <motion.div initial={shouldAnimate ? { opacity: 0, y: 12 } : false} animate={shouldAnimate ? { opacity: 1, y: 0 } : false} transition={shouldAnimate ? { delay: 0.05 } : undefined} className="rounded-2xl p-3" style={{ backgroundColor: 'var(--color-surface-card)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>{t('progress.thisWeek')}</span>
            <span className="text-[13px]" style={{ color: 'var(--color-text-primary)' }}>
              {loading ? t('progress.loading') : t('progress.greatWeek')}
            </span>
          </div>
          <div className="flex items-end justify-between h-20 gap-1.5">
            {weekData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <motion.div
                  initial={shouldAnimate ? { height: 0 } : false}
                  animate={shouldAnimate ? { height: `${Math.max((d.mins / maxMins) * 100, 4)}%` } : { height: `${Math.max((d.mins / maxMins) * 100, 4)}%` }}
                  transition={shouldAnimate ? { delay: 0.1 + i * 0.05, duration: 0.4 } : { duration: 0 }}
                  className="w-full rounded-t gradient-primary-teal"
                  style={{ minHeight: d.mins > 0 ? 4 : 2 }}
                />
                <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{d.day}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] mt-1.5 text-center" style={{ color: 'var(--color-text-muted)' }}>
            {weeklyStats ? t('progress.focusThisWeek', { min: weeklyStats.totalFocusMinutes }) : t('progress.noDataYet')}
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: String(unlockedCount), emoji: '🏆', label: t('progress.achievements') },
            { value: String(completedTotal), emoji: '✅', label: t('progress.tasksDone') },
            { value: String(burnoutScore), emoji: '🧠', label: t('progress.burnoutScoreLabel') },
          ].map((s, i) => (
            <motion.div key={i} initial={shouldAnimate ? { opacity: 0, y: 12 } : false} animate={shouldAnimate ? { opacity: 1, y: 0 } : false} transition={shouldAnimate ? { delay: 0.1 + i * 0.03 } : undefined} className="rounded-2xl p-2.5 flex flex-col items-center" style={{ backgroundColor: 'var(--color-surface-card)' }}>
              <span className="text-[18px] font-bold" style={{ color: 'var(--color-text-primary)' }}>{s.value}</span>
              <span className="text-[14px]">{s.emoji}</span>
              <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{s.label}</span>
            </motion.div>
          ))}
        </div>

        {/* Focus Score — composite health metric */}
        <motion.div
          initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
          animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
          transition={shouldAnimate ? { delay: 0.13 } : undefined}
          className="rounded-2xl p-3"
          style={{ backgroundColor: 'var(--color-surface-card)' }}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>{t('progress.focusHealthScore')}</p>
            <span
              className="text-[12px] font-semibold px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: focusScore >= 70 ? 'rgba(78,205,196,0.15)' : focusScore >= 40 ? 'rgba(123,114,255,0.12)' : 'rgba(245,158,11,0.10)',
                color: focusScore >= 70 ? 'var(--color-teal)' : focusScore >= 40 ? 'var(--color-primary)' : 'var(--color-gold)',
              }}
            >
              {focusScore >= 70 ? t('progress.thriving') : focusScore >= 40 ? t('progress.growing') : t('progress.planting')}
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
            <motion.div
              className="h-full rounded-full"
              initial={shouldAnimate ? { width: 0 } : false}
              animate={{ width: `${focusScore}%` }}
              transition={shouldAnimate ? { duration: 0.9, ease: 'easeOut' } : { duration: 0 }}
              style={{
                background: focusScore >= 70
                  ? 'linear-gradient(90deg, #4ECDC4, #7B72FF)'
                  : 'linear-gradient(90deg, #7B72FF, #9B8EFF)',
              }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{t('progress.scoreComponents')}</p>
            <p className="text-[11px] font-medium" style={{ color: 'var(--color-text-primary)' }}>{focusScore}/100</p>
          </div>
        </motion.div>

        {/* Energy Trends */}
        <motion.div initial={shouldAnimate ? { opacity: 0, y: 12 } : false} animate={shouldAnimate ? { opacity: 1, y: 0 } : false} transition={shouldAnimate ? { delay: 0.15 } : undefined} className="rounded-2xl p-3" style={{ backgroundColor: 'var(--color-surface-card)' }}>
          <p className="text-[11px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-teal)' }}>{t('progress.energyAfterSessions')}</p>
          {energyTrendEmojis.length > 0 ? (
            <>
              <div className="flex gap-1 text-[22px]">
                {energyTrendEmojis.map((emoji, i) => (
                  <span key={i}>{emoji}</span>
                ))}
              </div>
              <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>{t('progress.lastSessions', { count: energyTrendEmojis.length })}</p>
            </>
          ) : (
            <>
              <p className="text-[13px]" style={{ color: 'var(--color-teal)' }}>{t('progress.noEnergyData')}</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{t('progress.completeToTrack')}</p>
            </>
          )}
        </motion.div>

        {/* Peak Focus Window (O-12) — derived from session history */}
        {weeklyStats && weeklyStats.peakFocusTime !== 'Not enough data' && (
          <motion.div
            initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
            animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
            transition={shouldAnimate ? { delay: 0.17 } : undefined}
            className="rounded-2xl p-3"
            style={{ backgroundColor: 'var(--color-surface-card)', border: '1px solid rgba(78,205,196,0.12)' }}
          >
            <p className="text-[11px] uppercase tracking-widest mb-2" style={{ color: 'var(--color-teal)' }}>{t('progress.peakFocusWindow')}</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[20px] font-bold" style={{ color: 'var(--color-teal)' }}>{weeklyStats.peakFocusTime}</p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {t('progress.mostProductiveTime')}
                </p>
              </div>
              {weeklyStats.consistencyScore > 0 && (
                <div className="text-right">
                  <p className="text-[18px] font-bold" style={{ color: 'var(--color-primary)' }}>
                    {Math.round(weeklyStats.consistencyScore * 7)}/7
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{t('progress.daysActive')}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Your Focus Style — O-7 psychotype re-derivation */}
        {psychotype && (
          <motion.div
            initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
            animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
            transition={shouldAnimate ? { delay: 0.19 } : undefined}
            className="rounded-2xl p-3"
            style={{
              backgroundColor: 'var(--color-surface-card)',
              border: psychotypeEvolved
                ? '1px solid rgba(245,158,11,0.30)'
                : '1px solid rgba(123,114,255,0.12)',
            }}
          >
            <p className="text-[11px] uppercase tracking-widest mb-2" style={{ color: 'var(--color-primary)' }}>
              {t('progress.yourFocusStyle')}
            </p>
            <div className="flex items-center gap-3">
              <span className="text-[28px]">{PSYCHOTYPE_EMOJI[psychotype]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  {t(`progress.${psychotype}Label`)}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {t(`progress.${psychotype}Desc`)}
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
                  <p className="text-[12px] font-medium" style={{ color: 'var(--color-gold)' }}>
                    {t('progress.patternsSuggest', { type: t(`progress.${derivedPsychotype}Label`), emoji: PSYCHOTYPE_EMOJI[derivedPsychotype] })}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    {t('progress.basedOnSessions', { count: sessions.length })}
                  </p>
                </div>
                <button
                  onClick={handleAcceptEvolution}
                  className="text-[11px] font-semibold px-3 py-1.5 rounded-xl shrink-0 transition-all duration-150"
                  style={{
                    background: 'rgba(245,158,11,0.15)',
                    border: '1px solid rgba(245,158,11,0.30)',
                    color: 'var(--color-gold)',
                  }}
                >
                  {t('progress.update')}
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* Mochi's Garden — discovered collectibles */}
        {mochiDiscoveries.length > 0 && (
          <motion.div
            initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
            animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
            className="rounded-2xl p-4"
            style={{
              background: 'linear-gradient(135deg, rgba(78,205,196,0.06), rgba(123,114,255,0.04))',
              border: '1px solid rgba(78,205,196,0.12)',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {t('mochi.garden')}
              </h3>
              <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                {t('mochi.found', { count: mochiDiscoveries.length, total: DISCOVERIES.length })}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {DISCOVERIES.map(d => {
                const found = mochiDiscoveries.includes(d.id)
                return (
                  <div
                    key={d.id}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[16px]"
                    style={{
                      background: found
                        ? d.rarity === 'rare' ? 'rgba(245,158,11,0.12)' : 'rgba(78,205,196,0.08)'
                        : 'rgba(37,40,64,0.5)',
                      border: found && d.rarity === 'rare' ? '1px solid rgba(245,158,11,0.3)' : '1px solid transparent',
                      opacity: found ? 1 : 0.3,
                    }}
                    title={found ? `${d.emoji} ${d.name}` : '???'}
                  >
                    {found ? d.emoji : '?'}
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* Share this week — Web Share API / Capacitor Share */}
        {shareSupported && (
          <motion.button
            initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
            animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
            transition={shouldAnimate ? { delay: 0.18 } : undefined}
            whileTap={shouldAnimate ? { scale: 0.97 } : undefined}
            onClick={() => void handleShareWeek()}
            className="w-full py-3 rounded-2xl text-sm font-medium flex items-center justify-center gap-2 transition-all duration-200"
            style={{
              background: 'rgba(123,114,255,0.10)',
              border: '1px solid rgba(123,114,255,0.20)',
              color: '#C8C0FF',
            }}
          >
            <span>🔗</span>
            {t('progress.shareThisWeek')}
          </motion.button>
        )}

        {/* Session Log link */}
        <Link
          to="/history"
          className="flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-200"
          style={{ backgroundColor: 'var(--color-surface-card)', border: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-base">📋</span>
            <span className="text-[14px] font-medium" style={{ color: 'var(--color-text-primary)' }}>{t('progress.sessionLog')}</span>
          </div>
          <span className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>→</span>
        </Link>

        {/* AI Insights */}
        <div>
          <p className="text-[11px] uppercase tracking-widest mb-2" style={{ color: 'var(--color-gold)' }}>{t('progress.weeklyInsight')}</p>
          <div className="space-y-1.5">
            {weeklyInsight.map((insight, i) => (
              <div key={i} className="rounded-xl p-2.5" style={{ backgroundColor: 'var(--color-surface-card)' }}>
                <p className="text-[13px]" style={{ color: 'var(--color-text-primary)' }}>{insight.startsWith('progress.') ? t(insight) : insight}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Achievements */}
        <AchievementGrid achievements={achievements} />
      </div>
    </div>
    </PageTransition>
  );
}
