import { useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '@/store'
import { supabase } from '@/shared/lib/supabase'
import { toast } from 'sonner'
import { logError } from '@/shared/lib/logger'
import Avatar, { STAGE_NAMES } from '@/features/progress/Avatar'

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
      className="flex items-center justify-between w-full py-3 min-h-[44px]"
    >
      <span className="text-sm" style={{ color: '#E8E8F0' }}>{label}</span>
      <div
        className="w-11 h-6 rounded-full relative transition-colors duration-200"
        style={{ background: checked ? '#7B72FF' : '#252840' }}
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
    email, cognitiveMode, appMode, avatarId, energyLevel,
    setAvatarId, setCognitiveMode, setAppMode, setEnergyLevel, signOut,
    reducedStimulation, setReducedStimulation,
    subscriptionTier, trialEndsAt, setSubscription, isProActive,
  } = useStore()

  const [showTrialActivation, setShowTrialActivation] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteEmail, setDeleteEmail] = useState('')
  const [deleting, setDeleting] = useState(false)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    signOut()
    navigate('/auth', { replace: true })
    toast.success('Signed out')
  }

  // ── GDPR: Export all data ─────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    setExporting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gdpr-export`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        }
      )

      if (!resp.ok) throw new Error(`Export failed: ${resp.status}`)

      const result = await resp.json()
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mindshift-export-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Your data has been downloaded')
    } catch (err) {
      logError('Settings.handleExport', err)
      toast.error("Couldn't download your data. Check your connection and try again.")
    } finally {
      setExporting(false)
    }
  }, [])

  // ── GDPR: Delete all data ─────────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    if (!deleteEmail || deleteEmail.toLowerCase() !== email?.toLowerCase()) {
      toast.error('Email does not match')
      return
    }
    setDeleting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gdpr-delete`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ confirmEmail: deleteEmail }),
        }
      )

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}))
        throw new Error(data.error || `Delete failed: ${resp.status}`)
      }

      toast.success('All your data has been deleted')
      signOut()
      navigate('/auth', { replace: true })
    } catch (err) {
      logError('Settings.handleDelete', err)
      toast.error(err instanceof Error ? err.message : 'Deletion failed')
    } finally {
      setDeleting(false)
    }
  }, [deleteEmail, email, signOut, navigate])

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
    <div className="flex flex-col pb-[calc(112px+env(safe-area-inset-bottom))]">
      {/* Header */}
      <div className="px-5 pt-10 pb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#E8E8F0' }}>
          Settings
        </h1>
        <p className="text-sm mt-1" style={{ color: '#8B8BA7' }}>{email}</p>
      </div>

      {/* ── Subscription ─────────────────────────────────────────────────── */}
      <section className="mx-5 p-4 rounded-2xl mb-4" style={{
        background: proActive
          ? 'linear-gradient(135deg, rgba(123,114,255,0.15) 0%, rgba(78,205,196,0.10) 100%)'
          : '#1E2136',
        border: `1.5px solid ${proActive ? '#7B72FF' : 'rgba(255,255,255,0.06)'}`,
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
                style={{ background: '#7B72FF', color: '#FFFFFF' }}
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
                    className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-200 min-h-[44px]"
                    style={{ background: '#7B72FF', color: '#FFFFFF' }}
                  >
                    Activate trial
                  </button>
                  <button
                    onClick={() => setShowTrialActivation(false)}
                    className="px-4 py-3 rounded-xl text-sm transition-all duration-200 min-h-[44px]"
                    style={{ background: '#252840', color: '#8B8BA7' }}
                  >
                    Maybe later
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Avatar ────────────────────────────────────────────────────────── */}
      <section className="mx-5 p-4 rounded-2xl mb-4" style={{ background: '#1E2136', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-xs font-medium tracking-widest uppercase mb-3" style={{ color: '#8B8BA7' }}>
          Avatar
        </p>
        <div className="flex gap-3 flex-wrap">
          {STAGE_NAMES.map((name, i) => (
            <button
              key={i}
              onClick={() => setAvatarId(i + 1)}
              className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200"
              style={{
                background: avatarId === i + 1 ? 'rgba(123, 114, 255, 0.18)' : '#252840',
                border: `2px solid ${avatarId === i + 1 ? '#7B72FF' : 'transparent'}`,
              }}
              title={name}
              aria-label={`Select ${name} avatar`}
            >
              <Avatar level={i + 1} size={32} />
            </button>
          ))}
        </div>
      </section>

      {/* ── App mode ──────────────────────────────────────────────────────── */}
      <section className="mx-5 p-4 rounded-2xl mb-4" style={{ background: '#1E2136', border: '1px solid rgba(255,255,255,0.06)' }}>
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
              className="text-left px-3 py-3 rounded-xl text-sm transition-all duration-200 min-h-[44px]"
              style={{
                background: appMode === mode ? 'rgba(123, 114, 255, 0.15)' : 'transparent',
                border: `1.5px solid ${appMode === mode ? '#7B72FF' : 'rgba(255,255,255,0.06)'}`,
                color: appMode === mode ? '#E8E8F0' : '#8B8BA7',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* ── Focus Style ───────────────────────────────────────────────────── */}
      <section className="mx-5 p-4 rounded-2xl mb-4" style={{ background: '#1E2136', border: '1px solid rgba(255,255,255,0.06)' }}>
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
              className="flex-1 py-3 rounded-xl text-sm font-medium transition-all duration-200 min-h-[44px]"
              style={{
                background: cognitiveMode === mode ? 'rgba(123, 114, 255, 0.18)' : '#252840',
                border: `1.5px solid ${cognitiveMode === mode ? '#7B72FF' : 'rgba(255,255,255,0.06)'}`,
                color: cognitiveMode === mode ? '#7B72FF' : '#8B8BA7',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* ── Energy Level ──────────────────────────────────────────────────── */}
      <section className="mx-5 p-4 rounded-2xl mb-4" style={{ background: '#1E2136', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-xs font-medium tracking-widest uppercase mb-1" style={{ color: '#8B8BA7' }}>
          Energy Level
        </p>
        <p className="text-xs mb-3" style={{ color: '#8B8BA7' }}>
          How's your energy right now? Affects XP multipliers.
        </p>
        <div className="flex gap-2">
          {([
            { level: 1 as const, label: '😴', title: 'Low' },
            { level: 2 as const, label: '😌', title: 'Calm' },
            { level: 3 as const, label: '🙂', title: 'Good' },
            { level: 4 as const, label: '😄', title: 'High' },
            { level: 5 as const, label: '⚡', title: 'Peak' },
          ]).map(({ level, label, title }) => (
            <button
              key={level}
              onClick={() => {
                setEnergyLevel(level)
                toast.success(`Energy set to ${title}`)
              }}
              className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl text-sm transition-all duration-200 min-h-[48px]"
              aria-label={`Set energy to ${title}`}
              style={{
                background: energyLevel === level ? 'rgba(123, 114, 255, 0.18)' : '#252840',
                border: `1.5px solid ${energyLevel === level ? '#7B72FF' : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              <span className="text-base leading-none">{label}</span>
              <span className="text-[10px] font-medium" style={{ color: energyLevel === level ? '#7B72FF' : '#8B8BA7' }}>
                {title}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Accessibility ─────────────────────────────────────────────────── */}
      <section className="mx-5 p-4 rounded-2xl mb-4" style={{ background: '#1E2136', border: '1px solid rgba(255,255,255,0.06)' }}>
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

      {/* ── Your Data (GDPR) ──────────────────────────────────────────────── */}
      <section className="mx-5 p-4 rounded-2xl mb-4" style={{ background: '#1E2136', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-xs font-medium tracking-widest uppercase mb-3" style={{ color: '#8B8BA7' }}>
          Your Data
        </p>
        <p className="text-xs mb-3 leading-relaxed" style={{ color: '#8B8BA7' }}>
          You own your data. Export everything or delete your account at any time.
        </p>

        {/* Export button */}
        <button
          onClick={() => void handleExport()}
          disabled={exporting}
          className="w-full py-3 rounded-xl text-sm font-medium transition-all duration-200 mb-3"
          style={{
            background: exporting ? '#252840' : 'rgba(78, 205, 196, 0.12)',
            border: '1px solid rgba(255,255,255,0.06)',
            color: exporting ? '#8B8BA7' : '#4ECDC4',
            opacity: exporting ? 0.7 : 1,
          }}
        >
          {exporting ? 'Preparing your data...' : '📦 Download all my data (JSON)'}
        </button>

        {/* Delete account flow */}
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full py-3 rounded-xl text-sm font-medium transition-all duration-200"
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.06)',
              color: '#8B8BA7',
            }}
          >
            Delete my account and all data
          </button>
        ) : (
          <div className="flex flex-col gap-2 p-3 rounded-xl" style={{ background: '#252840' }}>
            <p className="text-xs leading-relaxed" style={{ color: '#E8E8F0' }}>
              This will permanently delete all your tasks, sessions, achievements, and account.
              This action cannot be undone.
            </p>
            <p className="text-xs" style={{ color: '#8B8BA7' }}>
              Type your email to confirm:
            </p>
            <input
              type="email"
              value={deleteEmail}
              onChange={(e) => setDeleteEmail(e.target.value)}
              placeholder={email ?? 'your@email.com'}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{
                background: '#1E2136',
                border: '1px solid rgba(255,255,255,0.06)',
                color: '#E8E8F0',
              }}
              autoComplete="off"
            />
            <div className="flex gap-2 mt-1">
              <button
                onClick={() => void handleDelete()}
                disabled={deleting || deleteEmail.toLowerCase() !== email?.toLowerCase()}
                className="flex-1 py-3 rounded-xl text-sm font-medium transition-all duration-200 min-h-[44px]"
                style={{
                  background: deleteEmail.toLowerCase() === email?.toLowerCase()
                    ? 'rgba(232, 151, 107, 0.15)' : '#252840',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: deleteEmail.toLowerCase() === email?.toLowerCase()
                    ? '#E8976B' : '#8B8BA7',
                  opacity: deleting ? 0.5 : 1,
                }}
              >
                {deleting ? 'Deleting...' : 'Permanently delete'}
              </button>
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteEmail('') }}
                className="px-4 py-3 rounded-xl text-sm transition-all duration-200 min-h-[44px]"
                style={{ background: '#1E2136', border: '1px solid rgba(255,255,255,0.06)', color: '#8B8BA7' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── Danger zone ───────────────────────────────────────────────────── */}
      <div className="px-5 mt-2">
        <button
          onClick={() => void handleSignOut()}
          className="w-full py-3.5 rounded-2xl text-sm font-medium transition-all duration-200"
          style={{ background: '#1E2136', border: '1px solid rgba(255,255,255,0.06)', color: '#E8976B' }}
        >
          Sign out
        </button>
      </div>

      {/* Legal links */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-4">
        <Link
          to="/privacy"
          className="text-xs transition-colors duration-200 hover:underline"
          style={{ color: '#8B8BA7' }}
        >
          Privacy Policy
        </Link>
        <span className="text-xs" style={{ color: '#4A4E5A' }}>·</span>
        <Link
          to="/terms"
          className="text-xs transition-colors duration-200 hover:underline"
          style={{ color: '#8B8BA7' }}
        >
          Terms of Service
        </Link>
        <span className="text-xs" style={{ color: '#4A4E5A' }}>·</span>
        <Link
          to="/cookie-policy"
          className="text-xs transition-colors duration-200 hover:underline"
          style={{ color: '#8B8BA7' }}
        >
          Cookie Policy
        </Link>
      </div>

      {/* Version */}
      <p className="text-center text-xs mt-3 mb-2" style={{ color: '#8B8BA7' }}>
        MindShift v1.0.0 — Built with 💜 for ADHD minds
      </p>
    </div>
  )
}
