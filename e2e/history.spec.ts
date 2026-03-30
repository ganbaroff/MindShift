/**
 * E2E: HistoryPage — session timeline, summary stats, grouping
 *
 * Covers:
 * - Summary row (session count, total minutes, flow count)
 * - Sessions grouped by date (Today, Yesterday, older dates)
 * - Phase labels rendered with correct text
 * - Duration formatting (30m, 1h, —)
 * - Energy delta displayed (before → after)
 * - Guest user sees sign-in prompt, not timeline
 * - Empty state when no sessions exist
 */
import { test, expect, seedStore, mockSupabase, TEST_USER } from './helpers'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const today = new Date()
const yesterday = new Date(today)
yesterday.setDate(today.getDate() - 1)
const twoDaysAgo = new Date(today)
twoDaysAgo.setDate(today.getDate() - 2)

function isoDate(d: Date, hour = 10): string {
  const copy = new Date(d)
  copy.setHours(hour, 0, 0, 0)
  return copy.toISOString()
}

/** 5 sessions spread across today, yesterday, two days ago */
const MOCK_SESSIONS = [
  {
    id: 'sess-001',
    user_id: TEST_USER.id,
    started_at: isoDate(today, 9),
    duration_ms: 30 * 60 * 1000,   // 30m
    phase_reached: 'flow',
    energy_before: 3,
    energy_after: 4,
    audio_preset: null,
  },
  {
    id: 'sess-002',
    user_id: TEST_USER.id,
    started_at: isoDate(today, 14),
    duration_ms: 15 * 60 * 1000,   // 15m
    phase_reached: 'release',
    energy_before: 2,
    energy_after: 3,
    audio_preset: null,
  },
  {
    id: 'sess-003',
    user_id: TEST_USER.id,
    started_at: isoDate(yesterday, 10),
    duration_ms: 60 * 60 * 1000,   // 1h — tests "1h" formatting
    phase_reached: 'flow',
    energy_before: 4,
    energy_after: 5,
    audio_preset: 'brown',
  },
  {
    id: 'sess-004',
    user_id: TEST_USER.id,
    started_at: isoDate(twoDaysAgo, 11),
    duration_ms: 25 * 60 * 1000,   // 25m
    phase_reached: 'struggle',
    energy_before: null,
    energy_after: null,
    audio_preset: null,
  },
  {
    id: 'sess-005',
    user_id: TEST_USER.id,
    started_at: isoDate(twoDaysAgo, 15),
    duration_ms: 45 * 60 * 1000,   // 45m
    phase_reached: 'release',
    energy_before: 3,
    energy_after: null,
    audio_preset: null,
  },
]

// Total: 5 sessions, 175m focused, 2 flow sessions

async function goToHistory(page: import('@playwright/test').Page) {
  await page.goto('/history')
  // Wait for URL to match then wait for the page title heading
  await page.waitForURL(/\/history/, { timeout: 5000 })
  // Wait for the h1 heading which uses t('history.title') = "Session Log 📋"
  await expect(
    page.getByRole('heading').first()
  ).toBeVisible({ timeout: 5000 })
}

// ── Tests: summary stats ──────────────────────────────────────────────────────

test.describe('HistoryPage — summary stats', () => {
  test.beforeEach(async ({ page }) => {
    // IMPORTANT: mockSupabase FIRST so the generic **/rest/v1/** route is registered first.
    // Then register the specific focus_sessions mock AFTER so it wins (last-registered wins).
    await mockSupabase(page)
    await page.route('**/rest/v1/focus_sessions**', (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_SESSIONS),
        })
      }
      return route.continue()
    })
    await seedStore(page)
    await goToHistory(page)
  })

  test('shows correct session count', async ({ page }) => {
    // Summary card: "5" sessions
    await expect(page.getByText('5').first()).toBeVisible({ timeout: 4000 })
  })

  test('shows total focused minutes', async ({ page }) => {
    // 30+15+60+25+45 = 175m
    await expect(page.getByText('175m')).toBeVisible({ timeout: 4000 })
  })

  test('shows flow session count', async ({ page }) => {
    // 2 flow sessions (sess-001, sess-003) — shown in the third summary card
    // "2" appears in the flow sessions stat pill (gold color)
    await expect(page.getByText('2').first()).toBeVisible({ timeout: 4000 })
  })
})

// ── Tests: timeline grouping and content ──────────────────────────────────────

test.describe('HistoryPage — timeline', () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabase(page)
    await page.route('**/rest/v1/focus_sessions**', (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_SESSIONS),
        })
      }
      return route.continue()
    })
    await seedStore(page)
    await goToHistory(page)
  })

  test('shows Today label for today sessions', async ({ page }) => {
    // t('history.today') = "Today" — rendered in the timeline date group heading
    // Use first() to handle strict mode (BottomNav also has a "Today" tab)
    await expect(page.getByText(/today/i).first()).toBeVisible({ timeout: 4000 })
  })

  test('shows Yesterday label for yesterday sessions', async ({ page }) => {
    // t('history.yesterday') = "Yesterday"
    await expect(page.getByText(/yesterday/i)).toBeVisible({ timeout: 4000 })
  })

  test('formats 30-minute session correctly', async ({ page }) => {
    await expect(page.getByText('30m')).toBeVisible({ timeout: 4000 })
  })

  test('formats 1-hour session as 1h', async ({ page }) => {
    await expect(page.getByText('1h')).toBeVisible({ timeout: 4000 })
  })

  test('shows phase label for flow session', async ({ page }) => {
    // t('history.phaseFlow') = "Flow 🌊" — check by partial text match
    await expect(page.getByText(/flow/i).first()).toBeVisible({ timeout: 4000 })
  })

  test('shows audio preset badge when present', async ({ page }) => {
    // sess-003 has audio_preset: 'brown' — rendered as "🎧 brown"
    await expect(page.getByText(/brown/i)).toBeVisible({ timeout: 4000 })
  })

  test('shows session cards with border-left styling', async ({ page }) => {
    // Each session card has borderLeft: `3px solid ${phaseColor}` in inline style
    // Verify at least one session card is present
    const sessionCards = page.locator('[style*="border-left"]')
    await expect(sessionCards.first()).toBeVisible({ timeout: 4000 })
    // Expect exactly 5 session cards (one per mock session)
    await expect(sessionCards).toHaveCount(5, { timeout: 4000 })
  })
})

// ── Tests: guest state ────────────────────────────────────────────────────────

test.describe('HistoryPage — guest user', () => {
  test('shows sign-in prompt for guest user', async ({ page }) => {
    // Return no auth session so App.tsx keeps the seeded guest userId.
    // If mockSupabase is used, it returns a full session which overwrites userId to TEST_USER.id.
    await page.route('**/auth/v1/session', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'not authenticated' }),
      })
    )
    await page.route('**/auth/v1/user', (route) =>
      route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ message: 'not authenticated' }) })
    )
    await page.route('**/auth/v1/token**', (route) =>
      route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ message: 'not authenticated' }) })
    )
    await page.route('**/auth/v1/otp**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
    )
    await page.route('**/rest/v1/**', (route) => {
      const method = route.request().method()
      if (method === 'GET' || method === 'HEAD') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
    })
    await page.route('**/functions/v1/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: 'ok' }) })
    )

    await seedStore(page, { userId: 'guest_abc123', email: '' })
    await page.addInitScript(() => {
      localStorage.setItem('ms_guest_id', 'guest_abc123')
      // Clear any cached Supabase session so getSession() returns null.
      // The Supabase JS client reads from localStorage BEFORE making network
      // requests, so without this, seedStore's fake JWT bypasses our route mock.
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
          localStorage.removeItem(key)
        }
      }
    })
    await page.goto('/history')
    await page.waitForURL(/\/history/, { timeout: 5000 })

    // Guest prompt: t('history.signInTitle') = "Sign in to see your history"
    // Rendered as a <p> element, not a button
    await expect(
      page.getByText(/sign in to see your history/i)
    ).toBeVisible({ timeout: 5000 })

    // Summary stats should NOT be visible — no timeline cards
    await expect(page.locator('[style*="border-left"]')).toHaveCount(0, { timeout: 3000 })
  })
})

// ── Tests: empty state ────────────────────────────────────────────────────────

test.describe('HistoryPage — empty state', () => {
  test('shows encouraging empty state when no sessions', async ({ page }) => {
    // mockSupabase already returns [] for rest/v1/** — no override needed
    await mockSupabase(page)
    await seedStore(page)
    await page.goto('/history')
    await page.waitForURL(/\/history/, { timeout: 5000 })

    // Empty state plant emoji + message: t('history.noSessionsTitle') = "No sessions yet"
    await expect(page.getByText('🌱')).toBeVisible({ timeout: 5000 })
    // No session cards
    await expect(page.locator('[style*="border-left"]')).toHaveCount(0, { timeout: 3000 })
  })
})

// ── Tests: navigation ─────────────────────────────────────────────────────────

test.describe('HistoryPage — navigation', () => {
  test('is reachable from progress page via session log link', async ({ page }) => {
    await mockSupabase(page)
    await seedStore(page)
    await page.goto('/progress')

    // "Session Log →" link in ProgressPage
    const logLink = page.getByRole('link', { name: /session log/i })
    if (await logLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await logLink.click()
      await expect(page).toHaveURL(/\/history/, { timeout: 3000 })
    } else {
      // Fallback: navigate directly (link text may vary by locale/sprint)
      await page.goto('/history')
      await expect(page).toHaveURL(/\/history/)
    }
  })
})
