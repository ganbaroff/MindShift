import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import EnergyPicker from '@/components/EnergyPicker';
import { useStore } from '@/store';
import type { EnergyLevel, AudioPreset } from '@/types';
import { supabase } from '@/shared/lib/supabase';
import { useAudioEngine } from '@/shared/hooks/useAudioEngine';

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
  const {
    appMode, setAppMode,
    timerStyle, setTimerStyle,
    energyLevel, setEnergyLevel,
    seasonalMode, setSeasonalMode,
    flexiblePauseUntil, setFlexiblePauseUntil,
    reducedStimulation, setReducedStimulation,
    subscriptionTier,
    email,
    signOut,
    focusAnchor, setFocusAnchor,
    audioVolume, setVolume: setStoreVolume,
    medicationEnabled, setMedicationEnabled,
    medicationTime, setMedicationTime,
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
    signOut();
  };

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

  const planLabel =
    subscriptionTier === 'pro' ? 'MindShift Pro' :
    subscriptionTier === 'pro_trial' ? 'MindShift Pro Trial' :
    'MindShift Free';

  return (
    <div className="min-h-screen px-5 pb-36 pt-10" style={{ backgroundColor: '#0F1120' }}>
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
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
                    whileTap={{ scale: 0.97 }}
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
                    whileTap={{ scale: 0.9 }}
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
                whileTap={{ scale: 0.97 }}
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
          <Toggle checked={reducedStimulation} onChange={setReducedStimulation} label="Reduced stimulation" />
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
              whileTap={{ scale: 0.97 }}
              onClick={requestNotifications}
              className="w-full h-10 rounded-xl text-[14px] font-medium"
              style={{ backgroundColor: 'rgba(78,205,196,0.12)', color: '#4ECDC4' }}
            >
              🔔 Enable reminders
            </motion.button>
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
                  animate={{ x: medicationEnabled ? 20 : 2 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                  className="absolute top-1 w-4 h-4 rounded-full bg-white"
                />
              </button>
            </div>
            {medicationEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
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
          <motion.button whileTap={{ scale: 0.97 }} className="w-full h-10 rounded-xl text-[14px] font-medium" style={{ backgroundColor: 'rgba(78,205,196,0.12)', color: '#4ECDC4' }}>📦 Export (JSON)</motion.button>
          <button className="text-[13px] font-medium w-full text-center mt-2" style={{ color: '#F59E0B' }}>Delete account</button>
        </Section>

        <button onClick={handleSignOut} className="text-[13px] font-medium w-full text-center py-2" style={{ color: '#E8976B' }}>Sign out</button>

        <div className="text-center space-y-1 pt-2 pb-6">
          <p className="text-[11px]" style={{ color: '#8B8BA7' }}>Privacy · Terms · Cookies</p>
          <p className="text-[11px]" style={{ color: '#8B8BA7' }}>MindShift v1.0 — Built with 💜 for ADHD minds</p>
        </div>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-3" style={{ backgroundColor: '#1E2136' }}>
      <p className="text-[11px] uppercase tracking-widest mb-2" style={{ color: '#8B8BA7' }}>{label}</p>
      {children}
    </motion.div>
  );
}

function Chip({ selected, onClick, emoji, label }: { selected: boolean; onClick: () => void; emoji: string; label: string }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
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
  return (
    <button onClick={() => onChange(!checked)} className="flex items-center justify-between w-full">
      <span className="text-[14px]" style={{ color: '#E8E8F0' }}>{label}</span>
      <div className="w-11 h-6 rounded-full p-0.5 transition-colors" style={{ backgroundColor: checked ? '#7B72FF' : '#252840' }}>
        <motion.div animate={{ x: checked ? 20 : 0 }} className="w-5 h-5 rounded-full" style={{ backgroundColor: '#E8E8F0' }} />
      </div>
    </button>
  );
}
