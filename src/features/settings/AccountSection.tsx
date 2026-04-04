/**
 * AccountSection — Data export, account deletion, sign out
 *
 * GDPR export + delete. Confirmation required for delete.
 * Guest users: clear local data only.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import i18n from '@/i18n'
import { useTranslation } from 'react-i18next'
import { useMotion } from '@/shared/hooks/useMotion'
import { useStore } from '@/store'
import { supabase } from '@/shared/lib/supabase'
import { Section } from './SettingsPrimitives'

export function AccountSection() {
  const { t } = useTranslation()
  const { shouldAnimate } = useMotion()
  const navigate = useNavigate()
  const { userId, email, signOut } = useStore()

  const isGuest = !userId || userId.startsWith('guest_')

  const [exportLoading, setExportLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const DELETE_WORD = 'DELETE'

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('ms_guest_id')
    localStorage.setItem('ms_signed_out', '1')
    signOut()
    navigate('/auth')
  }

  const handleExport = async () => {
    if (isGuest) {
      toast(i18n.t('settings.exportSignedIn'))
      return
    }
    setExportLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('gdpr-export')
      if (error) throw error
      if (!data || typeof data !== 'object') {
        toast.error(i18n.t('settings.exportFailed'))
        return
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mindshift-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(i18n.t('settings.dataExported'))
    } catch {
      toast.error(i18n.t('settings.exportError'))
    } finally {
      setExportLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!isGuest && deleteConfirmText !== DELETE_WORD) return
    if (isGuest) {
      localStorage.clear()
      signOut()
      navigate('/auth')
      return
    }
    setDeleteLoading(true)
    try {
      const { error } = await supabase.functions.invoke('gdpr-delete', {
        body: { confirmEmail: email },
      })
      if (error) throw error
      await supabase.auth.signOut()
      localStorage.clear()
      signOut()
      toast.success(i18n.t('settings.accountDeleted'))
      navigate('/auth')
    } catch {
      toast.error(i18n.t('settings.deleteError'))
    } finally {
      setDeleteLoading(false)
      setShowDeleteConfirm(false)
      setDeleteConfirmText('')
    }
  }

  return (
    <>
      {/* Feedback */}
      <Section label={t('settings.feedback')}>
        <a
          href="mailto:ganbarov.y@gmail.com?subject=MindShift%20Feedback&body=Hi%20Yusif%2C%0A%0A"
          className="flex items-center gap-3 w-full h-10 rounded-xl px-3 text-[14px] font-medium focus-visible:ring-2 focus-visible:ring-ms-primary/50 focus-visible:outline-none"
          style={{ backgroundColor: 'rgba(123,114,255,0.1)', color: 'var(--color-primary)' }}
        >
          <span>📬</span>
          <span>{t('settings.sendFeedback')}</span>
          <span className="ml-auto text-[11px]" style={{ color: 'var(--color-text-muted)' }}>ganbarov.y@gmail.com</span>
        </a>
      </Section>

      {/* Data */}
      <Section label={t('settings.yourData')}>
        <motion.button
          whileTap={shouldAnimate ? { scale: 0.97 } : undefined}
          onClick={handleExport}
          disabled={exportLoading}
          className="w-full h-10 rounded-xl text-[14px] font-medium disabled:opacity-50"
          style={{ backgroundColor: 'rgba(78,205,196,0.12)', color: 'var(--color-teal)' }}
        >
          {exportLoading ? t('settings.exporting') : `📦 ${t('settings.exportJson')}`}
        </motion.button>
        <button
          onClick={() => { setShowDeleteConfirm(true); setDeleteConfirmText('') }}
          className="text-[13px] font-medium w-full text-center mt-2"
          style={{ color: 'var(--color-gold)' }}
        >
          {t('settings.deleteAccount')}
        </button>
      </Section>

      {/* Delete confirmation */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={shouldAnimate ? { opacity: 0, height: 0 } : false}
            animate={shouldAnimate ? { opacity: 1, height: 'auto' } : false}
            exit={shouldAnimate ? { opacity: 0, height: 0 } : undefined}
            className="rounded-2xl p-4 space-y-3"
            style={{ backgroundColor: 'var(--color-surface-card)', border: '1px solid rgba(245,158,11,0.3)' }}
          >
            <p className="text-[13px]" style={{ color: 'var(--color-text-primary)' }}>
              {t('settings.deleteConfirm')}
            </p>
            {!isGuest && (
              <div className="space-y-1">
                <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                  {t('settings.deleteTypePrompt')}
                </p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={e => setDeleteConfirmText(e.target.value)}
                  placeholder={DELETE_WORD}
                  autoCapitalize="characters"
                  className="w-full h-9 rounded-xl px-3 text-[13px] font-mono tracking-widest text-center"
                  style={{ backgroundColor: 'var(--color-surface-raised)', color: 'var(--color-text-primary)', border: '1px solid rgba(245,158,11,0.3)' }}
                  aria-label={t('settings.deleteTypePrompt')}
                />
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 h-9 rounded-xl text-[13px] font-medium"
                style={{ backgroundColor: 'rgba(139,139,167,0.15)', color: 'var(--color-text-muted)' }}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading || (!isGuest && deleteConfirmText !== DELETE_WORD)}
                className="flex-1 h-9 rounded-xl text-[13px] font-medium disabled:opacity-50"
                style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: 'var(--color-gold)' }}
              >
                {deleteLoading ? t('settings.deleting') : t('settings.yesDelete')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        className="text-[13px] font-medium w-full text-center py-2"
        style={{ color: 'var(--color-gold)' }}
      >
        {t('settings.signOut')}
      </button>

      {/* Footer links */}
      <div className="text-center space-y-1 pt-2 pb-6">
        <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
          <button
            onClick={() => navigate('/privacy')}
            className="underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {t('settings.privacy')}
          </button>
          {' · '}
          <button
            onClick={() => navigate('/terms')}
            className="underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {t('settings.terms')}
          </button>
          {' · '}
          <button
            onClick={() => navigate('/cookie-policy')}
            className="underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {t('settings.cookies')}
          </button>
        </p>
        <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>MindShift v1.0.0</p>
      </div>
    </>
  )
}
