/**
 * E2E: Onboarding flow (5 screens)
 *
 * Step 1 (screen 0): Intent / App Mode selection — 3 options (auto-advance on tap)
 * Step 2 (screen 1): Time blindness — 3 options (auto-advance on tap)
 * Step 3 (screen 2): Emotional reactivity — 3 options (auto-advance on tap)
 * Step 4 (screen 3): Energy check-in — EnergyPicker with 5 emoji levels (Continue button)
 * Step 5 (screen 4): Ready screen — "You're all set." + "Let's start →" button
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
    await expect(page.getByText('Step 1 of 5')).toBeVisible()

    // Title
    await expect(page.getByText('What brings you here today?')).toBeVisible()

    // 3 intent options
    await expect(page.getByText('One thing at a time')).toBeVisible()
    await expect(page.getByText('Build daily habits')).toBeVisible()
    await expect(page.getByText('Full picture')).toBeVisible()
  })

  test('selecting intent auto-advances to step 2 (time blindness)', async ({ authedPage: page }) => {
    // Select first option — auto-advances after 160ms
    await page.getByText('One thing at a time').click()

    // Should now be on time blindness (step 2)
    await expect(page.getByText('Step 2 of 5')).toBeVisible({ timeout: 3000 })
    await expect(page.getByText('How do you experience time?', { exact: false })).toBeVisible()
  })

  test('step 2: shows 3 time blindness options', async ({ authedPage: page }) => {
    await page.getByText('One thing at a time').click()
    await expect(page.getByText('Step 2 of 5')).toBeVisible({ timeout: 3000 })

    // Time blindness options
    await expect(page.getByText('Time vanishes on me')).toBeVisible()
    await expect(page.getByText('I notice time slipping sometimes')).toBeVisible()
    await expect(page.getByText('I track time naturally')).toBeVisible()
  })

  test('selecting time blindness auto-advances to step 3 (emotional reactivity)', async ({ authedPage: page }) => {
    await page.getByText('One thing at a time').click()
    await expect(page.getByText('Step 2 of 5')).toBeVisible({ timeout: 3000 })

    await page.getByText('Time vanishes on me').click()

    await expect(page.getByText('Step 3 of 5')).toBeVisible({ timeout: 3000 })
    await expect(page.getByText('When plans change unexpectedly', { exact: false })).toBeVisible()
  })

  test('step 3: shows 3 emotional reactivity options', async ({ authedPage: page }) => {
    await page.getByText('One thing at a time').click()
    await expect(page.getByText('Step 2 of 5')).toBeVisible({ timeout: 3000 })
    await page.getByText('Time vanishes on me').click()
    await expect(page.getByText('Step 3 of 5')).toBeVisible({ timeout: 3000 })

    // Emotional reactivity options
    await expect(page.getByText('Throws me off completely')).toBeVisible()
    await expect(page.getByText('I notice it, then recover')).toBeVisible()
    await expect(page.getByText('Rarely phases me')).toBeVisible()
  })

  test('selecting reactivity auto-advances to step 4 (energy picker)', async ({ authedPage: page }) => {
    await page.getByText('One thing at a time').click()
    await expect(page.getByText('Step 2 of 5')).toBeVisible({ timeout: 3000 })
    await page.getByText('Time vanishes on me').click()
    await expect(page.getByText('Step 3 of 5')).toBeVisible({ timeout: 3000 })
    await page.getByText('Throws me off completely').click()

    await expect(page.getByText('Step 4 of 5')).toBeVisible({ timeout: 3000 })
    await expect(page.getByText("How's your brain right now?")).toBeVisible()
  })

  test('step 4: shows 5 energy options (emoji picker)', async ({ authedPage: page }) => {
    // Navigate to step 4 through first 3 auto-advancing steps
    await page.getByText('One thing at a time').click()
    await expect(page.getByText('Step 2 of 5')).toBeVisible({ timeout: 3000 })
    await page.getByText('Time vanishes on me').click()
    await expect(page.getByText('Step 3 of 5')).toBeVisible({ timeout: 3000 })
    await page.getByText('Throws me off completely').click()
    await expect(page.getByText('Step 4 of 5')).toBeVisible({ timeout: 3000 })

    // EnergyPicker renders 5 buttons with emoji + labels
    await expect(page.getByText('Drained')).toBeVisible()
    await expect(page.getByText('Low')).toBeVisible()
    await expect(page.getByText('Okay')).toBeVisible()
    await expect(page.getByText('Good')).toBeVisible()
    await expect(page.getByText('Wired')).toBeVisible()
  })

  test('step 4: Continue is always enabled (no selection required)', async ({ authedPage: page }) => {
    await page.getByText('One thing at a time').click()
    await expect(page.getByText('Step 2 of 5')).toBeVisible({ timeout: 3000 })
    await page.getByText('Time vanishes on me').click()
    await expect(page.getByText('Step 3 of 5')).toBeVisible({ timeout: 3000 })
    await page.getByText('Throws me off completely').click()
    await expect(page.getByText('Step 4 of 5')).toBeVisible({ timeout: 3000 })

    // Continue should be enabled without any explicit selection (default energy pre-selected)
    const continueBtn = page.getByRole('button', { name: /Continue/ })
    await expect(continueBtn).toBeEnabled()

    // Click Continue to advance to step 5
    await continueBtn.click()
    await expect(page.getByText('Step 5 of 5')).toBeVisible()
  })

  test('step 5: shows ready screen', async ({ authedPage: page }) => {
    // Navigate through all 4 preceding steps
    await page.getByText('One thing at a time').click()
    await expect(page.getByText('Step 2 of 5')).toBeVisible({ timeout: 3000 })
    await page.getByText('Time vanishes on me').click()
    await expect(page.getByText('Step 3 of 5')).toBeVisible({ timeout: 3000 })
    await page.getByText('Throws me off completely').click()
    await expect(page.getByText('Step 4 of 5')).toBeVisible({ timeout: 3000 })
    await page.getByRole('button', { name: /Continue/ }).click()

    // Step indicator
    await expect(page.getByText('Step 5 of 5')).toBeVisible()

    // Ready screen content
    await expect(page.getByText("You're all set.")).toBeVisible()
    await expect(page.getByRole('button', { name: /Let's start/ })).toBeVisible()
  })

  test('completing all 5 steps redirects to home', async ({ authedPage: page }) => {
    // Step 1: select intent (auto-advances)
    await page.getByText('One thing at a time').click()

    // Step 2: time blindness (auto-advances)
    await expect(page.getByText('Step 2 of 5')).toBeVisible({ timeout: 3000 })
    await page.getByText('Time vanishes on me').click()

    // Step 3: emotional reactivity (auto-advances)
    await expect(page.getByText('Step 3 of 5')).toBeVisible({ timeout: 3000 })
    await page.getByText('Throws me off completely').click()

    // Step 4: energy (Continue button)
    await expect(page.getByText('Step 4 of 5')).toBeVisible({ timeout: 3000 })
    await page.getByRole('button', { name: /Continue/ }).click()

    // Step 5: ready screen — "Let's start →"
    await expect(page.getByText('Step 5 of 5')).toBeVisible({ timeout: 3000 })
    await page.getByRole('button', { name: /Let's start/ }).click()

    // Should redirect to home
    await page.waitForURL('**/', { timeout: 5000 })
  })
})
