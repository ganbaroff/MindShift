/**
 * useAuthInit — Supabase auth state management + consent persistence + calendar OAuth.
 *
 * Extracted from App.tsx to keep component under 400-line guardrail.
 * Handles:
 *   - onAuthStateChange subscription
 *   - Guest fallback after 2s timeout
 *   - Consent persistence from localStorage to DB
 *   - Google Calendar token storage on OAuth callback
 *   - Session last-active update (gated by recovery threshold)
 */

import { useEffect } from 'react'
import { useStore } from '@/store'
import { supabase } from '@/shared/lib/supabase'
import { logError } from '@/shared/lib/logger'
import { RECOVERY_THRESHOLD_HOURS } from '@/shared/lib/constants'

const CONSENT_PENDING_KEY = 'ms_consent_pending'

export function useAuthInit() {
  const { setUser, updateLastSession } = useStore()

  useEffect(() => {
    let authStateResolved = false

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      authStateResolved = true
      if (session?.user) {
        localStorage.removeItem('ms_signed_out')
        setUser(session.user.id, session.user.email ?? '')

        // Sync subscription tier from DB
        void supabase
          .from('users')
          .select('subscription_tier, trial_ends_at')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            const row = data as { subscription_tier?: string; trial_ends_at?: string | null } | null
            if (row?.subscription_tier) {
              useStore.getState().setSubscription(
                row.subscription_tier as 'free' | 'pro_trial' | 'pro',
                row.trial_ends_at ?? null
              )
            }
          })

        // Guard: don't reset lastSessionAt when the recovery protocol should show
        const s = useStore.getState()
        const isLongAbsence = s.lastSessionAt && !s.recoveryShown &&
          (Date.now() - new Date(s.lastSessionAt).getTime()) / 3_600_000 >= RECOVERY_THRESHOLD_HOURS
        if (!isLongAbsence) updateLastSession()

        // Google Calendar: store provider tokens on OAuth callback
        if (session.provider_token && localStorage.getItem('ms_calendar_pending')) {
          localStorage.removeItem('ms_calendar_pending')
          try {
            await supabase.functions.invoke('gcal-store-token', {
              body: {
                providerToken: session.provider_token,
                providerRefreshToken: session.provider_refresh_token ?? null,
                expiresIn: 3600,
              },
            })
            useStore.getState().setCalendarSyncEnabled(true)
          } catch (err) {
            logError('App.gcalTokenStore', err instanceof Error ? err : new Error(String(err)))
          }
        }

        try {
          const raw = localStorage.getItem(CONSENT_PENDING_KEY)
          if (raw) {
            const consent = JSON.parse(raw) as {
              terms_accepted_at: string
              terms_version:     string
              age_confirmed:     boolean
            }
            supabase
              .from('users')
              .update({
                terms_accepted_at: consent.terms_accepted_at,
                terms_version:     consent.terms_version,
                age_confirmed:     consent.age_confirmed,
              } as never)
              .eq('id', session.user.id)
              .then(({ error }) => {
                if (error) logError('App.consentPersist', new Error(error.message))
                else localStorage.removeItem(CONSENT_PENDING_KEY)
              })
          }
        } catch { /* localStorage or JSON parse failure */ }
      } else {
        if (!localStorage.getItem('ms_signed_out')) {
          const guestId = localStorage.getItem('ms_guest_id') ?? `guest_${crypto.randomUUID()}`
          localStorage.setItem('ms_guest_id', guestId)
          setUser(guestId, '')
          updateLastSession()
        }
      }
    })

    const fallbackTimer = setTimeout(() => {
      if (!authStateResolved && !localStorage.getItem('ms_signed_out')) {
        const guestId = localStorage.getItem('ms_guest_id') ?? `guest_${crypto.randomUUID()}`
        localStorage.setItem('ms_guest_id', guestId)
        setUser(guestId, '')
        updateLastSession()
      }
    }, 2000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(fallbackTimer)
    }
  }, [setUser, updateLastSession])
}
