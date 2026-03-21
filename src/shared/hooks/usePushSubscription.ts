/**
 * usePushSubscription — persists Web Push subscription to Supabase.
 *
 * When the user has granted notification permission and is authenticated,
 * subscribes to push via the service worker and upserts the subscription
 * to the push_subscriptions table. This enables the scheduled-push edge
 * function to send background reminders even when the app is closed.
 *
 * Idempotent: skips if subscription already exists for this endpoint.
 * Cleans up on sign-out via the ON DELETE CASCADE on user_id FK.
 */

import { useEffect, useRef } from 'react'
import { useStore } from '@/store'
import { supabase } from '@/shared/lib/supabase'
import { VAPID_PUBLIC_KEY } from '@/shared/lib/vapid'
import { logError } from '@/shared/lib/logger'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function usePushSubscription() {
  const userId = useStore(s => s.userId)
  const subscribedRef = useRef(false)

  const isGuest = !userId || userId.startsWith('guest_')

  useEffect(() => {
    if (isGuest) return
    if (subscribedRef.current) return
    if (!('serviceWorker' in navigator)) return
    if (!('PushManager' in window)) return
    if (Notification.permission !== 'granted') return

    subscribedRef.current = true

    const subscribe = async () => {
      try {
        const registration = await navigator.serviceWorker.ready
        const existing = await registration.pushManager.getSubscription()

        // Subscribe or reuse existing
        const subscription = existing ?? await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
        })

        const subJson = subscription.toJSON()
        if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) return

        // Upsert to Supabase — ON CONFLICT does nothing (idempotent)
        // Table not in generated types yet, so use explicit cast
        const { error } = await (supabase.from('push_subscriptions') as ReturnType<typeof supabase.from>).upsert(
          {
            user_id: userId,
            endpoint: subJson.endpoint,
            p256dh: subJson.keys.p256dh,
            auth: subJson.keys.auth,
          } as Record<string, unknown>,
          { onConflict: 'user_id,endpoint' }
        )

        if (error) logError('usePushSubscription.upsert', error)
      } catch (err) {
        logError('usePushSubscription', err)
      }
    }

    void subscribe()
  }, [userId, isGuest])
}
