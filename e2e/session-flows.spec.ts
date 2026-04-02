/**
 * E2E: Session-adjacent flows — park-it, task undo, NatureBuffer
 *
 * Covers the three flows identified as uncovered in the E2E audit:
 *  1. Park it (NOW → NEXT snooze via TaskCard action button)
 *  2. Task completion undo (4s window, undo action in sonner toast)
 *  3. NatureBuffer post-session screen (shown after a completed session)
 *
 * All Supabase calls mocked via helpers.mockSupabase().
 */
import { test, expect, seedStore } from './helpers'

// ── Shared task fixture ────────────────────────────────────────────────────────

function makeTask(id: string, pool: 'now' | 'next' = 'now') {
  return {
    id,
    title: 'Test task for E2E',
    pool,
    status: 'active',
    difficulty: 1,
    estimatedMinutes: 25,
    position: 0,
    createdAt: new Date().toISOString(),
    completedAt: null,
    snoozeCount: 0,
    parentTaskId: null,
    dueDate: null,
    dueTime: null,
    taskType: 'task',
    reminderSentAt: null,
    repeat: 'none',
    note: null,
    category: null,
  }
}

// ── 1. Park it ─────────────────────────────────────────────────────────────────

test.describe('Park it (snooze NOW → NEXT)', () => {
  test('task card shows "Park it →" button', async ({ authedPage: page }) => {
    await seedStore(page, { nowPool: [makeTask('park-test-001')] })
    await page.goto('/tasks')

    await expect(page.getByText('Test task for E2E')).toBeVisible({ timeout: 8000 })
    // Park button rendered in TaskCard action row (exact label from en.json taskCard.park)
    await expect(page.locator('button[aria-label*="Park it →"]')).toBeVisible()
  })

  test('clicking "Park it →" moves task from NOW to NEXT', async ({ authedPage: page }) => {
    await seedStore(page, {
      nowPool: [makeTask('park-test-002')],
      nextPool: [],
    })
    await page.goto('/tasks')

    await expect(page.getByText('1/3')).toBeVisible({ timeout: 8000 })

    await page.locator('button[aria-label*="Park it →"]').click()

    // NOW pool empties, NEXT pool gains 1
    await expect(page.getByText('0/3')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('1/6')).toBeVisible()
  })

  test('parked task no longer appears in NOW pool', async ({ authedPage: page }) => {
    await seedStore(page, {
      nowPool: [makeTask('park-test-003')],
      nextPool: [],
    })
    await page.goto('/tasks')

    await expect(page.getByText('Test task for E2E')).toBeVisible({ timeout: 8000 })
    await page.locator('button[aria-label*="Park it →"]').click()

    // Task should move out of the NOW section
    await expect(page.getByText('0/3')).toBeVisible({ timeout: 5000 })
  })
})

// ── 2. Task completion undo ────────────────────────────────────────────────────

test.describe('Task completion undo', () => {
  test('completing a task shows "✓ Done" button state', async ({ authedPage: page }) => {
    await seedStore(page, { nowPool: [makeTask('undo-test-001')] })
    await page.goto('/tasks')

    await expect(page.getByText('Test task for E2E')).toBeVisible({ timeout: 8000 })

    // Done button (from en.json taskCard.done = "✓ Done")
    const doneBtn = page.getByRole('button', { name: '✓ Done: Test task for E2E', exact: true })
    await expect(doneBtn).toBeVisible()
    await doneBtn.click()

    // After click: justCompleted state shows doneComplete variant
    // Toast with Undo action appears (sonner toast with action button)
    await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeVisible({ timeout: 4000 })
  })

  test('clicking Undo in toast restores the task to NOW pool', async ({ authedPage: page }) => {
    await seedStore(page, { nowPool: [makeTask('undo-restore-001')] })
    await page.goto('/tasks')

    await expect(page.getByText('Test task for E2E')).toBeVisible({ timeout: 8000 })
    await expect(page.getByText('1/3')).toBeVisible()

    // Complete
    await page.getByRole('button', { name: '✓ Done: Test task for E2E', exact: true }).click()

    // Undo immediately
    const undoBtn = page.getByRole('button', { name: 'Undo', exact: true })
    await expect(undoBtn).toBeVisible({ timeout: 3000 })
    await undoBtn.click()

    // Task restored — NOW pool back to 1/3
    await expect(page.getByText('1/3')).toBeVisible({ timeout: 3000 })
    await expect(page.getByText('Test task for E2E')).toBeVisible()
  })

  test('undo toast disappears after 4 seconds without interaction', async ({ authedPage: page }) => {
    await seedStore(page, { nowPool: [makeTask('undo-expire-001')] })
    await page.goto('/tasks')

    await expect(page.getByText('Test task for E2E')).toBeVisible({ timeout: 8000 })
    await page.getByRole('button', { name: '✓ Done: Test task for E2E', exact: true }).click()

    // Toast visible
    await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeVisible({ timeout: 3000 })

    // Wait 5s — toast should have dismissed (duration=3000 in Toaster + 4s undo window)
    await page.waitForTimeout(5000)
    await expect(page.getByRole('button', { name: 'Undo', exact: true })).not.toBeVisible()
  })
})

// ── 3. NatureBuffer post-session ───────────────────────────────────────────────

test.describe('NatureBuffer post-session screen', () => {
  test('NatureBuffer shows energy check-in after session end', async ({ authedPage: page }) => {
    await seedStore(page, {
      nowPool: [makeTask('nature-test-001')],
      timerStyle: 'countdown',
    })
    await page.goto('/focus')

    // Select 5-minute preset
    await page.getByRole('button', { name: /^5 minutes/ }).click()

    // Start (BreathworkRitual is z-50 — skip it)
    await page.getByRole('button', { name: 'Start focus session with breathing ritual', exact: true }).click()
    await page.getByRole('button', { name: 'Skip breathing ritual', exact: true }).click()

    // End session deliberately
    await page.getByRole('button', { name: /end session|stop/i }).click()

    // Interrupt confirm — confirm end
    const confirmEnd = page.getByRole('button', { name: /end.*session|yes.*end|confirm/i }).first()
    if (await confirmEnd.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmEnd.click()
    }

    // Bookmark capture — skip if shown
    const skipBookmark = page.getByRole('button', { name: /skip|no bookmark|done/i }).first()
    if (await skipBookmark.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skipBookmark.click()
    }

    // NatureBuffer screen — energy picker heading (from en.json focus.howAreYouFeeling or similar)
    // The NatureBuffer shows "How are you feeling?" or energy emoji buttons 1-5
    await expect(
      page.getByText(/feeling|energy|breath|moment/i).first()
    ).toBeVisible({ timeout: 8000 })
  })

  test('NatureBuffer skip button is visible during buffer screen', async ({ authedPage: page }) => {
    await seedStore(page, {
      nowPool: [makeTask('nature-skip-001')],
      timerStyle: 'countdown',
    })
    await page.goto('/focus')

    await page.getByRole('button', { name: /^5 minutes/ }).click()
    await page.getByRole('button', { name: 'Start focus session with breathing ritual', exact: true }).click()
    await page.getByRole('button', { name: 'Skip breathing ritual', exact: true }).click()

    // Session is running — end it
    await page.getByRole('button', { name: 'End session', exact: true }).click()

    // Interrupt confirm screen
    await page.getByRole('button', { name: /end.*session|stop.*session/i }).first().click()

    // Bookmark capture — skip if shown
    const skipBookmark = page.getByRole('button', { name: /skip/i }).first()
    if (await skipBookmark.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skipBookmark.click()
    }

    // NatureBuffer shown — a "Skip" button must be present
    await expect(
      page.getByRole('button', { name: /skip/i }).first()
    ).toBeVisible({ timeout: 8000 })
  })
})
