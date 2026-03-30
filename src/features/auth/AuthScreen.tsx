import { useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/shared/lib/supabase'
import { toast } from 'sonner'
import { useMotion } from '@/shared/hooks/useMotion'
import { AuthEmailStep } from './AuthEmailStep'
import { AuthCheckStep } from './AuthCheckStep'

// Must match TERMS_VERSION in TermsPage.tsx
const TERMS_VERSION = '2026-03'

// localStorage key — stores pending consent to be saved after magic-link auth
const CONSENT_PENDING_KEY = 'ms_consent_pending'

type Step = 'email' | 'check'

// ── Mochi SVG Logo ────────────────────────────────────────────────────────────
function MochiLogo() {
  const { t: transition, shouldAnimate } = useMotion()
  return (
    <motion.div
      className="relative w-16 h-16 mx-auto"
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ ...transition('expressive'), delay: 0.05 }}
    >
      <motion.div
        className="absolute -inset-3 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(123,114,255,0.25) 0%, transparent 70%)' }}
        animate={shouldAnimate ? { scale: [1, 1.06, 1] } : {}}
        transition={{ duration: 4, repeat: shouldAnimate ? Infinity : 0, ease: 'easeInOut' }}
      />
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
            style={{ fill: 'var(--color-gold)' }} opacity="0.85" />
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

// ── Main component ────────────────────────────────────────────────────────────
export default function AuthScreen() {
  const { t: transition } = useMotion()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [step, setStep]                     = useState<Step>('email')
  const [email, setEmail]                   = useState('')
  const [loading, setLoading]               = useState(false)
  const [googleLoading, setGoogleLoading]   = useState(false)
  const [consented, setConsented]           = useState(false)
  const [consentHighlighted, setConsentHL]  = useState(false)

  const highlightConsent = useCallback(() => {
    setConsentHL(true)
    toast.info(t('auth.consentFirst'), { duration: 3000 })
    setTimeout(() => setConsentHL(false), 800)
  }, [t])

  const handleContinueAsGuest = useCallback(() => {
    localStorage.removeItem('ms_signed_out')
    const guestId = `guest_${crypto.randomUUID()}`
    localStorage.setItem('ms_guest_id', guestId)
    navigate('/')
    window.location.reload()
  }, [navigate])

  const persistConsent = useCallback(() => {
    try {
      localStorage.setItem(CONSENT_PENDING_KEY, JSON.stringify({
        terms_accepted_at: new Date().toISOString(),
        terms_version:     TERMS_VERSION,
        age_confirmed:     true,
      }))
    } catch { /* localStorage unavailable */ }
    localStorage.removeItem('ms_signed_out')
  }, [])

  const handleGoogleSignIn = useCallback(async () => {
    if (!consented) { highlightConsent(); return }

    persistConsent()
    setGoogleLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
        queryParams: { prompt: 'select_account' },
      },
    })
    setGoogleLoading(false)
    if (error) toast.error("Couldn't connect to Google. Try again or use email instead.")
  }, [consented, highlightConsent, persistConsent])

  const sendMagicLink = useCallback(async () => {
    if (!email.trim() || !consented) return

    persistConsent()
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
  }, [email, consented, persistConsent])

  const handleResend = useCallback(async () => {
    if (!email.trim()) return
    persistConsent()
    await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/` },
    })
  }, [email, persistConsent])

  return (
    <div
      className="fixed inset-0 flex flex-col items-center px-5 overflow-y-auto"
      style={{ background: 'var(--color-bg)' }}
    >
      <BgOrbs />

      <div className="flex-1 min-h-[40px]" />

      <div className="relative z-10 w-full max-w-[360px] flex flex-col items-center py-6">

        {/* Logo + Brand */}
        <motion.div
          className="flex flex-col items-center mb-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...transition(), delay: 0.05 }}
        >
          <MochiLogo />
          <h1 className="text-2xl font-bold tracking-tight mt-3" style={{ color: 'var(--color-text-primary)' }}>
            MindShift
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-primary)', letterSpacing: '0.08em' }}>
            Focus made kind
          </p>
        </motion.div>

        {/* Card */}
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
          transition={{ ...transition(), delay: 0.15 }}
        >
          <AnimatePresence mode="wait">
            {step === 'email' ? (
              <AuthEmailStep
                key="email"
                email={email}
                setEmail={setEmail}
                consented={consented}
                setConsented={setConsented}
                consentHighlighted={consentHighlighted}
                loading={loading}
                onSubmit={sendMagicLink}
                onGoogleSignIn={handleGoogleSignIn}
                googleLoading={googleLoading}
                onContinueAsGuest={handleContinueAsGuest}
              />
            ) : (
              <AuthCheckStep
                key="check"
                email={email}
                onBack={() => setStep('email')}
                onResend={handleResend}
              />
            )}
          </AnimatePresence>
        </motion.div>

        <motion.p
          className="text-center text-[11px] mt-5"
          style={{ color: '#4A4D6A' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ ...transition(), delay: 0.4 }}
        >
          {t('auth.dataPrivate')}{' '}
          <Link to="/privacy" target="_blank" style={{ color: 'var(--color-primary)' }} className="underline decoration-dotted opacity-60 hover:opacity-100 transition-opacity">
            Privacy Policy
          </Link>
        </motion.p>
      </div>

      <div className="flex-1 min-h-[60px]" />
    </div>
  )
}
