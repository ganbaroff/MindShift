/**
 * E2E: MonthlyReflection overlay
 *
 * Triggers once per month within the first 5 days of a new month.
 * 4 steps: wrapped → recap → intention → close (auto-dismisses after 3s).
 *
 * Strategy:
 *   1. Install fake clock at 2025-01-03 14:00 (Friday, day 3 ≤ 5).
 *   2. Seed store with monthlyReflectionShownMonth='2024-12' (past month)
 *      and completedTotal ≥ 3 to pass the guard.
 *   3. Navigate to home, fast-forward 2500ms to fire the 2000ms setTimeout.
 *
 * Important: page.clock.install() also patches requestAnimationFrame. After
 * any runFor() call the clock freezes, so AnimatePresence step transitions
 * stall (motion/react uses rAF internally). Fix: call runFor(500) after each
 * click that triggers a step change to let rAF callbacks fire.
 * MonthlyReflection hardcodes `duration: 0.35` on transitions, so
 * `reducedStimulation: true` alone is insufficient — clock advancement is needed.
 *
 * Guards verified:
 *   Jan 3 = Friday (day=5) → WeeklyPlanning guard blocks (not Sun/Mon).
 *   14:00 < 21:00 → ShutdownRitual guard blocks.
 *   lastSessionAt 1h ago → RecoveryProtocol (72h threshold) blocks.
 *
 * All Supabase calls mocked via helpers.mockSupabase().
 */
import { test, expect, seedStore } from './helpers'
import type { Page } from '@playwright/test'

// ── Time fixture ───────────────────────────────────────────────────────────────

/** 2025-01-03, 14:00 — Friday, day 3 ≤ 5, satisfies monthly guard. */
const JAN_3_2PM = new Date('2025-01-03T14:00:00')

// ── Store seed ─────────────────────────────────────────────────────────────────

function monthlyStore(extra: Record<string, unknown> = {}) {
  return {
    completedTotal: 15,
    currentStreak: 5,
    longestStreak: 8,
    xpTotal: 320,
    achievements: [],
    // monthlyReflectionShownMonth '2024-12' ≠ '2025-01' → overlay triggers
    monthlyReflectionShownMonth: '2024-12',
    firstFocusTutorialCompleted: true,
    // lastSessionAt 1h before clock — well below 72h recovery threshold
    lastSessionAt: new Date(JAN_3_2PM.getTime() - 60 * 60 * 1000).toISOString(),
    recoveryShown: false,
    // 14:00 < 21:00 → ShutdownRitual guard blocks
    shutdownShownDate: JAN_3_2PM.toISOString().split('T')[0],
    // Jan 3 = Friday → WeeklyPlanning guard blocks (not Sun/Mon)
    weeklyPlanShownWeek: '2024-W01',
    // reducedStimulation helps with some animations but MonthlyReflection
    // hardcodes duration: 0.35 — use runFor(500) after clicks instead
    reducedStimulation: true,
    ...extra,
  }
}

// ── Clock helpers ──────────────────────────────────────────────────────────────

/** Navigate with fake clock, advance 2500ms to fire the 2000ms overlay timeout. */
async function gotoWithClock(page: Page, path = '/') {
  await page.clock.install({ time: JAN_3_2PM })
  await page.goto(path)
  await page.clock.runFor(2500)
}

/**
 * Click a button and advance the fake clock so rAF-based step transitions
 * (AnimatePresence) complete. Needed because page.clock.install() patches
 * requestAnimationFrame — the clock must advance for rAF to fire.
 *
 * React 18 schedules state updates via MessageChannel (not patched by the fake
 * clock). The MessageChannel fires asynchronously, but only between CDP round-
 * trips — not while page.clock.runFor() is executing. By calling runFor in a
 * tight loop we maximise the number of CDP round-trips, giving the scheduler
 * many opportunities to commit the state update before AnimatePresence exit
 * animations need rAF ticks.
 */
async function clickAndAdvance(page: Page, button: ReturnType<Page['getByRole']>) {
  await button.click()
  // 30 × 50ms = 1500ms total — enough for any step transition animation.
  for (let i = 0; i < 30; i++) {
    await page.clock.runFor(50)
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────────

test.describe('MonthlyReflection overlay', () => {
  test('appears on day 3 of month with wrapped heading', async ({ authedPage: page }) => {
    await seedStore(page, monthlyStore())
    await gotoWithClock(page)

    // Step 'wrapped' — MonthlyWrappedStep: "Your December Wrapped"
    await expect(
      page.getByText('Your December Wrapped')
    ).toBeVisible({ timeout: 6000 })
  })

  test('"Continue →" advances from wrapped to recap step', async ({ authedPage: page }) => {
    await seedStore(page, monthlyStore())
    await gotoWithClock(page)

    await expect(page.getByText('Your December Wrapped')).toBeVisible({ timeout: 6000 })

    // Continue button (aria-label="Continue to recap") — advance clock for rAF
    await clickAndAdvance(page, page.getByRole('button', { name: 'Continue to recap' }))

    // Recap step heading (monthly.monthIsHere = "{{month}} is here" → "January is here")
    await expect(page.getByText('January is here')).toBeVisible({ timeout: 5000 })
  })

  test('"Skip" on recap step dismisses overlay', async ({ authedPage: page }) => {
    await seedStore(page, monthlyStore())
    await gotoWithClock(page)

    await expect(page.getByText('Your December Wrapped')).toBeVisible({ timeout: 6000 })
    await clickAndAdvance(page, page.getByRole('button', { name: 'Continue to recap' }))
    await expect(page.getByText('January is here')).toBeVisible({ timeout: 5000 })

    // Skip button (aria-label="Skip monthly reflection")
    await page.getByRole('button', { name: 'Skip monthly reflection' }).click()

    // Overlay dismissed
    await expect(page.getByText('Your December Wrapped')).not.toBeVisible({ timeout: 3000 })
  })

  test('"Set intention" on recap advances to intention step', async ({ authedPage: page }) => {
    await seedStore(page, monthlyStore())
    await gotoWithClock(page)

    await expect(page.getByText('Your December Wrapped')).toBeVisible({ timeout: 6000 })
    await clickAndAdvance(page, page.getByRole('button', { name: 'Continue to recap' }))
    await expect(page.getByText('January is here')).toBeVisible({ timeout: 5000 })

    // CTA button (aria-label="Set monthly intention") — advance for rAF
    await clickAndAdvance(page, page.getByRole('button', { name: 'Set monthly intention' }))

    // Intention step — monthly.oneWord = "One word for {{month}}"
    await expect(page.getByText('One word for January')).toBeVisible({ timeout: 5000 })
  })

  test('tapping a quick-pick chip and submitting advances to close step', async ({ authedPage: page }) => {
    await seedStore(page, monthlyStore())
    await gotoWithClock(page)

    await expect(page.getByText('Your December Wrapped')).toBeVisible({ timeout: 6000 })
    await clickAndAdvance(page, page.getByRole('button', { name: 'Continue to recap' }))
    await expect(page.getByText('January is here')).toBeVisible({ timeout: 5000 })
    await clickAndAdvance(page, page.getByRole('button', { name: 'Set monthly intention' }))
    await expect(page.getByText('One word for January')).toBeVisible({ timeout: 5000 })

    // Tap the "Flow 🌊" quick-pick chip (aria-label = "Set intention: Flow")
    await page.getByRole('button', { name: 'Set intention: Flow' }).click()

    // Submit button aria-label stays "Set monthly intention" regardless of text content
    // (text changes to "January: 'Flow' 🌱" once filled — aria-label is stable)
    await clickAndAdvance(page, page.getByRole('button', { name: 'Set monthly intention' }).last())

    // Close step — "Closing in a moment..."
    await expect(page.getByText('Closing in a moment...')).toBeVisible({ timeout: 5000 })
  })

  test('close step auto-dismisses after 3 seconds', async ({ authedPage: page }) => {
    await seedStore(page, monthlyStore())
    await gotoWithClock(page)

    await expect(page.getByText('Your December Wrapped')).toBeVisible({ timeout: 6000 })
    await clickAndAdvance(page, page.getByRole('button', { name: 'Continue to recap' }))
    await expect(page.getByText('January is here')).toBeVisible({ timeout: 5000 })
    await clickAndAdvance(page, page.getByRole('button', { name: 'Set monthly intention' }))
    await expect(page.getByText('One word for January')).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: 'Set intention: Flow' }).click()
    await clickAndAdvance(page, page.getByRole('button', { name: 'Set monthly intention' }).last())
    await expect(page.getByText('Closing in a moment...')).toBeVisible({ timeout: 5000 })

    // Advance past the 3000ms auto-dismiss setTimeout in close step
    await page.clock.runFor(3500)

    // Overlay gone
    await expect(page.getByText('Closing in a moment...')).not.toBeVisible({ timeout: 3000 })
  })

  test('does NOT appear when monthlyReflectionShownMonth is current month', async ({ authedPage: page }) => {
    // '2025-01' matches clock date → guard blocks overlay
    await seedStore(page, monthlyStore({ monthlyReflectionShownMonth: '2025-01' }))
    await gotoWithClock(page)

    await expect(page.getByText('Your December Wrapped')).not.toBeVisible({ timeout: 4000 })
  })

  test('does NOT appear when completedTotal is below threshold', async ({ authedPage: page }) => {
    // completedTotal < 3 → guard blocks overlay
    await seedStore(page, monthlyStore({ completedTotal: 2 }))
    await gotoWithClock(page)

    await expect(page.getByText('Your December Wrapped')).not.toBeVisible({ timeout: 4000 })
  })

  test('does NOT appear after day 5 of the month', async ({ authedPage: page }) => {
    // January 10 — getDate() = 10 > 5 → guard blocks
    const JAN_10 = new Date('2025-01-10T14:00:00')
    await seedStore(page, monthlyStore())
    await page.clock.install({ time: JAN_10 })
    await page.goto('/')
    await page.clock.runFor(2500)

    await expect(page.getByText('Your December Wrapped')).not.toBeVisible({ timeout: 4000 })
  })
})
