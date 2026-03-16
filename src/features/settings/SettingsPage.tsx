import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import EnergyPicker from '@/components/EnergyPicker';
import { useStore } from '@/store';
import type { EnergyLevel } from '@/types';
import { supabase } from '@/shared/lib/supabase';

const modeKeys = ['minimal', 'habit', 'system'] as const;
const timerKeys = ['countdown', 'countup', 'surprise'] as const;
const phaseKeys = ['launch', 'maintain', 'recover', 'sandbox'] as const;

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
  } = useStore();

  const mode = modeKeys.indexOf(appMode);
  const timer = timerKeys.indexOf(timerStyle);
  const phase = phaseKeys.indexOf(seasonalMode);
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
