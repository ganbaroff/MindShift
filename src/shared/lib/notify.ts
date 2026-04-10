// -- Notification layer --------------------------------------------------------
// Two channels:
//   1. In-app toasts (sonner)     — always shown when app is foregrounded
//   2. Native push (Web Notification API) — shown when app is backgrounded / closed
//
// Permission is requested lazily on first focus session start (not on mount).
// No npm package needed — Web Notification API is built into all modern browsers.

import { toast } from 'sonner'
import { hapticDone, hapticWow } from './haptic'

export function notifyXP(amount: number): void {
  hapticDone()
  toast.success(`+${amount} XP`, { duration: 2500 })
}

// XP notification — no multiplier details shown to user (VR math is internal)
export function notifyXPBonus(amount: number): void {
  hapticWow()
  toast.success(`+${amount} XP`, { duration: 3000 })
}

export function notifyAchievement(
  name: string,
  emoji: string,
  description: string,
  onShare?: () => void,
): void {
  hapticWow()
  toast(`${emoji} ${name}`, {
    description,
    duration: 5000,
    action: onShare ? { label: 'Share', onClick: onShare } : undefined,
  })
}

export function notifyFocusEnd(minutes: number): void {
  hapticDone()
  toast.success(`💪 ${minutes} min of deep focus!`, { duration: 3500 })
}

export function notifyTaskDone(title: string): void {
  hapticDone()
  toast.success(`✓ ${title}`, { duration: 2000 })
}

export function notifyError(message: string): void {
  toast.error(message, { duration: 4000 })
}

// -- Native Push Notifications (Web Notification API) -------------------------

/** Request notification permission — call once before first focus session. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function isNotificationGranted(): boolean {
  return 'Notification' in window && Notification.permission === 'granted'
}

/**
 * Show a native push notification (visible when app is backgrounded).
 * Falls back silently if permission not granted or API not supported.
 */
function pushNotify(title: string, options?: NotificationOptions): void {
  if (!isNotificationGranted()) return
  try {
    // Use Service Worker notification if available (more reliable on mobile)
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(title, {
          icon: '/icon-192.png',
          badge: '/icon-96.png',
          ...options,
        })
      }).catch(() => {
        // Fallback to window.Notification
        new Notification(title, { icon: '/icon-192.png', ...options })
      })
    } else {
      new Notification(title, { icon: '/icon-192.png', ...options })
    }
  } catch { /* non-critical */ }
}

/** Fired when a focus session ends — prompt return to app. */
export function pushFocusComplete(minutes: number): void {
  pushNotify('Focus session complete 💪', {
    body: `${minutes} min of deep work done. Time for a mindful break.`,
    tag: 'focus-complete',   // replaces previous notification of same type
    silent: false,
  })
}

/** Fired when recovery lock ends — user can start new session. */
export function pushRecoveryEnd(): void {
  pushNotify('Rest complete ✨', {
    body: 'Your mind has recharged. Ready when you are.',
    tag: 'recovery-end',
    silent: true,  // gentle — no sound on recovery
  })
}

/** Fired by RecoveryProtocol — user absent 72h+. */
export function pushWelcomeBack(name?: string): void {
  const greeting = name ? `Welcome back, ${name} 👋` : 'Good to see you again 👋'
  pushNotify(greeting, {
    body: 'MindShift is ready. No pressure — start wherever feels right.',
    tag: 'welcome-back',
    silent: true,
  })
}
