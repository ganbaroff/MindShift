/**
 * E2E: ProgressPage — StatsGrid empty-state + render guards (2026-04-19)
 *
 * Observable invariants from the production render pipeline:
 *
 *   • Grid always holds 3 columns — missing Burnout cell would break the
 *     Play Store screenshot composition and fail Foundation Law #6 (predictable
 *     layout for ADHD users).
 *   • Burnout cell never renders the literal string "NaN" — regression cover for
 *     the bug Design-Atlas surfaced on screenshot #04 of the submission set.
 *   • When session data exists (real focus history), the cell renders a finite
 *     integer — not the em-dash placeholder.
 *
 * The em-dash empty-state path is unit-tested in
 *   src/shared/lib/__tests__/burnout.test.ts → `formatBurnoutCell`
 * plus a per-locale a11y-key assertion in the same file. Unit-level coverage
 * is intentional: PR #13's defence-in-depth NaN guards (App.tsx callsite +
 * userSlice setter) normalize the pipeline so the em-dash path is almost
 * never observable end-to-end in a fully-booted app. The pure function test
 * covers the render contract directly.
 */
import { test, expect, mockSupabase, seedStore } from './helpers'

const EM_DASH = '\u2014'

test.describe('Progress — StatsGrid render contract', () => {
  test('Burnout cell never renders the literal string "NaN"', async ({ page }) => {
    await mockSupabase(page)
    await seedStore(page, {
      burnoutScore: NaN,
      completedTotal: 0,
      nowPool: [],
      nextPool: [],
      somedayPool: [],
      achievements: [],
      weeklyStats: null,
    })
    await page.goto('/progress')
    await page.waitForLoadState('networkidle')

    const burnoutCell = page
      .locator('div')
      .filter({ has: page.getByText('Burnout score', { exact: true }) })
      .first()
    const valueText = await burnoutCell
      .locator('span.text-\\[18px\\]')
      .first()
      .textContent()

    expect(valueText, 'Burnout cell must never render the literal string "NaN"').not.toBe('NaN')
    // Must be either a finite integer (from the computed pipeline) OR the em-dash.
    expect(
      valueText === EM_DASH || /^-?\d+$/.test(valueText ?? ''),
      `expected em-dash or finite integer, got ${JSON.stringify(valueText)}`
    ).toBe(true)
  })

  test('Burnout cell renders a finite integer when the score is a real number', async ({ page }) => {
    await mockSupabase(page)
    await seedStore(page, {
      burnoutScore: 42,
      completedTotal: 12,
      nowPool: [],
      nextPool: [],
      somedayPool: [],
      achievements: [],
      weeklyStats: null,
    })
    await page.goto('/progress')
    await page.waitForLoadState('networkidle')

    const burnoutCell = page
      .locator('div')
      .filter({ has: page.getByText('Burnout score', { exact: true }) })
      .first()
    const valueText = await burnoutCell
      .locator('span.text-\\[18px\\]')
      .first()
      .textContent()

    expect(valueText).toMatch(/^-?\d+$/)
    expect(valueText).not.toBe(EM_DASH)
  })

  test('StatsGrid holds 3 columns even when burnout data is missing', async ({ page }) => {
    await mockSupabase(page)
    await seedStore(page, {
      burnoutScore: NaN,
      completedTotal: 0,
      nowPool: [],
      nextPool: [],
      somedayPool: [],
      achievements: [],
      weeklyStats: null,
    })
    await page.goto('/progress')
    await page.waitForLoadState('networkidle')

    const gridCells = page.locator('div.grid.grid-cols-3 > div')
    await expect(gridCells).toHaveCount(3)
  })
})
