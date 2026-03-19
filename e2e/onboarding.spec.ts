/**
 * E2E: Onboarding flow (6 screens)
 *
 * Step 1 (screen 0): Intent / App Mode selection — 3 options (auto-advance on tap)
 * Step 2 (screen 1): Energy check-in — EnergyPicker with 5 emoji levels (Continue button)
 * Step 3 (screen 2): Timer style — 3 options (auto-advance on tap)
 * Step 4 (screen 3): Time blindness — 3 options (auto-advance on tap)
 * Step 5 (screen 4): Emotional reactivity — 3 options (auto-advance on tap)
 * Step 6 (screen 5): Notification permission (Enable + Skip for now)
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
    await expect(page.getByText('Step 1 of 6')).toBeVisible()

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
    await expect(page.getByText('Step 2 of 6')).toBeVisible({ timeout: 3000 })
    await expect(page.getByText("How's your brain right now?")).toBeVisible()
  })

  test('step 2: shows 5 energy options (emoji picker)', async ({ authedPage: page }) => {
    // Navigate to step 2 (auto-advance from step 1)
    await page.getByText('One thing at a time').click()
    await expect(page.getByText('Step 2 of 6')).toBeVisible({ timeout: 3000 })

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
    await expect(page.getByText('Step 2 of 6')).toBeVisible({ timeout: 3000 })

    // Continue should be enabled without any explicit selection (default energy pre-selected)
    const continueBtn = page.getByRole('button', { name: /Continue/ })
    await expect(continueBtn).toBeEnabled()

    // Click Continue to advance to step 3
    await continueBtn.click()
    await expect(page.getByText('Step 3 of 6')).toBeVisible()
  })

  test('step 3: shows 3 timer style options', async ({ authedPage: page }) => {
    // Navigate through steps 1 and 2
    await page.getByText('One thing at a time').click()
    await expect(page.getByText('Step 2 of 6')).toBeVisible({ timeout: 3000 })
    await page.getByRole('button', { name: /Continue/ }).click()

    // Step indicator
    await expect(page.getByText('Step 3 of 6')).toBeVisible()

    // Title
    await expect(page.getByText('How do you want to see your timer?')).toBeVisible()

    // 3 timer options
    await expect(page.getByText('Countdown')).toBeVisible()
    await expect(page.getByText('Count-up')).toBeVisible()
    await expect(page.getByText('Surprise')).toBeVisible()
  })

  test('step 3: selecting timer option auto-advances to step 4', async ({ authedPage: page }) => {
    // Navigate through steps 1 and 2
    await page.getByText('One thing at a time').click()
    await expect(page.getByText('Step 2 of 6')).toBeVisible({ timeout: 3000 })
    await page.getByRole('button', { name: /Continue/ }).click()

    // Select Countdown — auto-advances after 160ms
    await page.getByText('Countdown').click()

    // Advance to step 4 (Time blindness)
    await expect(page.getByText('Step 4 of 6')).toBeVisible({ timeout: 3000 })
    await expect(page.getByText(/How do you experience time/)).toBeVisible()
  })

  test('step 4: shows 3 time blindness options', async ({ authedPage: page }) => {
    // Navigate through steps 1, 2, and 3
    await page.getByText('Build daily habits').click()
    await expect(page.getByText('Step 2 of 6')).toBeVisible({ timeout: 3000 })
    await page.getByRole('button', { name: /Continue/ }).click()
    await page.getByText('Countdown').click()
    await expect(page.getByText('Step 4 of 6')).toBeVisible({ timeout: 3000 })

    // Title
    await expect(page.getByText(/How do you experience time/)).toBeVisible()

    // 3 time blindness options
    await expect(page.getByText('Time vanishes on me')).toBeVisible()
    await expect(page.getByText(/I notice time slipping/)).toBeVisible()
    await expect(page.getByText('I track time naturally')).toBeVisible()
  })

  test('completing all 6 steps redirects to home', async ({ authedPage: page }) => {
    // Step 1: select intent (auto-advances)
    await page.getByText('One thing at a time').click()

    // Step 2: energy (Continue button)
    await expect(page.getByText('Step 2 of 6')).toBeVisible({ timeout: 3000 })
    await page.getByRole('button', { name: /Continue/ }).click()

    // Step 3: select timer style (auto-advances)
    await page.getByText('Countdown').click()

    // Step 4: select time blindness (auto-advances)
    await expect(page.getByText('Step 4 of 6')).toBeVisible({ timeout: 3000 })
    await page.getByText('Time vanishes on me').click()

    // Step 5: select emotional reactivity (auto-advances)
    await expect(page.getByText('Step 5 of 6')).toBeVisible({ timeout: 3000 })
    await page.getByText(/Throws me off completely/).click()

    // Step 6: notification permission — skip to finish
    await expect(page.getByText('Step 6 of 6')).toBeVisible({ timeout: 3000 })
    await expect(page.getByText(/Want gentle reminders/)).toBeVisible()
    await page.getByRole('button', { name: /Skip for now/ }).click()

    // Should redirect to home
    await page.waitForURL('**/', { timeout: 5000 })
  })
})
