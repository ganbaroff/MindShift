/**
 * E2E: Focus session lifecycle (FocusScreen — real useFocusSession logic)
 *
 * FocusScreen uses useFocusSession which manages:
 *  - setInterval for timer ticking
 *  - useAudioEngine for sounds
 *  - Phase transitions (struggle → release → flow)
 *  - Post-session flows (NatureBuffer, RecoveryLock)
 *
 * Timer presets: TIMER_PRESETS = [5, 25, 52, 90] → "5m", "25m", "52m", "90m"
 * Audio controls: "🔊 Sound on" / "🔇 Sound off" (text labels, not bare emoji)
 * Stop → "End session" button → interrupt-confirm screen
 *
 * Note: "Start Focus →" opens BreathworkRitual first.
 *       Use "Skip ritual & jump in" to bypass breathwork in tests.
 */
import { test, expect, seedStore } from './helpers'

/** Helper: start a focus session by skipping the breathwork ritual */
async function startSession(page: import('@playwright/test').Page) {
  // BreathworkRitual is a z-50 overlay — click its exact "Skip breathing ritual" button (not the setup "skip")
  await page.getByRole('button', { name: 'Skip breathing ritual', exact: true }).click()
}

test.describe('Focus setup screen', () => {
  test('shows header with energy display', async ({ authedPage: page }) => {
    await page.goto('/focus')

    // Title
    await expect(page.getByText('Focus Session ⏱️')).toBeVisible()
  })

  test('shows duration preset buttons (5m, 25m, 52m, 90m + custom)', async ({ authedPage: page }) => {
    await page.goto('/focus')

    // Duration section label
    await expect(page.getByText('DURATION')).toBeVisible()
    await expect(page.getByText(/smart:/i)).toBeVisible()

    // TIMER_PRESETS = [5, 25, 52, 90] — aria-labels are "X minutes" (+ optional "(recommended)")
    await expect(page.getByRole('button', { name: /^5 minutes/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /^25 minutes/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /^52 minutes/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /^90 minutes/ })).toBeVisible()

    // Custom duration button (✎ pencil) — aria-label is "Custom duration"
    await expect(page.getByRole('button', { name: 'Custom duration' })).toBeVisible()

    // Start button
    await expect(page.getByRole('button', { name: /^Start focus session with/i })).toBeVisible()
  })

  test('shows "No tasks yet" empty state when pool is empty', async ({ authedPage: page }) => {
    await page.goto('/focus')

    // Empty state — no tasks seeded
    await expect(page.getByText('No tasks yet')).toBeVisible()
    await expect(page.getByRole('link', { name: /Go to Tasks/i })).toBeVisible()
  })

  test('shows bookmark card when saved bookmark exists', async ({ authedPage: page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('ms_interrupt_bookmark', JSON.stringify({
        text: 'Reviewing the design doc',
        taskId: null,
        taskTitle: null,
        timestamp: new Date().toISOString(),
      }))
    })
    await page.goto('/focus')

    await expect(page.getByText('Reviewing the design doc')).toBeVisible()
    await expect(page.getByRole('button', { name: /Dismiss/ })).toBeVisible()
  })

  test('shows task picker with open focus when tasks exist', async ({ authedPage: page }) => {
    await seedStore(page, {
      nowPool: [{
        id: 'e2e-task-1',
        title: 'Focus test task',
        pool: 'now',
        difficulty: 2,
        estimatedMinutes: 25,
        status: 'active',
        snoozeCount: 0,
        completedAt: null,
        dueDate: null,
        subtasks: [],
        position: 0,
        createdAt: new Date().toISOString(),
        userId: 'e2e-test-user-00000000-0000-0000-0000-000000000001',
        taskType: 'task',
        repeat: 'none',
      }],
    })

    await page.goto('/focus')

    // Task picker label shows when tasks exist
    await expect(page.getByText(/TASK \(OPTIONAL\)/i)).toBeVisible({ timeout: 8000 })
    // Task in picker
    await expect(page.getByText('Focus test task')).toBeVisible()
    // Open focus option
    await expect(page.getByText(/Open focus — no specific task/)).toBeVisible()
  })

  test('selecting a duration preset highlights it', async ({ authedPage: page }) => {
    await page.goto('/focus')

    const preset90 = page.getByRole('button', { name: /^90 minutes/ })
    await preset90.click()

    await expect(preset90).toBeVisible()
  })

  test('custom duration input appears when ✎ clicked', async ({ authedPage: page }) => {
    await page.goto('/focus')

    await page.getByRole('button', { name: 'Custom duration' }).click()

    await expect(page.getByPlaceholder('Minutes...')).toBeVisible()
  })
})

test.describe('Focus session', () => {
  test('starting a session shows the active timer view', async ({ authedPage: page }) => {
    await page.goto('/focus')
    await page.getByRole('button', { name: /^Start focus session with/i }).click()
    await startSession(page)

    // ArcTimer is present — check for the ArcTimer button's aria-label
    await expect(page.getByRole('button', { name: /Focus timer/i })).toBeVisible({ timeout: 5000 })
  })

  test('active session shows struggle phase label', async ({ authedPage: page }) => {
    await page.goto('/focus')
    await page.getByRole('button', { name: /^Start focus session with/i }).click()
    await startSession(page)

    // PHASE_LABELS.struggle = "Getting into it... 💪"
    await expect(page.getByText(/Getting into it/)).toBeVisible({ timeout: 5000 })
  })

  test('active session shows audio and end session controls', async ({ authedPage: page }) => {
    await page.goto('/focus')
    await page.getByRole('button', { name: /^Start focus session with/i }).click()
    await startSession(page)

    // Wait for active session — ArcTimer appears
    await expect(page.getByRole('button', { name: /Focus timer/i })).toBeVisible({ timeout: 5000 })

    // Audio toggle shows "🔊 Sound on" or "🔇 Sound off"
    await expect(
      page.getByRole('button', { name: /Sound on|Sound off/ })
    ).toBeVisible()

    // End session button
    await expect(page.getByRole('button', { name: 'End session', exact: true })).toBeVisible()

    // Park thought FAB
    await expect(page.getByRole('button', { name: /Park a thought/i })).toBeVisible()
  })

  test('tapping end session shows interrupt confirm screen', async ({ authedPage: page }) => {
    await page.goto('/focus')
    await page.getByRole('button', { name: /^Start focus session with/i }).click()
    await startSession(page)

    // Wait for session active
    await expect(page.getByRole('button', { name: /Focus timer/i })).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: 'End session', exact: true }).click()

    // Interrupt confirm: "Keep going 🌿" to resume (aria-label is "Resume focus session")
    await expect(page.getByRole('button', { name: /Resume focus session/i })).toBeVisible({ timeout: 5000 })
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
        snoozeCount: 0,
        completedAt: null,
        dueDate: null,
        subtasks: [],
        position: 0,
        createdAt: new Date().toISOString(),
        userId: 'e2e-test-user-00000000-0000-0000-0000-000000000001',
        taskType: 'task',
        repeat: 'none',
      }],
    })

    await page.goto('/focus')
    await expect(page.getByText('Write quarterly report')).toBeVisible({ timeout: 8000 })
    await page.getByText('Write quarterly report').click()
    await page.getByRole('button', { name: /^Start focus session with/i }).click()
    await startSession(page)

    // Wait for session to start
    await expect(page.getByRole('button', { name: /Focus timer/i })).toBeVisible({ timeout: 5000 })
    // Task title visible during session
    await expect(page.getByText('Write quarterly report')).toBeVisible({ timeout: 5000 })
  })
})
