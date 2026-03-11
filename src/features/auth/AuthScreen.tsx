import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { Mail, ArrowRight, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/shared/lib/supabase'
import { toast } from 'sonner'
import { useMotion } from '@/shared/hooks/useMotion'

// Must match TERMS_VERSION in TermsPage.tsx
const TERMS_VERSION = '2026-03'

// localStorage key — stores pending consent to be saved after magic-link auth
const CONSENT_PENDING_KEY = 'ms_consent_pending'

type Step = 'email' | 'check'

// ── Mochi SVG Logo ────────────────────────────────────────────────────────────
function MochiLogo() {
  const { t, shouldAnimate } = useMotion()
  return (
    <motion.div
      className="relative w-16 h-16 mx-auto"
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ ...t('expressive'), delay: 0.05 }}
    >
      {/* Subtle glow — only animates when motion is allowed */}
      <motion.div
        className="absolute -inset-3 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(123,114,255,0.25) 0%, transparent 70%)' }}
        animate={shouldAnimate ? { scale: [1, 1.06, 1] } : {}}
        transition={{ duration: 4, repeat: shouldAnimate ? Infinity : 0, ease: 'easeInOut' }}
      />
      {/* Icon container */}
      <div
        className="relative w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, rgba(123,114,255,0.25) 0%, rgba(123,114,255,0.08) 100%)',
          border: '1.5px solid rgba(123,114,255,0.5)',
          boxShadow: '0 0 40px rgba(123,114,255,0.25), inset 0 1px 0 rgba(255,255,255,0.08)',
        }}
      >
        <svg width="32" height="32" viewBox="0 0 44 44" fill="none">
          <path
            d="M8 22C8 14.268 14.268 8 22 8C29.732 8 36 14.268 36 22"
            stroke="#7B72FF"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx="22" cy="22" r="7" stroke="#7B72FF" strokeWidth="2" opacity="0.6" />
          <circle cx="22" cy="22" r="2.5" fill="#7B72FF" />
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
          top: '-20%', right: '-25%',
          width: 500, height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(123,114,255,0.10) 0%, transparent 60%)',
          filter: 'blur(60px)',
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: '-15%', left: '-20%',
          width: 450, height: 450,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(78,205,196,0.07) 0%, transparent 60%)',
          filter: 'blur(60px)',
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
  const { t } = useMotion()
  const inputRef = useRef<HTMLInputElement>(null)
  const [inputFocused, setInputFocused] = useState(false)
  const canSubmit = email.trim().length > 0 && consented

  return (
    <motion.div
      key="email-step"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={t()}
    >
      <h2 className="text-lg font-bold mb-1" style={{ color: '#E8E8F0' }}>
        Welcome — let's get you in
      </h2>
      <p className="text-[13px] mb-5 leading-relaxed" style={{ color: '#8B8BA7' }}>
        Enter your email and we'll send a magic link.
        <span style={{ color: '#6B7280' }}> No password. No friction.</span>
      </p>

      {/* Email input */}
      <div className="relative mb-4">
        <label htmlFor="auth-email" className="sr-only">Email address</label>
        <Mail
          className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 pointer-events-none"
          size={16}
          color={inputFocused ? '#7B72FF' : '#505370'}
          strokeWidth={2}
        />
        <input
          id="auth-email"
          ref={inputRef}
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onSubmit()}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          className="w-full pl-10 pr-4 rounded-xl text-sm outline-none transition-all duration-200 placeholder:text-[#484B68]"
          style={{
            background: inputFocused ? '#1C1F38' : '#191C30',
            color: '#E8E8F0',
            border: `1.5px solid ${inputFocused ? 'rgba(123,114,255,0.5)' : 'rgba(40,43,70,0.8)'}`,
            boxShadow: inputFocused ? '0 0 12px rgba(123,114,255,0.15)' : 'none',
            height: 46,
          }}
          autoFocus
          autoComplete="email"
        />
      </div>

      {/* Consent */}
      <label className="flex items-start gap-3 mb-5 cursor-pointer select-none group">
        <div className="relative shrink-0 mt-0.5" onClick={() => setConsented(!consented)}>
          <motion.div
            className="w-5 h-5 rounded-md flex items-center justify-center"
            animate={{
              background: consented ? '#7B72FF' : 'rgba(25,28,48,0.8)',
              borderColor: consented ? '#7B72FF' : '#3D4060',
              scale: consented ? [1, 1.15, 1] : 1,
            }}
            transition={{ duration: 0.2 }}
            style={{ border: '1.5px solid' }}
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
            style={{ color: '#7B72FF' }}
            onClick={e => e.stopPropagation()}>
            Terms
          </Link>
          {' '}&{' '}
          <Link to="/privacy" target="_blank" rel="noopener noreferrer"
            className="underline decoration-dotted hover:no-underline transition-all"
            style={{ color: '#7B72FF' }}
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
        className="w-full rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300"
        style={{
          height: 48,
          background: canSubmit
            ? 'linear-gradient(135deg, #7B72FF 0%, #5B52E8 100%)'
            : 'linear-gradient(135deg, rgba(123,114,255,0.15) 0%, rgba(91,82,232,0.08) 100%)',
          color: canSubmit ? '#fff' : '#5A5B72',
          boxShadow: canSubmit ? '0 4px 24px rgba(123,114,255,0.4), 0 0 0 1px rgba(123,114,255,0.3)' : '0 0 0 1px rgba(45,49,80,0.6)',
          cursor: canSubmit && !loading ? 'pointer' : 'not-allowed',
        }}
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin motion-reduce:animate-none motion-reduce:opacity-60" />
        ) : (
          <>
            Send magic link
            <ArrowRight size={16} strokeWidth={2.5} />
          </>
        )}
      </motion.button>

      <p className="text-center text-[11px] mt-3" style={{ color: '#4A4D6A' }}>
        No account? We'll create one automatically
      </p>
    </motion.div>
  )
}

// ── Check email step ──────────────────────────────────────────────────────────
function CheckStep({ email, onBack }: { email: string; onBack: () => void }) {
  const { t } = useMotion()
  return (
    <motion.div
      key="check-step"
      className="flex flex-col items-center text-center"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={t()}
    >
      {/* Animated checkmark */}
      <motion.div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
        style={{ background: 'rgba(78,205,196,0.12)', border: '1.5px solid rgba(78,205,196,0.35)' }}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={t('expressive')}
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
        className="text-xs underline decoration-dotted hover:no-underline transition-all min-h-[44px] px-4"
        style={{ color: '#7B72FF' }}
        onClick={onBack}
      >
        ← Use a different email
      </button>
    </motion.div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AuthScreen() {
  const { t } = useMotion()
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
      toast.error("Couldn't send your link. Check the email address and try again.")
      return
    }

    setStep('check')
  }

  return (
    <div
      className="fixed inset-0 flex flex-col items-center px-5 overflow-y-auto"
      style={{ background: '#0F1117' }}
    >
      <BgOrbs />

      {/* Vertically center content with flex spacers */}
      <div className="flex-1 min-h-[40px]" />

      <div className="relative z-10 w-full max-w-[360px] flex flex-col items-center py-6">

        {/* Logo + Brand — compact header */}
        <motion.div
          className="flex flex-col items-center mb-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...t(), delay: 0.05 }}
        >
          <MochiLogo />
          <h1 className="text-2xl font-bold tracking-tight mt-3" style={{ color: '#E8E8F0' }}>
            MindShift
          </h1>
          <p className="text-xs mt-0.5" style={{ color: '#7B72FF', letterSpacing: '0.08em' }}>
            Focus made kind
          </p>
        </motion.div>

        {/* Card — glass effect */}
        <motion.div
          className="w-full rounded-2xl p-5"
          style={{
            background: 'linear-gradient(160deg, rgba(28,31,52,0.95) 0%, rgba(20,22,38,0.98) 100%)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(255,255,255,0.04) inset, 0 1px 0 rgba(255,255,255,0.06) inset',
          }}
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ ...t(), delay: 0.15 }}
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
          className="text-center text-[11px] mt-5"
          style={{ color: '#4A4D6A' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ ...t(), delay: 0.4 }}
        >
          By continuing you agree to our{' '}
          <Link to="/privacy" target="_blank" style={{ color: '#7B72FF' }} className="underline decoration-dotted opacity-60 hover:opacity-100 transition-opacity">
            Privacy Policy
          </Link>
        </motion.p>
      </div>

      <div className="flex-1 min-h-[60px]" />
    </div>
  )
}
