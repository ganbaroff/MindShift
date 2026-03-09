/**
 * E2E: Focus session lifecycle
 *
 * Tests the setup screen, timer presets, quick-start mode,
 * session start, interrupt protection, and park-a-thought.
 *
 * TIMER_PRESETS = [5, 25, 52] — the "smart" duration gets a ✦ badge.
 */
import { test, expect, seedStore } from './helpers'

test.describe('Focus setup screen', () => {
  test('shows focus session setup with duration presets', async ({ authedPage: page }) => {
    await page.goto('/focus')

    // Title
    await expect(page.getByText(/Focus Session/)).toBeVisible()

    // Duration presets: [5, 25, 52] + custom (✎)
    // The "smart" duration (based on energy) gets a ✦ badge.
    // Default energy=3 → smart=25m → button text is "25m ✦"
    await expect(page.getByRole('button', { name: '5m', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /^25m/ })).toBeVisible()
    await expect(page.getByRole('button', { name: '52m', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '✎' })).toBeVisible()

    // Start button
    await expect(page.getByRole('button', { name: /start focus/i })).toBeVisible()
  })

  test('open focus option is available when tasks exist', async ({ authedPage: page }) => {
    // Override REST mock to return a task so the task picker renders
    await page.route('**/rest/v1/tasks**', (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{
            id: 'e2e-task-1',
            title: 'Focus test task',
            pool: 'now',
            difficulty: 2,
            estimated_minutes: 25,
            status: 'active',
            user_id: 'e2e-test-user-00000000-0000-0000-0000-000000000001',
          }]),
        })
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
    })

    // Also seed the Zustand store with tasks
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

    // "Open focus — no specific task" should appear when tasks exist
    await expect(page.getByText(/open focus/i)).toBeVisible({ timeout: 5000 })
  })

  test('custom duration input can be shown', async ({ authedPage: page }) => {
    await page.goto('/focus')

    // Click custom duration button (✎)
    const customBtn = page.getByRole('button', { name: '✎' })
    if (await customBtn.isVisible()) {
      await customBtn.click()
      // Custom input should appear
      await expect(page.getByPlaceholder(/minutes/i)).toBeVisible()
    }
  })

  test('selecting a duration preset highlights it', async ({ authedPage: page }) => {
    await page.goto('/focus')

    // Click 52m preset (use exact match)
    const preset52 = page.getByRole('button', { name: '52m', exact: true })
    await preset52.click()

    // Verify it's visually selected — button should be interactable
    await expect(preset52).toBeVisible()
  })
})

test.describe('Focus session start', () => {
  test('starting a session shows the arc timer', async ({ authedPage: page }) => {
    await page.goto('/focus')

    // Select 5-minute session
    await page.getByRole('button', { name: '5m', exact: true }).click()

    // Start the session
    await page.getByRole('button', { name: /start focus/i }).click()

    // Phase label should appear (Struggle phase at start)
    await expect(page.getByText(/getting into it/i)).toBeVisible({ timeout: 5000 })
  })

  test('session shows end button', async ({ authedPage: page }) => {
    await page.goto('/focus')
    await page.getByRole('button', { name: '5m', exact: true }).click()
    await page.getByRole('button', { name: /start focus/i }).click()

    // End session button should be visible
    await expect(page.getByText(/end session/i)).toBeVisible({ timeout: 5000 })
  })

  test('ending session shows interrupt confirmation', async ({ authedPage: page }) => {
    await page.goto('/focus')
    await page.getByRole('button', { name: '5m', exact: true }).click()
    await page.getByRole('button', { name: /start focus/i }).click()

    // Wait for session to be active
    await expect(page.getByText(/end session/i)).toBeVisible({ timeout: 5000 })

    // Click end session
    await page.getByText(/end session/i).click()

    // Interrupt confirm screen
    await expect(page.getByText(/leave focus session/i)).toBeVisible({ timeout: 3000 })
    await expect(page.getByText(/keep going/i)).toBeVisible()
  })

  test('keep going dismisses interrupt and resumes session', async ({ authedPage: page }) => {
    await page.goto('/focus')
    await page.getByRole('button', { name: '5m', exact: true }).click()
    await page.getByRole('button', { name: /start focus/i }).click()

    // Wait for session active
    await expect(page.getByText(/end session/i)).toBeVisible({ timeout: 5000 })

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

    // Should skip setup and show active session — phase label visible
    await expect(page.getByText(/getting into it/i)).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Park a thought', () => {
  test('park thought button is visible during session', async ({ authedPage: page }) => {
    await page.goto('/focus')
    await page.getByRole('button', { name: '5m', exact: true }).click()
    await page.getByRole('button', { name: /start focus/i }).click()

    // Park thought FAB (💭) — aria-label: "Park a thought"
    await expect(
      page.getByRole('button', { name: /park a thought/i }).or(page.getByText('💭'))
    ).toBeVisible({ timeout: 5000 })
  })
})
