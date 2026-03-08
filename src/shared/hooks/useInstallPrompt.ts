// ── useInstallPrompt ──────────────────────────────────────────────────────────
// Handles PWA install flow for both Android (beforeinstallprompt) and iOS (manual).
//
// Android/Chrome: browser fires `beforeinstallprompt` → we defer it → show our
//   own button → call prompt() → user taps "Install" → app installed.
//
// iOS/Safari: `beforeinstallprompt` is NOT supported. We detect iOS + Safari
//   and show manual instructions ("Share → Add to Home Screen").
//
// Already installed check: `window.matchMedia('(display-mode: standalone)')` —
//   if true the user already opened from home screen, never show the banner.

import { useState, useEffect, useCallback } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type InstallState =
  | 'idle'       // checking / not applicable
  | 'android'    // beforeinstallprompt captured — show Install button
  | 'ios'        // iOS Safari — show manual instructions
  | 'installed'  // already running as standalone PWA

const DISMISSED_KEY = 'mindshift_install_dismissed'

function isRunningStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true)
  )
}

function isIosSafari(): boolean {
  const ua = navigator.userAgent
  const isIos = /iphone|ipad|ipod/i.test(ua)
  // Chrome on iOS has CriOS in UA; we only want pure Safari
  const isSafari = /safari/i.test(ua) && !/crios|fxios|opios|mercury/i.test(ua)
  return isIos && isSafari
}

export function useInstallPrompt() {
  const [state, setState]   = useState<InstallState>('idle')
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISSED_KEY) === '1'
  )

  useEffect(() => {
    // Already installed — never show banner
    if (isRunningStandalone()) {
      setState('installed')
      return
    }

    // Already dismissed by user — respect that forever
    if (dismissed) return

    // iOS: check once (no event — just UA detection)
    if (isIosSafari()) {
      setState('ios')
      return
    }

    // Android/Chrome: wait for browser event
    const handler = (e: Event) => {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
      setState('android')
    }

    window.addEventListener('beforeinstallprompt', handler)

    // If app was installed via the prompt
    const installedHandler = () => setState('installed')
    window.addEventListener('appinstalled', installedHandler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installedHandler)
    }
  }, [dismissed])

  /** Trigger the native Android install dialog */
  const install = useCallback(async () => {
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') {
      setState('installed')
    }
    setPrompt(null)
  }, [prompt])

  /** Permanently dismiss — stored in localStorage */
  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISSED_KEY, '1')
    setDismissed(true)
    setState('idle')
  }, [])

  return { state, install, dismiss }
}
