import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '@/store'
import { supabase } from '@/shared/lib/supabase'
import { toast } from 'sonner'

const AVATAR_EMOJIS = ['🌱', '🌿', '🍀', '🌸', '🌻', '🌳']

// ── Toggle switch ─────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, label }: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between w-full py-2"
    >
      <span className="text-sm" style={{ color: '#E8E8F0' }}>{label}</span>
      <div
        className="w-11 h-6 rounded-full relative transition-colors duration-200"
        style={{ background: checked ? '#6C63FF' : '#2D3150' }}
      >
        <div
          className="absolute top-0.5 w-5 h-5 rounded-full transition-transform duration-200"
          style={{
            background: checked ? '#FFFFFF' : '#8B8BA7',
            transform: checked ? 'translateX(22px)' : 'translateX(2px)',
          }}
        />
      </div>
    </button>
  )
}

// ── Settings screen ───────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const navigate = useNavigate()
  const {
    email, cognitiveMode, appMode, avatarId,
    setAvatarId, setCognitiveMode, setAppMode, signOut,
    reducedStimulation, setReducedStimulation,
    subscriptionTier, trialEndsAt, setSubscription, isProActive,
  } = useStore()

  const [showTrialActivation, setShowTrialActivation] = useState(false)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    signOut()
    navigate('/auth', { replace: true })
    toast.success('Signed out')
  }

  const handleStartTrial = () => {
    // 30-day free trial — no card, no charges
    const trialEnd = new Date()
    trialEnd.setDate(trialEnd.getDate() + 30)
    setSubscription('pro_trial', trialEnd.toISOString())
    setShowTrialActivation(false)
    toast.success('🎉 Pro trial activated — 30 days free!')
  }

  const proActive = isProActive()
  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86_400_000))
    : 0

  return (
    <div className="flex flex-col pb-28">
      {/* Header */}
      <div className="px-5 pt-10 pb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#E8E8F0' }}>
          Settings ⚙️
        </h1>
        <p className="text-sm mt-1" style={{ color: '#8B8BA7' }}>{email}</p>
      </div>

      {/* ── Subscription ─────────────────────────────────────────────────── */}
      <section className="mx-5 p-4 rounded-2xl mb-4" style={{
        background: proActive
          ? 'linear-gradient(135deg, rgba(108,99,255,0.15) 0%, rgba(78,205,196,0.10) 100%)'
          : '#1A1D2E',
        border: `1.5px solid ${proActive ? '#6C63FF' : '#2D3150'}`,
      }}>
        <p className="text-xs font-medium tracking-widest uppercase mb-3" style={{ color: '#8B8BA7' }}>
          Plan
        </p>
        {proActive ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">✨</span>
              <span className="text-sm font-semibold" style={{ color: '#E8E8F0' }}>
                {subscriptionTier === 'pro_trial' ? 'Pro Trial' : 'Pro'}
              </span>
            </div>
            {subscriptionTier === 'pro_trial' && (
              <p className="text-xs" style={{ color: '#8B8BA7' }}>
                {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} remaining — enjoy all features 🎉
              </p>
            )}
            <div className="flex flex-col gap-1 mt-1">
              <span className="text-xs" style={{ color: '#4ECDC4' }}>✓ Unlimited AI task decomposition</span>
              <span className="text-xs" style={{ color: '#4ECDC4' }}>✓ Full weekly insights</span>
              <span className="text-xs" style={{ color: '#4ECDC4' }}>✓ All audio presets</span>
              <span className="text-xs" style={{ color: '#4ECDC4' }}>✓ Priority recovery support</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🌱</span>
              <span className="text-sm font-semibold" style={{ color: '#E8E8F0' }}>Free</span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: '#8B8BA7' }}>
              Upgrade to Pro for unlimited AI features, weekly insights, and more.
            </p>
            {!showTrialActivation ? (
              <button
                onClick={() => setShowTrialActivation(true)}
                className="w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200"
                style={{ background: '#6C63FF', color: '#FFFFFF' }}
              >
                Start 30-day free trial
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-center" style={{ color: '#E8E8F0' }}>
                  No card required. No charges. Just full access for 30 days.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleStartTrial}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                    style={{ background: '#6C63FF', color: '#FFFFFF' }}
                  >
                    Activate trial
                  </button>
                  <button
                    onClick={() => setShowTrialActivation(false)}
                    className="px-4 py-2.5 rounded-xl text-sm transition-all duration-200"
                    style={{ background: '#252840', color: '#8B8BA7' }}
                  >
                    Later
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Avatar ────────────────────────────────────────────────────────── */}
      <section className="mx-5 p-4 rounded-2xl mb-4" style={{ background: '#1A1D2E', border: '1.5px solid #2D3150' }}>
        <p className="text-xs font-medium tracking-widest uppercase mb-3" style={{ color: '#8B8BA7' }}>
          Avatar
        </p>
        <div className="flex gap-3 flex-wrap">
          {AVATAR_EMOJIS.map((emoji, i) => (
            <button
              key={i}
              onClick={() => setAvatarId(i + 1)}
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-all duration-200"
              style={{
                background: avatarId === i + 1 ? 'rgba(108, 99, 255, 0.18)' : '#252840',
                border: `2px solid ${avatarId === i + 1 ? '#6C63FF' : 'transparent'}`,
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      </section>

      {/* ── App mode ──────────────────────────────────────────────────────── */}
      <section className="mx-5 p-4 rounded-2xl mb-4" style={{ background: '#1A1D2E', border: '1.5px solid #2D3150' }}>
        <p className="text-xs font-medium tracking-widest uppercase mb-3" style={{ color: '#8B8BA7' }}>
          App Mode
        </p>
        <div className="flex flex-col gap-2">
          {([
            { mode: 'minimal', label: '🎯 Minimal — one task at a time' },
            { mode: 'habit',   label: '🌱 Habit — daily routine builder' },
            { mode: 'system',  label: '🗂️ System — full visibility' },
          ] as const).map(({ mode, label }) => (
            <button
              key={mode}
              onClick={() => setAppMode(mode)}
              className="text-left px-3 py-2.5 rounded-xl text-sm transition-all duration-200"
              style={{
                background: appMode === mode ? 'rgba(108, 99, 255, 0.15)' : 'transparent',
                border: `1.5px solid ${appMode === mode ? '#6C63FF' : '#2D3150'}`,
                color: appMode === mode ? '#E8E8F0' : '#8B8BA7',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* ── Focus Style ───────────────────────────────────────────────────── */}
      <section className="mx-5 p-4 rounded-2xl mb-4" style={{ background: '#1A1D2E', border: '1.5px solid #2D3150' }}>
        <p className="text-xs font-medium tracking-widest uppercase mb-3" style={{ color: '#8B8BA7' }}>
          Focus Style
        </p>
        <div className="flex gap-2">
          {([
            { mode: 'focused',  label: '🎯 One at a time' },
            { mode: 'overview', label: '🗺️ See everything' },
          ] as const).map(({ mode, label }) => (
            <button
              key={mode}
              onClick={() => setCognitiveMode(mode)}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
              style={{
                background: cognitiveMode === mode ? 'rgba(108, 99, 255, 0.18)' : '#252840',
                border: `1.5px solid ${cognitiveMode === mode ? '#6C63FF' : '#2D3150'}`,
                color: cognitiveMode === mode ? '#6C63FF' : '#8B8BA7',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* ── Accessibility ─────────────────────────────────────────────────── */}
      <section className="mx-5 p-4 rounded-2xl mb-4" style={{ background: '#1A1D2E', border: '1.5px solid #2D3150' }}>
        <p className="text-xs font-medium tracking-widest uppercase mb-3" style={{ color: '#8B8BA7' }}>
          Accessibility
        </p>
        <Toggle
          checked={reducedStimulation}
          onChange={(val) => {
            setReducedStimulation(val)
            toast.success(val ? 'Reduced stimulation on 🧘' : 'Full animations restored')
          }}
          label="Reduced stimulation mode"
        />
        <p className="text-xs mt-1 mb-3" style={{ color: '#8B8BA7' }}>
          Disables animations, confetti, and reduces visual complexity
        </p>
      </section>

      {/* ── Danger zone ───────────────────────────────────────────────────── */}
      <div className="px-5 mt-2">
        <button
          onClick={() => void handleSignOut()}
          className="w-full py-3.5 rounded-2xl text-sm font-medium transition-all duration-200"
          style={{ background: '#1A1D2E', border: '1.5px solid #2D3150', color: '#E8976B' }}
        >
          Sign out
        </button>
      </div>

      {/* Legal links */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-4">
        <Link
          to="/privacy"
          className="text-xs transition-colors duration-200 hover:underline"
          style={{ color: '#3D405B' }}
        >
          Privacy Policy
        </Link>
        <span className="text-xs" style={{ color: '#2D3150' }}>·</span>
        <Link
          to="/terms"
          className="text-xs transition-colors duration-200 hover:underline"
          style={{ color: '#3D405B' }}
        >
          Terms of Service
        </Link>
        <span className="text-xs" style={{ color: '#2D3150' }}>·</span>
        <Link
          to="/cookie-policy"
          className="text-xs transition-colors duration-200 hover:underline"
          style={{ color: '#3D405B' }}
        >
          Cookie Policy
        </Link>
      </div>

      {/* Version */}
      <p className="text-center text-xs mt-3 mb-2" style={{ color: '#3D405B' }}>
        MindShift v1.0.0 — Built with 💜 for ADHD minds
      </p>
    </div>
  )
}
