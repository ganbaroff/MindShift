/**
 * E2E: Onboarding flow (4 screens)
 *
 * Step 1 (screen 0): Intent / App Mode selection — 3 options (One thing at a time / Build daily habits / Full picture)
 * Step 2 (screen 1): Energy check-in — EnergyPicker with 5 emoji levels
 * Step 3 (screen 2): Timer style — 3 options (Countdown / Count-up / Surprise)
 * Step 4 (screen 3): Cognitive mode — 2 options (Yes — one at a time / No — show everything)
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

  test('selecting an option enables Continue and advances to step 2', async ({ authedPage: page }) => {
    // Continue should be disabled before selection
    const continueBtn = page.getByRole('button', { name: /Continue/ })
    await expect(continueBtn).toBeDisabled()

    // Select first option
    await page.getByText('One thing at a time').click()

    // Continue should now be enabled
    await expect(continueBtn).toBeEnabled()

    // Click Continue to advance
    await continueBtn.click()

    // Should now be on energy check-in (step 2)
    await expect(page.getByText('Step 2 of 5')).toBeVisible()
    await expect(page.getByText("How's your brain right now?")).toBeVisible()
  })

  test('step 2: shows 5 energy options (emoji picker)', async ({ authedPage: page }) => {
    // Navigate to step 2
    await page.getByText('One thing at a time').click()
    await page.getByRole('button', { name: /Continue/ }).click()

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
    await page.getByRole('button', { name: /Continue/ }).click()

    // Continue should be enabled without any explicit selection (default energy pre-selected)
    const continueBtn = page.getByRole('button', { name: /Continue/ })
    await expect(continueBtn).toBeEnabled()

    // Click Continue to advance to step 3
    await continueBtn.click()
    await expect(page.getByText('Step 3 of 5')).toBeVisible()
  })

  test('step 3: shows 3 timer style options', async ({ authedPage: page }) => {
    // Navigate through steps 1 and 2
    await page.getByText('One thing at a time').click()
    await page.getByRole('button', { name: /Continue/ }).click()
    await page.getByRole('button', { name: /Continue/ }).click()

    // Step indicator
    await expect(page.getByText('Step 3 of 5')).toBeVisible()

    // Title
    await expect(page.getByText('How do you want to see your timer?')).toBeVisible()

    // 3 timer options
    await expect(page.getByText('Countdown')).toBeVisible()
    await expect(page.getByText('Count-up')).toBeVisible()
    await expect(page.getByText('Surprise')).toBeVisible()
  })

  test('step 3: selecting timer option enables Continue and advances to step 4', async ({ authedPage: page }) => {
    // Navigate through steps 1 and 2
    await page.getByText('One thing at a time').click()
    await page.getByRole('button', { name: /Continue/ }).click()
    await page.getByRole('button', { name: /Continue/ }).click()

    // Continue should be disabled before selection
    const continueBtn = page.getByRole('button', { name: /Continue/ })
    await expect(continueBtn).toBeDisabled()

    // Select Countdown
    await page.getByText('Countdown').click()
    await expect(continueBtn).toBeEnabled()

    // Advance to step 4
    await continueBtn.click()
    await expect(page.getByText('Step 4 of 5')).toBeVisible()
  })

  test('step 4: shows 2 task visibility options', async ({ authedPage: page }) => {
    // Navigate through steps 1, 2, and 3
    await page.getByText('Build daily habits').click()
    await page.getByRole('button', { name: /Continue/ }).click()
    await page.getByRole('button', { name: /Continue/ }).click()
    await page.getByText('Countdown').click()
    await page.getByRole('button', { name: /Continue/ }).click()

    // Step indicator
    await expect(page.getByText('Step 4 of 5')).toBeVisible()

    // Title and subtitle
    await expect(page.getByText(/One last question/)).toBeVisible()
    await expect(page.getByText(/Do tasks disappear from your mind/)).toBeVisible()

    // 2 cognitive mode options
    await expect(page.getByText('Yes — one at a time')).toBeVisible()
    await expect(page.getByText('No — show everything')).toBeVisible()
  })

  test('completing all 5 steps redirects to home', async ({ authedPage: page }) => {
    // Step 1: select intent
    await page.getByText('One thing at a time').click()
    await page.getByRole('button', { name: /Continue/ }).click()

    // Step 2: energy (Continue always enabled, just advance)
    await page.getByRole('button', { name: /Continue/ }).click()

    // Step 3: select timer style
    await page.getByText('Countdown').click()
    await page.getByRole('button', { name: /Continue/ }).click()

    // Step 4: select cognitive mode → Continue (no longer the final step)
    await page.getByText('Yes — one at a time').click()
    await page.getByRole('button', { name: /Continue/ }).click()

    // Step 5: notification permission — skip to finish
    await expect(page.getByText('Step 5 of 5')).toBeVisible()
    await expect(page.getByText(/Want gentle reminders/)).toBeVisible()
    await page.getByRole('button', { name: /Skip for now/ }).click()

    // Should redirect to home
    await page.waitForURL('**/', { timeout: 5000 })
  })
})
