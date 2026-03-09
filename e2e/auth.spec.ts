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

test.describe('Auth screen', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept the Supabase OTP call so it never hits a real server
    await page.route('**/auth/v1/otp', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      })
    )

    // Intercept session check to return "no session" (unauthenticated)
    await page.route('**/auth/v1/session', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
    )

    await page.goto('/auth')
  })

  test('renders sign-in form with email input and consent checkbox', async ({ page }) => {
    // Heading
    await expect(page.getByText('Sign in with email')).toBeVisible()

    // Email field
    const emailInput = page.getByPlaceholder('your@email.com')
    await expect(emailInput).toBeVisible()
    await expect(emailInput).toBeFocused()

    // Consent checkbox
    await expect(page.getByText(/16 or older/)).toBeVisible()
    await expect(page.getByText('Terms of Service')).toBeVisible()
    await expect(page.getByText('Privacy Policy')).toBeVisible()

    // Submit button — initially disabled
    const submitBtn = page.getByRole('button', { name: /send magic link/i })
    await expect(submitBtn).toBeVisible()
    await expect(submitBtn).toBeDisabled()
  })

  test('submit button remains disabled without consent', async ({ page }) => {
    const emailInput = page.getByPlaceholder('your@email.com')
    await emailInput.fill('test@example.com')

    const submitBtn = page.getByRole('button', { name: /send magic link/i })
    // Email filled but checkbox not checked → still disabled
    await expect(submitBtn).toBeDisabled()
  })

  test('submit button enables when email + consent provided', async ({ page }) => {
    const emailInput = page.getByPlaceholder('your@email.com')
    await emailInput.fill('user@example.com')

    // Check the consent checkbox by clicking the label text
    await page.getByText(/16 or older/).click()

    const submitBtn = page.getByRole('button', { name: /send magic link/i })
    await expect(submitBtn).toBeEnabled()
  })

  test('shows "check your inbox" after submitting', async ({ page }) => {
    const emailInput = page.getByPlaceholder('your@email.com')
    await emailInput.fill('user@example.com')
    await page.getByText(/16 or older/).click()

    await page.getByRole('button', { name: /send magic link/i }).click()

    // Check inbox step
    await expect(page.getByText('Check your inbox')).toBeVisible()
    await expect(page.getByText('user@example.com')).toBeVisible()
    await expect(page.getByText(/use a different email/i)).toBeVisible()
  })

  test('"use a different email" returns to email input', async ({ page }) => {
    // Submit first
    await page.getByPlaceholder('your@email.com').fill('user@example.com')
    await page.getByText(/16 or older/).click()
    await page.getByRole('button', { name: /send magic link/i }).click()

    // Go back
    await page.getByText(/use a different email/i).click()

    // Should be back on email step
    await expect(page.getByPlaceholder('your@email.com')).toBeVisible()
    await expect(page.getByText('Sign in with email')).toBeVisible()
  })

  test('MindShift branding is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'MindShift' })).toBeVisible()
    await expect(page.getByText('Focus made kind')).toBeVisible()
  })
})

test.describe('Auth redirect', () => {
  test('unauthenticated user on / is redirected to /auth', async ({ page }) => {
    // No session mocked — return empty
    await page.route('**/auth/v1/session', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
    )

    await page.goto('/')
    // AuthGuard should redirect to /auth
    await page.waitForURL('**/auth')
    await expect(page.getByText('Sign in with email')).toBeVisible()
  })
})
