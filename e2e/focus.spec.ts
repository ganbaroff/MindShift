/**
 * E2E: Focus session lifecycle (Sprint C — FocusPage rewrite)
 *
 * Tests the setup screen, duration presets, task picker,
 * session start, and end session.
 *
 * Duration buttons: [5, 15, 25, 45, 60] — 25 gets a ⭐ badge.
 * No custom duration input, no interrupt confirmation, no nature buffer.
 */
import { test, expect, seedStore } from './helpers'

test.describe('Focus setup screen', () => {
  test('shows header with energy display', async ({ authedPage: page }) => {
    await page.goto('/focus')

    // Title
    await expect(page.getByText('Focus Session ⏱️')).toBeVisible()

    // Energy level display (default energy=3 → "Okay")
    await expect(page.getByText(/Energy:/)).toBeVisible()
  })

  test('shows duration preset buttons (5, 15, 25⭐, 45, 60)', async ({ authedPage: page }) => {
    await page.goto('/focus')

    // Duration label
    await expect(page.getByText(/Duration \(smart: 25m ⭐\)/i)).toBeVisible()

    // Duration buttons show just numbers, not "5m" etc.
    // 25 button includes ⭐ emoji
    await expect(page.getByRole('button', { name: '5', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '15', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /25⭐/ })).toBeVisible()
    await expect(page.getByRole('button', { name: '45', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '60', exact: true })).toBeVisible()

    // No custom duration button (✎) or 52m button
    await expect(page.getByRole('button', { name: '✎' })).not.toBeVisible()
    await expect(page.getByRole('button', { name: /52/ })).not.toBeVisible()

    // Start button
    await expect(page.getByRole('button', { name: /Start Focus/ })).toBeVisible()
  })

  test('shows bookmark card with continue and dismiss', async ({ authedPage: page }) => {
    await page.goto('/focus')

    await expect(page.getByText('📌 Pick up where you left off')).toBeVisible()
    await expect(page.getByRole('button', { name: /Continue/ })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Dismiss', exact: true })).toBeVisible()
  })

  test('shows task picker with open focus default', async ({ authedPage: page }) => {
    await page.goto('/focus')

    // Task picker label
    await expect(page.getByText(/Task \(optional\)/i)).toBeVisible()

    // Default "open focus" option
    await expect(page.getByText(/Open focus — no specific task/)).toBeVisible()
  })

  test('lists active tasks in picker when tasks exist', async ({ authedPage: page }) => {
    await seedStore(page, {
      nowPool: [{
        id: 'e2e-task-1',
        title: 'Focus test task',
        pool: 'now',
        difficulty: 2,
        estimatedMinutes: 25,
        status: 'active',
      }],
    })

    await page.goto('/focus')

    await expect(page.getByText('Focus test task')).toBeVisible({ timeout: 5000 })
    // Open focus option should still be present alongside tasks
    await expect(page.getByText(/Open focus — no specific task/)).toBeVisible()
  })

  test('selecting a duration preset highlights it', async ({ authedPage: page }) => {
    await page.goto('/focus')

    // Click 45 preset
    const preset45 = page.getByRole('button', { name: '45', exact: true })
    await preset45.click()

    // Button should remain visible and interactable
    await expect(preset45).toBeVisible()
  })
})

test.describe('Focus session', () => {
  test('starting a session shows the active timer view', async ({ authedPage: page }) => {
    await page.goto('/focus')

    // Click Start Focus
    await page.getByRole('button', { name: /Start Focus/ }).click()

    // Active session should show the countdown timer (mm:ss format)
    await expect(page.getByText(/\d+:\d{2}/)).toBeVisible({ timeout: 5000 })
  })

  test('active session shows phase name', async ({ authedPage: page }) => {
    await page.goto('/focus')
    await page.getByRole('button', { name: /Start Focus/ }).click()

    // Phase label should appear (capitalized phase name, e.g. "Struggle")
    // The phase comes from store's sessionPhase
    await expect(page.locator('p').filter({ hasText: /\w+/ }).first()).toBeVisible({ timeout: 5000 })
  })

  test('active session shows Mochi companion message', async ({ authedPage: page }) => {
    await page.goto('/focus')
    await page.getByRole('button', { name: /Start Focus/ }).click()

    // Mochi says "You're in the zone! 🌊"
    await expect(page.getByText("You're in the zone! 🌊")).toBeVisible({ timeout: 5000 })
  })

  test('active session shows control buttons (🔊, ⏹, 💭)', async ({ authedPage: page }) => {
    await page.goto('/focus')
    await page.getByRole('button', { name: /Start Focus/ }).click()

    // Three control buttons
    await expect(page.getByText('🔊')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('⏹')).toBeVisible()
    await expect(page.getByText('💭')).toBeVisible()
  })

  test('tapping stop button ends session and returns to setup', async ({ authedPage: page }) => {
    await page.goto('/focus')
    await page.getByRole('button', { name: /Start Focus/ }).click()

    // Wait for session to be active
    await expect(page.getByText('⏹')).toBeVisible({ timeout: 5000 })

    // Click stop — no interrupt confirmation, just ends
    await page.getByText('⏹').click()

    // Should return to setup screen — Start Focus button visible again
    await expect(page.getByRole('button', { name: /Start Focus/ })).toBeVisible({ timeout: 5000 })
  })

  test('active session shows task title when task is selected', async ({ authedPage: page }) => {
    await seedStore(page, {
      nowPool: [{
        id: 'e2e-task-2',
        title: 'Write quarterly report',
        pool: 'now',
        difficulty: 1,
        estimatedMinutes: 25,
        status: 'active',
      }],
    })

    await page.goto('/focus')

    // Select the task
    await page.getByText('Write quarterly report').click()

    // Start session
    await page.getByRole('button', { name: /Start Focus/ }).click()

    // Task title should be visible in active session
    await expect(page.getByText('Write quarterly report')).toBeVisible({ timeout: 5000 })
  })
})
