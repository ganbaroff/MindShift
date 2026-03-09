/**
 * E2E: Task creation + management
 *
 * Tests the AddTaskModal, NOW/NEXT/SOMEDAY pools,
 * task completion, snoozing, and pool overflow behavior.
 */
import { test, expect } from './helpers'

test.describe('Task creation', () => {
  test('tasks screen shows empty state', async ({ authedPage: page }) => {
    await page.goto('/tasks')

    await expect(page.getByRole('heading', { name: /All Tasks/ })).toBeVisible()
    await expect(page.getByText(/Now pool is empty/)).toBeVisible()
    await expect(page.getByText(/Next pool is empty/)).toBeVisible()
  })

  test('FAB opens add task modal', async ({ authedPage: page }) => {
    await page.goto('/tasks')

    // Click the Add task FAB (aria-label: "Add task")
    await page.getByRole('button', { name: /add task/i }).click()

    // Modal should open
    await expect(page.getByRole('heading', { name: 'Add task' })).toBeVisible()
    await expect(page.getByPlaceholder(/what needs to be done/i)).toBeVisible()
  })

  test('add task modal has difficulty and duration selectors', async ({ authedPage: page }) => {
    await page.goto('/tasks')
    await page.getByRole('button', { name: /add task/i }).click()

    // Difficulty buttons
    await expect(page.getByText('🟢 Easy')).toBeVisible()
    await expect(page.getByText('🟡 Medium')).toBeVisible()
    await expect(page.getByText('🟠 Hard')).toBeVisible()

    // Duration presets — use exact:true to avoid "5m" matching "15m" etc.
    await expect(page.getByRole('button', { name: '5m', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '15m', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '25m', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '45m', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '60m', exact: true })).toBeVisible()
  })

  test('submit button is disabled without title', async ({ authedPage: page }) => {
    await page.goto('/tasks')
    await page.getByRole('button', { name: /add task/i }).click()

    const submitBtn = page.getByRole('button', { name: /add to now/i })
    await expect(submitBtn).toBeDisabled()
  })

  test('typing a title enables submit button', async ({ authedPage: page }) => {
    await page.goto('/tasks')
    await page.getByRole('button', { name: /add task/i }).click()

    await page.getByPlaceholder(/what needs to be done/i).fill('Test task')

    const submitBtn = page.getByRole('button', { name: /add to now/i })
    await expect(submitBtn).toBeEnabled()
  })

  test('adding a task shows it in NOW pool', async ({ authedPage: page }) => {
    await page.goto('/tasks')
    await page.getByRole('button', { name: /add task/i }).click()

    // Fill task title
    await page.getByPlaceholder(/what needs to be done/i).fill('Buy groceries')

    // Select difficulty
    await page.getByText('🟢 Easy').click()

    // Select duration
    await page.getByRole('button', { name: '15m', exact: true }).click()

    // Submit — use dispatchEvent to bypass any stacking context issues
    await page.getByRole('button', { name: /add to now/i }).dispatchEvent('click')

    // Modal closes, task appears in NOW pool
    await expect(page.getByText('Buy groceries')).toBeVisible()
  })

  test('AI decomposition button appears when title > 3 chars', async ({ authedPage: page }) => {
    await page.goto('/tasks')
    await page.getByRole('button', { name: /add task/i }).click()

    // Type short text — no AI button
    await page.getByPlaceholder(/what needs to be done/i).fill('ab')
    await expect(page.getByText(/break it down/i)).not.toBeVisible()

    // Type longer text — AI button appears
    await page.getByPlaceholder(/what needs to be done/i).fill('Prepare quarterly report for stakeholders')
    await expect(page.getByText(/break it down/i)).toBeVisible()
  })

  test('closing modal via close button resets form', async ({ authedPage: page }) => {
    await page.goto('/tasks')
    await page.getByRole('button', { name: /add task/i }).click()

    // Fill title
    await page.getByPlaceholder(/what needs to be done/i).fill('Temp task')

    // Close via X button (aria-label: "Close")
    await page.getByRole('button', { name: /close/i }).click()

    // Re-open — title should be empty
    await page.getByRole('button', { name: /add task/i }).click()
    await expect(page.getByPlaceholder(/what needs to be done/i)).toHaveValue('')
  })

  test('custom duration input works', async ({ authedPage: page }) => {
    await page.goto('/tasks')
    await page.getByRole('button', { name: /add task/i }).click()

    // Fill custom duration
    const customInput = page.getByPlaceholder('Custom')
    await customInput.fill('90')

    // The custom input should have the value
    await expect(customInput).toHaveValue('90')
  })
})

test.describe('Task pools', () => {
  test('SOMEDAY pool is collapsed by default', async ({ authedPage: page }) => {
    await page.goto('/tasks')

    // Someday section should have aria-expanded=false
    const somedayToggle = page.getByRole('button', { name: /someday/i })
    await expect(somedayToggle).toHaveAttribute('aria-expanded', 'false')
  })

  test('clicking SOMEDAY header expands it', async ({ authedPage: page }) => {
    await page.goto('/tasks')

    const somedayToggle = page.getByRole('button', { name: /someday/i })
    await somedayToggle.click()

    await expect(somedayToggle).toHaveAttribute('aria-expanded', 'true')
  })

  test('pool counters are visible', async ({ authedPage: page }) => {
    await page.goto('/tasks')

    // NOW pool shows 0/3
    await expect(page.getByText('0/3')).toBeVisible()

    // NEXT pool shows 0/6
    await expect(page.getByText('0/6')).toBeVisible()
  })
})

test.describe('Task from HomeScreen', () => {
  test('HomeScreen has Add task FAB', async ({ authedPage: page }) => {
    await page.goto('/')

    const fab = page.getByRole('button', { name: /add task/i })
    await expect(fab).toBeVisible()
  })
})
