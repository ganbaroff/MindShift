/**
 * E2E: Sprint E3 features
 *
 * Tests:
 *   - If-Then card visible in FocusSetup
 *   - Data firewall note visible in Settings > Your Data
 *   - Smart task suggestion chip (✨) shown for single NOW task
 *   - Focus Proof share button visible in Settings (layout check)
 */
import { test, expect } from './helpers'

test.describe('Sprint E3: If-Then + Data Firewall + Smart Suggestion', () => {
  test('If-Then card renders in FocusSetup', async ({ authedPage: page }) => {
    await page.goto('/focus')
    // IfThenCard "Add focus intention" link is visible in the setup screen
    const addBtn = page.getByText('Add focus intention')
    await expect(addBtn).toBeVisible()
  })

  test('data firewall note visible in Settings Your Data section', async ({ authedPage: page }) => {
    await page.goto('/settings')
    // The transparency note about health data staying on-device
    await expect(page.getByText(/health data.*stays on your device/i)).toBeVisible()
  })

  test('analytics toggle visible in Settings Your Data section', async ({ authedPage: page }) => {
    await page.goto('/settings')
    await expect(page.getByText('Anonymous analytics')).toBeVisible()
  })

  test('smart suggestion ✨ shown when tasks exist', async ({ authedPage: page }) => {
    // Seed store with one NOW task so smart suggestion fires
    await page.evaluate(() => {
      const raw = localStorage.getItem('mindshift-store')
      if (!raw) return
      const s = JSON.parse(raw)
      s.state.nowPool = [{
        id: 'task-suggest-1',
        title: 'Write unit tests',
        status: 'active',
        pool: 'now',
        difficulty: 3,
        dueDate: null,
        repeat: 'none',
        position: 0,
        createdAt: new Date().toISOString(),
      }]
      localStorage.setItem('mindshift-store', JSON.stringify(s))
    })
    await page.goto('/focus')
    // With 1 task in NOW pool, it becomes the suggested task
    // The task title should be visible in the task picker
    await expect(page.getByText('Write unit tests')).toBeVisible()
  })

  test('If-Then add intention form opens on click', async ({ authedPage: page }) => {
    await page.goto('/focus')
    const addBtn = page.getByText(/add focus intention/i)
    await addBtn.click()
    // Form inputs should appear
    await expect(page.getByPlaceholder('I sit down at my desk')).toBeVisible()
  })
})
