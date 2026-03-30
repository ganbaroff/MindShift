/**
 * AuthCheckStep — "check your email" screen after magic link is sent
 *
 * Extracted from AuthScreen.tsx.
 */

import { useState } from 'react'
import { motion } from 'motion/react'
import { CheckCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useMotion } from '@/shared/hooks/useMotion'

export interface AuthCheckStepProps {
  email: string
  onBack: () => void
  onResend: () => void
}

export function AuthCheckStep({ email, onBack, onResend }: AuthCheckStepProps) {
  const { t: transition } = useMotion()
  const { t } = useTranslation()
  const [resent, setResent] = useState(false)

  const handleResend = () => {
    onResend()
    setResent(true)
    setTimeout(() => setResent(false), 4000)
  }

  return (
    <motion.div
      key="check-step"
      className="flex flex-col items-center text-center"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={transition()}
    >
      <motion.div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
        style={{ background: 'rgba(78,205,196,0.12)', border: '1.5px solid rgba(78,205,196,0.35)' }}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={transition('expressive')}
      >
        <CheckCircle2 size={38} color="#4ECDC4" strokeWidth={1.5} />
      </motion.div>

      <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
        {t('auth.magicLinkOnWay')}
      </h2>
      <p className="text-sm leading-relaxed mb-1" style={{ color: 'var(--color-text-muted)' }}>
        {t('auth.weSentLink')}
      </p>
      <p className="text-sm font-semibold mb-3 px-4 py-1.5 rounded-lg"
         style={{ color: 'var(--color-text-primary)', background: 'var(--color-surface-raised)' }}>
        {email}
      </p>

      {/* Spam hint — helps ADHD users who won't find it otherwise */}
      <p className="text-xs leading-relaxed mb-5 px-2" style={{ color: '#6B7280' }}>
        {t('auth.checkSpam')}
      </p>

      <div className="flex flex-col items-center gap-3 w-full">
        <button
          onClick={handleResend}
          disabled={resent}
          className="text-sm font-medium px-5 py-2 rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-ms-primary/50 focus-visible:outline-none"
          style={{
            background: resent ? 'rgba(78,205,196,0.12)' : 'var(--color-surface-raised)',
            color: resent ? 'var(--color-teal)' : 'var(--color-text-muted)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {resent ? '✓ Link resent' : t('auth.resendLink')}
        </button>

        <button
          className="text-xs underline decoration-dotted hover:no-underline transition-all min-h-[44px] px-4"
          style={{ color: 'var(--color-primary)' }}
          onClick={onBack}
        >
          {t('auth.wrongEmail')}
        </button>
      </div>
    </motion.div>
  )
}
