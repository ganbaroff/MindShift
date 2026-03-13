/**
 * E2E: Settings screen + GDPR controls
 *
 * Tests settings sections, accessibility toggle, subscription UI,
 * GDPR export/delete flows, and sign-out.
 */
import { test, expect, TEST_USER } from './helpers'

test.describe('Settings screen', () => {
  test.beforeEach(async ({ authedPage: page }) => {
    await page.goto('/settings')
  })

  test('renders all settings sections', async ({ authedPage: page }) => {
    // Header
    await expect(page.getByRole('heading', { name: /Settings/ })).toBeVisible()
    await expect(page.getByText(TEST_USER.email)).toBeVisible()

    // Sections
    await expect(page.getByText('Plan').first()).toBeVisible()
    await expect(page.getByText('Avatar')).toBeVisible()
    await expect(page.getByText('App Mode')).toBeVisible()
    await expect(page.getByText('Focus Style')).toBeVisible()
    await expect(page.getByText('Accessibility')).toBeVisible()
    await expect(page.getByText('Your Data', { exact: true })).toBeVisible()
  })

  test('avatar selection shows 6 emoji options', async ({ authedPage: page }) => {
    const avatars = ['🌱', '🌿', '🍀', '🌸', '🌻', '🌳']
    for (const emoji of avatars) {
      // Use exact:true to avoid matching app mode buttons (e.g. "🌱 Habit...")
      await expect(page.getByRole('button', { name: emoji, exact: true })).toBeVisible()
    }
  })

  test('app mode shows 3 options', async ({ authedPage: page }) => {
    await expect(page.getByText(/Minimal — one task at a time/)).toBeVisible()
    await expect(page.getByText(/Habit — daily routine builder/)).toBeVisible()
    await expect(page.getByText(/System — full visibility/)).toBeVisible()
  })

  test('focus style shows 2 cognitive modes', async ({ authedPage: page }) => {
    await expect(page.getByText(/One at a time/)).toBeVisible()
    await expect(page.getByText(/See everything/)).toBeVisible()
  })
})

test.describe('Accessibility toggle', () => {
  test('reduced stimulation toggle is a switch', async ({ authedPage: page }) => {
    await page.goto('/settings')

    const toggle = page.getByRole('switch')
    await expect(toggle).toBeVisible()
    await expect(toggle).toHaveAttribute('aria-checked', 'false')
  })

  test('toggling reduced stimulation updates state', async ({ authedPage: page }) => {
    await page.goto('/settings')

    const toggle = page.getByRole('switch')
    await toggle.click()

    await expect(toggle).toHaveAttribute('aria-checked', 'true')
  })
})

test.describe('Subscription (free tier)', () => {
  test('shows free tier with trial CTA', async ({ authedPage: page }) => {
    await page.goto('/settings')

    await expect(page.getByText('Free').first()).toBeVisible()
    await expect(page.getByRole('button', { name: /start 30-day free trial/i })).toBeVisible()
  })

  test('clicking trial CTA shows confirmation', async ({ authedPage: page }) => {
    await page.goto('/settings')

    await page.getByRole('button', { name: /start 30-day free trial/i }).click()

    await expect(page.getByText(/No card required/)).toBeVisible()
    await expect(page.getByRole('button', { name: /activate trial/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /later/i })).toBeVisible()
  })

  test('"Later" dismisses trial activation', async ({ authedPage: page }) => {
    await page.goto('/settings')

    await page.getByRole('button', { name: /start 30-day free trial/i }).click()
    await page.getByRole('button', { name: /later/i }).click()

    // Back to original state
    await expect(page.getByRole('button', { name: /start 30-day free trial/i })).toBeVisible()
  })
})

test.describe('GDPR controls', () => {
  test('export button is visible', async ({ authedPage: page }) => {
    await page.goto('/settings')

    await expect(page.getByRole('button', { name: /download all my data/i })).toBeVisible()
  })

  test('delete account button shows confirmation flow', async ({ authedPage: page }) => {
    await page.goto('/settings')

    // Click delete button
    await page.getByRole('button', { name: /delete my account/i }).click()

    // Confirmation form appears — check the warning message
    await expect(page.getByText(/this action cannot be undone/i)).toBeVisible()
    await expect(page.getByText(/type your email to confirm/i)).toBeVisible()

    // Delete button is disabled until email matches
    const deleteBtn = page.getByRole('button', { name: /yes, delete/i })
    await expect(deleteBtn).toBeDisabled()
  })

  test('cancel dismisses delete confirmation', async ({ authedPage: page }) => {
    await page.goto('/settings')

    await page.getByRole('button', { name: /delete my account/i }).click()
    await page.getByRole('button', { name: /cancel/i }).click()

    // Back to delete button
    await expect(page.getByRole('button', { name: /delete my account/i })).toBeVisible()
  })

  test('delete button enables when email matches', async ({ authedPage: page }) => {
    await page.goto('/settings')

    await page.getByRole('button', { name: /delete my account/i }).click()

    // Type matching email
    const emailInput = page.getByPlaceholder(TEST_USER.email)
    await emailInput.fill(TEST_USER.email)

    // Delete button should be enabled
    const deleteBtn = page.getByRole('button', { name: /yes, delete/i })
    await expect(deleteBtn).toBeEnabled()
  })
})

test.describe('Sign out', () => {
  test('sign out button is visible', async ({ authedPage: page }) => {
    await page.goto('/settings')

    await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible()
  })
})

test.describe('Legal links', () => {
  test('footer has links to legal pages', async ({ authedPage: page }) => {
    await page.goto('/settings')

    await expect(page.getByRole('link', { name: /privacy policy/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /terms of service/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /cookie policy/i })).toBeVisible()
  })

  test('version string is visible', async ({ authedPage: page }) => {
    await page.goto('/settings')

    await expect(page.getByText(/MindShift v1\.0\.0/)).toBeVisible()
    await expect(page.getByText(/ADHD minds/)).toBeVisible()
  })
})

test.describe('Legal pages (public)', () => {
  test('privacy page loads without auth', async ({ page }) => {
    // Dismiss cookie banner
    await page.addInitScript(() => {
      localStorage.setItem('ms_cookie_consent', JSON.stringify({
        accepted: true, version: '2026-03', at: new Date().toISOString(),
      }))
    })

    // Intercept auth endpoints (prevent real API calls on public pages)
    await page.route('**/auth/v1/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
    )

    await page.goto('/privacy')
    await expect(page.getByText(/privacy/i).first()).toBeVisible()
  })

  test('terms page loads without auth', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('ms_cookie_consent', JSON.stringify({
        accepted: true, version: '2026-03', at: new Date().toISOString(),
      }))
    })
    await page.route('**/auth/v1/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
    )

    await page.goto('/terms')
    await expect(page.getByText(/terms/i).first()).toBeVisible()
  })

  test('cookie policy page loads without auth', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('ms_cookie_consent', JSON.stringify({
        accepted: true, version: '2026-03', at: new Date().toISOString(),
      }))
    })
    await page.route('**/auth/v1/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
    )

    await page.goto('/cookie-policy')
    await expect(page.getByText(/cookie/i).first()).toBeVisible()
  })
})
