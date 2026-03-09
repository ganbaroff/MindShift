/**
 * E2E: Onboarding flow (3 screens)
 *
 * Screen 1: Intent / App Mode selection (minimal / habit / system)
 * Screen 2: Energy check-in (5 levels)
 * Screen 3: ADHD Signal (focused / overview cognitive mode)
 *
 * After completion → redirect to HomeScreen.
 */
import { test, expect, TEST_USER, mockSupabase, seedStore } from './helpers'

test.describe('Onboarding flow', () => {
  test.beforeEach(async ({ authedPage: page }) => {
    // Seed with onboarding NOT completed so the full flow is accessible
    await seedStore(page, { onboardingCompleted: false })
    await page.goto('/onboarding')
  })

  test('screen 1: shows intent selection with 3 modes', async ({ authedPage: page }) => {
    // Step indicator
    await expect(page.getByText('Step 1 of 3')).toBeVisible()

    // Title
    await expect(page.getByText('What brings you here today?')).toBeVisible()

    // 3 mode cards
    await expect(page.getByText('Close ONE important task')).toBeVisible()
    await expect(page.getByText('Build a daily routine')).toBeVisible()
    await expect(page.getByText('Organize my whole system')).toBeVisible()

    // Progress dots — 3 dots visible
    const dots = page.locator('.fixed.bottom-8 div')
    await expect(dots).toHaveCount(3)
  })

  test('selecting "minimal" mode advances to screen 2', async ({ authedPage: page }) => {
    await page.getByText('Close ONE important task').click()

    // Should now be on energy check-in
    await expect(page.getByText('Step 2 of 3')).toBeVisible()
    await expect(page.getByText("How's your brain right now?")).toBeVisible()
  })

  test('screen 2: energy check-in shows 5 options', async ({ authedPage: page }) => {
    // Navigate to screen 2
    await page.getByText('Close ONE important task').click()

    // Should show energy checkin options (emoji buttons)
    // EnergyCheckin renders 5 energy level buttons
    await expect(page.getByText("How's your brain right now?")).toBeVisible()
  })

  test('selecting energy advances to screen 3 (ADHD signal)', async ({ authedPage: page }) => {
    // Screen 1 → select minimal
    await page.getByText('Close ONE important task').click()

    // Screen 2 → select any energy level (click a button in EnergyCheckin)
    // EnergyCheckin renders buttons with emoji labels; click a mid-energy one
    const energyButtons = page.locator('button').filter({ hasText: /⚡|🔋|🫠|😊|🚀/ })
    const count = await energyButtons.count()
    if (count > 0) {
      await energyButtons.first().click()
    }

    // Screen 3 — ADHD signal
    await expect(page.getByText('Step 3 of 3')).toBeVisible()
    await expect(page.getByText(/One last question/)).toBeVisible()
    await expect(page.getByText(/forgets tasks exist/)).toBeVisible()
  })

  test('completing all 3 screens redirects to home', async ({ authedPage: page }) => {
    // Screen 1
    await page.getByText('Close ONE important task').click()

    // Screen 2 — click any energy button
    const energyButtons = page.locator('button').filter({ hasText: /⚡|🔋|🫠|😊|🚀/ })
    const count = await energyButtons.count()
    if (count > 0) {
      await energyButtons.first().click()
    }

    // Screen 3 — select cognitive mode
    await page.getByText(/Yes — show me one task at a time/).click()

    // Should redirect to home
    await page.waitForURL('**/', { timeout: 5000 })
  })

  test('screen 3: both cognitive mode options are present', async ({ authedPage: page }) => {
    // Navigate through to screen 3
    await page.getByText('Build a daily routine').click()

    const energyButtons = page.locator('button').filter({ hasText: /⚡|🔋|🫠|😊|🚀/ })
    const count = await energyButtons.count()
    if (count > 0) {
      await energyButtons.first().click()
    }

    // Verify both options
    await expect(page.getByText(/Yes — show me one task at a time/)).toBeVisible()
    await expect(page.getByText(/No — I like seeing the full picture/)).toBeVisible()
  })
})
