import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMotion } from '@/shared/hooks/useMotion';
import { useStore } from '@/store';
import { useSessionHistory } from '@/shared/hooks/useSessionHistory';
import { isVolauraConfigured, fetchCharacterState, type CharacterState } from '@/shared/lib/volaura-bridge';
import { supabase } from '@/shared/lib/supabase';
import { AchievementGrid } from './AchievementGrid';
import { BurnoutAlert } from '@/features/home/BurnoutAlert';
import { PageTransition } from '@/shared/ui/PageTransition';
import { XpCard } from './XpCard';
import { WeeklyActivityChart } from './WeeklyActivityChart';
import { StatsGrid } from './StatsGrid';
import { FocusScoreCard } from './FocusScoreCard';
import { EnergyTrendCard } from './EnergyTrendCard';
import { PeakFocusCard } from './PeakFocusCard';
import { FocusStyleCard } from './FocusStyleCard';
import { MochiGarden } from './MochiGarden';
import { VolauraCrystalCard } from './VolauraCrystalCard';
import { CrystalShopSection } from './CrystalShopSection';
import { VolauraAuraBadges } from './VolauraAuraBadges';
import { ShareWeekButton } from './ShareWeekButton';
import { WeeklyInsights } from './WeeklyInsights';
import { FirstWeekCard } from './FirstWeekCard';
import { logEvent } from '@/shared/lib/logger';

export default function ProgressPage() {
  const { shouldAnimate } = useMotion();
  const { t } = useTranslation();
  const { achievements, burnoutScore, subscriptionTier, installDate } = useStore();
  const { energyTrend, weeklyInsight, loading, sessions } = useSessionHistory();

  useEffect(() => { logEvent('progress_page_viewed') }, []);

  // VOLAURA AURA badge integration (Phase 1 — best-effort)
  const [auraState, setAuraState] = useState<CharacterState | null>(null);
  useEffect(() => {
    if (!isVolauraConfigured()) return;
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.access_token || cancelled) return;
      const state = await fetchCharacterState(data.session.access_token);
      if (!cancelled) setAuraState(state);
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  return (
    <PageTransition>
      <div className="min-h-screen px-5 pb-36 pt-10" style={{ backgroundColor: 'var(--color-bg)' }}>
        <motion.div
          initial={shouldAnimate ? { opacity: 0, y: -8 } : false}
          animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
        >
          <h1 className="text-[24px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {t('progress.title')}
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {t('progress.subtitle')}
          </p>
        </motion.div>

        <div className="space-y-4 mt-5">
          {/* Burnout Alert — amber (41-65) or purple (66+) */}
          <BurnoutAlert score={burnoutScore} />

          <XpCard />
          <FirstWeekCard sessionCount={sessions.length} installDate={installDate ?? null} />
          <WeeklyActivityChart loading={loading} />
          <StatsGrid />
          <FocusScoreCard />
          <EnergyTrendCard energyTrend={energyTrend} />
          <PeakFocusCard />
          <FocusStyleCard sessions={sessions} />
          <MochiGarden />

          {/* VOLAURA Crystal Balance */}
          {auraState && <VolauraCrystalCard auraState={auraState} />}

          {/* Crystal Shop — spend path (Constitution: ≥1 sink required before crystals shown) */}
          {auraState && <CrystalShopSection crystalBalance={auraState.crystal_balance} />}

          {/* Pro upgrade CTA — inline on ProgressPage so users in shop context can upgrade without navigation */}
          {subscriptionTier === 'free' && (
            <Link
              to="/settings"
              className="flex items-center justify-between px-4 py-3 rounded-2xl focus-visible:ring-2 focus-visible:ring-[var(--color-teal)] focus-visible:outline-none"
              style={{
                background: 'rgba(78,205,196,0.07)',
                border: '1px solid rgba(78,205,196,0.22)',
              }}
              aria-label={t('progress.upgradeProHint')}
            >
              <div>
                <p className="text-[13px] font-semibold" style={{ color: 'var(--color-teal)' }}>
                  {t('progress.upgradeProHint')}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {t('progress.upgradeProDesc')}
                </p>
              </div>
              <span className="text-[11px] px-2.5 py-1 rounded-lg font-medium shrink-0" style={{ background: 'rgba(78,205,196,0.15)', color: 'var(--color-teal)' }}>
                {t('progress.upgradeProCTA')}
              </span>
            </Link>
          )}

          {/* VOLAURA AURA Badges */}
          {auraState && <VolauraAuraBadges auraState={auraState} />}

          <ShareWeekButton />

          {/* Session Log link */}
          <Link
            to="/history"
            className="flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            style={{
              backgroundColor: 'var(--color-surface-card)',
              border: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-base">📋</span>
              <span className="text-[14px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {t('progress.sessionLog')}
              </span>
            </div>
            <span className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>→</span>
          </Link>

          <WeeklyInsights weeklyInsight={weeklyInsight} />

          {/* Achievements */}
          <AchievementGrid achievements={achievements} />
        </div>
      </div>
    </PageTransition>
  );
}
