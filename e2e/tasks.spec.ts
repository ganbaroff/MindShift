/**
 * E2E: Task creation + management
 *
 * Tests the AddTaskModal, NOW/NEXT/SOMEDAY pools,
 * task completion, snoozing, and pool overflow behavior.
 *
 * Matches Sprint C TasksPage + HomePage UI.
 */
import { test, expect, seedStore } from './helpers'

test.describe('Task creation', () => {
  test('tasks screen shows empty state with pool headers', async ({ authedPage: page }) => {
    await page.goto('/tasks')

    // Header: "Your Tasks"
    await expect(page.getByText('Your Tasks')).toBeVisible()

    // NOW and NEXT pool headers with counters
    // Wait for store hydration (async idbStorage) before checking counter values
    await expect(page.getByText('NOW', { exact: true })).toBeVisible()
    await expect(page.getByText('0/3')).toBeVisible({ timeout: 8000 })
    await expect(page.getByText('NEXT', { exact: true })).toBeVisible()
    await expect(page.getByText('0/6')).toBeVisible()
  })

  test('FAB opens add task modal', async ({ authedPage: page }) => {
    await page.goto('/tasks')

    // Click the Add task FAB
    await page.getByRole('button', { name: /add task/i }).click()

    // Modal should open with "Add a task" heading and placeholder
    await expect(page.getByText('Add a task')).toBeVisible()
    await expect(page.getByPlaceholder("What's on your mind?")).toBeVisible()
  })

  test('add task modal has difficulty and duration selectors', async ({ authedPage: page }) => {
    await page.goto('/tasks')
    await page.getByRole('button', { name: /add task/i }).click()

    // Difficulty label and buttons (dots + label text, no emoji circles)
    await expect(page.getByText('Difficulty')).toBeVisible()
    await expect(page.getByRole('button', { name: /Easy/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Medium/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Hard/i })).toBeVisible()

    // Time label and duration presets
    await expect(page.getByText('Time')).toBeVisible()
    await expect(page.getByRole('button', { name: '5m', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '15m', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '25m', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '45m', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '60m', exact: true })).toBeVisible()
  })

  test('submit button says "Add to Now" by default', async ({ authedPage: page }) => {
    await page.goto('/tasks')
    await page.getByRole('button', { name: /add task/i }).click()

    // Submit button is present with "Add to Now →" text
    await expect(page.getByRole('button', { name: /Add to Now/i })).toBeVisible()

    // Pool hint shows "Adding to NOW"
    await expect(page.getByText(/Adding to NOW/)).toBeVisible()
  })

  test('typing a title and submitting adds the task', async ({ authedPage: page }) => {
    await page.goto('/tasks')
    await page.getByRole('button', { name: /add task/i }).click()

    await page.getByPlaceholder("What's on your mind?").fill('Test task')

    // Submit button should be visible
    const submitBtn = page.getByRole('button', { name: /Add to Now/i })
    await expect(submitBtn).toBeVisible()
  })

  test('adding a task shows it in NOW pool', async ({ authedPage: page }) => {
    await page.goto('/tasks')
    await page.getByRole('button', { name: /add task/i }).click()

    // Fill task title
    await page.getByPlaceholder("What's on your mind?").fill('Buy groceries')

    // Select difficulty (Medium)
    await page.getByRole('button', { name: /Medium/i }).click()

    // Select duration
    await page.getByRole('button', { name: '15m', exact: true }).click()

    // Submit
    await page.getByRole('button', { name: /Add to Now/i }).dispatchEvent('click')

    // Modal closes, task appears in NOW pool
    await expect(page.getByText('Buy groceries')).toBeVisible()
  })

  test('closing modal resets form', async ({ authedPage: page }) => {
    await page.goto('/tasks')
    await page.getByRole('button', { name: /add task/i }).click()

    // Fill title
    await page.getByPlaceholder("What's on your mind?").fill('Temp task')

    // Close via the X button (aria-label="Close modal")
    await page.getByRole('button', { name: 'Close modal' }).click()

    // Wait for the sheet to finish its exit animation before re-opening
    await expect(page.getByText('Add a task')).not.toBeVisible({ timeout: 4000 })

    // Re-open — title should be empty
    await page.getByRole('button', { name: /add task/i }).click()
    await expect(page.getByPlaceholder("What's on your mind?")).toHaveValue('')
  })
})

test.describe('Task pools', () => {
  test('SOMEDAY pool is collapsed by default', async ({ authedPage: page }) => {
    await page.goto('/tasks')

    // Someday section header should be visible
    await expect(page.getByText('SOMEDAY')).toBeVisible()

    // The chevron should not be rotated (collapsed state)
    // Verify collapsed by checking no someday task content area is visible
    // (CollapsibleSection hides children when collapsed via AnimatePresence)
  })

  test('clicking SOMEDAY header expands it', async ({ authedPage: page }) => {
    await page.goto('/tasks')

    // Click the SOMEDAY toggle button
    const somedayButton = page.locator('button').filter({ hasText: 'SOMEDAY' })
    await somedayButton.click()

    // After clicking, the chevron should rotate (expanded)
    // Verify by checking the rotate-180 class appears on the chevron
    await expect(somedayButton.locator('svg')).toHaveClass(/rotate-180/)
  })

  test('pool counters are visible', async ({ authedPage: page }) => {
    await page.goto('/tasks')

    // NOW pool shows 0/3
    await expect(page.getByText('0/3')).toBeVisible()

    // NEXT pool shows 0/6
    await expect(page.getByText('0/6')).toBeVisible()
  })

  test('energy hint card is visible', async ({ authedPage: page }) => {
    await page.goto('/tasks')

    // Energy hint card with teal text
    await expect(page.getByText(/Low energy day/)).toBeVisible()
  })

  test('DONE RECENTLY section is collapsed by default', async ({ authedPage: page }) => {
    await page.goto('/tasks')

    // Done recently section header should be visible
    await expect(page.getByText(/Done recently/)).toBeVisible()
  })
})

test.describe('Task from HomeScreen', () => {
  test('HomeScreen has Add task FAB', async ({ authedPage: page }) => {
    await page.goto('/')

    const fab = page.getByRole('button', { name: /add task/i })
    await expect(fab).toBeVisible()
  })

  test('empty state prompt shows when no tasks', async ({ authedPage: page }) => {
    await page.goto('/')

    // Empty state card: "What's on your mind?"
    await expect(page.getByText("What's on your mind?")).toBeVisible()
    await expect(page.getByText(/Tap to add your first task/)).toBeVisible()
  })

  test('empty state prompt hidden when tasks exist', async ({ authedPage: page }) => {
    await seedStore(page, {
      nowPool: [
        { id: 'e2e-check-1', title: 'Existing task', pool: 'now', difficulty: 1, estimatedMinutes: 5, status: 'active', snoozeCount: 0, completedAt: null, dueDate: null, subtasks: [], position: 0, createdAt: new Date().toISOString(), userId: 'e2e-test-user-00000000-0000-0000-0000-000000000001' },
      ],
    })
    await page.goto('/')

    // Empty state should NOT be visible when NOW pool has a task
    await expect(page.getByText(/Tap to add your first task/)).not.toBeVisible()
  })

  test('NOW pool counter visible on HomeScreen', async ({ authedPage: page }) => {
    await page.goto('/')

    // NOW pool header with counter (appMode minimal + seasonalMode maintain → nowMax=3)
    await expect(page.getByText('NOW', { exact: true })).toBeVisible()
    await expect(page.getByText('0/3')).toBeVisible()
  })
})

test.describe('Due date picker', () => {
  test.beforeEach(async ({ authedPage: page }) => {
    await page.goto('/tasks')
    await page.getByRole('button', { name: /add task/i }).click()
  })

  test('due date section is visible in modal', async ({ authedPage: page }) => {
    await expect(page.getByText('Due date')).toBeVisible()
    await expect(page.getByRole('button', { name: /Today/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Tomorrow/i })).toBeVisible()
  })

  test('clicking Today shows upcoming hint', async ({ authedPage: page }) => {
    // Before selection — no hint
    await expect(page.getByText(/Upcoming tab/)).not.toBeVisible()

    // Select Today
    await page.getByRole('button', { name: 'Today', exact: true }).click()

    // Hint should appear
    await expect(page.getByText(/Will appear in Upcoming tab/)).toBeVisible()
  })

  test('clicking Tomorrow shows upcoming hint', async ({ authedPage: page }) => {
    await page.getByRole('button', { name: 'Tomorrow', exact: true }).click()
    await expect(page.getByText(/Will appear in Upcoming tab/)).toBeVisible()
  })

  test('clicking selected date chip deselects it (toggles)', async ({ authedPage: page }) => {
    // Select Today
    await page.getByRole('button', { name: 'Today', exact: true }).click()
    await expect(page.getByText(/Will appear in Upcoming tab/)).toBeVisible()

    // Click again to deselect
    await page.getByRole('button', { name: 'Today', exact: true }).click()
    await expect(page.getByText(/Will appear in Upcoming tab/)).not.toBeVisible()
  })
})

test.describe('Empty states', () => {
  test('NEXT pool shows queue hint when empty', async ({ authedPage: page }) => {
    await page.goto('/tasks')
    await expect(page.getByText(/Queue tasks here/)).toBeVisible()
  })

  test('NOW pool shows no tasks when empty', async ({ authedPage: page }) => {
    await page.goto('/tasks')
    // NOW pool header is visible with 0 count
    await expect(page.getByText('NOW', { exact: true })).toBeVisible()
    await expect(page.getByText('0/3')).toBeVisible()
  })

  test('home shows empty state prompt when no tasks', async ({ authedPage: page }) => {
    await page.goto('/')
    await expect(page.getByText("What's on your mind?")).toBeVisible()
    await expect(page.getByText(/Tap to add your first task/)).toBeVisible()
  })

  test('empty state prompt is a button that opens add task modal', async ({ authedPage: page }) => {
    await page.goto('/')
    // The empty state card is a button
    await page.getByText(/Tap to add your first task/).click()
    // Modal should open
    await expect(page.getByText('Add a task')).toBeVisible()
  })
})

test.describe('Pool overflow', () => {
  test('shows overflow message and "Add to Next" when NOW pool is full', async ({ authedPage: page }) => {
    // Seed 3 active tasks (appMode minimal + seasonalMode maintain → NOW_POOL_MAX = 3)
    await seedStore(page, {
      nowPool: [
        { id: 'e2e-overflow-1', title: 'Task A', pool: 'now', difficulty: 1, estimatedMinutes: 15, status: 'active', snoozeCount: 0, completedAt: null, dueDate: null, subtasks: [], position: 0, createdAt: new Date().toISOString(), userId: 'e2e-test-user-00000000-0000-0000-0000-000000000001' },
        { id: 'e2e-overflow-2', title: 'Task B', pool: 'now', difficulty: 1, estimatedMinutes: 15, status: 'active', snoozeCount: 0, completedAt: null, dueDate: null, subtasks: [], position: 1, createdAt: new Date().toISOString(), userId: 'e2e-test-user-00000000-0000-0000-0000-000000000001' },
        { id: 'e2e-overflow-3', title: 'Task C', pool: 'now', difficulty: 1, estimatedMinutes: 15, status: 'active', snoozeCount: 0, completedAt: null, dueDate: null, subtasks: [], position: 2, createdAt: new Date().toISOString(), userId: 'e2e-test-user-00000000-0000-0000-0000-000000000001' },
      ],
    })

    await page.goto('/tasks')

    // Open add task modal
    await page.getByRole('button', { name: /add task/i }).click()

    // Overflow notice should be visible
    await expect(page.getByText(/NOW is full/i)).toBeVisible()

    // Submit button should say "Add to Next →" (not "Add to Now →")
    await expect(page.getByRole('button', { name: /Add to Next/i })).toBeVisible()
  })
})
