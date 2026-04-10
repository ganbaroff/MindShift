/**
 * AliasJoinModal — shown before joining an anonymous community
 *
 * Anonymous communities (is_anonymous=true) allow members to pick an alias
 * that's visible only inside the community. Outside, they're known by badge only.
 *
 * Rules:
 * - Alias is optional — "Join anonymously" skips it
 * - Max 24 chars, no PII pressure
 * - Rule 1: teal/indigo palette
 * - Rule 3: role=dialog, aria-labelledby, Escape to close
 * - Rule 6: plain warm copy, no pressure
 */

import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useMotion } from '@/shared/hooks/useMotion'
import type { Community } from './useCommunity'

interface AliasJoinModalProps {
  community: Community
  isJoining: boolean
  onConfirm: (alias: string | undefined) => void
  onCancel: () => void
}

export function AliasJoinModal({ community, isJoining, onConfirm, onCancel }: AliasJoinModalProps) {
  const { shouldAnimate } = useMotion()
  const { t } = useTranslation()
  const [alias, setAlias] = useState('')
  const inputRef  = useRef<HTMLInputElement>(null)
  const titleId   = 'alias-join-modal-title'

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 80)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onCancel])

  const trimmedAlias = alias.trim()

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={shouldAnimate ? { opacity: 0 } : {}}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-50"
        style={{ background: 'rgba(0,0,0,0.6)' }}
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Modal */}
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={shouldAnimate ? { opacity: 0, scale: 0.95, y: 8 } : {}}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={shouldAnimate ? { type: 'spring', damping: 22, stiffness: 300 } : { duration: 0 }}
        className="fixed inset-x-4 z-50 rounded-3xl px-6 py-6"
        style={{
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'var(--color-bg)',
          border: '1px solid rgba(255,255,255,0.08)',
          maxWidth: 420,
          margin: '0 auto',
        }}
      >
        {/* Lock icon — decorative */}
        <div aria-hidden="true" className="text-3xl mb-4 text-center">🔒</div>

        <h2
          id={titleId}
          className="text-lg font-bold mb-1 text-center"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {t('community.aliasTitle', 'Join anonymously')}
        </h2>

        <p className="text-sm text-center mb-5 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          {t('community.aliasSubtitle',
            `In ${community.name}, members are known by their badge only. ` +
            'You can pick a name visible inside — or stay badge-only.',
          )}
        </p>

        {/* Constitution preview */}
        {community.constitution && (
          <div
            className="rounded-2xl px-4 py-3 mb-5 text-[11px] leading-relaxed"
            style={{
              background: 'rgba(123,114,255,0.07)',
              border: '1px solid rgba(123,114,255,0.15)',
              color: 'var(--color-text-muted)',
              maxHeight: 100,
              overflowY: 'auto',
            }}
          >
            {community.constitution}
          </div>
        )}

        {/* Alias input */}
        <label
          htmlFor="alias-input"
          className="block text-xs font-medium mb-1.5"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {t('community.aliasLabel', 'Your name inside this community (optional)')}
        </label>
        <input
          ref={inputRef}
          id="alias-input"
          type="text"
          value={alias}
          onChange={e => setAlias(e.target.value.slice(0, 24))}
          placeholder={t('community.aliasPlaceholder', 'e.g. nightowl, deep-work-fan…')}
          disabled={isJoining}
          maxLength={24}
          className="w-full rounded-xl px-3 py-2.5 text-sm mb-1
                     focus-visible:ring-2 focus-visible:ring-[var(--color-teal)] focus-visible:outline-none
                     disabled:opacity-50"
          style={{
            background: 'var(--color-surface-raised)',
            color: 'var(--color-text-primary)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        />
        <p className="text-[10px] mb-5 text-right" style={{ color: 'var(--color-text-muted)' }}>
          {alias.length}/24
        </p>

        {/* Crystal cost reminder */}
        {community.entry_cost_crystals > 0 && (
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2 mb-5 text-[11px]"
            style={{ background: 'rgba(123,114,255,0.08)', color: 'var(--color-text-muted)' }}
          >
            <span aria-hidden="true">🌟</span>
            <span>
              {t('community.aliasCost',
                `Entry costs ${community.entry_cost_crystals.toLocaleString()} SHARE crystals. ` +
                'This grants you shareholder status.',
              )}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => onConfirm(trimmedAlias || undefined)}
            disabled={isJoining}
            aria-label={trimmedAlias
              ? t('community.aliasJoinAs', { alias: trimmedAlias, defaultValue: `Join as ${trimmedAlias}` })
              : t('community.aliasJoinAnon', 'Join with badge only')
            }
            className="w-full py-3 rounded-2xl text-sm font-semibold transition-all duration-150
                       focus-visible:ring-2 focus-visible:ring-[var(--color-teal)] focus-visible:outline-none
                       active:scale-[0.98] disabled:opacity-50"
            style={{
              background: isJoining ? 'var(--color-surface-raised)' : 'rgba(78,205,196,0.15)',
              border: '1px solid rgba(78,205,196,0.3)',
              color: 'var(--color-teal)',
            }}
          >
            {isJoining
              ? t('community.joining', 'Joining…')
              : trimmedAlias
              ? t('community.aliasJoinAs', { alias: trimmedAlias, defaultValue: `Join as "${trimmedAlias}"` })
              : t('community.aliasJoinAnon', 'Join with badge only')
            }
          </button>

          <button
            onClick={onCancel}
            disabled={isJoining}
            className="w-full py-2.5 rounded-2xl text-sm transition-all duration-150
                       focus-visible:ring-2 focus-visible:ring-[var(--color-teal)] focus-visible:outline-none
                       disabled:opacity-40"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {t('community.aliasCancel', 'Not now')}
          </button>
        </div>
      </motion.div>
    </>
  )
}
