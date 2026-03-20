import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useMotion } from '@/shared/hooks/useMotion';
import { useI18n } from '@/shared/hooks/useI18n';
import EnergyPicker from '@/components/EnergyPicker';
import { useStore } from '@/store';
import type { EnergyLevel, AudioPreset } from '@/types';
import type { UITone } from '@/shared/lib/uiTone';
import { TONE_LABELS, TONE_DESCRIPTIONS } from '@/shared/lib/uiTone';
import { getCrisisResources } from '@/shared/lib/crisisDetection';
import { supabase } from '@/shared/lib/supabase';
import { useAudioEngine } from '@/shared/hooks/useAudioEngine';
import { PageTransition } from '@/shared/ui/PageTransition';

const modeKeys = ['minimal', 'habit', 'system'] as const;
const timerKeys = ['countdown', 'countup', 'surprise'] as const;
const phaseKeys = ['launch', 'maintain', 'recover', 'sandbox'] as const;
const audioPresets: { key: AudioPreset; emoji: string; label: string; desc: string }[] = [
  { key: 'brown', emoji: '🌊', label: 'Brown',  desc: 'Deep rumble — quiets racing thoughts' },
  { key: 'pink',  emoji: '🌧️', label: 'Pink',   desc: 'Steady rain — boosts working memory' },
  { key: 'nature',emoji: '🌿', label: 'Nature', desc: 'Organic swell — parasympathetic calm' },
  { key: 'lofi',  emoji: '🎵', label: 'Lo-fi',  desc: 'Cassette warmth — gentle stimulation' },
  { key: 'gamma', emoji: '⚡', label: 'Gamma',  desc: '40 Hz beat — narrows focus spotlight' },
];

const modeChips = [
  { emoji: '🎯', label: 'Minimal', desc: 'One task at a time' },
  { emoji: '🌱', label: 'Habit', desc: 'Build daily streaks' },
  { emoji: '🗂️', label: 'System', desc: 'Full task management' },
];

const timerChips = [
  { emoji: '⏱', label: 'Countdown', desc: 'Classic timer counting down' },
  { emoji: '⬆️', label: 'Count-up', desc: 'See how long you focus' },
  { emoji: '🎲', label: 'Surprise', desc: 'Random session length' },
];

const phaseCards = [
  { emoji: '🚀', label: 'Launch', desc: 'Up to 5 NOW' },
  { emoji: '🌱', label: 'Maintain', desc: '3 NOW tasks' },
  { emoji: '🛋️', label: 'Recover', desc: 'Max 2 NOW' },
  { emoji: '🧪', label: 'Sandbox', desc: 'No limits' },
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
      toast.success('Account deleted')
      navigate('/auth')
    } catch {
      toast.error('Could not delete account. Try again later.')
    } finally {
      setDeleteLoading(false)
      setShowDeleteConfirm(false)
    }
  }

  // ── Export data ──────────────────────────────────────────────────────────────
  const [exportLoading, setExportLoading] = useState(false)

  const handleExport = async () => {
    if (isGuest) {
      toast('Export is available for signed-in users')
      return
    }
    setExportLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('gdpr-export')
      if (error) throw error
      if (!data || typeof data !== 'object') {
        toast.error('Export failed — please try again')
        return
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mindshift-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Data exported')
    } catch {
      toast.error('Export failed. Try again later.')
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

  const { t, locale } = useI18n();
  const crisisResources = useMemo(() => getCrisisResources(locale), [locale]);

  const planLabel =
    subscriptionTier === 'pro' ? 'MindShift Pro' :
    subscriptionTier === 'pro_trial' ? 'MindShift Pro Trial' :
    'MindShift Free';

  return (
    <PageTransition>
    <div className="min-h-screen px-5 pb-36 pt-10" style={{ backgroundColor: '#0F1120' }}>
      <motion.div initial={shouldAnimate ? { opacity: 0, y: -8 } : false} animate={shouldAnimate ? { opacity: 1, y: 0 } : false}>
        <h1 className="text-[24px] font-bold" style={{ color: '#E8E8F0' }}>Settings</h1>
        <p className="text-[13px] mt-0.5" style={{ color: '#8B8BA7' }}>{email ?? 'Not signed in'}</p>
      </motion.div>

      <div className="space-y-3 mt-5">
        {/* Plan */}
        <div className="rounded-2xl p-3" style={{ backgroundColor: '#1E2136' }}>
          <p className="text-[15px]" style={{ color: '#E8E8F0' }}>🌱 {planLabel}</p>
        </div>

        {/* App Mode */}
        <Section label="App Mode">
          <div className="flex gap-1.5">
            {modeChips.map((c, i) => (
              <Chip key={i} selected={mode === i} onClick={() => setAppMode(modeKeys[i])} emoji={c.emoji} label={c.label} />
            ))}
          </div>
          <p className="text-[11px] mt-1.5" style={{ color: '#8B8BA7' }}>{modeChips[mode]?.desc}</p>
        </Section>

        {/* Timer */}
        <Section label="Timer">
          <div className="flex gap-1.5">
            {timerChips.map((c, i) => (
              <Chip key={i} selected={timer === i} onClick={() => setTimerStyle(timerKeys[i])} emoji={c.emoji} label={c.label} />
            ))}
          </div>
          <p className="text-[11px] mt-1.5" style={{ color: '#8B8BA7' }}>{timerChips[timer]?.desc}</p>
        </Section>

        {/* Sound */}
        <Section label="Sound">
          <p className="text-[11px] mb-2" style={{ color: '#8B8BA7' }}>
            Tap to preview · Press 🔒 to set as focus anchor
          </p>
          <div className="space-y-1.5">
            {audioPresets.map((p) => {
              const isAnchor = focusAnchor === p.key;
              const isPreviewing = previewPreset === p.key && isPlaying;
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
                    aria-label={`${isPreviewing ? 'Stop' : 'Preview'} ${p.label} noise`}
                    aria-pressed={isPreviewing}
                  >
                    <span className="text-[16px]">{p.emoji}</span>
                    <div className="flex-1">
                      <p className="text-[13px] font-medium leading-none" style={{ color: isPreviewing ? '#7B72FF' : '#E8E8F0' }}>{p.label}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: '#8B8BA7' }}>{p.desc}</p>
                    </div>
                    {isPreviewing && <span className="text-[10px]" style={{ color: '#7B72FF' }}>▶ playing</span>}
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
                    aria-label={isAnchor ? `Remove ${p.label} as focus anchor` : `Set ${p.label} as focus anchor`}
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
              <p className="text-[11px] uppercase tracking-widest" style={{ color: '#8B8BA7' }}>Volume</p>
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
        <Section label="Energy">
          <EnergyPicker
            selected={energyLevel - 1}
            onSelect={(i) => setEnergyLevel((i + 1) as EnergyLevel)}
            size={40}
          />
        </Section>

        {/* Phase */}
        <Section label="Phase">
          <div className="grid grid-cols-2 gap-1.5">
            {phaseCards.map((c, i) => (
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
                <p className="text-[13px] font-semibold mt-0.5" style={{ color: phase === i ? '#7B72FF' : '#E8E8F0' }}>{c.label}</p>
                <p className="text-[11px]" style={{ color: '#8B8BA7' }}>{c.desc}</p>
              </motion.button>
            ))}
          </div>
        </Section>

        {/* Toggles */}
        <Section label="Rest Mode">
          <Toggle
            checked={restMode}
            onChange={(v) => setFlexiblePauseUntil(v ? new Date(Date.now() + 24 * 3600 * 1000).toISOString() : null)}
            label="🛋️ Pause for 24h"
          />
        </Section>

        <Section label="Accessibility">
          <div className="space-y-3">
            <Toggle checked={reducedStimulation} onChange={setReducedStimulation} label="Reduced stimulation" />
            <Toggle checked={hapticsEnabled} onChange={setHapticsEnabled} label="Haptic feedback" />
          </div>
        </Section>

        {/* Notifications */}
        <Section label="Reminders">
          {notifPermission === 'granted' ? (
            <div className="flex items-center gap-2">
              <span className="text-[20px]">🔔</span>
              <p className="text-[14px]" style={{ color: '#4ECDC4' }}>Reminders enabled</p>
            </div>
          ) : notifPermission === 'denied' ? (
            <p className="text-[13px]" style={{ color: '#8B8BA7' }}>Blocked by browser — enable in browser settings to get due-date nudges.</p>
          ) : (
            <motion.button
              whileTap={shouldAnimate ? { scale: 0.97 } : undefined}
              onClick={requestNotifications}
              className="w-full h-10 rounded-xl text-[14px] font-medium"
              style={{ backgroundColor: 'rgba(78,205,196,0.12)', color: '#4ECDC4' }}
            >
              🔔 Enable reminders
            </motion.button>
          )}
        </Section>

        {/* Telegram integration */}
        <Section label="Telegram">
          {telegramLinked ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[16px]">✅</span>
                <p className="text-[14px] font-medium" style={{ color: '#4ECDC4' }}>Telegram connected</p>
              </div>
              <p className="text-[12px]" style={{ color: '#8B8BA7' }}>
                Send tasks and notes to{' '}
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
                Disconnect
              </motion.button>
            </div>
          ) : telegramLinkCode ? (
            <div className="space-y-2">
              <p className="text-[12px]" style={{ color: '#8B8BA7' }}>
                Send this to{' '}
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
                  {codeCopied ? 'Copied' : 'Copy'}
                </motion.button>
              </div>
              <p className="text-[11px]" style={{ color: '#8B8BA7' }}>
                The code expires in 10 minutes
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[12px]" style={{ color: '#8B8BA7' }}>
                Add tasks and notes by messaging our Telegram bot
              </p>
              <motion.button
                whileTap={shouldAnimate ? { scale: 0.97 } : undefined}
                onClick={generateTelegramCode}
                className="w-full h-10 rounded-xl text-[14px] font-medium"
                style={{ backgroundColor: 'rgba(78,205,196,0.12)', color: '#4ECDC4' }}
                aria-label="Connect Telegram"
              >
                Connect Telegram
              </motion.button>
            </div>
          )}
        </Section>

        {/* Google Calendar integration */}
        <Section label="Google Calendar">
          {isGuest ? (
            <p className="text-[12px]" style={{ color: '#8B8BA7' }}>
              Sign in with Google to sync meetings and reminders
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[14px] font-medium" style={{ color: '#E8E8F0' }}>Sync to calendar</p>
                  <p className="text-[12px] mt-0.5" style={{ color: '#8B8BA7' }}>
                    Meetings and reminders with dates appear in Google Calendar
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
                    label="Add focus sessions as time blocks"
                  />
                  <p className="text-[11px]" style={{ color: '#8B8BA7' }}>
                    Focus sessions will show as teal blocks in your calendar
                  </p>
                </motion.div>
              )}
            </div>
          )}
        </Section>

        {/* Medication peak window — B-12: show optimal focus window around med timing */}
        <Section label="Medication">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[14px] font-medium" style={{ color: '#E8E8F0' }}>Peak window indicator</p>
                <p className="text-[12px] mt-0.5" style={{ color: '#8B8BA7' }}>
                  Highlights your optimal focus window on the Focus screen
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
                <p className="text-[12px] mb-2" style={{ color: '#8B8BA7' }}>When do you take it?</p>
                <div className="flex gap-2">
                  {([
                    { key: 'morning', label: 'Morning', sub: '7–9am', emoji: '🌅' },
                    { key: 'afternoon', label: 'Afternoon', sub: '12–2pm', emoji: '☀️' },
                    { key: 'evening', label: 'Evening', sub: '4–6pm', emoji: '🌆' },
                  ] as const).map(({ key, label, sub, emoji }) => {
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
                        <span className="font-medium">{label}</span>
                        <span style={{ color: '#5A5B72', fontSize: 10 }}>{sub}</span>
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
        <Section label="Daily Focus Goal">
          <p className="text-[12px] mb-2" style={{ color: '#8B8BA7' }}>
            Target minutes of focused work per day
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
        <Section label="Interface Style">
          <div className="grid grid-cols-2 gap-1.5">
            {(['neutral', 'gen_z', 'millennial', 'gen_x'] as UITone[]).map(tone => {
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
                    {TONE_LABELS[tone]}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: '#8B8BA7' }}>
                    {TONE_DESCRIPTIONS[tone]}
                  </p>
                </motion.button>
              );
            })}
          </div>
        </Section>

        <Section label="Preferences">
          <button
            onClick={() => navigate('/onboarding')}
            className="flex items-center gap-3 w-full h-10 rounded-xl px-3 text-[14px] font-medium"
            style={{ backgroundColor: 'rgba(78,205,196,0.08)', color: '#4ECDC4', border: '1px solid rgba(78,205,196,0.15)' }}
          >
            <span>🔄</span>
            <span>Re-run setup wizard</span>
          </button>
        </Section>

        {/* Mental Health Resources — always visible */}
        <Section label="Mental Health">
          <div className="space-y-2">
            <p className="text-[13px] leading-relaxed" style={{ color: '#E8E8F0' }}>
              {t('crisis.settings.title')}
            </p>
            <div
              className="rounded-xl p-3 space-y-1.5"
              style={{
                backgroundColor: 'rgba(78,205,196,0.06)',
                border: '1px solid rgba(78,205,196,0.15)',
              }}
            >
              <p className="text-[13px] font-medium" style={{ color: '#4ECDC4' }}>
                {crisisResources.primary}
              </p>
              <p className="text-[12px]" style={{ color: '#8B8BA7' }}>
                {crisisResources.international}
              </p>
            </div>
          </div>
        </Section>

        {/* Feedback */}
        <Section label="Feedback">
          <a
            href="mailto:ganbarov.y@gmail.com?subject=MindShift%20Feedback&body=Hi%20Yusif%2C%0A%0A"
            className="flex items-center gap-3 w-full h-10 rounded-xl px-3 text-[14px] font-medium focus-visible:ring-2 focus-visible:ring-ms-primary/50 focus-visible:outline-none"
            style={{ backgroundColor: 'rgba(123,114,255,0.1)', color: '#7B72FF' }}
          >
            <span>📬</span>
            <span>Send feedback</span>
          </a>
        </Section>

        {/* Data */}
        <Section label="Your Data">
          <motion.button
            whileTap={shouldAnimate ? { scale: 0.97 } : undefined}
            onClick={handleExport}
            disabled={exportLoading}
            className="w-full h-10 rounded-xl text-[14px] font-medium disabled:opacity-50"
            style={{ backgroundColor: 'rgba(78,205,196,0.12)', color: '#4ECDC4' }}
          >
            {exportLoading ? 'Exporting...' : '📦 Export (JSON)'}
          </motion.button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-[13px] font-medium w-full text-center mt-2"
            style={{ color: '#F59E0B' }}
          >
            Delete account
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
                This will permanently delete your account and all data. This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 h-9 rounded-xl text-[13px] font-medium"
                  style={{ backgroundColor: 'rgba(139,139,167,0.15)', color: '#8B8BA7' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading}
                  className="flex-1 h-9 rounded-xl text-[13px] font-medium disabled:opacity-50"
                  style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}
                >
                  {deleteLoading ? 'Deleting...' : 'Yes, delete'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button onClick={handleSignOut} className="text-[13px] font-medium w-full text-center py-2" style={{ color: '#E8976B' }}>Sign out</button>

        <div className="text-center space-y-1 pt-2 pb-6">
          <p className="text-[11px]" style={{ color: '#8B8BA7' }}>
            <button onClick={() => navigate('/privacy')} className="underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-[#7B72FF] rounded" style={{ color: '#8B8BA7' }}>Privacy</button>
            {' · '}
            <button onClick={() => navigate('/terms')} className="underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-[#7B72FF] rounded" style={{ color: '#8B8BA7' }}>Terms</button>
            {' · '}
            <button onClick={() => navigate('/cookie-policy')} className="underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-[#7B72FF] rounded" style={{ color: '#8B8BA7' }}>Cookies</button>
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
