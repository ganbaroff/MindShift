/**
 * E2E: MochiChat — AI chat, crisis detection, rate limit
 *
 * Covers:
 * - Sheet opens and shows welcome message
 * - Sending a message and receiving AI response
 * - Crisis keyword triggers safety resources (no AI call)
 * - Guest user sees sign-in prompt
 * - 20-message limit disables input
 */
import { test, expect, seedStore, mockSupabase } from './helpers'

const MOCHI_AI_RESPONSE = {
  message: "Sounds like you're in a good rhythm. Keep it going.",
  mascotState: 'focused',
}

// ── Fixtures ─────────────────────────────────────────────────────────────────

async function openMochiChat(page: import('@playwright/test').Page) {
  await page.goto('/today')
  // Mochi FAB is visible outside active focus sessions
  const fab = page.getByRole('button', { name: /Chat with Mochi/i })
  await expect(fab).toBeVisible({ timeout: 5000 })
  await fab.click()
  // Sheet opens — welcome message visible (hardcoded English string in MochiChat.tsx)
  await expect(page.getByText(/Hey.*Tap me|Hey.*nudge/i)).toBeVisible({ timeout: 4000 })
}

// Helper: get the chat input regardless of locale (uses aria-label or role)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getChatInput(page: import('@playwright/test').Page) {
  return page.getByRole('textbox', { name: /message|mochi|ask|сообщение|спроси/i })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('MochiChat — sheet and welcome', () => {
  test('opens from FAB and shows welcome message', async ({ page }) => {
    await mockSupabase(page)
    await seedStore(page, { userId: 'e2e-test-user-00000000-0000-0000-0000-000000000001' })
    await openMochiChat(page)

    // Sheet is open — close button exists (aria-label = t('mochi.closeChat') = "Close chat")
    await expect(page.getByRole('button', { name: /close/i })).toBeVisible({ timeout: 3000 })
  })

  test('closes on close button tap', async ({ page }) => {
    await mockSupabase(page)
    await seedStore(page)
    await openMochiChat(page)

    await page.getByRole('button', { name: /close/i }).click()
    // Sheet dismissed — FAB visible again
    await expect(page.getByRole('button', { name: /Chat with Mochi/i })).toBeVisible({ timeout: 3000 })
  })
})

test.describe('MochiChat — message flow', () => {
  test('sends message and shows AI response', async ({ page }) => {
    await mockSupabase(page)
    // Override edge function mock to return Mochi response
    await page.route('**/functions/v1/mochi-respond', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCHI_AI_RESPONSE),
      })
    )
    await seedStore(page)
    await openMochiChat(page)

    const input = page.getByPlaceholder(/Ask Mochi anything/i)
    await expect(input).toBeVisible({ timeout: 3000 })
    await input.fill('How do I stay focused today?')
    await page.getByRole('button', { name: /send message/i }).click()

    // User message appears
    await expect(page.getByText('How do I stay focused today?')).toBeVisible({ timeout: 3000 })
    // AI response appears
    await expect(page.getByText(MOCHI_AI_RESPONSE.message)).toBeVisible({ timeout: 6000 })
  })

  test('Enter key submits message', async ({ page }) => {
    await mockSupabase(page)
    await page.route('**/functions/v1/mochi-respond', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCHI_AI_RESPONSE),
      })
    )
    await seedStore(page)
    await openMochiChat(page)

    const input = page.getByPlaceholder(/Ask Mochi anything/i)
    await input.fill('Quick test message')
    await input.press('Enter')

    await expect(page.getByText('Quick test message')).toBeVisible({ timeout: 3000 })
  })
})

test.describe('MochiChat — crisis detection', () => {
  test('crisis keyword shows resources without calling AI', async ({ page }) => {
    await mockSupabase(page)

    // Track whether mochi-respond was called
    let aiCalled = false
    await page.route('**/functions/v1/mochi-respond', (route) => {
      aiCalled = true
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCHI_AI_RESPONSE),
      })
    })

    await seedStore(page)
    await openMochiChat(page)

    const input = page.getByPlaceholder(/Ask Mochi anything/i)
    await input.fill('I want to end my life')
    await page.getByRole('button', { name: /send message/i }).click()

    // Crisis resources must be visible — 988 is the US crisis line
    await expect(page.getByText(/988|crisis/i)).toBeVisible({ timeout: 3000 })

    // Verify AI was NOT called (safety-first)
    expect(aiCalled).toBe(false)

    // Input remains functional — user is not blocked
    await expect(input).toBeEnabled()
  })

  test('Russian crisis keyword also triggers resources', async ({ page }) => {
    await mockSupabase(page)
    let aiCalled = false
    await page.route('**/functions/v1/mochi-respond', (route) => {
      aiCalled = true
      return route.abort()
    })

    // Do NOT seed Russian locale — keeps i18next in English so the input
    // placeholder stays as "Ask Mochi anything..." (matching our selector).
    // The crisis keyword detection is language-agnostic (detects RU keywords regardless).
    // We separately test that Russian resources show when locale is 'ru' via getCrisisResources.
    await seedStore(page)
    await openMochiChat(page)

    const input = page.getByPlaceholder(/Ask Mochi anything/i)
    await expect(input).toBeVisible({ timeout: 3000 })
    await input.fill('хочу умереть')
    await page.getByRole('button', { name: /send message/i }).click()

    // Crisis resources visible — default locale is 'en' so 988 appears
    await expect(
      page.getByText(/988|crisis/i).first()
    ).toBeVisible({ timeout: 3000 })
    expect(aiCalled).toBe(false)
  })
})

test.describe('MochiChat — guest user', () => {
  test('guest user sees sign-in prompt instead of chat', async ({ page }) => {
    // To keep the guest state: return no auth session so App.tsx creates a guest ID
    // from ms_guest_id in localStorage (which we seed to 'guest_abc123').
    // The auth session endpoint returning a null/empty session means no real user.
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

    // Seed store with guest userId AND seed ms_guest_id so App.tsx reuses it.
    // Also clear the Supabase auth token from localStorage so the client doesn't
    // find a cached session — the Supabase JS client reads from localStorage BEFORE
    // making network requests, bypassing our route mocks.
    await seedStore(page, { userId: 'guest_abc123', email: '' })
    await page.addInitScript(() => {
      localStorage.setItem('ms_guest_id', 'guest_abc123')
      // Clear any cached Supabase session so getSession() returns null
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
          localStorage.removeItem(key)
        }
      }
    })

    await page.goto('/today')
    const fab = page.getByRole('button', { name: /Chat with Mochi/i })
    await expect(fab).toBeVisible({ timeout: 5000 })
    await fab.click()

    // Guest prompt shows t('mochi.signIn') = "Sign in" button
    await expect(
      page.getByRole('button', { name: /sign in/i })
    ).toBeVisible({ timeout: 4000 })
  })
})

test.describe('MochiChat — message limit', () => {
  test('input disables after 20 messages with limit notice', async ({ page }) => {
    await mockSupabase(page)
    await page.route('**/functions/v1/mochi-respond', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Got it!', mascotState: 'focused' }),
      })
    )
    await seedStore(page)
    await openMochiChat(page)

    // Use aria-label selector — stable even when placeholder changes to "Limit reached"
    const inputLabel = 'Message to Mochi'
    const sendBtn = page.getByRole('button', { name: /send message/i })

    // Send 20 messages — wait for each response before sending the next
    for (let i = 0; i < 20; i++) {
      const input = page.getByLabel(inputLabel)
      await expect(input).toBeEnabled({ timeout: 5000 })
      await input.fill(`Message ${i + 1}`)
      await sendBtn.click()
      // Wait for the user message to appear in the chat (confirms send completed)
      await expect(page.getByText(`Message ${i + 1}`)).toBeVisible({ timeout: 5000 })
      // Wait for Mochi response to arrive (loading spinner disappears)
      await page.waitForTimeout(300)
    }

    // After 20 messages: limit notice visible
    // Rate limit text: "That's the limit for now — Mochi needs a rest too"
    await expect(
      page.getByText(/that.s the limit|that's the limit|limit for now/i)
    ).toBeVisible({ timeout: 5000 })

    // Input disabled — placeholder changes to "Limit reached"
    const inputAfterLimit = page.getByLabel(inputLabel)
    await expect(inputAfterLimit).toBeDisabled({ timeout: 5000 })
  })
})
