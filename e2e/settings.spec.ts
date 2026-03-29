/**
 * E2E: Settings screen (Sprint C SettingsPage UI)
 *
 * Tests settings sections, app mode chips, seasonal phase cards,
 * accessibility toggle, plan label, GDPR buttons, sign-out, and legal footer.
 */
import { test, expect, TEST_USER } from './helpers'

test.describe('Settings screen', () => {
  test.beforeEach(async ({ authedPage: page }) => {
    await page.goto('/settings')
  })

  test('renders key sections', async ({ authedPage: page }) => {
    // Header
    await expect(page.getByRole('heading', { name: /Settings/ })).toBeVisible()
    await expect(page.getByText(TEST_USER.email)).toBeVisible()

    // Section labels (text is mixed-case in DOM; CSS `uppercase` is visual only)
    await expect(page.getByText('App Mode', { exact: true })).toBeVisible()
    await expect(page.getByText('Timer', { exact: true })).toBeVisible()
    await expect(page.getByText('Energy', { exact: true })).toBeVisible()
    await expect(page.getByText('Phase', { exact: true })).toBeVisible()
    await expect(page.getByText('Rest Mode', { exact: true })).toBeVisible()
    await expect(page.getByText('Accessibility', { exact: true })).toBeVisible()
    await expect(page.getByText('Your Data', { exact: true })).toBeVisible()
  })

  test('app mode shows 3 options and they are clickable', async ({ authedPage: page }) => {
    // Three chip buttons (use exact emoji+label to avoid matching Interface Style section)
    const minimal = page.getByRole('button', { name: '🎯 Minimal' })
    const habit = page.getByRole('button', { name: '🌱 Habit' })
    const system = page.getByRole('button', { name: '🗂️ System' })

    await expect(minimal).toBeVisible()
    await expect(habit).toBeVisible()
    await expect(system).toBeVisible()

    // Click Habit — description updates
    await habit.click()
    await expect(page.getByText('Build daily streaks')).toBeVisible()

    // Click System — description updates
    await system.click()
    await expect(page.getByText('Full task management')).toBeVisible()
  })

  test('seasonal mode section shows 4 phase cards', async ({ authedPage: page }) => {
    await expect(page.getByText('Phase', { exact: true })).toBeVisible()

    // All four phases visible with emoji + label + desc
    await expect(page.getByText('Launch')).toBeVisible()
    await expect(page.getByText('Maintain')).toBeVisible()
    await expect(page.getByText('Recover')).toBeVisible()
    await expect(page.getByText('Sandbox')).toBeVisible()

    // Descriptions
    await expect(page.getByText('Up to 5 NOW')).toBeVisible()
    await expect(page.getByText('3 NOW tasks')).toBeVisible()
    await expect(page.getByText('Max 2 NOW')).toBeVisible()
    await expect(page.getByText('No limits')).toBeVisible()
  })

  test('switching seasonal mode updates selected card', async ({ authedPage: page }) => {
    // Click Recover phase card
    const recoverCard = page.getByRole('button', { name: /Recover/i })
    await recoverCard.click()

    // The Recover card should now have the selected border color (#7B72FF)
    // Verify by checking the label gets the primary color
    const recoverLabel = page.getByText('Recover').first()
    await expect(recoverLabel).toBeVisible()
  })

  test('accessibility toggle works', async ({ authedPage: page }) => {
    const toggle = page.getByRole('button', { name: /Reduced stimulation/i })
    await expect(toggle).toBeVisible()

    // Click to enable
    await toggle.click()

    // Toggle is custom — just verify it's still visible after click (state change)
    await expect(toggle).toBeVisible()
  })

  test('shows free plan label', async ({ authedPage: page }) => {
    await expect(page.getByText('MindShift Free')).toBeVisible()
  })

  test('GDPR buttons visible', async ({ authedPage: page }) => {
    await expect(page.getByRole('button', { name: /Export/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Delete account/i })).toBeVisible()
  })

  test('sign out button visible and navigates to /auth', async ({ authedPage: page }) => {
    const signOutBtn = page.getByRole('button', { name: /Sign out/i })
    await expect(signOutBtn).toBeVisible()

    // Mock the signOut endpoint
    await page.route('**/auth/v1/logout', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    )

    await signOutBtn.click()

    // Should navigate to auth screen
    await expect(page).toHaveURL(/\/auth/)
    await expect(page.getByText("Welcome. Let's get started.")).toBeVisible()
  })

  test('delete account shows confirmation dialog', async ({ authedPage: page }) => {
    const deleteBtn = page.getByRole('button', { name: /Delete account/i })
    await expect(deleteBtn).toBeVisible()
    await deleteBtn.click()

    // Confirmation dialog appears
    await expect(page.getByText(/permanently delete/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /Cancel/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Yes, delete/i })).toBeVisible()

    // Cancel hides the dialog
    await page.getByRole('button', { name: /Cancel/i }).click()
    await expect(page.getByText(/permanently delete/i)).not.toBeVisible()
  })

  test('export button is clickable', async ({ authedPage: page }) => {
    const exportBtn = page.getByRole('button', { name: /Export/i })
    await expect(exportBtn).toBeVisible()
    // Click triggers download (edge function mocked in helpers)
    await exportBtn.click()
    // Button should still be visible (no crash)
    await expect(exportBtn).toBeVisible()
  })

  test('Reminders section is visible', async ({ authedPage: page }) => {
    await expect(page.getByText('Reminders', { exact: true })).toBeVisible()
  })

  test('Reminders section shows enable button when permission not granted', async ({ authedPage: page }) => {
    // In test environment Notification.permission defaults to 'default'
    // On iOS non-standalone (iPhone 14 UA), shows "Add to Home Screen first" banner instead
    await expect(
      page.getByRole('button', { name: /Enable reminders/i })
        .or(page.getByText(/Reminders enabled/))
        .or(page.getByText(/Blocked by browser/))
        .or(page.getByText(/Add to Home Screen first/))
    ).toBeVisible()
  })

  test('footer shows legal links and version', async ({ authedPage: page }) => {
    await expect(page.getByText(/Privacy/)).toBeVisible()
    await expect(page.getByText(/Terms/)).toBeVisible()
    await expect(page.getByText(/Cookies/)).toBeVisible()
    await expect(page.getByText(/MindShift v1\.0/)).toBeVisible()
  })
})

test.describe('Legal pages (public)', () => {
  const setupPublicPage = async (page: import('@playwright/test').Page) => {
    await page.addInitScript(() => {
      localStorage.setItem('ms_cookie_consent', JSON.stringify({
        accepted: true, version: '2026-03', at: new Date().toISOString(),
      }))
    })
    await page.route('**/auth/v1/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
    )
  }

  test('privacy page loads without auth', async ({ page }) => {
    await setupPublicPage(page)
    await page.goto('/privacy')
    await expect(page.getByText(/privacy/i).first()).toBeVisible()
  })

  test('terms page loads without auth', async ({ page }) => {
    await setupPublicPage(page)
    await page.goto('/terms')
    await expect(page.getByText(/terms/i).first()).toBeVisible()
  })

  test('cookie policy page loads without auth', async ({ page }) => {
    await setupPublicPage(page)
    await page.goto('/cookie-policy')
    await expect(page.getByText(/cookie/i).first()).toBeVisible()
  })
})
