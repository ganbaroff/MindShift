/**
 * E2E: FirstFocusTutorial
 *
 * Covers:
 *  1. Tutorial overlay appears for new users (firstFocusTutorialCompleted: false)
 *  2. Skip button works and marks tutorial done
 *  3. Tutorial does not appear after completion
 *  4. Intro → timer step navigation
 *  5. Timer → celebrate step via "Skip to results"
 *  6. Celebrate → next step via "Got it"
 *  7. Next step "Start for real" completes tutorial
 */

import { test, expect, seedStore, mockSupabase } from './helpers'

test.describe('FirstFocusTutorial', () => {
  test('appears for new users after onboarding', async ({ page }) => {
    await mockSupabase(page)
    await seedStore(page, { firstFocusTutorialCompleted: false })
    await page.goto('/')

    // Tutorial overlay is fullscreen z-50 — intro step should be visible
    await expect(page.getByText('Let\'s try focusing')).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('button', { name: /skip/i })).toBeVisible()
  })

  test('skip button dismisses tutorial and persists completion', async ({ page }) => {
    await mockSupabase(page)
    await seedStore(page, { firstFocusTutorialCompleted: false })
    await page.goto('/')

    await page.getByRole('button', { name: /skip/i }).first().click()

    // Tutorial overlay gone — app renders normally
    await expect(page.getByText('Let\'s try focusing')).not.toBeVisible({ timeout: 3000 })

    // firstFocusTutorialCompleted should be true in persisted store.
    // idbStorage.setItem writes to IDB asynchronously and keeps a backup in
    // localStorage under 'mindshift-store_backup'. Poll until the value
    // propagates (typically < 500 ms).
    await page.waitForFunction(() => {
      const raw = localStorage.getItem('mindshift-store_backup')
        ?? localStorage.getItem('mindshift-store')
      if (!raw) return false
      try {
        const state = (JSON.parse(raw) as { state: { firstFocusTutorialCompleted?: boolean } }).state
        return state.firstFocusTutorialCompleted === true
      } catch {
        return false
      }
    }, undefined, { timeout: 5000 })
    const stored = await page.evaluate(() => {
      const raw = localStorage.getItem('mindshift-store_backup')
        ?? localStorage.getItem('mindshift-store')
      if (!raw) return null
      return (JSON.parse(raw) as { state: { firstFocusTutorialCompleted?: boolean } }).state
        .firstFocusTutorialCompleted
    })
    expect(stored).toBe(true)
  })

  test('does not appear once completed', async ({ page }) => {
    // Default seedStore has firstFocusTutorialCompleted: true
    await mockSupabase(page)
    await seedStore(page)
    await page.goto('/')

    await expect(page.getByText('Let\'s try focusing')).not.toBeVisible({ timeout: 3000 })
  })

  test('intro → timer: clicking "Start 2-min session" shows timer step', async ({ page }) => {
    await mockSupabase(page)
    await seedStore(page, { firstFocusTutorialCompleted: false })
    await page.goto('/')

    // Intro step visible
    await expect(page.getByText('Let\'s try focusing')).toBeVisible({ timeout: 5000 })

    // Click start
    await page.getByRole('button', { name: /start 2-min session/i }).click()

    // Timer step: countdown visible (starts at 2:00)
    await expect(page.getByText('2:00')).toBeVisible({ timeout: 3000 })
    // Phase label visible — starts in "Struggle" phase
    await expect(page.getByText('Struggle')).toBeVisible({ timeout: 3000 })
    // Skip timer button visible
    await expect(page.getByRole('button', { name: /skip to results/i })).toBeVisible()
  })

  test('timer → celebrate: "Skip to results" skips countdown', async ({ page }) => {
    await mockSupabase(page)
    await seedStore(page, { firstFocusTutorialCompleted: false })
    await page.goto('/')

    // Navigate to timer step
    await expect(page.getByText('Let\'s try focusing')).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: /start 2-min session/i }).click()
    await expect(page.getByText('2:00')).toBeVisible({ timeout: 3000 })

    // Skip the countdown
    await page.getByRole('button', { name: /skip to results/i }).click()

    // Celebrate step visible
    await expect(page.getByText('You did it')).toBeVisible({ timeout: 3000 })
    // Phase breakdown visible
    await expect(page.getByText('Struggle')).toBeVisible()
    await expect(page.getByText('Release')).toBeVisible()
    await expect(page.getByText('Flow')).toBeVisible()
    // Continue button visible
    await expect(page.getByRole('button', { name: /got it/i })).toBeVisible()
  })

  test('celebrate → next: "Got it" advances to what\'s next step', async ({ page }) => {
    await mockSupabase(page)
    await seedStore(page, { firstFocusTutorialCompleted: false })
    await page.goto('/')

    // Navigate to celebrate step
    await expect(page.getByText('Let\'s try focusing')).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: /start 2-min session/i }).click()
    await expect(page.getByText('2:00')).toBeVisible({ timeout: 3000 })
    await page.getByRole('button', { name: /skip to results/i }).click()
    await expect(page.getByText('You did it')).toBeVisible({ timeout: 3000 })

    // Advance to next step
    await page.getByRole('button', { name: /got it/i }).click()

    // "What's next" step visible
    await expect(page.getByText('You\'re ready')).toBeVisible({ timeout: 3000 })
    // Tips list visible
    await expect(page.getByText(/add your own tasks/i)).toBeVisible()
    // Final CTA
    await expect(page.getByRole('button', { name: /start for real/i })).toBeVisible()
  })

  test('next step: "Start for real" completes tutorial and navigates to /today', async ({ page }) => {
    await mockSupabase(page)
    await seedStore(page, { firstFocusTutorialCompleted: false })
    await page.goto('/')

    // Navigate all the way to the final step
    await expect(page.getByText('Let\'s try focusing')).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: /start 2-min session/i }).click()
    await expect(page.getByText('2:00')).toBeVisible({ timeout: 3000 })
    await page.getByRole('button', { name: /skip to results/i }).click()
    await expect(page.getByText('You did it')).toBeVisible({ timeout: 3000 })
    await page.getByRole('button', { name: /got it/i }).click()
    await expect(page.getByText('You\'re ready')).toBeVisible({ timeout: 3000 })

    // Complete tutorial
    await page.getByRole('button', { name: /start for real/i }).click()

    // Navigated to /today — tutorial overlay gone
    await expect(page).toHaveURL(/\/today/, { timeout: 5000 })
    await expect(page.getByText('You\'re ready')).not.toBeVisible({ timeout: 3000 })
  })
})
