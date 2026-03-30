/**
 * Capacitor configuration — iOS & Android native deployment
 *
 * Setup steps (first time):
 *   npm install @capacitor/core @capacitor/cli
 *   npm install @capacitor/ios @capacitor/android
 *   npx cap add ios
 *   npx cap add android
 *
 * Build + sync:
 *   npm run build && npx cap sync
 *
 * Open in Xcode / Android Studio:
 *   npx cap open ios
 *   npx cap open android
 *
 * Live reload during dev:
 *   npx cap run android --livereload --external
 */

import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.mindshift.app',
  appName: 'MindShift',
  webDir: 'dist',

  // Production server (Vercel) — useful for quick testing without local build
  // Remove or comment out when doing App Store / Play Store builds
  // server: {
  //   url: 'https://mind-shift-git-main-yusifg27-3093s-projects.vercel.app',
  //   cleartext: false,
  // },

  plugins: {
    SplashScreen: {
      launchShowDuration: 0,                // No splash — app is fast enough
      backgroundColor: '#0F1117',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },

    StatusBar: {
      style: 'dark',                        // Light icons on dark background
      backgroundColor: '#0F1117',
      overlaysWebView: false,
    },

    Keyboard: {
      resize: 'body',                       // Resize body when keyboard opens
      style: 'dark',
      resizeOnFullScreen: true,
    },

    LocalNotifications: {
      smallIcon: 'ic_stat_mindshift',
      iconColor: '#7B72FF',                 // MindShift primary color
      sound: 'beep.wav',
    },

    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },

    // Haptics — used throughout the app for ADHD-safe tactile feedback
    // Requires VIBRATE permission on Android (auto-added by @capacitor/haptics)
    Haptics: {},
  },

  ios: {
    contentInset: 'always',
    allowsLinkPreview: false,
    scrollEnabled: true,
    backgroundColor: '#0F1117',
  },

  server: {
    androidScheme: 'https',
  },

  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,    // Set true only for dev builds
    backgroundColor: '#0F1117',
    // Minimum WebView version for security + ES2020 support
    minWebViewVersion: 60,
    // Permissions declared here for Play Store Data Safety Form reference:
    //   android.permission.INTERNET          — web app networking (auto-granted)
    //   android.permission.VIBRATE           — haptic feedback (@capacitor/haptics)
    //   android.permission.POST_NOTIFICATIONS — push notifications (Android 13+)
    //   android.permission.RECEIVE_BOOT_COMPLETED — reschedule local notifications
    //   android.permission.WAKE_LOCK         — notification delivery reliability
    //   android.permission.SCHEDULE_EXACT_ALARM — precise task reminders
  },
}

export default config
