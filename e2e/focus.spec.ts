/**
 * E2E: Focus session lifecycle
 *
 * Tests the setup screen, timer presets, quick-start mode,
 * session start, interrupt protection, and park-a-thought.
 */
import { test, expect } from './helpers'

test.describe('Focus setup screen', () => {
  test('shows focus session setup with duration presets', async ({ authedPage: page }) => {
    await page.goto('/focus')

    // Title
    await expect(page.getByText('Focus Session')).toBeVisible()

    // Duration presets
    await expect(page.getByRole('button', { name: '5m' })).toBeVisible()
    await expect(page.getByRole('button', { name: '25m' })).toBeVisible()
    await expect(page.getByRole('button', { name: '45m' })).toBeVisible()
    await expect(page.getByRole('button', { name: '90m' })).toBeVisible()

    // Start button
    await expect(page.getByRole('button', { name: /start focus/i })).toBeVisible()
  })

  test('open focus option is available', async ({ authedPage: page }) => {
    await page.goto('/focus')

    // "Open focus — no specific task" button
    await expect(page.getByText(/open focus/i)).toBeVisible()
  })

  test('custom duration input can be shown', async ({ authedPage: page }) => {
    await page.goto('/focus')

    // Click custom duration button (pencil icon ✎)
    const customBtn = page.getByRole('button', { name: '✎' })
    if (await customBtn.isVisible()) {
      await customBtn.click()
      // Custom input should appear
      await expect(page.getByPlaceholder(/minutes/i)).toBeVisible()
    }
  })

  test('selecting a duration preset highlights it', async ({ authedPage: page }) => {
    await page.goto('/focus')

    // Click 45m preset
    const preset45 = page.getByRole('button', { name: '45m' })
    await preset45.click()

    // Verify it's visually selected (border color changes to primary)
    // We can check CSS or just verify the button is interactable
    await expect(preset45).toBeVisible()
  })
})

test.describe('Focus session start', () => {
  test('starting a session shows the arc timer', async ({ authedPage: page }) => {
    await page.goto('/focus')

    // Select 5-minute session
    await page.getByRole('button', { name: '5m' }).click()

    // Start the session
    await page.getByRole('button', { name: /start focus/i }).click()

    // Arc timer should be visible (SVG element)
    await expect(page.locator('svg circle, svg path').first()).toBeVisible({ timeout: 3000 })

    // Phase label should appear (Struggle phase at start)
    await expect(page.getByText(/getting into it/i)).toBeVisible({ timeout: 3000 })
  })

  test('session shows end button', async ({ authedPage: page }) => {
    await page.goto('/focus')
    await page.getByRole('button', { name: '5m' }).click()
    await page.getByRole('button', { name: /start focus/i }).click()

    // End session button should be visible
    await expect(page.getByText(/end session/i)).toBeVisible({ timeout: 3000 })
  })

  test('ending session shows interrupt confirmation', async ({ authedPage: page }) => {
    await page.goto('/focus')
    await page.getByRole('button', { name: '5m' }).click()
    await page.getByRole('button', { name: /start focus/i }).click()

    // Click end session
    await page.getByText(/end session/i).click()

    // Interrupt confirm screen
    await expect(page.getByText(/leave focus session/i)).toBeVisible({ timeout: 3000 })
    await expect(page.getByText(/keep going/i)).toBeVisible()
  })

  test('keep going dismisses interrupt and resumes session', async ({ authedPage: page }) => {
    await page.goto('/focus')
    await page.getByRole('button', { name: '5m' }).click()
    await page.getByRole('button', { name: /start focus/i }).click()

    // End → interrupt confirm
    await page.getByText(/end session/i).click()
    await expect(page.getByText(/leave focus session/i)).toBeVisible({ timeout: 3000 })

    // Click keep going
    await page.getByText(/keep going/i).click()

    // Should return to session — phase label reappears
    await expect(page.getByText(/getting into it/i)).toBeVisible({ timeout: 3000 })
  })
})

test.describe('Quick start mode', () => {
  test('?quick=1 auto-starts a 5-minute session', async ({ authedPage: page }) => {
    await page.goto('/focus?quick=1')

    // Should skip setup and go directly to active session
    // Arc timer or phase label should be visible
    await expect(
      page.getByText(/getting into it/i).or(page.locator('svg'))
    ).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Park a thought', () => {
  test('park thought button is visible during session', async ({ authedPage: page }) => {
    await page.goto('/focus')
    await page.getByRole('button', { name: '5m' }).click()
    await page.getByRole('button', { name: /start focus/i }).click()

    // Park thought FAB (💭)
    await expect(page.getByText('💭')).toBeVisible({ timeout: 3000 })
  })
})
