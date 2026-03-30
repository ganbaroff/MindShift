/**
 * E2E: TaskCard inline edit mode
 *
 * Tests the pencil-button edit flow on an active task:
 * open/close, save via button, save via Enter, cancel via Escape,
 * cancel via button, and disabled Save when title is empty.
 */
import { test, expect, seedStore } from './helpers'

// ── Shared task fixture ────────────────────────────────────────────────────────

const BASE_TASK = {
  id: 'e2e-edit-task-1',
  title: 'Original title',
  pool: 'now',
  difficulty: 1 as const,
  estimatedMinutes: 15,
  status: 'active',
  snoozeCount: 0,
  completedAt: null,
  dueDate: null,
  note: '',
  subtasks: [],
  position: 0,
  createdAt: new Date().toISOString(),
  userId: 'e2e-test-user-00000000-0000-0000-0000-000000000001',
  taskType: 'task',
  repeat: 'none',
}

// Navigate to /tasks with one seeded NOW task
async function gotoTasksWithTask(page: Parameters<typeof seedStore>[0], overrides: Partial<typeof BASE_TASK> = {}) {
  await seedStore(page, {
    nowPool: [{ ...BASE_TASK, ...overrides }],
  })
  await page.goto('/tasks')
  // Wait for store hydration — task title must appear
  await expect(page.getByText(overrides.title ?? BASE_TASK.title)).toBeVisible({ timeout: 8000 })
}

// The dnd-kit sortable wrapper renders as role="button" with an accessible name
// that concatenates all child button labels. Using { exact: true } avoids
// strict-mode violations caused by the wrapper matching partial names.
type PageLike = Parameters<typeof seedStore>[0]
function editTaskBtn(page: PageLike) {
  return page.getByRole('button', { name: 'Edit task', exact: true })
}
function saveEditBtn(page: PageLike) {
  return page.getByRole('button', { name: 'Save edit', exact: true })
}
function cancelEditBtn(page: PageLike) {
  return page.getByRole('button', { name: 'Cancel edit', exact: true })
}

// ── Test suite ─────────────────────────────────────────────────────────────────

test.describe('TaskCard inline edit', () => {
  test('pencil button is visible on active task', async ({ authedPage: page }) => {
    await gotoTasksWithTask(page)

    await expect(editTaskBtn(page)).toBeVisible()
  })

  test('clicking pencil opens edit mode with input, textarea, date input, save and cancel buttons', async ({ authedPage: page }) => {
    await gotoTasksWithTask(page)

    await editTaskBtn(page).click()

    // Title input
    await expect(page.getByRole('textbox', { name: 'Edit task title' })).toBeVisible()
    // Note textarea
    await expect(page.getByRole('textbox', { name: 'Edit task note' })).toBeVisible()
    // Due date input (type=date — not a role=textbox in all browsers; use label)
    await expect(page.getByLabel('Edit due date')).toBeVisible()
    // Save and Cancel buttons
    await expect(saveEditBtn(page)).toBeVisible()
    await expect(cancelEditBtn(page)).toBeVisible()
  })

  test('modifying title and clicking Save updates the task title', async ({ authedPage: page }) => {
    await gotoTasksWithTask(page)

    await editTaskBtn(page).click()

    const titleInput = page.getByRole('textbox', { name: 'Edit task title' })
    await titleInput.fill('Updated title')

    await saveEditBtn(page).click()

    // Edit mode closes and updated title is visible
    await expect(page.getByText('Updated title')).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Edit task title' })).not.toBeVisible()
  })

  test('modifying title and pressing Enter saves the task', async ({ authedPage: page }) => {
    await gotoTasksWithTask(page)

    await editTaskBtn(page).click()

    const titleInput = page.getByRole('textbox', { name: 'Edit task title' })
    await titleInput.fill('Enter saved title')
    await titleInput.press('Enter')

    await expect(page.getByText('Enter saved title')).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Edit task title' })).not.toBeVisible()
  })

  test('pressing Escape reverts title to original', async ({ authedPage: page }) => {
    await gotoTasksWithTask(page)

    await editTaskBtn(page).click()

    const titleInput = page.getByRole('textbox', { name: 'Edit task title' })
    await titleInput.fill('Discard this')
    await titleInput.press('Escape')

    // Edit mode closes
    await expect(page.getByRole('textbox', { name: 'Edit task title' })).not.toBeVisible()
    // Original title still shown
    await expect(page.getByText('Original title')).toBeVisible()
  })

  test('clicking Cancel reverts title to original', async ({ authedPage: page }) => {
    await gotoTasksWithTask(page)

    await editTaskBtn(page).click()

    const titleInput = page.getByRole('textbox', { name: 'Edit task title' })
    await titleInput.fill('Should be discarded')

    await cancelEditBtn(page).click()

    // Edit mode closes
    await expect(page.getByRole('textbox', { name: 'Edit task title' })).not.toBeVisible()
    // Original title still shown
    await expect(page.getByText('Original title')).toBeVisible()
  })

  test('clearing the title disables the Save button', async ({ authedPage: page }) => {
    await gotoTasksWithTask(page)

    await editTaskBtn(page).click()

    const titleInput = page.getByRole('textbox', { name: 'Edit task title' })
    await titleInput.fill('')

    await expect(saveEditBtn(page)).toBeDisabled()
  })
})
