/**
 * E2E: WeeklyPlanning overlay
 *
 * The overlay fires once per ISO week on:
 *   - Sunday 18:00+ ("end of week, plan what's next")
 *   - Monday 00:00–11:59 ("new week, set your intention")
 *
 * Strategy:
 *   1. Install Playwright's fake clock fixed at Monday 2025-01-06 10:00 AM.
 *   2. Seed store with completedTotal ≥ 3 and a past ISO week key.
 *   3. Navigate to home, then fast-forward the clock 3 s to fire the
 *      internal 2500 ms setTimeout in useOverlayState.
 *
 * getIsoWeekKey(2025-01-06) === '2025-W02', so seeding PAST_WEEK = '2025-W01'
 * guarantees weeklyPlanShownWeek ≠ current week → overlay appears.
 *
 * All Supabase calls mocked via helpers.mockSupabase().
 */
import { test, expect, seedStore } from './helpers'
import type { Page } from '@playwright/test'

// ── Time fixture ───────────────────────────────────────────────────────────────

/** Monday 2025-01-06, 10:00 AM — satisfies the "Monday before noon" guard. */
const MONDAY_10AM = new Date('2025-01-06T10:00:00')

/**
 * getIsoWeekKey(MONDAY_10AM) === '2025-W02'.
 * We seed PAST_WEEK so the guard weeklyPlanShownWeek !== currentWeek passes.
 */
const PAST_WEEK = '2025-W01'

// ── Store helpers ──────────────────────────────────────────────────────────────

function weeklyStore(extra: Record<string, unknown> = {}) {
  return {
    completedTotal: 10,      // ≥ 3 required to unlock overlay
    currentStreak: 3,        // shows day-streak mini-card in step 0
    weeklyPlanShownWeek: PAST_WEEK,
    firstFocusTutorialCompleted: true,
    // lastSessionAt 1 h before clock — below 72h recovery threshold
    lastSessionAt: new Date(MONDAY_10AM.getTime() - 60 * 60 * 1000).toISOString(),
    recoveryShown: false,
    // Clock is 10 AM → hour < 21, so ShutdownRitual guard blocks it
    shutdownShownDate: MONDAY_10AM.toISOString().split('T')[0],
    // Jan 6 > 5th-day guard → MonthlyReflection won't trigger
    monthlyReflectionShownMonth: '2025-01',
    // Disable motion/react animations — fake clock affects performance.now()
    // which breaks AnimatePresence mode="wait" step transitions on desktop.
    reducedStimulation: true,
    ...extra,
  }
}

// ── Clock helper ───────────────────────────────────────────────────────────────

/**
 * Install a fake clock at MONDAY_10AM, navigate, then advance 3 s to fire
 * the 2500 ms setTimeout inside useOverlayState that shows WeeklyPlanning.
 */
async function gotoWithClock(page: Page, path = '/') {
  await page.clock.install({ time: MONDAY_10AM })
  await page.goto(path)
  // Advance past the 2500 ms internal setTimeout
  await page.clock.runFor(3000)
}

// ── Tests ──────────────────────────────────────────────────────────────────────

test.describe('WeeklyPlanning overlay', () => {
  test('appears on Monday morning with heading and CTA', async ({ authedPage: page }) => {
    await seedStore(page, weeklyStore())
    await gotoWithClock(page)

    // Step 0 heading (weekly.newWeek = "New week, fresh start")
    await expect(
      page.getByRole('heading', { name: 'New week, fresh start' })
    ).toBeVisible({ timeout: 6000 })

    // Primary CTA (weekly.setIntention = "Set my intention →")
    await expect(
      page.getByRole('button', { name: 'Set weekly intention' })
    ).toBeVisible()
  })

  test('"Skip for now" on step 0 dismisses the overlay', async ({ authedPage: page }) => {
    await seedStore(page, weeklyStore())
    await gotoWithClock(page)

    await expect(
      page.getByRole('button', { name: 'Set weekly intention' })
    ).toBeVisible({ timeout: 6000 })

    // weekly.skipForNow = "Skip for now"
    await page.getByRole('button', { name: 'Skip weekly planning' }).first().click()

    // Overlay dismissed — CTA gone
    await expect(
      page.getByRole('button', { name: 'Set weekly intention' })
    ).not.toBeVisible({ timeout: 3000 })
  })

  test('advancing to step 1 shows all 4 intention chips', async ({ authedPage: page }) => {
    await seedStore(page, weeklyStore())
    await gotoWithClock(page)

    await expect(
      page.getByRole('button', { name: 'Set weekly intention' })
    ).toBeVisible({ timeout: 6000 })

    await page.getByRole('button', { name: 'Set weekly intention' }).click()

    // Step 1 sub-heading (weekly.weekFocus)
    await expect(
      page.getByText("What's your focus this week?")
    ).toBeVisible({ timeout: 3000 })

    // All 4 intention chips — aria-label="Intention: {label}"
    await expect(page.getByRole('button', { name: 'Intention: Stay consistent' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Intention: Take on a challenge' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Intention: Rest & recover' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Intention: Follow curiosity' })).toBeVisible()
  })

  test('picking an intention advances to closing step with finish button', async ({ authedPage: page }) => {
    await seedStore(page, weeklyStore())
    await gotoWithClock(page)

    await expect(
      page.getByRole('button', { name: 'Set weekly intention' })
    ).toBeVisible({ timeout: 6000 })

    await page.getByRole('button', { name: 'Set weekly intention' }).click()

    await expect(
      page.getByRole('button', { name: 'Intention: Stay consistent' })
    ).toBeVisible({ timeout: 3000 })

    // Pick "consistent" — triggers 220ms auto-advance to step 2
    await page.getByRole('button', { name: 'Intention: Stay consistent' }).click()

    // Step 2 finish button (weekly.letsGo = "Let's go 🌿")
    await expect(
      page.getByRole('button', { name: 'Finish weekly planning' })
    ).toBeVisible({ timeout: 2000 })
  })

  test('finishing step 2 closes the overlay', async ({ authedPage: page }) => {
    await seedStore(page, weeklyStore())
    await gotoWithClock(page)

    await expect(
      page.getByRole('button', { name: 'Set weekly intention' })
    ).toBeVisible({ timeout: 6000 })

    await page.getByRole('button', { name: 'Set weekly intention' }).click()

    await expect(
      page.getByRole('button', { name: 'Intention: Follow curiosity' })
    ).toBeVisible({ timeout: 3000 })

    await page.getByRole('button', { name: 'Intention: Follow curiosity' }).click()

    await expect(
      page.getByRole('button', { name: 'Finish weekly planning' })
    ).toBeVisible({ timeout: 2000 })

    await page.getByRole('button', { name: 'Finish weekly planning' }).click()

    // Overlay gone
    await expect(
      page.getByRole('button', { name: 'Finish weekly planning' })
    ).not.toBeVisible({ timeout: 3000 })
  })

  test('"Skip" on step 1 (skipDecide) also dismisses the overlay', async ({ authedPage: page }) => {
    await seedStore(page, weeklyStore())
    await gotoWithClock(page)

    await expect(
      page.getByRole('button', { name: 'Set weekly intention' })
    ).toBeVisible({ timeout: 6000 })

    await page.getByRole('button', { name: 'Set weekly intention' }).click()

    // Step 1 skip (aria-label = "Skip weekly planning", text = weekly.skipDecide)
    await expect(
      page.getByRole('button', { name: 'Skip weekly planning' }).first()
    ).toBeVisible({ timeout: 3000 })

    await page.getByRole('button', { name: 'Skip weekly planning' }).first().click()

    // Overlay dismissed
    await expect(
      page.getByRole('button', { name: 'Set weekly intention' })
    ).not.toBeVisible({ timeout: 3000 })
  })

  test('does NOT appear when weeklyPlanShownWeek is current ISO week', async ({ authedPage: page }) => {
    // '2025-W02' matches getIsoWeekKey(MONDAY_10AM) → guard blocks overlay
    await seedStore(page, weeklyStore({ weeklyPlanShownWeek: '2025-W02' }))
    await gotoWithClock(page)

    // Wait comfortably beyond the 2500 ms timeout — overlay must not appear
    await expect(
      page.getByRole('button', { name: 'Set weekly intention' })
    ).not.toBeVisible({ timeout: 4000 })
  })

  test('does NOT appear when completedTotal is below threshold', async ({ authedPage: page }) => {
    // completedTotal < 3 → guard blocks overlay even on correct day/time
    await seedStore(page, weeklyStore({ completedTotal: 2 }))
    await gotoWithClock(page)

    await expect(
      page.getByRole('button', { name: 'Set weekly intention' })
    ).not.toBeVisible({ timeout: 4000 })
  })
})
