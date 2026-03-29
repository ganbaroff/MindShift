/**
 * E2E: Authentication flow
 *
 * Tests the auth screen UI, form validation, consent checkbox,
 * and the "check your inbox" step after submitting.
 *
 * NOTE: Actual magic-link delivery is NOT tested (requires email infra).
 * We verify that the UI behaves correctly up to the OTP request.
 */
import { test, expect } from '@playwright/test'

/** Helper: click the custom consent checkbox (the visual checkbox <div>, not the text). */
async function clickConsentCheckbox(page: import('@playwright/test').Page) {
  // The consent label wraps a <div> (visual checkbox) and a <span> (text).
  // The onClick handler lives on the <div>, so we must click it — not the text.
  const label = page.locator('label').filter({ hasText: /16 or older/ })
  // Click the first div inside the label — that's the checkbox container
  await label.locator('div').first().click()
}

test.describe('Auth screen', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept the Supabase OTP call so it never hits a real server
    // signInWithOtp adds ?redirect_to= query param, so we need ** suffix
    await page.route('**/auth/v1/otp**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message_id: 'e2e-mock-message' }),
      })
    )

    // Intercept session check to return "no session" (unauthenticated)
    await page.route('**/auth/v1/session', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
    )

    // Intercept token refresh
    await page.route('**/auth/v1/token**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
    )

    // Dismiss cookie banner
    await page.addInitScript(() => {
      localStorage.setItem('ms_cookie_consent', JSON.stringify({
        accepted: true, version: '2026-03', at: new Date().toISOString(),
      }))
    })

    await page.goto('/auth')
  })

  test('renders sign-in form with email input and consent checkbox', async ({ page }) => {
    // Heading (copy: Welcome. Let's get started.)
    await expect(page.getByText("Welcome. Let's get started.")).toBeVisible()

    // Email field
    const emailInput = page.getByPlaceholder('Enter your email')
    await expect(emailInput).toBeVisible()

    // Consent checkbox — UI says "Terms" (not "Terms of Service") and "Privacy Policy"
    const consentLabel = page.locator('label').filter({ hasText: /16 or older/ })
    await expect(consentLabel).toBeVisible()
    await expect(consentLabel.locator('a').filter({ hasText: 'Terms' })).toBeVisible()
    await expect(consentLabel.locator('a').filter({ hasText: 'Privacy Policy' })).toBeVisible()

    // Submit button — initially disabled (no email, no consent)
    const submitBtn = page.getByRole('button', { name: /send magic link/i })
    await expect(submitBtn).toBeVisible()
    await expect(submitBtn).toBeDisabled()
  })

  test('submit button remains disabled without consent', async ({ page }) => {
    const emailInput = page.getByPlaceholder('Enter your email')
    await emailInput.fill('test@example.com')

    const submitBtn = page.getByRole('button', { name: /send magic link/i })
    // Email filled but checkbox not checked → still disabled
    await expect(submitBtn).toBeDisabled()
  })

  test('submit button enables when email + consent provided', async ({ page }) => {
    const emailInput = page.getByPlaceholder('Enter your email')
    await emailInput.fill('user@example.com')

    // Check the consent checkbox by clicking the visual checkbox div
    await clickConsentCheckbox(page)

    const submitBtn = page.getByRole('button', { name: /send magic link/i })
    await expect(submitBtn).toBeEnabled()
  })

  test('shows "magic link on its way" after submitting', async ({ page }) => {
    // Ensure OTP endpoint is mocked for POST as well
    await page.route('**/auth/v1/otp**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message_id: 'e2e-mock-message' }),
      })
    )

    const emailInput = page.getByPlaceholder('Enter your email')
    await emailInput.fill('user@example.com')
    await clickConsentCheckbox(page)

    await page.getByRole('button', { name: /send magic link/i }).click()

    // Sent state — copy: "Magic link on its way ✨"
    await expect(page.getByText('Magic link on its way ✨')).toBeVisible()
    await expect(page.getByText('user@example.com')).toBeVisible()
    await expect(page.getByText(/wrong email/i)).toBeVisible()
  })

  test('"wrong email? go back" returns to email input', async ({ page }) => {
    // Submit first
    await page.getByPlaceholder('Enter your email').fill('user@example.com')
    await clickConsentCheckbox(page)
    await page.getByRole('button', { name: /send magic link/i }).click()

    // Go back — copy: "Wrong email? Go back"
    await page.getByText(/wrong email/i).click()

    // Should be back on email step
    await expect(page.getByPlaceholder('Enter your email')).toBeVisible()
    await expect(page.getByText("Welcome. Let's get started.")).toBeVisible()
  })

  test('MindShift branding is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'MindShift' })).toBeVisible()
    await expect(page.getByText(/Focus made kind/)).toBeVisible()
  })

  test('"Continue without account" link is visible', async ({ page }) => {
    await expect(page.getByText(/Continue without account/)).toBeVisible()
  })

  test('Google sign-in button is visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible()
  })
})

test.describe('Auth bypass (AuthGuard disabled)', () => {
  test('unauthenticated user on / stays on home (no redirect to /auth)', async ({ page }) => {
    // AuthGuard is currently a passthrough — magic-link auth removed,
    // Google OAuth coming soon. Unauthenticated users see the home screen.
    await page.route('**/auth/v1/session', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
    )
    await page.route('**/auth/v1/token**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
    )
    await page.route('**/rest/v1/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    )

    // Dismiss cookie banner
    await page.addInitScript(() => {
      localStorage.setItem('ms_cookie_consent', JSON.stringify({
        accepted: true, version: '2026-03', at: new Date().toISOString(),
      }))
    })

    await page.goto('/')
    // / redirects to /today — verify we stay within the app (not /auth)
    await expect(page).toHaveURL(/\/(today)?$/)
    // TodayPage renders — check the page loaded successfully (not /auth)
    await expect(page.getByRole('navigation')).toBeVisible()
  })
})
