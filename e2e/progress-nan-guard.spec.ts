/**
 * E2E: ProgressPage — StatsGrid NaN guard (2026-04-19 launch-blocker fix)
 *
 * Regression coverage for the Play Store screenshot bug where the Burnout cell
 * rendered the literal string "NaN" when Supabase returned empty focus_sessions
 * and the store's energyLevel was pre-hydration / undefined.
 *
 * Guarded at three layers (StatsGrid render, userSlice setter, App.tsx callsite).
 * This test exercises the terminal render path: empty Supabase → empty
 * weeklyStats → callsite math path → store → StatsGrid. Expectation: "0", never
 * "NaN".
 */
import { test, expect, mockSupabase, seedStore } from './helpers'

test.describe('Progress — StatsGrid NaN guard', () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabase(page)
    // Seed store WITHOUT energyLevel so the App.tsx callsite has to default to 3.
    // This mirrors the capture-script seed-state that produced the original NaN bug.
    await seedStore(page, {
      burnoutScore: NaN,
      completedTotal: 0,
      nowPool: [],
      nextPool: [],
      somedayPool: [],
      achievements: [],
      weeklyStats: null,
    })
  })

  test('Burnout cell renders a finite numeric string, never "NaN"', async ({ page }) => {
    await page.goto('/progress')
    await page.waitForLoadState('networkidle')

    // Locate the Burnout cell by its label text — the stat value sits in the
    // same motion.div as the Burnout score label.
    const burnoutCell = page
      .locator('div')
      .filter({ has: page.getByText('Burnout score', { exact: true }) })
      .first()

    await expect(burnoutCell).toBeVisible()

    // Grab the rendered number — the first text node inside the cell is the value.
    const valueText = await burnoutCell
      .locator('span.text-\\[18px\\]')
      .first()
      .textContent()

    expect(valueText, 'Burnout cell must never render the literal string "NaN"').not.toBe('NaN')
    expect(valueText, 'Burnout cell must render a finite numeric value').toMatch(/^-?\d+$/)
  })

  test('StatsGrid holds 3 columns even when burnout data is missing', async ({ page }) => {
    await page.goto('/progress')
    await page.waitForLoadState('networkidle')

    // Grid-shape integrity — the 3-column invariant is what makes the launch
    // design rule hold; a missing Burnout cell would collapse to 2 cells and
    // break the Play Store screenshot composition.
    const gridCells = page.locator('div.grid.grid-cols-3 > div')
    await expect(gridCells).toHaveCount(3)
  })
})
