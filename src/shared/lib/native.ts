/**
 * native.ts — Capacitor runtime bridge with Web API fallbacks
 *
 * Designed to work in both PWA (browser) and Capacitor (iOS/Android) contexts.
 * Uses window.Capacitor.Plugins for runtime plugin access — no TypeScript
 * imports of @capacitor/* packages needed. This means zero build-time
 * dependency on Capacitor being installed.
 *
 * When Capacitor is NOT present (pure PWA):
 *   - isNativeApp() → false
 *   - haptic calls → navigator.vibrate() (existing behavior)
 *   - statusBar calls → noop
 *   - share → Web Share API (navigator.share)
 *
 * When Capacitor IS present (native app after `npm run cap:sync`):
 *   - isNativeApp() → true
 *   - haptic calls → Capacitor Haptics plugin (proper iOS Taptic Engine)
 *   - statusBar calls → StatusBar plugin
 *   - share → Capacitor Share plugin (native share sheet)
 */

// -- Runtime detection ----------------------------------------------------------

/** Returns true when running inside a Capacitor native shell (iOS/Android) */
export const isNativeApp = (): boolean => {
  try {
    return !!(window as unknown as { Capacitor?: { isNative?: boolean } }).Capacitor?.isNative
  } catch {
    return false
  }
}

// -- Plugin accessor (avoids TypeScript imports) -------------------------------

type CapPlugins = {
  Haptics?: {
    impact: (opts: { style: 'HEAVY' | 'MEDIUM' | 'LIGHT' }) => Promise<void>
    vibrate: (opts: { duration: number }) => Promise<void>
    notification: (opts: { type: 'SUCCESS' | 'WARNING' | 'ERROR' }) => Promise<void>
    selectionStart: () => Promise<void>
    selectionEnd: () => Promise<void>
  }
  StatusBar?: {
    hide: () => Promise<void>
    show: () => Promise<void>
    setStyle: (opts: { style: 'DARK' | 'LIGHT' | 'DEFAULT' }) => Promise<void>
    setBackgroundColor: (opts: { color: string }) => Promise<void>
    setOverlaysWebView: (opts: { overlay: boolean }) => Promise<void>
  }
  Share?: {
    share: (opts: { title?: string; text?: string; url?: string }) => Promise<void>
  }
}

const getPlugins = (): CapPlugins => {
  try {
    return (window as unknown as { Capacitor?: { Plugins?: CapPlugins } }).Capacitor?.Plugins ?? {}
  } catch {
    return {}
  }
}

// -- Haptics -------------------------------------------------------------------

/**
 * Trigger a native haptic impact on iOS/Android.
 * Falls back to navigator.vibrate on web — existing haptic.ts calls this.
 *
 * style: 'light' = tap, 'medium' = confirm, 'heavy' = success/wow
 */
export const nativeHapticImpact = (style: 'light' | 'medium' | 'heavy' = 'medium'): void => {
  const Haptics = getPlugins().Haptics
  if (Haptics) {
    const styleMap = { light: 'LIGHT', medium: 'MEDIUM', heavy: 'HEAVY' } as const
    void Haptics.impact({ style: styleMap[style] })
  } else if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    const durations = { light: 10, medium: 20, heavy: 40 }
    navigator.vibrate(durations[style])
  }
}

export const nativeHapticNotification = (type: 'success' | 'warning' | 'error' = 'success'): void => {
  const Haptics = getPlugins().Haptics
  if (Haptics) {
    const typeMap = { success: 'SUCCESS', warning: 'WARNING', error: 'ERROR' } as const
    void Haptics.notification({ type: typeMap[type] })
  }
}

export const nativeHapticSelection = (): void => {
  const Haptics = getPlugins().Haptics
  if (Haptics) {
    void Haptics.selectionStart()
    void Haptics.selectionEnd()
  } else if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(6)
  }
}

// -- Status Bar ----------------------------------------------------------------

/** Hide status bar — call when entering focus session for immersive mode */
export const nativeStatusBarHide = (): void => {
  const StatusBar = getPlugins().StatusBar
  if (StatusBar) void StatusBar.hide()
}

/** Show status bar — call when leaving focus session */
export const nativeStatusBarShow = (): void => {
  const StatusBar = getPlugins().StatusBar
  if (StatusBar) void StatusBar.show()
}

export const nativeStatusBarDark = (): void => {
  const StatusBar = getPlugins().StatusBar
  if (StatusBar) {
    void StatusBar.setStyle({ style: 'DARK' })
    void StatusBar.setBackgroundColor({ color: '#0F1117' })
  }
}

// -- Share ---------------------------------------------------------------------

interface ShareData {
  title?: string
  text?: string
  url?: string
}

/**
 * Share content via native share sheet (Capacitor) or Web Share API.
 * Returns true if share was triggered, false if not supported.
 */
export const nativeShare = async (data: ShareData): Promise<boolean> => {
  const Share = getPlugins().Share
  if (Share) {
    try {
      await Share.share(data)
      return true
    } catch {
      // User cancelled or plugin failed — fall through
    }
  }

  if (typeof navigator !== 'undefined' && 'share' in navigator) {
    try {
      await navigator.share(data)
      return true
    } catch {
      // User cancelled
    }
  }

  return false
}

/** Returns true if sharing is possible in the current context */
export const canShare = (): boolean => {
  return isNativeApp() || (typeof navigator !== 'undefined' && 'share' in navigator)
}

// -- In-App Review ------------------------------------------------------------

/**
 * Request an in-app review dialog via Capacitor InAppReview plugin.
 * No-op on web or when the plugin is unavailable.
 * OS rate-limits actual dialog display — calling this is always safe.
 */
export const nativeRequestReview = (): void => {
  if (!isNativeApp()) return
  try {
    const plugins = getPlugins() as CapPlugins & {
      InAppReview?: { requestReview: () => Promise<void> }
    }
    if (plugins.InAppReview) {
      void plugins.InAppReview.requestReview()
    }
  } catch {
    // Plugin not registered — ignore silently
  }
}

// -- Android Widget Bridge ----------------------------------------------------

interface WidgetData {
  nowTaskTitle: string
  focusMinutesToday: number
}

/**
 * Update Android home screen widget data via SharedPreferences bridge.
 * Requires WidgetBridgePlugin registered in MainActivity (see docs/android-widget-guide.md).
 * No-op on iOS, web, or when the plugin is not available.
 */
export const updateWidgetData = (data: WidgetData): void => {
  if (!isNativeApp()) return
  try {
    const plugins = getPlugins() as CapPlugins & {
      WidgetBridge?: { updateWidgetData: (opts: WidgetData) => Promise<void> }
    }
    if (plugins.WidgetBridge) {
      void plugins.WidgetBridge.updateWidgetData(data)
    }
  } catch {
    // Widget bridge not available — ignore silently
  }
}
