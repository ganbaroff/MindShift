import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import i18n from '@/i18n';
import { useMotion } from '@/shared/hooks/useMotion';
import { useTranslation } from 'react-i18next';
import EnergyPicker from '@/components/EnergyPicker';
import { useStore } from '@/store';
import type { EnergyLevel, AudioPreset } from '@/types';
import type { UITone } from '@/shared/lib/uiTone';
import { getCrisisResourcesByCountry, countryFromLocale } from '@/shared/lib/crisisHotlines';
import { supabase } from '@/shared/lib/supabase';
import { useAudioEngine } from '@/shared/hooks/useAudioEngine';
import { PageTransition } from '@/shared/ui/PageTransition';

const modeKeys = ['minimal', 'habit', 'system'] as const;
const timerKeys = ['countdown', 'countup', 'surprise'] as const;
const phaseKeys = ['launch', 'maintain', 'recover', 'sandbox'] as const;
const audioPresetKeys: { key: AudioPreset; emoji: string; labelKey: string; descKey: string }[] = [
  { key: 'brown', emoji: '🌊', labelKey: 'settings.soundBrown',  descKey: 'settings.soundBrownDesc' },
  { key: 'pink',  emoji: '🌧️', labelKey: 'settings.soundPink',   descKey: 'settings.soundPinkDesc' },
  { key: 'nature',emoji: '🌿', labelKey: 'settings.soundNature', descKey: 'settings.soundNatureDesc' },
  { key: 'lofi',  emoji: '🎵', labelKey: 'settings.soundLofi',  descKey: 'settings.soundLofiDesc' },
  { key: 'gamma', emoji: '⚡', labelKey: 'settings.soundGamma',  descKey: 'settings.soundGammaDesc' },
];

const modeChipKeys = [
  { emoji: '🎯', labelKey: 'settings.modeMinimal', descKey: 'settings.modeMinimalDesc' },
  { emoji: '🌱', labelKey: 'settings.modeHabit', descKey: 'settings.modeHabitDesc' },
  { emoji: '🗂️', labelKey: 'settings.modeSystem', descKey: 'settings.modeSystemDesc' },
];

const timerChipKeys = [
  { emoji: '⏱', labelKey: 'settings.timerCountdown', descKey: 'settings.timerCountdownDesc' },
  { emoji: '⬆️', labelKey: 'settings.timerCountUp', descKey: 'settings.timerCountUpDesc' },
  { emoji: '🎲', labelKey: 'settings.timerSurprise', descKey: 'settings.timerSurpriseDesc' },
];

const phaseCardKeys = [
  { emoji: '🚀', labelKey: 'settings.phaseLaunch', descKey: 'settings.phaseLaunchDesc' },
  { emoji: '🌱', labelKey: 'settings.phaseMaintain', descKey: 'settings.phaseMaintainDesc' },
  { emoji: '🛋️', labelKey: 'settings.phaseRecover', descKey: 'settings.phaseRecoverDesc' },
  { emoji: '🧪', labelKey: 'settings.phaseSandbox', descKey: 'settings.phaseSandboxDesc' },
];

export default function SettingsPage() {
  const { shouldAnimate } = useMotion();
  const {
    appMode, setAppMode,
    timerStyle, setTimerStyle,
    energyLevel, setEnergyLevel,
    seasonalMode, setSeasonalMode,
    flexiblePauseUntil, setFlexiblePauseUntil,
    reducedStimulation, setReducedStimulation,
    subscriptionTier,
    email,
    userId,
    signOut,
    focusAnchor, setFocusAnchor,
    audioVolume, setVolume: setStoreVolume,
    medicationEnabled, setMedicationEnabled,
    medicationTime, setMedicationTime,
    dailyFocusGoalMin, setDailyFocusGoalMin,
    uiTone, setUITone,
    hapticsEnabled, setHapticsEnabled,
    telegramLinkCode, telegramLinked, generateTelegramCode, setTelegramLinked,
    calendarSyncEnabled, setCalendarSyncEnabled,
    calendarFocusBlocks, setCalendarFocusBlocks,
    userLocale, setUserLocale,
    userTheme, setUserTheme,
    userCountry,
  } = useStore();

  const { play, stop, isPlaying, setVolume: setEngineVolume } = useAudioEngine();
  const [previewPreset, setPreviewPreset] = useState<AudioPreset | null>(null);

  const handlePresetPreview = (preset: AudioPreset) => {
    if (previewPreset === preset && isPlaying) {
      stop();
      setPreviewPreset(null);
    } else {
      void play(preset);
      setPreviewPreset(preset);
    }
  };

  const handleSetFocusAnchor = (preset: AudioPreset) => {
    setFocusAnchor(focusAnchor === preset ? null : preset);
  };

  const mode = modeKeys.indexOf(appMode);
  const timer = timerKeys.indexOf(timerStyle);
  const phase = phaseKeys.indexOf(seasonalMode);
  const navigate = useNavigate();
  const restMode = flexiblePauseUntil ? new Date(flexiblePauseUntil) > new Date() : false;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('ms_guest_id');
    localStorage.setItem('ms_signed_out', '1');
    signOut();
    navigate('/auth');
  };

  const isGuest = !userId || userId.startsWith('guest_')

  // ── Delete account ───────────────────────────────────────────────────────────
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const handleDeleteAccount = async () => {
    if (isGuest) {
      // Guest users — just clear local data
      localStorage.clear()
      signOut()
      navigate('/auth')
      return
    }
    setDeleteLoading(true)
    try {
      const { error } = await supabase.functions.invoke('gdpr-delete', {
        body: { confirmEmail: email },
      })
      if (error) throw error
      await supabase.auth.signOut()
      localStorage.clear()
      signOut()
      toast.success(i18n.t('settings.accountDeleted'))
      navigate('/auth')
    } catch {
      toast.error(i18n.t('settings.deleteError'))
    } finally {
      setDeleteLoading(false)
      setShowDeleteConfirm(false)
    }
  }

  // ── Export data ──────────────────────────────────────────────────────────────
  const [exportLoading, setExportLoading] = useState(false)

  const handleExport = async () => {
    if (isGuest) {
      toast(i18n.t('settings.exportSignedIn'))
      return
    }
    setExportLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('gdpr-export')
      if (error) throw error
      if (!data || typeof data !== 'object') {
        toast.error(i18n.t('settings.exportFailed'))
        return
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mindshift-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(i18n.t('settings.dataExported'))
    } catch {
      toast.error(i18n.t('settings.exportError'))
    } finally {
      setExportLoading(false)
    }
  }

  // Notification permission state
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default')
  useEffect(() => {
    if ('Notification' in window) setNotifPermission(Notification.permission)
  }, [])
  const requestNotifications = async () => {
    if (!('Notification' in window)) return
    const result = await Notification.requestPermission()
    setNotifPermission(result)
  }

  // Telegram link code — copy to clipboard
  const [codeCopied, setCodeCopied] = useState(false)
  const handleCopyCode = useCallback(() => {
    if (!telegramLinkCode) return
    void navigator.clipboard.writeText(`/link ${telegramLinkCode}`)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }, [telegramLinkCode])

  const { t } = useTranslation();
  // crisisResources now handled inline via getCrisisResourcesByCountry

  const planLabel =
    subscriptionTier === 'pro' ? 'MindShift Pro' :
    subscriptionTier === 'pro_trial' ? 'MindShift Pro Trial' :
    'MindShift Free';

  return (
    <PageTransition>
    <div className="min-h-screen px-5 pb-36 pt-10" style={{ backgroundColor: '#0F1120' }}>
      <motion.div initial={shouldAnimate ? { opacity: 0, y: -8 } : false} animate={shouldAnimate ? { opacity: 1, y: 0 } : false}>
        <h1 className="text-[24px] font-bold" style={{ color: '#E8E8F0' }}>{t('settings.title')}</h1>
        <p className="text-[13px] mt-0.5" style={{ color: '#8B8BA7' }}>{email ?? t('settings.notSignedIn')}</p>
      </motion.div>

      <div className="space-y-3 mt-5">
        {/* Plan */}
        <div className="rounded-2xl p-3" style={{ backgroundColor: '#1E2136' }}>
          <p className="text-[15px]" style={{ color: '#E8E8F0' }}>🌱 {planLabel}</p>
        </div>

        {/* Language */}
        <Section label={t('settings.language')}>
          <div className="flex flex-wrap gap-2">
            {[
              { code: null, label: t('common.auto') },
              { code: 'en', label: 'English' },
              { code: 'ru', label: 'Русский' },
              { code: 'az', label: 'Azərbaycanca' },
              { code: 'tr', label: 'Türkçe' },
              { code: 'de', label: 'Deutsch' },
              { code: 'es', label: 'Español' },
            ].map(({ code, label }) => (
              <button
                key={code ?? 'auto'}
                onClick={() => {
                  setUserLocale(code)
                  // Switch i18n language immediately
                  const resolvedLang = code ?? navigator.language.split('-')[0]
                  i18n.changeLanguage(resolvedLang)
                  toast(`Language: ${label}`)
                }}
                className="px-3 py-1.5 rounded-xl text-[13px] font-medium focus-visible:ring-2 focus-visible:ring-[#7B72FF]"
                style={{
                  background: userLocale === code ? 'rgba(123,114,255,0.15)' : '#252840',
                  color: userLocale === code ? '#7B72FF' : '#E8E8F0',
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
            {[
              { key: 'dark' as const, label: t('settings.darkTheme') },
              { key: 'light' as const, label: t('settings.lightTheme') },
              { key: 'system' as const, label: t('settings.systemTheme') },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => { setUserTheme(key); toast(`Theme: ${label}`) }}
                className="flex-1 px-3 py-2 rounded-xl text-[13px] font-medium focus-visible:ring-2 focus-visible:ring-[#7B72FF]"
                style={{
                  background: userTheme === key ? 'rgba(123,114,255,0.15)' : '#252840',
                  color: userTheme === key ? '#7B72FF' : '#E8E8F0',
                  border: userTheme === key ? '1px solid rgba(123,114,255,0.3)' : '1px solid transparent',
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-[11px] mt-1.5" style={{ color: '#8B8BA7' }}>
            {t('settings.lightComingSoon')}
          </p>
        </Section>

        {/* App Mode */}
        <Section label={t('settings.appMode')}>
          <div className="flex gap-1.5">
            {modeChipKeys.map((c, i) => (
              <Chip key={i} selected={mode === i} onClick={() => setAppMode(modeKeys[i])} emoji={c.emoji} label={t(c.labelKey)} />
            ))}
          </div>
          <p className="text-[11px] mt-1.5" style={{ color: '#8B8BA7' }}>{t(modeChipKeys[mode]?.descKey ?? '')}</p>
        </Section>

        {/* Timer */}
        <Section label={t('settings.timer')}>
          <div className="flex gap-1.5">
            {timerChipKeys.map((c, i) => (
              <Chip key={i} selected={timer === i} onClick={() => setTimerStyle(timerKeys[i])} emoji={c.emoji} label={t(c.labelKey)} />
            ))}
          </div>
          <p className="text-[11px] mt-1.5" style={{ color: '#8B8BA7' }}>{t(timerChipKeys[timer]?.descKey ?? '')}</p>
        </Section>

        {/* Sound */}
        <Section label={t('settings.sound')}>
          <p className="text-[11px] mb-2" style={{ color: '#8B8BA7' }}>
            {t('settings.soundPreviewHint')}
          </p>
          <div className="space-y-1.5">
            {audioPresetKeys.map((p) => {
              const isAnchor = focusAnchor === p.key;
              const isPreviewing = previewPreset === p.key && isPlaying;
              const label = t(p.labelKey);
              return (
                <div key={p.key} className="flex items-center gap-2">
                  <motion.button
                    whileTap={shouldAnimate ? { scale: 0.97 } : undefined}
                    onClick={() => handlePresetPreview(p.key)}
                    className="flex-1 flex items-center gap-2 h-10 rounded-xl px-3 text-left"
                    style={{
                      backgroundColor: isPreviewing ? 'rgba(123,114,255,0.15)' : '#252840',
                      borderWidth: isPreviewing ? 1.5 : 1,
                      borderStyle: 'solid',
                      borderColor: isPreviewing ? '#7B72FF' : 'rgba(255,255,255,0.06)',
                    }}
                    aria-label={`${isPreviewing ? 'Stop' : 'Preview'} ${label} noise`}
                    aria-pressed={isPreviewing}
                  >
                    <span className="text-[16px]">{p.emoji}</span>
                    <div className="flex-1">
                      <p className="text-[13px] font-medium leading-none" style={{ color: isPreviewing ? '#7B72FF' : '#E8E8F0' }}>{label}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: '#8B8BA7' }}>{t(p.descKey)}</p>
                    </div>
                    {isPreviewing && <span className="text-[10px]" style={{ color: '#7B72FF' }}>▶ {t('settings.soundPlaying')}</span>}
                  </motion.button>
                  <motion.button
                    whileTap={shouldAnimate ? { scale: 0.9 } : undefined}
                    onClick={() => handleSetFocusAnchor(p.key)}
                    className="w-9 h-10 rounded-xl flex items-center justify-center text-[16px]"
                    style={{
                      backgroundColor: isAnchor ? 'rgba(78,205,196,0.15)' : '#252840',
                      borderWidth: isAnchor ? 1.5 : 1,
                      borderStyle: 'solid',
                      borderColor: isAnchor ? '#4ECDC4' : 'rgba(255,255,255,0.06)',
                    }}
                    aria-label={isAnchor ? `Remove ${label} as focus anchor` : `Set ${label} as focus anchor`}
                    aria-pressed={isAnchor}
                  >
                    🔒
                  </motion.button>
                </div>
              );
            })}
          </div>
          {/* Volume slider */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[11px] uppercase tracking-widest" style={{ color: '#8B8BA7' }}>{t('settings.volume')}</p>
              <p className="text-[11px]" style={{ color: '#8B8BA7' }}>{Math.round(audioVolume * 100)}%</p>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={audioVolume}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setStoreVolume(v);
                setEngineVolume(v);
              }}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
              style={{ accentColor: '#7B72FF' }}
              aria-label="Audio volume"
            />
          </div>
        </Section>

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
                  backgroundColor: phase === i ? 'rgba(123,114,255,0.15)' : '#252840',
                  borderWidth: phase === i ? 1.5 : 1,
                  borderStyle: 'solid',
                  borderColor: phase === i ? '#7B72FF' : 'rgba(255,255,255,0.06)',
                }}
              >
                <span className="text-[18px]">{c.emoji}</span>
                <p className="text-[13px] font-semibold mt-0.5" style={{ color: phase === i ? '#7B72FF' : '#E8E8F0' }}>{t(c.labelKey)}</p>
                <p className="text-[11px]" style={{ color: '#8B8BA7' }}>{t(c.descKey)}</p>
              </motion.button>
            ))}
          </div>
        </Section>

        {/* Toggles */}
        <Section label={t('settings.restMode')}>
          <Toggle
            checked={restMode}
            onChange={(v) => setFlexiblePauseUntil(v ? new Date(Date.now() + 24 * 3600 * 1000).toISOString() : null)}
            label={`🛋️ ${t('settings.pauseForDay')}`}
          />
        </Section>

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
              <p className="text-[14px]" style={{ color: '#4ECDC4' }}>{t('settings.remindersEnabled')}</p>
            </div>
          ) : notifPermission === 'denied' ? (
            <p className="text-[13px]" style={{ color: '#8B8BA7' }}>{t('settings.remindersBlocked')}</p>
          ) : (
            <motion.button
              whileTap={shouldAnimate ? { scale: 0.97 } : undefined}
              onClick={requestNotifications}
              className="w-full h-10 rounded-xl text-[14px] font-medium"
              style={{ backgroundColor: 'rgba(78,205,196,0.12)', color: '#4ECDC4' }}
            >
              🔔 {t('settings.enableReminders')}
            </motion.button>
          )}
        </Section>

        {/* Telegram integration */}
        <Section label={t('settings.telegram')}>
          {telegramLinked ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[16px]">✅</span>
                <p className="text-[14px] font-medium" style={{ color: '#4ECDC4' }}>{t('settings.telegramConnected')}</p>
              </div>
              <p className="text-[12px]" style={{ color: '#8B8BA7' }}>
                {t('settings.telegramSendTo')}{' '}
                <a href="https://t.me/MindShiftBot" target="_blank" rel="noopener noreferrer" style={{ color: '#4ECDC4' }}>
                  @MindShiftBot
                </a>
              </p>
              <motion.button
                whileTap={shouldAnimate ? { scale: 0.97 } : undefined}
                onClick={() => setTelegramLinked(false)}
                className="w-full h-9 rounded-xl text-[13px] font-medium"
                style={{ backgroundColor: 'rgba(139,139,167,0.12)', color: '#8B8BA7' }}
              >
                {t('settings.telegramDisconnect')}
              </motion.button>
            </div>
          ) : telegramLinkCode ? (
            <div className="space-y-2">
              <p className="text-[12px]" style={{ color: '#8B8BA7' }}>
                {t('settings.telegramSendThis')}{' '}
                <a href="https://t.me/MindShiftBot" target="_blank" rel="noopener noreferrer" style={{ color: '#4ECDC4' }}>
                  @MindShiftBot
                </a>
              </p>
              <div className="flex items-center gap-2">
                <div
                  className="flex-1 h-10 rounded-xl flex items-center px-3 font-mono text-[15px] tracking-widest"
                  style={{ backgroundColor: '#252840', color: '#E8E8F0', border: '1px solid rgba(78,205,196,0.2)' }}
                >
                  /link {telegramLinkCode}
                </div>
                <motion.button
                  whileTap={shouldAnimate ? { scale: 0.93 } : undefined}
                  onClick={handleCopyCode}
                  className="h-10 px-3 rounded-xl text-[13px] font-medium"
                  style={{
                    backgroundColor: codeCopied ? 'rgba(78,205,196,0.2)' : 'rgba(78,205,196,0.12)',
                    color: '#4ECDC4',
                  }}
                  aria-label="Copy link code"
                >
                  {codeCopied ? t('settings.telegramCodeCopied') : t('settings.telegramCodeCopy')}
                </motion.button>
              </div>
              <p className="text-[11px]" style={{ color: '#8B8BA7' }}>
                {t('settings.telegramCodeExpires')}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[12px] leading-relaxed" style={{ color: '#8B8BA7' }}>
                {t('settings.telegramDesc')}
              </p>
              <motion.button
                whileTap={shouldAnimate ? { scale: 0.97 } : undefined}
                onClick={generateTelegramCode}
                className="w-full h-10 rounded-xl text-[14px] font-medium"
                style={{ backgroundColor: 'rgba(78,205,196,0.12)', color: '#4ECDC4' }}
                aria-label="Connect Telegram"
              >
                {t('settings.connectTelegram')}
              </motion.button>
              <p className="text-[11px]" style={{ color: '#8B8BA7' }}>
                {t('settings.telegramHowTo')}
              </p>
            </div>
          )}
        </Section>

        {/* Google Calendar integration */}
        <Section label={t('settings.googleCalendar')}>
          {isGuest ? (
            <p className="text-[12px]" style={{ color: '#8B8BA7' }}>
              {t('settings.signInForCalendar')}
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[14px] font-medium" style={{ color: '#E8E8F0' }}>{t('settings.syncToCalendar')}</p>
                  <p className="text-[12px] mt-0.5" style={{ color: '#8B8BA7' }}>
                    {t('settings.calendarDesc')}
                  </p>
                </div>
                <button
                  onClick={async () => {
                    if (!calendarSyncEnabled) {
                      // Flag so App.tsx onAuthStateChange knows this was calendar auth
                      localStorage.setItem('ms_calendar_pending', '1')
                      const { error } = await supabase.auth.signInWithOAuth({
                        provider: 'google',
                        options: {
                          redirectTo: `${window.location.origin}/settings`,
                          queryParams: { prompt: 'consent', access_type: 'offline' },
                          scopes: 'https://www.googleapis.com/auth/calendar.events',
                        },
                      })
                      if (error) {
                        toast.error('Could not connect Google Calendar')
                      }
                      // After redirect + return, onAuthStateChange will store tokens and enable sync
                    } else {
                      setCalendarSyncEnabled(false)
                      toast('Calendar sync disabled', { icon: '📅' })
                    }
                  }}
                  className="w-11 h-6 rounded-full relative transition-colors duration-200"
                  style={{ background: calendarSyncEnabled ? '#4ECDC4' : '#252840' }}
                  aria-pressed={calendarSyncEnabled}
                  aria-label="Toggle Google Calendar sync"
                >
                  <motion.div
                    animate={shouldAnimate ? { x: calendarSyncEnabled ? 20 : 2 } : { x: calendarSyncEnabled ? 20 : 2 }}
                    transition={shouldAnimate ? { type: 'spring', damping: 20, stiffness: 300 } : { duration: 0 }}
                    className="absolute top-1 w-4 h-4 rounded-full bg-white"
                  />
                </button>
              </div>
              {calendarSyncEnabled && (
                <motion.div
                  initial={shouldAnimate ? { opacity: 0, height: 0 } : false}
                  animate={shouldAnimate ? { opacity: 1, height: 'auto' } : false}
                  className="overflow-hidden space-y-2"
                >
                  <Toggle
                    checked={calendarFocusBlocks}
                    onChange={setCalendarFocusBlocks}
                    label={t('settings.focusBlocks')}
                  />
                  <p className="text-[11px]" style={{ color: '#8B8BA7' }}>
                    {t('settings.focusBlocksDesc')}
                  </p>
                </motion.div>
              )}
            </div>
          )}
        </Section>

        {/* Medication peak window — B-12: show optimal focus window around med timing */}
        <Section label={t('settings.medication')}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[14px] font-medium" style={{ color: '#E8E8F0' }}>{t('settings.peakWindow')}</p>
                <p className="text-[12px] mt-0.5" style={{ color: '#8B8BA7' }}>
                  {t('settings.medHighlights')}
                </p>
              </div>
              <button
                onClick={() => setMedicationEnabled(!medicationEnabled)}
                className="w-11 h-6 rounded-full relative transition-colors duration-200"
                style={{ background: medicationEnabled ? '#7B72FF' : '#252840' }}
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
                <p className="text-[12px] mb-2" style={{ color: '#8B8BA7' }}>{t('settings.medWhenTake')}</p>
                <div className="flex gap-2">
                  {([
                    { key: 'morning', labelKey: 'settings.medMorning', subKey: 'settings.medMorningSub', emoji: '🌅' },
                    { key: 'afternoon', labelKey: 'settings.medAfternoon', subKey: 'settings.medAfternoonSub', emoji: '☀️' },
                    { key: 'evening', labelKey: 'settings.medEvening', subKey: 'settings.medEveningSub', emoji: '🌆' },
                  ] as const).map(({ key, labelKey, subKey, emoji }) => {
                    const sel = medicationTime === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setMedicationTime(sel ? null : key)}
                        className="flex-1 flex flex-col items-center gap-0.5 py-2.5 rounded-xl transition-all text-xs"
                        style={{
                          background: sel ? 'rgba(123,114,255,0.18)' : '#252840',
                          border: `1px solid ${sel ? '#7B72FF' : 'rgba(255,255,255,0.06)'}`,
                          color: sel ? '#C8C0FF' : '#8B8BA7',
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

        {/* Setup revisit — O-11: re-run onboarding to update preferences */}
        {/* Daily focus goal — P-1 */}
        <Section label={t('settings.dailyGoal')}>
          <p className="text-[12px] mb-2" style={{ color: '#8B8BA7' }}>
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
                  backgroundColor: dailyFocusGoalMin === min ? 'rgba(123,114,255,0.15)' : '#252840',
                  border: `${dailyFocusGoalMin === min ? 1.5 : 1}px solid ${dailyFocusGoalMin === min ? '#7B72FF' : 'rgba(255,255,255,0.06)'}`,
                  color: dailyFocusGoalMin === min ? '#7B72FF' : '#8B8BA7',
                }}
              >
                {min}m
              </motion.button>
            ))}
          </div>
        </Section>

        {/* Interface Style — age-adaptive UI tone override */}
        <Section label={t('settings.interfaceStyle')}>
          <div className="grid grid-cols-2 gap-1.5">
            {([
              { tone: 'neutral' as UITone, labelKey: 'settings.toneAuto', descKey: 'settings.toneAutoDesc' },
              { tone: 'gen_z' as UITone, labelKey: 'settings.toneDynamic', descKey: 'settings.toneDynamicDesc' },
              { tone: 'millennial' as UITone, labelKey: 'settings.toneBalanced', descKey: 'settings.toneBalancedDesc' },
              { tone: 'gen_x' as UITone, labelKey: 'settings.toneClear', descKey: 'settings.toneClearDesc' },
            ]).map(({ tone, labelKey, descKey }) => {
              const sel = uiTone === tone;
              return (
                <motion.button
                  key={tone}
                  whileTap={shouldAnimate ? { scale: 0.97 } : undefined}
                  onClick={() => setUITone(tone)}
                  className="p-2.5 rounded-xl text-left"
                  style={{
                    backgroundColor: sel ? 'rgba(123,114,255,0.15)' : '#252840',
                    borderWidth: sel ? 1.5 : 1,
                    borderStyle: 'solid',
                    borderColor: sel ? '#7B72FF' : 'rgba(255,255,255,0.06)',
                  }}
                >
                  <p className="text-[13px] font-semibold" style={{ color: sel ? '#7B72FF' : '#E8E8F0' }}>
                    {t(labelKey)}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: '#8B8BA7' }}>
                    {t(descKey)}
                  </p>
                </motion.button>
              );
            })}
          </div>
        </Section>

        <Section label={t('settings.preferences')}>
          <button
            onClick={() => navigate('/onboarding')}
            className="flex items-center gap-3 w-full h-10 rounded-xl px-3 text-[14px] font-medium"
            style={{ backgroundColor: 'rgba(78,205,196,0.08)', color: '#4ECDC4', border: '1px solid rgba(78,205,196,0.15)' }}
          >
            <span>🔄</span>
            <span>{t('settings.rerunSetup')}</span>
          </button>
        </Section>

        {/* Mental Health Resources — localized by country */}
        <Section label={t('settings.mentalHealth')}>
          <div className="space-y-2">
            <p className="text-[13px] leading-relaxed" style={{ color: '#E8E8F0' }}>
              {t('settings.crisisTitle')}
            </p>
            <div
              className="rounded-xl p-3 space-y-2"
              style={{
                backgroundColor: 'rgba(78,205,196,0.06)',
                border: '1px solid rgba(78,205,196,0.15)',
              }}
            >
              {getCrisisResourcesByCountry(userCountry ?? countryFromLocale(navigator.language)).map((r, i) => (
                <div key={i}>
                  <p className="text-[13px] font-medium" style={{ color: '#4ECDC4' }}>
                    {r.name}
                  </p>
                  <p className="text-[12px]" style={{ color: '#8B8BA7' }}>
                    {r.type === 'web' ? (
                      <a href={`https://${r.number}`} target="_blank" rel="noopener noreferrer" style={{ color: '#7B72FF' }}>
                        {r.number}
                      </a>
                    ) : r.number}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Feedback */}
        <Section label={t('settings.feedback')}>
          <a
            href="mailto:ganbarov.y@gmail.com?subject=MindShift%20Feedback&body=Hi%20Yusif%2C%0A%0A"
            className="flex items-center gap-3 w-full h-10 rounded-xl px-3 text-[14px] font-medium focus-visible:ring-2 focus-visible:ring-ms-primary/50 focus-visible:outline-none"
            style={{ backgroundColor: 'rgba(123,114,255,0.1)', color: '#7B72FF' }}
          >
            <span>📬</span>
            <span>{t('settings.sendFeedback')}</span>
          </a>
        </Section>

        {/* Data */}
        <Section label={t('settings.yourData')}>
          <motion.button
            whileTap={shouldAnimate ? { scale: 0.97 } : undefined}
            onClick={handleExport}
            disabled={exportLoading}
            className="w-full h-10 rounded-xl text-[14px] font-medium disabled:opacity-50"
            style={{ backgroundColor: 'rgba(78,205,196,0.12)', color: '#4ECDC4' }}
          >
            {exportLoading ? t('settings.exporting') : `📦 ${t('settings.exportJson')}`}
          </motion.button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-[13px] font-medium w-full text-center mt-2"
            style={{ color: '#F59E0B' }}
          >
            {t('settings.deleteAccount')}
          </button>
        </Section>

        {/* Delete confirmation */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div
              initial={shouldAnimate ? { opacity: 0, height: 0 } : false}
              animate={shouldAnimate ? { opacity: 1, height: 'auto' } : false}
              exit={shouldAnimate ? { opacity: 0, height: 0 } : undefined}
              className="rounded-2xl p-4 space-y-3"
              style={{ backgroundColor: '#1E2136', border: '1px solid rgba(245,158,11,0.3)' }}
            >
              <p className="text-[13px]" style={{ color: '#E8E8F0' }}>
                {t('settings.deleteConfirm')}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 h-9 rounded-xl text-[13px] font-medium"
                  style={{ backgroundColor: 'rgba(139,139,167,0.15)', color: '#8B8BA7' }}
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading}
                  className="flex-1 h-9 rounded-xl text-[13px] font-medium disabled:opacity-50"
                  style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}
                >
                  {deleteLoading ? t('settings.deleting') : t('settings.yesDelete')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button onClick={handleSignOut} className="text-[13px] font-medium w-full text-center py-2" style={{ color: '#E8976B' }}>{t('settings.signOut')}</button>

        <div className="text-center space-y-1 pt-2 pb-6">
          <p className="text-[11px]" style={{ color: '#8B8BA7' }}>
            <button onClick={() => navigate('/privacy')} className="underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-[#7B72FF] rounded" style={{ color: '#8B8BA7' }}>{t('settings.privacy')}</button>
            {' · '}
            <button onClick={() => navigate('/terms')} className="underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-[#7B72FF] rounded" style={{ color: '#8B8BA7' }}>{t('settings.terms')}</button>
            {' · '}
            <button onClick={() => navigate('/cookie-policy')} className="underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-[#7B72FF] rounded" style={{ color: '#8B8BA7' }}>{t('settings.cookies')}</button>
          </p>
          <p className="text-[11px]" style={{ color: '#8B8BA7' }}>MindShift v1.0.0</p>
        </div>
      </div>
    </div>
    </PageTransition>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  const { shouldAnimate } = useMotion();
  return (
    <motion.div initial={shouldAnimate ? { opacity: 0, y: 12 } : false} animate={shouldAnimate ? { opacity: 1, y: 0 } : false} className="rounded-2xl p-3" style={{ backgroundColor: '#1E2136' }}>
      <p className="text-[11px] uppercase tracking-widest mb-2" style={{ color: '#8B8BA7' }}>{label}</p>
      {children}
    </motion.div>
  );
}

function Chip({ selected, onClick, emoji, label }: { selected: boolean; onClick: () => void; emoji: string; label: string }) {
  const { shouldAnimate } = useMotion();
  return (
    <motion.button
      whileTap={shouldAnimate ? { scale: 0.97 } : undefined}
      onClick={onClick}
      className="flex-1 h-9 rounded-full flex items-center justify-center gap-1 text-[13px] font-medium"
      style={{
        backgroundColor: selected ? 'rgba(123,114,255,0.15)' : '#252840',
        borderWidth: selected ? 1.5 : 1,
        borderStyle: 'solid',
        borderColor: selected ? '#7B72FF' : 'rgba(255,255,255,0.06)',
        color: selected ? '#7B72FF' : '#8B8BA7',
      }}
    >
      {emoji} {label}
    </motion.button>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  const { shouldAnimate } = useMotion();
  return (
    <button onClick={() => onChange(!checked)} className="flex items-center justify-between w-full">
      <span className="text-[14px]" style={{ color: '#E8E8F0' }}>{label}</span>
      <div className="w-11 h-6 rounded-full p-0.5 transition-colors" style={{ backgroundColor: checked ? '#7B72FF' : '#252840' }}>
        <motion.div animate={{ x: checked ? 20 : 0 }} transition={shouldAnimate ? undefined : { duration: 0 }} className="w-5 h-5 rounded-full" style={{ backgroundColor: '#E8E8F0' }} />
      </div>
    </button>
  );
}
