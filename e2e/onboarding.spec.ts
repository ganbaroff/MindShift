/**
 * E2E: Onboarding flow (3 screens)
 *
 * Step 1 (screen 0): Intent / App Mode selection — 3 options (auto-advance on tap)
 * Step 2 (screen 1): Energy check-in — EnergyPicker with 5 emoji levels (Continue button)
 * Step 3 (screen 2): Ready screen — "You're all set." + "Let's start →" button
 *
 * After completion -> redirect to HomeScreen.
 */
import { test, expect, seedStore } from './helpers'

test.describe('Onboarding flow', () => {
  test.beforeEach(async ({ authedPage: page }) => {
    // Seed with onboarding NOT completed so the full flow is accessible
    await seedStore(page, { onboardingCompleted: false })
    await page.goto('/onboarding')
  })

  test('step 1: shows intent selection with 3 options', async ({ authedPage: page }) => {
    // Step indicator
    await expect(page.getByText('Step 1 of 3')).toBeVisible()

    // Title
    await expect(page.getByText('What brings you here today?')).toBeVisible()

    // 3 intent options
    await expect(page.getByText('One thing at a time')).toBeVisible()
    await expect(page.getByText('Build daily habits')).toBeVisible()
    await expect(page.getByText('Full picture')).toBeVisible()
  })

  test('selecting an option auto-advances to step 2', async ({ authedPage: page }) => {
    // Select first option — auto-advances after 160ms
    await page.getByText('One thing at a time').click()

    // Should now be on energy check-in (step 2)
    await expect(page.getByText('Step 2 of 3')).toBeVisible({ timeout: 3000 })
    await expect(page.getByText("How's your brain right now?")).toBeVisible()
  })

  test('step 2: shows 5 energy options (emoji picker)', async ({ authedPage: page }) => {
    // Navigate to step 2 (auto-advance from step 1)
    await page.getByText('One thing at a time').click()
    await expect(page.getByText('Step 2 of 3')).toBeVisible({ timeout: 3000 })

    // Should show energy check-in heading
    await expect(page.getByText("How's your brain right now?")).toBeVisible()

    // EnergyPicker renders 5 buttons with emoji + labels
    await expect(page.getByText('Drained')).toBeVisible()
    await expect(page.getByText('Low')).toBeVisible()
    await expect(page.getByText('Okay')).toBeVisible()
    await expect(page.getByText('Good')).toBeVisible()
    await expect(page.getByText('Wired')).toBeVisible()
  })

  test('step 2: Continue is always enabled (no selection required)', async ({ authedPage: page }) => {
    // Navigate to step 2
    await page.getByText('One thing at a time').click()
    await expect(page.getByText('Step 2 of 3')).toBeVisible({ timeout: 3000 })

    // Continue should be enabled without any explicit selection (default energy pre-selected)
    const continueBtn = page.getByRole('button', { name: /Continue/ })
    await expect(continueBtn).toBeEnabled()

    // Click Continue to advance to step 3
    await continueBtn.click()
    await expect(page.getByText('Step 3 of 3')).toBeVisible()
  })

  test('step 3: shows ready screen', async ({ authedPage: page }) => {
    // Navigate through steps 1 and 2
    await page.getByText('One thing at a time').click()
    await expect(page.getByText('Step 2 of 3')).toBeVisible({ timeout: 3000 })
    await page.getByRole('button', { name: /Continue/ }).click()

    // Step indicator
    await expect(page.getByText('Step 3 of 3')).toBeVisible()

    // Ready screen content
    await expect(page.getByText("You're all set.")).toBeVisible()
    await expect(page.getByRole('button', { name: /Let's start/ })).toBeVisible()
  })

  test('completing all 3 steps redirects to home', async ({ authedPage: page }) => {
    // Step 1: select intent (auto-advances)
    await page.getByText('One thing at a time').click()

    // Step 2: energy (Continue button)
    await expect(page.getByText('Step 2 of 3')).toBeVisible({ timeout: 3000 })
    await page.getByRole('button', { name: /Continue/ }).click()

    // Step 3: ready screen — "Let's start →"
    await expect(page.getByText('Step 3 of 3')).toBeVisible({ timeout: 3000 })
    await page.getByRole('button', { name: /Let's start/ }).click()

    // Should redirect to home
    await page.waitForURL('**/', { timeout: 5000 })
  })
})
