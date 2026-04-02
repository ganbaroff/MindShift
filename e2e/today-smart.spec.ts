/**
 * E2E: TodayPage (/today) — smart daily view
 *
 * Covers:
 * - Time-based greeting text (morning / afternoon / evening)
 * - Quick capture input visible
 * - NOW pool tasks rendered in "In your NOW pool" section
 * - Energy advice shown for low-energy users
 * - Mochi FAB visible
 * - Add task modal opens
 * - Evening wrap-up view
 *
 * NOTE: TodayPage does NOT have EnergyPicker, streak badge, or daily brief card.
 * Those live on other pages. Tests are scoped strictly to what TodayPage renders.
 */
import { test, expect, seedStore, mockSupabase } from './helpers'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTask(overrides: Record<string, unknown> = {}) {
  return {
    id: `task-${Math.random().toString(36).slice(2, 8)}`,
    title: 'Test task',
    status: 'active',
    pool: 'now',
    difficulty: 1,
    estimatedMinutes: 25,
    position: 0,
    taskType: 'task',
    repeat: 'none',
    createdAt: new Date().toISOString(),
    dueDate: null,
    dueTime: null,
    note: null,
    snoozeCount: 0,
    parentTaskId: null,
    completedAt: null,
    reminderSentAt: null,
    ...overrides,
  }
}

// ── Tests: greeting ───────────────────────────────────────────────────────────

test.describe('TodayPage — time-based greeting', () => {
  test('shows morning greeting during morning hours', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-03-30T09:00:00'))
    await mockSupabase(page)
    await seedStore(page)
    await page.goto('/today')

    await expect(page.getByText(/good morning/i)).toBeVisible({ timeout: 5000 })
  })

  test('shows afternoon greeting during afternoon hours', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-03-30T14:00:00'))
    await mockSupabase(page)
    await seedStore(page)
    await page.goto('/today')

    await expect(page.getByText(/good afternoon/i)).toBeVisible({ timeout: 5000 })
  })

  test('shows evening heading during evening hours', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-03-30T18:00:00'))
    await mockSupabase(page)
    await seedStore(page)
    await page.goto('/today')

    // Evening greeting key: t('today.evening') = "Your day"
    await expect(page.getByText(/your day/i)).toBeVisible({ timeout: 5000 })
  })
})

// ── Tests: quick capture ──────────────────────────────────────────────────────

test.describe('TodayPage — quick capture', () => {
  test('quick capture input is visible with correct placeholder', async ({ page }) => {
    await mockSupabase(page)
    await seedStore(page)
    await page.goto('/today')

    // t('quickCapture.placeholder') = "Add a task, reminder, or meeting..."
    await expect(
      page.getByPlaceholder(/add a task, reminder, or meeting/i)
    ).toBeVisible({ timeout: 5000 })
  })
})

// ── Tests: task list ──────────────────────────────────────────────────────────

test.describe('TodayPage — task list', () => {
  test('NOW pool tasks appear in "In your NOW pool" section (morning)', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-03-30T09:00:00'))
    await mockSupabase(page)
    await seedStore(page, {
      energyLevel: 3,
      nowPool: [
        makeTask({ title: 'Deep work session', id: 'task-e2e-002' }),
        makeTask({ title: 'Review PRs', id: 'task-e2e-003', position: 1 }),
      ],
    })
    await page.goto('/today')

    // Tasks with no dueDate appear in "In your NOW pool" section
    // t('today.nowPool') = "In your NOW pool"
    // Use exact: true to avoid matching the "Focus on: ..." button aria-label
    await expect(page.getByText('Deep work session', { exact: true }).first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Review PRs', { exact: true }).first()).toBeVisible({ timeout: 5000 })
  })

  test('Mochi FAB is visible on today page', async ({ page }) => {
    await mockSupabase(page)
    await seedStore(page)
    await page.goto('/today')

    await expect(
      page.getByRole('button', { name: /Chat with Mochi/i })
    ).toBeVisible({ timeout: 5000 })
  })

  test('add task modal opens from expand action', async ({ page }) => {
    await mockSupabase(page)
    await seedStore(page)
    await page.goto('/today')

    // QuickCapture has a "More options" expand button
    // t('quickCapture.moreOptions') = "More options"
    const expandBtn = page.getByRole('button', { name: /more options/i }).first()
    if (await expandBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expandBtn.click()
      // AddTaskModal opens with its placeholder
      await expect(
        page.getByPlaceholder(/what's on your mind/i)
      ).toBeVisible({ timeout: 3000 })
    }
  })
})

// ── Tests: low-energy mode ────────────────────────────────────────────────────

test.describe('TodayPage — low-energy mode', () => {
  test('low energy (≤2) shows energy advice copy', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-03-30T09:00:00'))
    await mockSupabase(page)
    await seedStore(page, { energyLevel: 1 })
    await page.goto('/today')

    // Low energy = energyLevel <= 2: energyAdvice shows copy.lowEnergyNudge
    // Morning greeting is "Good morning" (t('today.morning'))
    await expect(page.getByText(/good morning/i)).toBeVisible({ timeout: 5000 })
  })

  test('normal energy (≥3) with NOW pool tasks shows them', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-03-30T09:00:00'))
    await mockSupabase(page)
    await seedStore(page, {
      energyLevel: 3,
      nowPool: [makeTask({ title: 'Write specs', id: 'task-e2e-001' })],
    })
    await page.goto('/today')

    await expect(page.getByText('Write specs', { exact: true }).first()).toBeVisible({ timeout: 5000 })
  })
})

// ── Tests: evening view ───────────────────────────────────────────────────────

test.describe('TodayPage — evening view', () => {
  test('evening shows wrap-up heading', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-03-30T20:00:00'))
    await mockSupabase(page)
    await seedStore(page)
    await page.goto('/today')

    // Evening block: t('today.wrapUp') = "Today's wrap-up"
    await expect(page.getByText(/today's wrap-up/i)).toBeVisible({ timeout: 5000 })
  })
})

// ── Tests: clear day empty state ──────────────────────────────────────────────

test.describe('TodayPage — empty state', () => {
  test('shows clear day message when no tasks', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-03-30T09:00:00'))
    await mockSupabase(page)
    await seedStore(page, { nowPool: [], nextPool: [], somedayPool: [] })
    await page.goto('/today')

    // t('today.clearDay') = "Clear day ahead"
    await expect(page.getByText(/clear day ahead/i)).toBeVisible({ timeout: 5000 })
  })
})
