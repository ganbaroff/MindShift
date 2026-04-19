/**
 * capture-screenshots.ts — Play Store screenshot capture
 *
 * Usage: npx tsx scripts/capture-screenshots.ts
 *
 * Captures 8 phone screenshots (390×844, 2× retina) with seeded demo data.
 * Output: public/screenshots/playstore/NN-name.png
 */

import { chromium } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'

const BASE_URL   = process.env.SCREENSHOTS_BASE_URL ?? 'http://localhost:5173'
const OUT_DIR    = path.join(process.cwd(), 'public', 'screenshots', 'playstore')
const VIEWPORT   = { width: 390, height: 844 }
const SUPABASE_REF = 'awfoqycoltvhamtrsvxk'

// -- Demo session --------------------------------------------------------------
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

// -- Demo store state ----------------------------------------------------------
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
    longestStreak: 7,
  },
  version: 0,
}

// -- Screen list ---------------------------------------------------------------
const SCREENS = [
  { name: '01-today',      path: '/today',      wait: 'h1' },
  { name: '02-tasks',      path: '/tasks',       wait: 'h1' },
  { name: '03-focus',      path: '/focus',       wait: 'h1' },
  { name: '04-progress',   path: '/progress',    wait: 'h1' },
  { name: '05-onboarding', path: '/onboarding',  wait: 'h1' },
  { name: '06-settings',   path: '/settings',    wait: 'h1' },
  { name: '07-history',    path: '/history',     wait: 'h1' },
  { name: '08-home',       path: '/',            wait: 'h1' },
]

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })

  const browser = await chromium.launch({ headless: true })

  for (const screen of SCREENS) {
    const ctx = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 2,
      colorScheme: 'dark',
    })
    const page = await ctx.newPage()

    // Mock Supabase endpoints before any navigation
    const storageKey = `sb-${SUPABASE_REF}-auth-token`
    const storeJSON  = JSON.stringify(DEMO_STATE)
    const sessionJSON = JSON.stringify(DEMO_SESSION)

    await page.route('**/auth/v1/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: sessionJSON })
    )
    // 2026-04-19 (Design-Atlas recapture packet): seed focus_sessions with
    // realistic rows so screenshot #7 (Session Log) shows a populated history
    // instead of a first-run placeholder. Play Store carousel = peak-experience
    // signal to installers. Empty state reads as "nothing is happening here"
    // and is the wrong install-decision frame.
    const dayMs = 86_400_000
    const iso = (offsetDays: number, hour: number) =>
      new Date(Date.now() - offsetDays * dayMs + hour * 3_600_000).toISOString()
    const DEMO_FOCUS_SESSIONS = [
      { id: 's-01', user_id: 'demo-user-001', started_at: iso(0, -2), ended_at: iso(0, -1), duration_ms: 25 * 60_000, phase_reached: 'flow',     audio_preset: 'brown',   task_id: 't1', energy_before: 3, energy_after: 4 },
      { id: 's-02', user_id: 'demo-user-001', started_at: iso(0, -5), ended_at: iso(0, -4), duration_ms: 20 * 60_000, phase_reached: 'release',  audio_preset: 'lofi',    task_id: 't2', energy_before: 2, energy_after: 3 },
      { id: 's-03', user_id: 'demo-user-001', started_at: iso(1, -3), ended_at: iso(1, -2), duration_ms: 45 * 60_000, phase_reached: 'flow',     audio_preset: 'brown',   task_id: 't3', energy_before: 4, energy_after: 4 },
      { id: 's-04', user_id: 'demo-user-001', started_at: iso(1, -7), ended_at: iso(1, -6), duration_ms: 15 * 60_000, phase_reached: 'struggle', audio_preset: null,       task_id: null, energy_before: 2, energy_after: 2 },
      { id: 's-05', user_id: 'demo-user-001', started_at: iso(3, -4), ended_at: iso(3, -3), duration_ms: 30 * 60_000, phase_reached: 'flow',     audio_preset: 'nature',  task_id: null, energy_before: 3, energy_after: 5 },
      { id: 's-06', user_id: 'demo-user-001', started_at: iso(4, -5), ended_at: iso(4, -4), duration_ms: 25 * 60_000, phase_reached: 'recovery', audio_preset: 'brown',   task_id: null, energy_before: 2, energy_after: 3 },
      { id: 's-07', user_id: 'demo-user-001', started_at: iso(6, -6), ended_at: iso(6, -5), duration_ms: 42 * 60_000, phase_reached: 'flow',     audio_preset: 'pink',    task_id: null, energy_before: 3, energy_after: 4 },
    ]
    await page.route('**/rest/v1/**', (route) => {
      const url = route.request().url()
      if (url.includes('focus_sessions')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(DEMO_FOCUS_SESSIONS),
        })
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    })
    await page.route('**/functions/v1/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        steps: [], message: 'Great work today.', insights: [],
      }) })
    )

    // Inject localStorage before page scripts run
    await page.addInitScript(({ storeJSON, sessionJSON, storageKey }) => {
      localStorage.setItem('mindshift-store', storeJSON)
      localStorage.setItem(storageKey, sessionJSON)
      localStorage.setItem('ms_cookie_consent', JSON.stringify({ accepted: true, version: '2026-03', at: new Date().toISOString() }))
      localStorage.setItem('mindshift_install_dismissed', '1')
    }, { storeJSON, sessionJSON, storageKey })

    await page.goto(BASE_URL + screen.path, { waitUntil: 'networkidle', timeout: 15000 })
    await page.waitForSelector(screen.wait, { timeout: 8000 }).catch(() => {})
    await page.waitForTimeout(1000)

    const outPath = path.join(OUT_DIR, `${screen.name}.png`)
    await page.screenshot({ path: outPath, fullPage: false })
    console.log(`✓ ${screen.name}`)

    await ctx.close()
  }

  await browser.close()
  console.log(`\n8 screenshots → ${OUT_DIR}`)
}

main().catch(e => { console.error(e); process.exit(1) })
