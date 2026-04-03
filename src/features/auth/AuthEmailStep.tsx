/**
 * AuthEmailStep — email/Google/guest sign-in UI
 *
 * Extracted from AuthScreen.tsx.
 * Layout order (research-backed for ADHD):
 *   1. Consent checkbox — visible FIRST, above all CTAs
 *   2. Google SSO — primary, one-tap, no friction
 *   3. Continue without account — secondary, co-equal visibility
 *   4. Divider + email input — tertiary (collapsed by default)
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { Mail, ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useMotion } from '@/shared/hooks/useMotion'

export interface AuthEmailStepProps {
  email: string
  setEmail: (v: string) => void
  consented: boolean
  setConsented: (v: boolean) => void
  consentHighlighted: boolean
  loading: boolean
  onSubmit: () => void
  onGoogleSignIn: () => void
  googleLoading: boolean
  onContinueAsGuest: () => void
}

export function AuthEmailStep({
  email, setEmail, consented, setConsented, consentHighlighted,
  loading, onSubmit, onGoogleSignIn, googleLoading, onContinueAsGuest,
}: AuthEmailStepProps) {
  const { t: transition } = useMotion()
  const { t } = useTranslation()
  const [showEmail, setShowEmail] = useState(false)

  return (
    <motion.div
      key="email-step"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={transition()}
    >
      <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
        {t('auth.letsGetStarted')}
      </h2>
      <p className="text-[13px] mb-5 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
        {t('auth.enterEmailDesc')}
        <span style={{ color: '#6B7280' }}> {t('auth.noPasswordNoFriction')}</span>
      </p>

      {/* ── 1. Consent — prominent, above all CTAs ── */}
      <motion.label
        className="flex items-start gap-3 mb-5 cursor-pointer select-none rounded-xl px-3 py-2.5 -mx-1"
        animate={consentHighlighted ? {
          backgroundColor: ['rgba(78,205,196,0)', 'rgba(78,205,196,0.12)', 'rgba(78,205,196,0)'],
          borderColor: ['rgba(78,205,196,0)', 'rgba(78,205,196,0.5)', 'rgba(78,205,196,0)'],
        } : {}}
        transition={{ duration: 0.6 }}
        style={{ border: '1px solid transparent' }}
      >
        <div className="relative shrink-0 mt-0.5" onClick={() => setConsented(!consented)}>
          <motion.div
            className="w-5 h-5 rounded-md flex items-center justify-center"
            animate={{
              background: consented ? 'var(--color-primary)' : 'rgba(25,28,48,0.8)',
              borderColor: consented ? 'var(--color-primary)' : '#3D4060',
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
        <span className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          I'm <strong style={{ color: '#C4C4D4' }}>{t('auth.consentAge')}</strong> and agree to MindShift's{' '}
          <Link to="/terms" target="_blank" rel="noopener noreferrer"
            className="underline decoration-dotted hover:no-underline transition-all"
            style={{ color: 'var(--color-primary)' }}
            onClick={e => e.stopPropagation()}>
            {t('auth.consentTerms')}
          </Link>
          {' '}&{' '}
          <Link to="/privacy" target="_blank" rel="noopener noreferrer"
            className="underline decoration-dotted hover:no-underline transition-all"
            style={{ color: 'var(--color-primary)' }}
            onClick={e => e.stopPropagation()}>
            {t('auth.consentPrivacy')}
          </Link>
        </span>
      </motion.label>

      {/* ── 2. Google SSO — primary CTA, always visually active ── */}
      <motion.button
        onClick={onGoogleSignIn}
        disabled={googleLoading}
        whileTap={{ scale: 0.97 }}
        className="w-full rounded-xl font-semibold text-sm flex items-center justify-center gap-2.5 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ms-primary/50 focus-visible:outline-none"
        style={{
          height: 48,
          background: '#1C1F38',
          border: '1.5px solid rgba(255,255,255,0.10)',
          color: 'var(--color-text-primary)',
        }}
        aria-label={t('auth.continueWithGoogle')}
      >
        {googleLoading ? (
          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin motion-reduce:animate-none motion-reduce:opacity-60" />
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {t('auth.continueWithGoogle')}
          </>
        )}
      </motion.button>

      {/* ── 3. Continue without account — secondary, co-equal visibility ── */}
      <button
        onClick={onContinueAsGuest}
        className="w-full mt-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ms-primary/50 focus-visible:outline-none"
        style={{
          height: 44,
          background: 'transparent',
          border: '1px solid rgba(255,255,255,0.06)',
          color: 'var(--color-text-muted)',
        }}
      >
        {t('auth.continueWithout')}
      </button>

      {/* ── 4. Email input — tertiary / collapsed by default ── */}
      <div className="mt-4">
        {!showEmail ? (
          <button
            onClick={() => setShowEmail(true)}
            className="w-full text-center text-[12px] py-1 focus-visible:outline-none focus-visible:underline"
            style={{ color: '#4A4D6A' }}
          >
            {t('auth.orUseEmail')} →
          </button>
        ) : (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 mb-2 pt-1">
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <span className="text-[11px]" style={{ color: '#4A4D6A' }}>{t('auth.or')}</span>
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
            </div>

            <label htmlFor="auth-email" className="sr-only">Email address</label>
            <div className="relative mb-3">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" size={16} color="#505370" strokeWidth={2} />
              <input
                id="auth-email"
                type="email"
                placeholder={t('auth.enterEmail')}
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && onSubmit()}
                autoFocus
                autoComplete="email"
                className="w-full pl-10 pr-4 rounded-xl text-sm outline-none transition-all duration-200 placeholder:text-[#484B68] focus:ring-2 focus:ring-ms-primary/40"
                style={{
                  background: '#191C30',
                  color: 'var(--color-text-primary)',
                  border: '1.5px solid rgba(40,43,70,0.8)',
                  height: 46,
                }}
              />
            </div>

            <motion.button
              onClick={onSubmit}
              disabled={!email.trim() || !consented || loading}
              whileTap={{ scale: email.trim() && consented ? 0.97 : 1 }}
              className="w-full rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 focus-visible:ring-2 focus-visible:ring-ms-primary/50 focus-visible:outline-none"
              style={{
                height: 44,
                background: email.trim() && consented
                  ? 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)'
                  : 'rgba(123,114,255,0.12)',
                color: email.trim() && consented ? '#fff' : 'var(--color-muted)',
                cursor: email.trim() && consented && !loading ? 'pointer' : 'not-allowed',
              }}
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin motion-reduce:animate-none motion-reduce:opacity-60" />
              ) : (
                <>{t('auth.sendLink')}<ArrowRight size={16} strokeWidth={2.5} /></>
              )}
            </motion.button>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
