/**
 * E2E: Sprint B–D feature coverage
 *
 * Tests for features that were previously uncovered:
 * - Focus setup (surprise mode, task picker, skip ritual)
 * - History page (empty state, guest prompt)
 * - Task search (filter by query, clear search)
 * - Home page (energy picker, low energy mode, focus goal)
 * - AddTaskModal (notes, repeat picker, two-thirds guardrail)
 * - Settings (medication, daily focus goal, re-run wizard, sound)
 * - Focus room button
 * - Breathwork ritual
 */
import { test, expect, seedStore, mockSupabase } from './helpers'

// -- Shared task factory ------------------------------------------------------
const makeTask = (overrides: Record<string, unknown> = {}) => ({
  id: `e2e-bd-${Math.random().toString(36).slice(2, 8)}`,
  title: 'Test task',
  pool: 'now',
  difficulty: 1,
  estimatedMinutes: 15,
  status: 'active',
  snoozeCount: 0,
  completedAt: null,
  dueDate: null,
  subtasks: [],
  position: 0,
  createdAt: new Date().toISOString(),
  userId: 'e2e-test-user-00000000-0000-0000-0000-000000000001',
  repeat: 'none',
  taskType: 'task',
  note: undefined,
  ...overrides,
})

// -- Focus Setup --------------------------------------------------------------

test.describe('FocusSetup — surprise mode', () => {
  test('surprise mode shows info card instead of duration presets', async ({ authedPage: page }) => {
    await seedStore(page, { timerStyle: 'surprise' })
    await page.goto('/focus')

    // Surprise mode info card visible
    await expect(page.getByText(/Surprise mode/)).toBeVisible({ timeout: 8000 })

    // Duration preset buttons should NOT be visible
    await expect(page.getByText('DURATION')).not.toBeVisible()
    await expect(page.getByRole('button', { name: /^5m/ })).not.toBeVisible()
    await expect(page.getByRole('button', { name: /^25m/ })).not.toBeVisible()
  })
})

test.describe('FocusSetup — task picker', () => {
  test('shows TASK (OPTIONAL) label and task list when tasks exist', async ({ authedPage: page }) => {
    await seedStore(page, {
      nowPool: [
        makeTask({ id: 'bd-task-1', title: 'Design mockups', position: 0 }),
        makeTask({ id: 'bd-task-2', title: 'Write tests', position: 1 }),
      ],
    })
    await page.goto('/focus')

    await expect(page.getByText(/TASK \(OPTIONAL\)/i)).toBeVisible({ timeout: 8000 })
    await expect(page.getByText('Design mockups')).toBeVisible()
    await expect(page.getByText('Write tests')).toBeVisible()
    await expect(page.getByText(/Open focus — no specific task/)).toBeVisible()
  })

  test('shows duration presets and Start Focus button', async ({ authedPage: page }) => {
    await page.goto('/focus')
    // Wait for focus screen to fully render
    await expect(page.getByText('Focus Session')).toBeVisible({ timeout: 8000 })
    await expect(page.getByText('DURATION')).toBeVisible()
    await expect(page.getByRole('button', { name: '5 minutes', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /^25 minutes/i })).toBeVisible()
    await expect(page.getByText('Start Focus')).toBeVisible()
  })

  test('shows Breathe first option (breathwork opt-in)', async ({ authedPage: page }) => {
    await page.goto('/focus')
    await expect(page.getByText('Focus Session')).toBeVisible({ timeout: 8000 })
    await expect(page.getByRole('button', { name: 'Start focus session with breathing ritual', exact: true })).toBeVisible()
  })
})

// -- History Page -------------------------------------------------------------

test.describe('HistoryPage', () => {
  test('shows empty state when no sessions exist', async ({ authedPage: page }) => {
    await page.goto('/history')

    await expect(page.getByText('Session Log')).toBeVisible()
    await expect(page.getByText('No sessions yet')).toBeVisible({ timeout: 8000 })
    await expect(page.getByText(/Start your first focus session/)).toBeVisible()
  })

  test('shows sign-in prompt for guest users', async ({ page }) => {
    // Mock Supabase with NO valid session — simulate guest user
    await page.route('**/auth/v1/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    )
    await page.route('**/rest/v1/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    )
    await page.route('**/functions/v1/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    )
    await page.route('**/realtime/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    )

    // Seed store with guest userId — do NOT add Supabase auth session to localStorage
    // This way onAuthStateChange won't find a stored session and won't set a real user
    const storeState = JSON.stringify({
      state: {
        userId: 'guest_test_user',
        email: '',
        cognitiveMode: 'focused',
        appMode: 'minimal',
        avatarId: 1,
        xpTotal: 0,
        lastSessionAt: new Date().toISOString(),
        onboardingCompleted: true,
        seasonalMode: 'maintain',
        focusAnchor: null,
        achievements: [],
        audioVolume: 0.47,
        reducedStimulation: false,
        subscriptionTier: 'free',
        trialEndsAt: null,
        gridWidgets: [],
        psychotype: 'achiever',
        nowPool: [],
        nextPool: [],
        somedayPool: [],
        timerStyle: 'countdown',
        medicationEnabled: false,
        medicationTime: null,
        chronotype: null,
        timeBlindness: null,
        emotionalReactivity: null,
        flexiblePauseUntil: null,
        locale: 'en',
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: null,
        shutdownShownDate: new Date().toISOString().split('T')[0],
        monthlyReflectionShownMonth: new Date().toISOString().slice(0, 7),
        dailyFocusGoalMin: 60,
        goalCelebratedDate: null,
        weeklyPlanShownWeek: new Date().toISOString().split('T')[0],
        weeklyIntention: null,
        uiTone: 'neutral',
        completedTotal: 0,
        psychotypeLastDerived: null,
        seenHints: [],
        firstFocusTutorialCompleted: true,
        userLocale: 'en',
        userTheme: 'dark',
      },
      version: 0,
    })

    await page.addInitScript(({ storeState }) => {
      localStorage.setItem('mindshift-store', storeState)
      localStorage.setItem('ms_cookie_consent', JSON.stringify({
        accepted: true, version: '2026-03', at: new Date().toISOString(),
      }))
      localStorage.setItem('mindshift_install_dismissed', '1')
      localStorage.setItem('ms_signed_out', '1')
      // Do NOT set sb-*-auth-token — no Supabase session
    }, { storeState })

    await page.goto('/history')

    await expect(page.getByText('Session Log')).toBeVisible()
    await expect(page.getByText(/Sign in to see your history/)).toBeVisible({ timeout: 8000 })
  })

  test('shows page header and subtitle', async ({ authedPage: page }) => {
    await page.goto('/history')

    await expect(page.getByText('Session Log')).toBeVisible()
    await expect(page.getByText('Last 30 days of focus')).toBeVisible()
  })
})

// -- Task Search --------------------------------------------------------------

test.describe('TasksPage search', () => {
  test('search bar is visible and filters tasks by query', async ({ authedPage: page }) => {
    await seedStore(page, {
      nowPool: [
        makeTask({ id: 'search-1', title: 'Buy groceries', position: 0 }),
        makeTask({ id: 'search-2', title: 'Read book', position: 1 }),
      ],
      nextPool: [
        makeTask({ id: 'search-3', title: 'Fix bug', pool: 'next', position: 0 }),
      ],
    })
    await page.goto('/tasks')

    // All tasks visible initially
    await expect(page.getByText('Buy groceries')).toBeVisible({ timeout: 8000 })
    await expect(page.getByText('Read book')).toBeVisible()
    await expect(page.getByText('Fix bug')).toBeVisible()

    // Type search query
    await page.getByPlaceholder('Search tasks...').fill('buy')

    // Only matching task visible
    await expect(page.getByText('Buy groceries')).toBeVisible()
    await expect(page.getByText('Read book')).not.toBeVisible()
    await expect(page.getByText('Fix bug')).not.toBeVisible()
  })

  test('clear search button restores all tasks', async ({ authedPage: page }) => {
    await seedStore(page, {
      nowPool: [
        makeTask({ id: 'clear-1', title: 'Alpha task', position: 0 }),
        makeTask({ id: 'clear-2', title: 'Beta task', position: 1 }),
      ],
    })
    await page.goto('/tasks')

    await expect(page.getByText('Alpha task')).toBeVisible({ timeout: 8000 })

    // Search to filter
    await page.getByPlaceholder('Search tasks...').fill('alpha')
    await expect(page.getByText('Beta task')).not.toBeVisible()

    // Clear search
    await page.getByRole('button', { name: 'Clear search' }).click()

    // Both tasks visible again
    await expect(page.getByText('Alpha task')).toBeVisible()
    await expect(page.getByText('Beta task')).toBeVisible()
  })
})

// -- Two-Thirds Guardrail -----------------------------------------------------

test.describe('Two-Thirds guardrail', () => {
  test('shows "filling up" badge when NEXT pool has 4+ tasks', async ({ authedPage: page }) => {
    await seedStore(page, {
      nextPool: [
        makeTask({ id: 'guard-1', title: 'Next 1', pool: 'next', position: 0 }),
        makeTask({ id: 'guard-2', title: 'Next 2', pool: 'next', position: 1 }),
        makeTask({ id: 'guard-3', title: 'Next 3', pool: 'next', position: 2 }),
        makeTask({ id: 'guard-4', title: 'Next 4', pool: 'next', position: 3 }),
      ],
    })
    await page.goto('/tasks')

    await expect(page.getByText('filling up')).toBeVisible({ timeout: 8000 })
  })
})

// -- HomePage -----------------------------------------------------------------

test.describe('HomePage', () => {
  test('shows energy picker on first load', async ({ authedPage: page }) => {
    await page.goto('/home')
    await expect(page.getByText("How's your energy right now?")).toBeVisible()
  })

  test('shows low energy banner when energyLevel is 2', async ({ authedPage: page }) => {
    await seedStore(page, { energyLevel: 2 })
    await page.goto('/home')

    await expect(page.getByText(/Low energy detected/)).toBeVisible({ timeout: 8000 })
    await expect(page.getByText('gentle mode')).toBeVisible()
  })

  test('low energy mode shows only 1 NOW task', async ({ authedPage: page }) => {
    await seedStore(page, {
      energyLevel: 1,
      nowPool: [
        makeTask({ id: 'low-1', title: 'First task', position: 0 }),
        makeTask({ id: 'low-2', title: 'Second task', position: 1 }),
        makeTask({ id: 'low-3', title: 'Third task', position: 2 }),
      ],
    })
    await page.goto('/home')

    // First task visible
    await expect(page.getByText('First task')).toBeVisible({ timeout: 8000 })
    // Second and third tasks hidden in low energy mode
    await expect(page.getByText('Second task')).not.toBeVisible()
    await expect(page.getByText('Third task')).not.toBeVisible()
  })

  test('shows daily focus goal card', async ({ authedPage: page }) => {
    // 2026-04-19: HomeDailyBrief gates "Today's focus" on weeklyStats truthy.
    // Prior test-pass relied on useSessionHistory overwriting store with zeros;
    // fix now preserves last-known values, so test seeds real stats explicitly.
    await seedStore(page, {
      weeklyStats: {
        peakFocusTime: '10-12am',
        tasksCompleted: 3,
        mostUsedPreset: 'brown',
        peakEnergyLevel: 3,
        consistencyScore: 0.5,
        totalFocusMinutes: 60,
        dailyMinutes: [0, 10, 20, 0, 30, 0, 0],
      },
    })
    await page.goto('/home')
    await expect(page.getByText("Today's focus")).toBeVisible({ timeout: 8000 })
  })

  test('shows NOW pool header with counter', async ({ authedPage: page }) => {
    await page.goto('/home')
    await expect(page.getByText('NOW', { exact: true })).toBeVisible()
    await expect(page.getByText('0/3')).toBeVisible()
  })
})

// -- AddTaskModal — notes and repeat ------------------------------------------

test.describe('AddTaskModal features', () => {
  test('shows Add context link that expands note textarea', async ({ authedPage: page }) => {
    await page.goto('/tasks')
    await page.getByRole('button', { name: /add task/i }).last().click()

    // "Add context" link visible
    const contextLink = page.getByText(/Add context/)
    await expect(contextLink).toBeVisible()

    // Click to expand
    await contextLink.click()

    // Textarea should now be visible (aria-expanded changes)
    await expect(page.locator('textarea').last()).toBeVisible()
  })

  test('shows repeat picker with Once/Daily/Weekly options', async ({ authedPage: page }) => {
    await page.goto('/tasks')
    await page.getByRole('button', { name: /add task/i }).last().click()

    // Repeat section visible
    await expect(page.getByText('Repeat')).toBeVisible()

    // Three repeat options
    await expect(page.getByRole('button', { name: /Once/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Daily/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Weekly/i })).toBeVisible()
  })

  test('task note preview shown on task card when note exists', async ({ authedPage: page }) => {
    await seedStore(page, {
      nowPool: [
        makeTask({
          id: 'note-task-1',
          title: 'Task with note',
          note: 'Remember to check the docs',
          position: 0,
        }),
      ],
    })
    await page.goto('/tasks')

    await expect(page.getByText('Task with note')).toBeVisible({ timeout: 8000 })
    await expect(page.getByText(/Remember to check the docs/)).toBeVisible()
  })
})

// -- Settings — medication, focus goal, sound, preferences --------------------

test.describe('Settings extended', () => {
  test('shows Medication section with toggle', async ({ authedPage: page }) => {
    await page.goto('/settings')
    await expect(page.getByText('Medication', { exact: true })).toBeVisible()
  })

  test('shows Daily Focus Goal section with duration chips', async ({ authedPage: page }) => {
    await page.goto('/settings')
    await expect(page.getByText('Daily Focus Goal')).toBeVisible()

    // Duration chip options — use exact button text to avoid matching Sound presets
    await expect(page.getByRole('button', { name: '30m', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '60m', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '90m', exact: true })).toBeVisible()
  })

  test('shows Re-run setup wizard button in Preferences', async ({ authedPage: page }) => {
    await page.goto('/settings')
    await expect(page.getByText(/Re-run setup wizard|Re-run setup/i)).toBeVisible()
  })

  test('shows Sound section', async ({ authedPage: page }) => {
    await page.goto('/settings')
    await expect(page.getByText('Sound', { exact: true })).toBeVisible()
  })

  test('shows Interface Style section', async ({ authedPage: page }) => {
    await page.goto('/settings')
    await expect(page.getByText('Interface Style', { exact: true })).toBeVisible()
  })
})

// -- Focus Room ---------------------------------------------------------------

test.describe('FocusScreen — room button', () => {
  test('shows Focus with someone button on setup screen', async ({ authedPage: page }) => {
    await page.goto('/focus')
    await expect(page.getByText('Focus Session')).toBeVisible({ timeout: 8000 })
    await expect(page.getByText(/Focus with someone/)).toBeVisible()
  })
})

// -- Breathwork Ritual (via focus session start) ------------------------------

test.describe('BreathworkRitual', () => {
  test('breathwork ritual appears on Start Focus and can be skipped', async ({ authedPage: page }) => {
    await page.goto('/focus')

    // Wait for setup screen to be fully loaded
    await expect(page.getByText('Focus Session')).toBeVisible({ timeout: 8000 })

    // Click the secondary "Breathe first" button to opt into breathwork ritual
    await page.getByRole('button', { name: 'Start focus session with breathing ritual', exact: true }).click()

    // Breathwork shows: either "Breathe in..." or "Breathe out..."
    await expect(page.getByText(/Breathe in|Breathe out/)).toBeVisible({ timeout: 5000 })

    // Skip button with exact aria-label "Skip breathing ritual" (not the setup screen one)
    const skipBtn = page.getByRole('button', { name: 'Skip breathing ritual', exact: true })
    await expect(skipBtn).toBeVisible()

    // Skip and verify active session starts (ArcTimer appears)
    await skipBtn.click()
    await expect(page.getByRole('button', { name: /Focus timer/i })).toBeVisible({ timeout: 5000 })
  })

  test('breathwork shows breath count progress', async ({ authedPage: page }) => {
    await page.goto('/focus')
    await expect(page.getByText('Focus Session')).toBeVisible({ timeout: 8000 })

    await page.getByRole('button', { name: /^Start focus session with/i }).click()

    // Shows "Breath X of 3"
    await expect(page.getByText(/Breath \d+ of 3/)).toBeVisible({ timeout: 5000 })
  })
})
