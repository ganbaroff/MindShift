import { useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '@/store'
import { supabase } from '@/shared/lib/supabase'
import { toast } from 'sonner'
import { logError } from '@/shared/lib/logger'
import Avatar, { STAGE_NAMES } from '@/features/progress/Avatar'
import { ENERGY_LABELS, ENERGY_EMOJI } from '@/shared/lib/constants'

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
      <span className="text-sm" style={{ color: 'var(--color-text)' }}>{label}</span>
      <div
        className="w-11 h-6 rounded-full relative transition-colors duration-200"
        style={{ background: checked ? 'var(--color-primary)' : 'var(--color-elevated)' }}
      >
        <div
          className="absolute top-0.5 w-5 h-5 rounded-full transition-transform duration-200"
          style={{
            background: checked ? '#FFFFFF' : 'var(--color-muted)',
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
    email, appMode, avatarId, energyLevel,
    setAvatarId, setAppMode, setEnergyLevel, signOut,
    reducedStimulation, setReducedStimulation,
    // Timer + seasonal
    timerStyle, setTimerStyle,
    seasonalMode, setSeasonalMode,
    flexiblePauseUntil, setFlexiblePauseUntil,
  } = useStore()

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

  return (
    <div className="flex flex-col pb-[calc(112px+env(safe-area-inset-bottom))]">
      {/* Header */}
      <div className="px-5 pt-10 pb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
          Settings
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>{email}</p>
      </div>

      {/* ── Plan ──────────────────────────────────────────────────────────── */}
      {/* TODO: Restore full ProBanner when Stripe integration is ready (see CLAUDE.md Known Gaps) */}
      <section className="mx-5 p-4 rounded-2xl mb-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border-subtle)' }}>
        <p className="text-xs font-medium tracking-widest uppercase mb-3" style={{ color: 'var(--color-muted)' }}>
          Plan
        </p>
        <div className="flex items-center gap-2">
          <span className="text-lg">🌱</span>
          <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>MindShift Free</span>
        </div>
      </section>

      {/* ── Avatar ────────────────────────────────────────────────────────── */}
      <section className="mx-5 p-4 rounded-2xl mb-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border-subtle)' }}>
        <p className="text-xs font-medium tracking-widest uppercase mb-3" style={{ color: 'var(--color-muted)' }}>
          Avatar
        </p>
        <div className="flex gap-3 flex-wrap">
          {STAGE_NAMES.map((name, i) => (
            <button
              key={i}
              onClick={() => setAvatarId(i + 1)}
              className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200"
              style={{
                background: avatarId === i + 1 ? 'var(--color-primary-alpha)' : 'var(--color-elevated)',
                border: `2px solid ${avatarId === i + 1 ? 'var(--color-primary)' : 'transparent'}`,
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
      <section className="mx-5 p-4 rounded-2xl mb-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border-subtle)' }}>
        <p className="text-xs font-medium tracking-widest uppercase mb-3" style={{ color: 'var(--color-muted)' }}>
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
                background: appMode === mode ? 'var(--color-primary-alpha)' : 'transparent',
                border: `1.5px solid ${appMode === mode ? 'var(--color-primary)' : 'var(--color-border-subtle)'}`,
                color: appMode === mode ? 'var(--color-text)' : 'var(--color-muted)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* Focus Style section removed — App Mode covers the same spectrum */}

      {/* ── Focus Timer Style ──────────────────────────────────────────────── */}
      <section className="mx-5 p-4 rounded-2xl mb-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border-subtle)' }}>
        <p className="text-xs font-medium tracking-widest uppercase mb-3" style={{ color: 'var(--color-muted)' }}>
          Focus Timer Style
        </p>
        <div className="flex gap-2">
          {([
            { style: 'countdown' as const, label: 'Countdown' },
            { style: 'countup' as const, label: 'Count-up' },
            { style: 'surprise' as const, label: 'Surprise' },
          ]).map(({ style, label }) => (
            <button
              key={style}
              onClick={() => setTimerStyle(style)}
              className="flex-1 py-3 rounded-xl text-sm font-medium transition-all duration-200 min-h-[44px]"
              style={{
                background: timerStyle === style ? 'var(--color-primary-alpha)' : 'var(--color-elevated)',
                border: `1.5px solid ${timerStyle === style ? 'var(--color-primary)' : 'var(--color-border-subtle)'}`,
                color: timerStyle === style ? 'var(--color-primary)' : 'var(--color-muted)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mt-3">
          Count-up shows time earned — helps if countdowns feel pressuring.
        </p>
      </section>

      {/* ── Energy Level ──────────────────────────────────────────────────── */}
      <section className="mx-5 p-4 rounded-2xl mb-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border-subtle)' }}>
        <p className="text-xs font-medium tracking-widest uppercase mb-1" style={{ color: 'var(--color-muted)' }}>
          Energy Level
        </p>
        <p className="text-xs mb-3" style={{ color: 'var(--color-muted)' }}>
          How's your energy right now? Affects XP multipliers.
        </p>
        <div className="flex gap-2">
          {([
            { level: 1 as const, label: ENERGY_EMOJI[0], title: ENERGY_LABELS[0] },
            { level: 2 as const, label: ENERGY_EMOJI[1], title: ENERGY_LABELS[1] },
            { level: 3 as const, label: ENERGY_EMOJI[2], title: ENERGY_LABELS[2] },
            { level: 4 as const, label: ENERGY_EMOJI[3], title: ENERGY_LABELS[3] },
            { level: 5 as const, label: ENERGY_EMOJI[4], title: ENERGY_LABELS[4] },
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
                background: energyLevel === level ? 'var(--color-primary-alpha)' : 'var(--color-elevated)',
                border: `1.5px solid ${energyLevel === level ? 'var(--color-primary)' : 'var(--color-border-subtle)'}`,
              }}
            >
              <span className="text-base leading-none">{label}</span>
              <span className="text-[10px] font-medium" style={{ color: energyLevel === level ? 'var(--color-primary)' : 'var(--color-muted)' }}>
                {title}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Rest Mode ─────────────────────────────────────────────────────── */}
      {/* TODO Sprint B: add sleep, chronotype, medication health signals once wired to recommendations */}
      <section className="mx-5 p-4 rounded-2xl mb-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border-subtle)' }}>
        <p className="text-xs font-medium tracking-widest uppercase mb-1" style={{ color: 'var(--color-muted)' }}>
          Rest Mode
        </p>
        <Toggle
          checked={!!flexiblePauseUntil && new Date(flexiblePauseUntil) > new Date()}
          onChange={(val) => {
            if (val) {
              const until = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
              setFlexiblePauseUntil(until)
              toast.success('🛋️ Rest mode on — no pressure for 24 hours')
            } else {
              setFlexiblePauseUntil(null)
              toast.success('Rest mode off — welcome back 🌿')
            }
          }}
          label="🛋️ Pause focus pressure for 24 hours"
        />
        <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
          Turns off session reminders and soft-stop toasts. You can still focus.
        </p>
      </section>

      {/* ── Your Current Phase — Block 6c ─────────────────────────────────── */}
      {/* Seasonal mode: shapes NOW-pool limits + difficulty defaults, not aesthetics */}
      <section className="mx-5 p-4 rounded-2xl mb-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border-subtle)' }}>
        <p className="text-xs font-medium tracking-widest uppercase mb-1" style={{ color: 'var(--color-muted)' }}>
          Your Current Phase
        </p>
        <p className="text-xs mb-4 leading-relaxed" style={{ color: 'var(--color-muted)' }}>
          Adjusts task limits and defaults to match where you are in life right now.
        </p>

        {/* 2×2 grid */}
        <div className="grid grid-cols-2 gap-2">
          {([
            {
              mode: 'launch'   as const,
              emoji: '🚀',
              label: 'Launch',
              desc:  'Ambitious goals — up to 5 NOW tasks',
            },
            {
              mode: 'maintain' as const,
              emoji: '🌱',
              label: 'Maintain',
              desc:  'Steady pace — 3 NOW tasks default',
            },
            {
              mode: 'recover'  as const,
              emoji: '🛋️',
              label: 'Recover',
              desc:  'Minimal pressure — max 2 NOW tasks',
            },
            {
              mode: 'sandbox'  as const,
              emoji: '🎮',
              label: 'Sandbox',
              desc:  'Open mode — no pool constraints',
            },
          ]).map(({ mode, emoji, label, desc }) => {
            const isActive = seasonalMode === mode
            return (
              <button
                key={mode}
                onClick={() => {
                  setSeasonalMode(mode)
                  toast.success(`Phase set to ${label}`)
                }}
                className="flex flex-col items-start p-3 rounded-xl text-left transition-all duration-200 min-h-[88px]"
                style={{
                  background: isActive ? 'var(--color-primary-alpha)' : 'var(--color-elevated)',
                  border: `1.5px solid ${isActive ? 'var(--color-primary)' : 'var(--color-border-subtle)'}`,
                }}
              >
                <span className="text-xl mb-1">{emoji}</span>
                <p className="text-xs font-semibold mb-0.5" style={{ color: isActive ? 'var(--color-primary)' : 'var(--color-text)' }}>
                  {label}
                </p>
                <p className="text-[10px] leading-tight" style={{ color: 'var(--color-muted)' }}>
                  {desc}
                </p>
              </button>
            )
          })}
        </div>
      </section>

      {/* ── Accessibility ─────────────────────────────────────────────────── */}
      <section className="mx-5 p-4 rounded-2xl mb-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border-subtle)' }}>
        <p className="text-xs font-medium tracking-widest uppercase mb-3" style={{ color: 'var(--color-muted)' }}>
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
        <p className="text-xs mt-1 mb-3" style={{ color: 'var(--color-muted)' }}>
          Disables animations, confetti, and reduces visual complexity
        </p>
      </section>

      {/* ── Your Data (GDPR) ──────────────────────────────────────────────── */}
      <section className="mx-5 p-4 rounded-2xl mb-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border-subtle)' }}>
        <p className="text-xs font-medium tracking-widest uppercase mb-3" style={{ color: 'var(--color-muted)' }}>
          Your Data
        </p>
        <p className="text-xs mb-3 leading-relaxed" style={{ color: 'var(--color-muted)' }}>
          You own your data. Export everything or delete your account at any time.
        </p>

        {/* Export button */}
        <button
          onClick={() => void handleExport()}
          disabled={exporting}
          className="w-full py-3 rounded-xl text-sm font-medium transition-all duration-200 mb-3"
          style={{
            background: exporting ? 'var(--color-elevated)' : 'var(--color-teal-alpha)',
            border: '1px solid var(--color-border-subtle)',
            color: exporting ? 'var(--color-muted)' : 'var(--color-secondary)',
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
              border: '1px solid var(--color-border-subtle)',
              color: 'var(--color-muted)',
            }}
          >
            Delete my account and all data
          </button>
        ) : (
          <div className="flex flex-col gap-2 p-3 rounded-xl" style={{ background: 'var(--color-elevated)' }}>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text)' }}>
              This will permanently delete all your tasks, sessions, achievements, and account.
              This action cannot be undone.
            </p>
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
              Type your email to confirm:
            </p>
            <input
              type="email"
              value={deleteEmail}
              onChange={(e) => setDeleteEmail(e.target.value)}
              placeholder={email ?? 'your@email.com'}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{
                background: 'var(--color-card)',
                border: '1px solid var(--color-border-subtle)',
                color: 'var(--color-text)',
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
                    ? 'rgba(232, 151, 107, 0.15)' : 'var(--color-elevated)',
                  border: '1px solid var(--color-border-subtle)',
                  color: deleteEmail.toLowerCase() === email?.toLowerCase()
                    ? '#E8976B' : 'var(--color-muted)',
                  opacity: deleting ? 0.5 : 1,
                }}
              >
                {deleting ? 'Deleting...' : 'Yes, delete my account'}
              </button>
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteEmail('') }}
                className="px-4 py-3 rounded-xl text-sm transition-all duration-200 min-h-[44px]"
                style={{ background: 'var(--color-card)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-muted)' }}
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
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border-subtle)', color: '#E8976B' }}
        >
          Sign out
        </button>
      </div>

      {/* Legal links */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-4">
        <Link
          to="/privacy"
          className="text-xs transition-colors duration-200 hover:underline"
          style={{ color: 'var(--color-muted)' }}
        >
          Privacy Policy
        </Link>
        <span className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>·</span>
        <Link
          to="/terms"
          className="text-xs transition-colors duration-200 hover:underline"
          style={{ color: 'var(--color-muted)' }}
        >
          Terms of Service
        </Link>
        <span className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>·</span>
        <Link
          to="/cookie-policy"
          className="text-xs transition-colors duration-200 hover:underline"
          style={{ color: 'var(--color-muted)' }}
        >
          Cookie Policy
        </Link>
      </div>

      {/* Version */}
      <p className="text-center text-xs mt-3 mb-2" style={{ color: 'var(--color-muted)' }}>
        MindShift v1.0.0 — Built with 💜 for ADHD minds
      </p>
    </div>
  )
}
