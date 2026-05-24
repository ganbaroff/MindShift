/**
 * capture-tablet-screenshots.ts — Play Store tablet screenshot capture (CL-J4)
 *
 * Usage: npx tsx scripts/capture-tablet-screenshots.ts
 *
 * Captures 4 tablet screenshots at two Google Play tablet aspect ratios:
 *   - 7" tablet:  1920×1200 (deviceScaleFactor 1 → produces 1920×1200 png)
 *   - 10" tablet: 2560×1600 (deviceScaleFactor 1 → produces 2560×1600 png)
 *
 * Each size produces 2 screens (Today + Focus) so we get 4 output files:
 *   public/screenshots/playstore/tablet-01.png  (7" today)
 *   public/screenshots/playstore/tablet-02.png  (7" focus setup)
 *   public/screenshots/playstore/tablet-03.png  (10" today)
 *   public/screenshots/playstore/tablet-04.png  (10" focus setup)
 */

import { chromium } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'

const BASE_URL     = process.env.SCREENSHOTS_BASE_URL ?? 'http://localhost:5173'
const OUT_DIR      = path.join(process.cwd(), 'public', 'screenshots', 'playstore')
const SUPABASE_REF = 'awfoqycoltvhamtrsvxk'

// Tablet viewports matching Google Play Console requirements:
// 7-inch: minimum 320px wide, recommended 1920×1200
// 10-inch: minimum 320px wide, recommended 2560×1600
const TABLET_SIZES = [
  { label: '7in',  viewport: { width: 1920, height: 1200 } },
  { label: '10in', viewport: { width: 2560, height: 1600 } },
]

// Screens to capture — two that showcase the key value propositions
const SCREENS = [
  { name: 'today', path: '/today', wait: 'h1' },
  { name: 'focus', path: '/focus', wait: 'h1' },
]

// -- Demo session (same as capture-screenshots.ts) ----------------------------
const now = Math.floor(Date.now() / 1000)
const expiresAt = now + 86_400
const header  = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
const payload = Buffer.from(JSON.stringify({
  iss: 'supabase', sub: 'demo-user-001', aud: 'authenticated',
  role: 'authenticated', email: 'demo@mindshift.app', iat: now, exp: expiresAt,
})).toString('base64url')
const DEMO_SESSION = {
  access_token: `${header}.${payload}.screenshot-sig`,
  token_type: 'bearer', expires_in: 86_400, expires_at: expiresAt,
  refresh_token: 'demo-refresh',
  user: {
    id: 'demo-user-001', email: 'demo@mindshift.app',
    aud: 'authenticated', role: 'authenticated',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {}, identities: [],
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
}

// -- Demo store state (same as capture-screenshots.ts) -----------------------
const DEMO_STATE = {
  state: {
    userId: 'demo-user-001', email: 'demo@mindshift.app',
    onboardingCompleted: true, firstFocusTutorialCompleted: true,
    appMode: 'habit', energyLevel: 3, psychotype: 'achiever',
    timeBlindness: 'often', emotionalReactivity: 'moderate',
    avatarId: 1, cognitiveMode: 'focused', uiTone: 'neutral',
    xpTotal: 2450, completedTotal: 18,
    currentStreak: 4, longestStreak: 7,
    lastActiveDate: new Date().toISOString().slice(0, 10),
    weeklyStats: {
      totalFocusMinutes: 142,
      dailyMinutes: [25, 0, 45, 30, 42, 0, 0],
      tasksCompleted: 18,
      peakFocusTime: '9:00 AM',
      consistencyScore: 0.57,
    },
    achievements: [
      { key: 'first_seed',  unlockedAt: new Date(Date.now() - 86400000 * 5).toISOString() },
      { key: 'task_sniper', unlockedAt: new Date(Date.now() - 86400000 * 2).toISOString() },
    ],
    nowPool: [
      { id: 't1', title: 'Review sprint plan', pool: 'now', status: 'active', difficulty: 2, estimatedMinutes: 25, position: 0, createdAt: new Date().toISOString(), repeat: 'none' },
      { id: 't2', title: 'Write standup notes', pool: 'now', status: 'active', difficulty: 1, estimatedMinutes: 10, position: 1, createdAt: new Date().toISOString(), repeat: 'none' },
    ],
    nextPool: [
      { id: 't3', title: 'Set up dev environment', pool: 'next', status: 'active', difficulty: 3, estimatedMinutes: 45, position: 0, createdAt: new Date().toISOString(), repeat: 'none' },
      { id: 't4', title: 'Reply to design feedback', pool: 'next', status: 'active', difficulty: 1, estimatedMinutes: 15, position: 1, createdAt: new Date().toISOString(), repeat: 'none' },
      { id: 't5', title: 'Update portfolio page', pool: 'next', status: 'active', difficulty: 2, estimatedMinutes: 30, position: 2, createdAt: new Date().toISOString(), repeat: 'none' },
    ],
    somedayPool: [],
    gridWidgets: [],
    audioVolume: 0.47, audioPlaying: false,
    timerStyle: 'countdown',
    dailyFocusGoalMin: 60, goalCelebratedDate: null,
    burnoutScore: 22, seasonalMode: 'launch',
    reducedStimulation: false, locale: 'en', userLocale: 'en', userTheme: 'dark',
    subscriptionTier: 'free', trialEndsAt: null,
    medicationEnabled: false, medicationTime: null, chronotype: null,
    flexiblePauseUntil: null, lastSessionAt: new Date().toISOString(),
    shutdownShownDate: new Date().toISOString().split('T')[0],
    monthlyReflectionShownMonth: new Date().toISOString().slice(0, 7),
    weeklyPlanShownWeek: new Date().toISOString().split('T')[0],
    weeklyIntention: '🚀 challenge',
    psychotypeLastDerived: null, seenHints: [],
    mochiDiscoveries: ['seedling'], focusAnchor: null,
  },
  version: 0,
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })

  const browser = await chromium.launch({ headless: true })

  // Output naming: tablet-01 .. tablet-04
  let outputIndex = 1

  for (const { label, viewport } of TABLET_SIZES) {
    for (const screen of SCREENS) {
      const ctx = await browser.newContext({
        viewport,
        deviceScaleFactor: 1,   // 1:1 — Play Console wants real pixel dimensions
        colorScheme: 'dark',
      })
      const page = await ctx.newPage()

      const storageKey  = `sb-${SUPABASE_REF}-auth-token`
      const storeJSON   = JSON.stringify(DEMO_STATE)
      const sessionJSON = JSON.stringify(DEMO_SESSION)

      // Mock Supabase API calls so screenshots work without a live backend
      await page.route('**/auth/v1/**', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: sessionJSON })
      )
      await page.route('**/rest/v1/**', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
      )
      await page.route('**/functions/v1/**', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
          steps: [], message: 'Great work today.', insights: [],
        }) })
      )

      // Seed store + session before any app scripts run
      await page.addInitScript(({ storeJSON, sessionJSON, storageKey }) => {
        localStorage.setItem('mindshift-store', storeJSON)
        localStorage.setItem(storageKey, sessionJSON)
        localStorage.setItem('ms_cookie_consent', JSON.stringify({
          accepted: true, version: '2026-03', at: new Date().toISOString(),
        }))
        localStorage.setItem('mindshift_install_dismissed', '1')
      }, { storeJSON, sessionJSON, storageKey })

      await page.goto(BASE_URL + screen.path, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForSelector(screen.wait, { timeout: 8000 }).catch(() => {})
      await page.waitForTimeout(1000)

      const filename = `tablet-0${outputIndex}.png`
      const outPath  = path.join(OUT_DIR, filename)
      await page.screenshot({ path: outPath, fullPage: false })
      console.log(`✓ ${filename}  (${label} ${viewport.width}×${viewport.height}  screen=${screen.path})`)

      outputIndex++
      await ctx.close()
    }
  }

  await browser.close()
  console.log(`\n4 tablet screenshots → ${OUT_DIR}`)
}

main().catch(e => { console.error(e); process.exit(1) })
