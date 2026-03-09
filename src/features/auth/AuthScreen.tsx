import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { Mail, ArrowRight, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/shared/lib/supabase'
import { toast } from 'sonner'

// Must match TERMS_VERSION in TermsPage.tsx
const TERMS_VERSION = '2026-03'

// localStorage key — stores pending consent to be saved after magic-link auth
const CONSENT_PENDING_KEY = 'ms_consent_pending'

type Step = 'email' | 'check'

// ── Mochi SVG Logo ────────────────────────────────────────────────────────────
function MochiLogo() {
  return (
    <motion.div
      className="relative w-24 h-24 mx-auto"
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.05 }}
    >
      {/* Outer glow ring */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(108,99,255,0.35) 0%, transparent 70%)' }}
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Icon container */}
      <div
        className="relative w-24 h-24 rounded-3xl flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, rgba(108,99,255,0.2) 0%, rgba(108,99,255,0.08) 100%)',
          border: '1.5px solid rgba(108,99,255,0.45)',
          boxShadow: '0 0 32px rgba(108,99,255,0.2), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        {/* Stylised brain / focus mark */}
        <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
          {/* Outer arc */}
          <path
            d="M8 22C8 14.268 14.268 8 22 8C29.732 8 36 14.268 36 22"
            stroke="#6C63FF"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Inner focus ring */}
          <circle cx="22" cy="22" r="7" stroke="#6C63FF" strokeWidth="2" opacity="0.6" />
          {/* Centre dot */}
          <circle cx="22" cy="22" r="2.5" fill="#6C63FF" />
          {/* Sparkle top-right */}
          <path d="M33 10L33.8 12L36 12L34.2 13.4L35 15.4L33 14L31 15.4L31.8 13.4L30 12L32.2 12Z"
            fill="#FFE66D" opacity="0.85" />
        </svg>
      </div>
    </motion.div>
  )
}

// ── Background orbs ───────────────────────────────────────────────────────────
function BgOrbs() {
  return (
    <>
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-15%', right: '-20%',
          width: 400, height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(108,99,255,0.12) 0%, transparent 65%)',
          filter: 'blur(1px)',
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: '-10%', left: '-15%',
          width: 350, height: 350,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(78,205,196,0.09) 0%, transparent 65%)',
          filter: 'blur(1px)',
        }}
      />
    </>
  )
}

// ── Email step ────────────────────────────────────────────────────────────────
function EmailStep({
  email, setEmail, consented, setConsented, loading, onSubmit,
}: {
  email: string
  setEmail: (v: string) => void
  consented: boolean
  setConsented: (v: boolean) => void
  loading: boolean
  onSubmit: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [inputFocused, setInputFocused] = useState(false)
  const canSubmit = email.trim().length > 0 && consented

  return (
    <motion.div
      key="email-step"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="text-xl font-bold mb-1.5" style={{ color: '#E8E8F0' }}>
        Welcome — let's get you in
      </h2>
      <p className="text-sm mb-6 leading-relaxed" style={{ color: '#8B8BA7' }}>
        Enter your email and we'll send a magic link.<br />
        No password. No friction.
      </p>

      {/* Email input */}
      <div className="relative mb-4">
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          animate={{ opacity: inputFocused ? 1 : 0 }}
          style={{ boxShadow: '0 0 0 2px rgba(108,99,255,0.5)', borderRadius: 12 }}
        />
        <Mail
          className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200"
          size={17}
          color={inputFocused ? '#6C63FF' : '#6B7280'}
        />
        <input
          ref={inputRef}
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onSubmit()}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          className="w-full pl-11 pr-4 h-13 rounded-xl text-sm outline-none transition-all duration-200"
          style={{
            background: '#252840',
            color: '#E8E8F0',
            border: `1.5px solid ${inputFocused ? 'rgba(108,99,255,0.6)' : '#2D3150'}`,
            height: 52,
          }}
          autoFocus
          autoComplete="email"
        />
      </div>

      {/* Consent */}
      <label className="flex items-start gap-3 mb-6 cursor-pointer select-none group">
        <div className="relative shrink-0 mt-0.5" onClick={() => setConsented(!consented)}>
          <motion.div
            className="w-5 h-5 rounded-md flex items-center justify-center"
            animate={{
              background: consented ? '#6C63FF' : 'transparent',
              borderColor: consented ? '#6C63FF' : '#4A4D6A',
              scale: consented ? [1, 1.15, 1] : 1,
            }}
            transition={{ duration: 0.2 }}
            style={{ border: '2px solid' }}
          >
            <AnimatePresence>
              {consented && (
                <motion.svg
                  width="11" height="8" viewBox="0 0 11 8" fill="none"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.15 }}
                >
                  <path d="M1 3.5L4 6.5L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </motion.svg>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
        <span className="text-xs leading-relaxed" style={{ color: '#8B8BA7' }}>
          I'm <strong style={{ color: '#C4C4D4' }}>16 or older</strong> and agree to MindShift's{' '}
          <Link to="/terms" target="_blank" rel="noopener noreferrer"
            className="underline decoration-dotted hover:no-underline transition-all"
            style={{ color: '#6C63FF' }}
            onClick={e => e.stopPropagation()}>
            Terms
          </Link>
          {' '}&{' '}
          <Link to="/privacy" target="_blank" rel="noopener noreferrer"
            className="underline decoration-dotted hover:no-underline transition-all"
            style={{ color: '#6C63FF' }}
            onClick={e => e.stopPropagation()}>
            Privacy Policy
          </Link>
        </span>
      </label>

      {/* CTA */}
      <motion.button
        onClick={onSubmit}
        disabled={!canSubmit || loading}
        whileTap={{ scale: canSubmit ? 0.97 : 1 }}
        className="w-full h-13 rounded-xl font-semibold text-sm flex items-center justify-center gap-2.5 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          height: 52,
          background: canSubmit
            ? 'linear-gradient(135deg, #6C63FF 0%, #5B52E8 100%)'
            : '#252840',
          color: canSubmit ? '#fff' : '#6B7280',
          boxShadow: canSubmit ? '0 4px 24px rgba(108,99,255,0.35)' : 'none',
        }}
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
        ) : (
          <>
            Send magic link
            <ArrowRight size={17} />
          </>
        )}
      </motion.button>

      <p className="text-center text-xs mt-4" style={{ color: '#5A5B72' }}>
        No account? We'll create one automatically ✨
      </p>
    </motion.div>
  )
}

// ── Check email step ──────────────────────────────────────────────────────────
function CheckStep({ email, onBack }: { email: string; onBack: () => void }) {
  return (
    <motion.div
      key="check-step"
      className="flex flex-col items-center text-center"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
    >
      {/* Animated checkmark */}
      <motion.div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
        style={{ background: 'rgba(78,205,196,0.12)', border: '1.5px solid rgba(78,205,196,0.35)' }}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      >
        <CheckCircle2 size={38} color="#4ECDC4" strokeWidth={1.5} />
      </motion.div>

      <h2 className="text-xl font-bold mb-2" style={{ color: '#E8E8F0' }}>
        Check your inbox 📬
      </h2>
      <p className="text-sm leading-relaxed mb-1" style={{ color: '#8B8BA7' }}>
        We sent a link to
      </p>
      <p className="text-sm font-semibold mb-5 px-4 py-1.5 rounded-lg"
         style={{ color: '#E8E8F0', background: '#252840' }}>
        {email}
      </p>
      <p className="text-xs leading-relaxed mb-6" style={{ color: '#6B7280' }}>
        Tap the link in the email to sign in instantly.<br />
        No password needed — ever.
      </p>

      <button
        className="text-xs underline decoration-dotted hover:no-underline transition-all"
        style={{ color: '#6C63FF' }}
        onClick={onBack}
      >
        ← Use a different email
      </button>
    </motion.div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AuthScreen() {
  const [step, setStep]           = useState<Step>('email')
  const [email, setEmail]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [consented, setConsented] = useState(false)

  const handleSendLink = async () => {
    if (!email.trim() || !consented) return

    // Persist consent before we send the link — survives magic-link redirect
    try {
      localStorage.setItem(CONSENT_PENDING_KEY, JSON.stringify({
        terms_accepted_at: new Date().toISOString(),
        terms_version:     TERMS_VERSION,
        age_confirmed:     true,
      }))
    } catch {
      // localStorage unavailable — proceed anyway; consent given in session
    }

    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/` },
    })
    setLoading(false)

    if (error) {
      toast.error('Something went wrong. Please try again.')
      return
    }

    setStep('check')
  }

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center px-5 overflow-hidden"
      style={{ background: '#0F1117' }}
    >
      <BgOrbs />

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">

        {/* Logo */}
        <div className="mb-6">
          <MochiLogo />
        </div>

        {/* Brand name */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#E8E8F0' }}>
            MindShift
          </h1>
          <p className="text-sm mt-1" style={{ color: '#8B8BA7' }}>
            Focus made kind ✨
          </p>
        </motion.div>

        {/* Card */}
        <motion.div
          className="w-full rounded-2xl p-6"
          style={{
            background: 'rgba(26,29,46,0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(45,49,80,0.8)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
          }}
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.4, type: 'spring', stiffness: 200, damping: 22 }}
        >
          <AnimatePresence mode="wait">
            {step === 'email' ? (
              <EmailStep
                key="email"
                email={email}
                setEmail={setEmail}
                consented={consented}
                setConsented={setConsented}
                loading={loading}
                onSubmit={handleSendLink}
              />
            ) : (
              <CheckStep
                key="check"
                email={email}
                onBack={() => setStep('email')}
              />
            )}
          </AnimatePresence>
        </motion.div>

        {/* Footer */}
        <motion.p
          className="text-center text-xs mt-6"
          style={{ color: '#3D3F56' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          By continuing you agree to our{' '}
          <Link to="/privacy" target="_blank" style={{ color: '#5A5B72' }} className="underline decoration-dotted">
            Privacy Policy
          </Link>
        </motion.p>
      </div>
    </div>
  )
}
