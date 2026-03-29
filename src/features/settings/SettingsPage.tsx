import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { useMotion } from '@/shared/hooks/useMotion';
import EnergyPicker from '@/components/EnergyPicker';
import { useStore } from '@/store';
import type { EnergyLevel } from '@/types';
import type { UITone } from '@/shared/lib/uiTone';
import { getCrisisResourcesByCountry, countryFromLocale } from '@/shared/lib/crisisHotlines';
import { PageTransition } from '@/shared/ui/PageTransition';
import { Section, Chip, Toggle } from './SettingsPrimitives';
import { AudioSection } from './AudioSection';
import { IntegrationsSection } from './IntegrationsSection';
import { AccountSection } from './AccountSection';

const modeKeys = ['minimal', 'habit', 'system'] as const;
const timerKeys = ['countdown', 'countup', 'surprise'] as const;
const phaseKeys = ['launch', 'maintain', 'recover', 'sandbox'] as const;

const modeChipKeys = [
  { emoji: '🎯', labelKey: 'settings.modeMinimal', descKey: 'settings.modeMinimalDesc' },
  { emoji: '🌱', labelKey: 'settings.modeHabit',   descKey: 'settings.modeHabitDesc' },
  { emoji: '🗂️', labelKey: 'settings.modeSystem', descKey: 'settings.modeSystemDesc' },
];

const timerChipKeys = [
  { emoji: '⏱',  labelKey: 'settings.timerCountdown', descKey: 'settings.timerCountdownDesc' },
  { emoji: '⬆️', labelKey: 'settings.timerCountUp',   descKey: 'settings.timerCountUpDesc' },
  { emoji: '🎲', labelKey: 'settings.timerSurprise',  descKey: 'settings.timerSurpriseDesc' },
];

const phaseCardKeys = [
  { emoji: '🚀', labelKey: 'settings.phaseLaunch',   descKey: 'settings.phaseLaunchDesc' },
  { emoji: '🌱', labelKey: 'settings.phaseMaintain', descKey: 'settings.phaseMaintainDesc' },
  { emoji: '🛋️', labelKey: 'settings.phaseRecover', descKey: 'settings.phaseRecoverDesc' },
  { emoji: '🧪', labelKey: 'settings.phaseSandbox',  descKey: 'settings.phaseSandboxDesc' },
];

export default function SettingsPage() {
  const { shouldAnimate } = useMotion();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const {
    appMode, setAppMode,
    timerStyle, setTimerStyle,
    energyLevel, setEnergyLevel,
    seasonalMode, setSeasonalMode,
    flexiblePauseUntil, setFlexiblePauseUntil,
    reducedStimulation, setReducedStimulation,
    subscriptionTier,
    email,
    medicationEnabled, setMedicationEnabled,
    medicationTime, setMedicationTime,
    dailyFocusGoalMin, setDailyFocusGoalMin,
    uiTone, setUITone,
    hapticsEnabled, setHapticsEnabled,
    userLocale, setUserLocale,
    userTheme, setUserTheme,
    userCountry,
  } = useStore();

  const mode  = modeKeys.indexOf(appMode);
  const timer = timerKeys.indexOf(timerStyle);
  const phase = phaseKeys.indexOf(seasonalMode);
  const restMode = flexiblePauseUntil ? new Date(flexiblePauseUntil) > new Date() : false;

  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
  useEffect(() => {
    if ('Notification' in window) setNotifPermission(Notification.permission);
  }, []);
  const requestNotifications = async () => {
    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setNotifPermission(result);
  };

  const planLabel =
    subscriptionTier === 'pro'       ? 'MindShift Pro' :
    subscriptionTier === 'pro_trial' ? 'MindShift Pro Trial' :
    'MindShift Free';

  return (
    <PageTransition>
    <div className="min-h-screen px-5 pb-36 pt-10" style={{ backgroundColor: 'var(--color-bg)' }}>
      <motion.div
        initial={shouldAnimate ? { opacity: 0, y: -8 } : false}
        animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
      >
        <h1 className="text-[24px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
          {t('settings.title')}
        </h1>
        <p className="text-[13px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          {email ?? t('settings.notSignedIn')}
        </p>
      </motion.div>

      <div className="space-y-3 mt-5">
        {/* Plan */}
        <div className="rounded-2xl p-3" style={{ backgroundColor: 'var(--color-surface-card)' }}>
          <p className="text-[15px]" style={{ color: 'var(--color-text-primary)' }}>🌱 {planLabel}</p>
        </div>

        {/* Language */}
        <Section label={t('settings.language')}>
          <div className="flex flex-wrap gap-2">
            {[
              { code: null,  label: t('common.auto') },
              { code: 'en',  label: 'English' },
              { code: 'ru',  label: 'Русский' },
              { code: 'az',  label: 'Azərbaycanca' },
              { code: 'tr',  label: 'Türkçe' },
              { code: 'de',  label: 'Deutsch' },
              { code: 'es',  label: 'Español' },
            ].map(({ code, label }) => (
              <button
                key={code ?? 'auto'}
                onClick={() => {
                  setUserLocale(code);
                  i18n.changeLanguage(code ?? navigator.language.split('-')[0]);
                }}
                className="px-3 py-1.5 rounded-xl text-[13px] font-medium focus-visible:ring-2 focus-visible:ring-[#7B72FF]"
                style={{
                  background: userLocale === code ? 'rgba(123,114,255,0.15)' : 'var(--color-surface-raised)',
                  color: userLocale === code ? 'var(--color-primary)' : 'var(--color-text-primary)',
                  border: userLocale === code ? '1px solid rgba(123,114,255,0.3)' : '1px solid transparent',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </Section>

        {/* Theme */}
        <Section label={t('settings.theme')}>
          <div className="flex gap-2">
            {([
              { key: 'dark'   as const, label: t('settings.darkTheme') },
              { key: 'light'  as const, label: t('settings.lightTheme') },
              { key: 'system' as const, label: t('settings.systemTheme') },
            ]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setUserTheme(key)}
                className="flex-1 px-3 py-2 rounded-xl text-[13px] font-medium focus-visible:ring-2 focus-visible:ring-[#7B72FF]"
                style={{
                  background: userTheme === key ? 'var(--color-primary-alpha)' : 'var(--color-surface-raised)',
                  color: userTheme === key ? 'var(--color-primary)' : 'var(--color-text-primary)',
                  border: userTheme === key ? '1px solid var(--color-border-accent)' : '1px solid transparent',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </Section>

        {/* App Mode */}
        <Section label={t('settings.appMode')}>
          <div className="flex gap-1.5">
            {modeChipKeys.map((c, i) => (
              <Chip key={i} selected={mode === i} onClick={() => setAppMode(modeKeys[i])} emoji={c.emoji} label={t(c.labelKey)} />
            ))}
          </div>
          <p className="text-[11px] mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
            {t(modeChipKeys[mode]?.descKey ?? '')}
          </p>
        </Section>

        {/* Timer */}
        <Section label={t('settings.timer')}>
          <div className="flex gap-1.5">
            {timerChipKeys.map((c, i) => (
              <Chip key={i} selected={timer === i} onClick={() => setTimerStyle(timerKeys[i])} emoji={c.emoji} label={t(c.labelKey)} />
            ))}
          </div>
          <p className="text-[11px] mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
            {t(timerChipKeys[timer]?.descKey ?? '')}
          </p>
        </Section>

        {/* Sound (extracted) */}
        <AudioSection />

        {/* Energy */}
        <Section label={t('settings.energy')}>
          <EnergyPicker
            selected={energyLevel - 1}
            onSelect={(i) => setEnergyLevel((i + 1) as EnergyLevel)}
            size={40}
          />
        </Section>

        {/* Phase */}
        <Section label={t('settings.phase')}>
          <div className="grid grid-cols-2 gap-1.5">
            {phaseCardKeys.map((c, i) => (
              <motion.button
                key={i}
                whileTap={shouldAnimate ? { scale: 0.97 } : undefined}
                onClick={() => setSeasonalMode(phaseKeys[i])}
                className="p-2.5 rounded-xl text-left"
                style={{
                  backgroundColor: phase === i ? 'rgba(123,114,255,0.15)' : 'var(--color-surface-raised)',
                  borderWidth: phase === i ? 1.5 : 1,
                  borderStyle: 'solid',
                  borderColor: phase === i ? 'var(--color-primary)' : 'var(--color-border-subtle)',
                }}
              >
                <span className="text-[18px]">{c.emoji}</span>
                <p className="text-[13px] font-semibold mt-0.5" style={{ color: phase === i ? 'var(--color-primary)' : 'var(--color-text-primary)' }}>
                  {t(c.labelKey)}
                </p>
                <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{t(c.descKey)}</p>
              </motion.button>
            ))}
          </div>
        </Section>

        {/* Rest Mode */}
        <Section label={t('settings.restMode')}>
          <Toggle
            checked={restMode}
            onChange={(v) => setFlexiblePauseUntil(v ? new Date(Date.now() + 24 * 3600 * 1000).toISOString() : null)}
            label={`🛋️ ${t('settings.pauseForDay')}`}
          />
        </Section>

        {/* Accessibility */}
        <Section label={t('settings.accessibility')}>
          <div className="space-y-3">
            <Toggle checked={reducedStimulation} onChange={setReducedStimulation} label={t('settings.reducedStimulation')} />
            <Toggle checked={hapticsEnabled} onChange={setHapticsEnabled} label={t('settings.hapticFeedback')} />
          </div>
        </Section>

        {/* Notifications */}
        <Section label={t('settings.reminders')}>
          {notifPermission === 'granted' ? (
            <div className="flex items-center gap-2">
              <span className="text-[20px]">🔔</span>
              <p className="text-[14px]" style={{ color: 'var(--color-teal)' }}>{t('settings.remindersEnabled')}</p>
            </div>
          ) : notifPermission === 'denied' ? (
            <p className="text-[13px]" style={{ color: 'var(--color-text-muted)' }}>{t('settings.remindersBlocked')}</p>
          ) : (
            <motion.button
              whileTap={shouldAnimate ? { scale: 0.97 } : undefined}
              onClick={requestNotifications}
              className="w-full h-10 rounded-xl text-[14px] font-medium"
              style={{ backgroundColor: 'rgba(78,205,196,0.12)', color: 'var(--color-teal)' }}
            >
              🔔 {t('settings.enableReminders')}
            </motion.button>
          )}
        </Section>

        {/* Integrations (Telegram + Calendar — extracted) */}
        <IntegrationsSection />

        {/* Medication */}
        <Section label={t('settings.medication')}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[14px] font-medium" style={{ color: 'var(--color-text-primary)' }}>{t('settings.peakWindow')}</p>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {t('settings.medHighlights')}
                </p>
              </div>
              <button
                onClick={() => setMedicationEnabled(!medicationEnabled)}
                className="w-11 h-6 rounded-full relative transition-colors duration-200"
                style={{ background: medicationEnabled ? 'var(--color-primary)' : 'var(--color-surface-raised)' }}
                aria-pressed={medicationEnabled}
                aria-label="Toggle medication peak indicator"
              >
                <motion.div
                  animate={shouldAnimate ? { x: medicationEnabled ? 20 : 2 } : { x: medicationEnabled ? 20 : 2 }}
                  transition={shouldAnimate ? { type: 'spring', damping: 20, stiffness: 300 } : { duration: 0 }}
                  className="absolute top-1 w-4 h-4 rounded-full bg-white"
                />
              </button>
            </div>
            {medicationEnabled && (
              <motion.div
                initial={shouldAnimate ? { opacity: 0, height: 0 } : false}
                animate={shouldAnimate ? { opacity: 1, height: 'auto' } : false}
                className="overflow-hidden"
              >
                <p className="text-[12px] mb-2" style={{ color: 'var(--color-text-muted)' }}>{t('settings.medWhenTake')}</p>
                <div className="flex gap-2">
                  {([
                    { key: 'morning',   labelKey: 'settings.medMorning',   subKey: 'settings.medMorningSub',   emoji: '🌅' },
                    { key: 'afternoon', labelKey: 'settings.medAfternoon', subKey: 'settings.medAfternoonSub', emoji: '☀️' },
                    { key: 'evening',   labelKey: 'settings.medEvening',   subKey: 'settings.medEveningSub',   emoji: '🌆' },
                  ] as const).map(({ key, labelKey, subKey, emoji }) => {
                    const sel = medicationTime === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setMedicationTime(sel ? null : key)}
                        className="flex-1 flex flex-col items-center gap-0.5 py-2.5 rounded-xl transition-all text-xs"
                        style={{
                          background: sel ? 'rgba(123,114,255,0.18)' : 'var(--color-surface-raised)',
                          border: `1px solid ${sel ? '#7B72FF' : 'rgba(255,255,255,0.06)'}`,
                          color: sel ? 'var(--color-primary-light)' : 'var(--color-text-muted)',
                        }}
                      >
                        <span className="text-base">{emoji}</span>
                        <span className="font-medium">{t(labelKey)}</span>
                        <span style={{ color: '#5A5B72', fontSize: 10 }}>{t(subKey)}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </div>
        </Section>

        {/* Daily Goal */}
        <Section label={t('settings.dailyGoal')}>
          <p className="text-[12px] mb-2" style={{ color: 'var(--color-text-muted)' }}>
            {t('settings.targetMinutes')}
          </p>
          <div className="flex gap-2">
            {([30, 45, 60, 90] as const).map(min => (
              <motion.button
                key={min}
                whileTap={shouldAnimate ? { scale: 0.95 } : undefined}
                onClick={() => setDailyFocusGoalMin(min)}
                className="flex-1 h-9 rounded-full text-[13px] font-medium"
                style={{
                  backgroundColor: dailyFocusGoalMin === min ? 'rgba(123,114,255,0.15)' : 'var(--color-surface-raised)',
                  border: `${dailyFocusGoalMin === min ? 1.5 : 1}px solid ${dailyFocusGoalMin === min ? '#7B72FF' : 'rgba(255,255,255,0.06)'}`,
                  color: dailyFocusGoalMin === min ? 'var(--color-primary)' : 'var(--color-text-muted)',
                }}
              >
                {min}m
              </motion.button>
            ))}
          </div>
        </Section>

        {/* Interface Style */}
        <Section label={t('settings.interfaceStyle')}>
          <div className="grid grid-cols-2 gap-1.5">
            {([
              { tone: 'neutral'    as UITone, labelKey: 'settings.toneAuto',     descKey: 'settings.toneAutoDesc' },
              { tone: 'gen_z'      as UITone, labelKey: 'settings.toneDynamic',  descKey: 'settings.toneDynamicDesc' },
              { tone: 'millennial' as UITone, labelKey: 'settings.toneBalanced', descKey: 'settings.toneBalancedDesc' },
              { tone: 'gen_x'      as UITone, labelKey: 'settings.toneClear',    descKey: 'settings.toneClearDesc' },
            ]).map(({ tone, labelKey, descKey }) => {
              const sel = uiTone === tone;
              return (
                <motion.button
                  key={tone}
                  whileTap={shouldAnimate ? { scale: 0.97 } : undefined}
                  onClick={() => setUITone(tone)}
                  className="p-2.5 rounded-xl text-left"
                  style={{
                    backgroundColor: sel ? 'rgba(123,114,255,0.15)' : 'var(--color-surface-raised)',
                    borderWidth: sel ? 1.5 : 1,
                    borderStyle: 'solid',
                    borderColor: sel ? 'var(--color-primary)' : 'var(--color-border-subtle)',
                  }}
                >
                  <p className="text-[13px] font-semibold" style={{ color: sel ? 'var(--color-primary)' : 'var(--color-text-primary)' }}>
                    {t(labelKey)}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{t(descKey)}</p>
                </motion.button>
              );
            })}
          </div>
        </Section>

        {/* Preferences */}
        <Section label={t('settings.preferences')}>
          <button
            onClick={() => navigate('/onboarding')}
            className="flex items-center gap-3 w-full h-10 rounded-xl px-3 text-[14px] font-medium"
            style={{ backgroundColor: 'rgba(78,205,196,0.08)', color: 'var(--color-teal)', border: '1px solid rgba(78,205,196,0.15)' }}
          >
            <span>🔄</span>
            <span>{t('settings.rerunSetup')}</span>
          </button>
        </Section>

        {/* Mental Health Resources */}
        <Section label={t('settings.mentalHealth')}>
          <div className="space-y-2">
            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
              {t('settings.crisisTitle')}
            </p>
            <div
              className="rounded-xl p-3 space-y-2"
              style={{ backgroundColor: 'rgba(78,205,196,0.06)', border: '1px solid rgba(78,205,196,0.15)' }}
            >
              {getCrisisResourcesByCountry(userCountry ?? countryFromLocale(navigator.language)).map((r, i) => (
                <div key={i}>
                  <p className="text-[13px] font-medium" style={{ color: 'var(--color-teal)' }}>{r.name}</p>
                  <p className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                    {r.type === 'web' ? (
                      <a href={`https://${r.number}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)' }}>
                        {r.number}
                      </a>
                    ) : r.number}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Account (Feedback + Data + Sign out — extracted) */}
        <AccountSection />
      </div>
    </div>
    </PageTransition>
  );
}
