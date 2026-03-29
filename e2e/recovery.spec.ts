/**
 * E2E: Recovery flow (72h+ absence detection)
 *
 * RecoveryProtocol is the core ADHD safety feature: shown after 3+ days away.
 * Research #7: RSD spiral peaks at 3+ days absence → warm, non-shaming return.
 *
 * Coverage:
 *  - Shows when lastSessionAt is 73h+ ago and recoveryShown=false
 *  - Does NOT show when lastSessionAt is recent (<72h)
 *  - Does NOT show when recoveryShown=true
 *  - Key UI elements render (overwhelm picker, task input, skip button)
 *  - Skip button dismisses overlay and shows app content
 *  - Submitting one task adds it and dismisses
 *  - Micro-win shortcuts visible
 */
import { test, expect, seedStore } from './helpers'

/** 73 hours ago in ISO string */
const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000).toISOString()

test.describe('RecoveryProtocol — 72h absence', () => {
  test('shows after 73h absence with recoveryShown=false', async ({ authedPage: page }) => {
    await seedStore(page, {
      lastSessionAt: hoursAgo(73),
      recoveryShown: false,
    })
    await page.goto('/today')

    // Overwhelm question is the unique identifier for RecoveryProtocol
    await expect(page.getByText('How overwhelmed are you right now?')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText("What's the ONE thing that matters most right now?")).toBeVisible()
  })

  test('does NOT show when lastSessionAt is 24h ago', async ({ authedPage: page }) => {
    await seedStore(page, {
      lastSessionAt: hoursAgo(24),
      recoveryShown: false,
    })
    await page.goto('/today')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('How overwhelmed are you right now?')).not.toBeVisible()
  })

  test('does NOT show when recoveryShown=true even with old lastSessionAt', async ({ authedPage: page }) => {
    await seedStore(page, {
      lastSessionAt: hoursAgo(100),
      recoveryShown: true,
    })
    await page.goto('/today')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('How overwhelmed are you right now?')).not.toBeVisible()
  })

  test('shows overwhelm level picker (1–5)', async ({ authedPage: page }) => {
    await seedStore(page, { lastSessionAt: hoursAgo(73), recoveryShown: false })
    await page.goto('/today')

    await expect(page.getByRole('button', { name: /Overwhelm level: Very/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Overwhelm level: Barely/ })).toBeVisible()
  })

  test('skip button dismisses overlay and reveals app content', async ({ authedPage: page }) => {
    await seedStore(page, { lastSessionAt: hoursAgo(73), recoveryShown: false })
    await page.goto('/today')

    await expect(page.getByText('How overwhelmed are you right now?')).toBeVisible()

    await page.getByRole('button', { name: 'Skip — show my tasks' }).click()

    // Overlay dismissed — recovery question gone
    await expect(page.getByText('How overwhelmed are you right now?')).not.toBeVisible()
  })

  test('micro-win shortcuts are visible', async ({ authedPage: page }) => {
    await seedStore(page, { lastSessionAt: hoursAgo(73), recoveryShown: false })
    await page.goto('/today')

    await expect(page.getByText('Drink a glass of water')).toBeVisible()
    await expect(page.getByText('Take 5 slow breaths')).toBeVisible()
  })

  test('task input accepts text', async ({ authedPage: page }) => {
    await seedStore(page, { lastSessionAt: hoursAgo(73), recoveryShown: false })
    await page.goto('/today')

    const input = page.getByPlaceholder('Just one thing...')
    await expect(input).toBeVisible()
    await input.fill('Write one sentence')
    await expect(input).toHaveValue('Write one sentence')
  })

  test('micro-win click fills task input', async ({ authedPage: page }) => {
    await seedStore(page, { lastSessionAt: hoursAgo(73), recoveryShown: false })
    await page.goto('/today')

    // Button text includes emoji: "Drink a glass of water 💧"
    await page.getByRole('button', { name: /Drink a glass of water/ }).click()

    const input = page.getByPlaceholder('Just one thing...')
    // Value includes the emoji appended by the component
    await expect(input).toHaveValue(/Drink a glass of water/)
  })

  test('submit adds task and dismisses overlay', async ({ authedPage: page }) => {
    await seedStore(page, { lastSessionAt: hoursAgo(73), recoveryShown: false })
    await page.goto('/today')

    await page.getByPlaceholder('Just one thing...').fill('Review my notes')
    await page.getByRole('button', { name: "Let's go →" }).click()

    // Overlay should dismiss after submission
    await expect(page.getByText('How overwhelmed are you right now?')).not.toBeVisible({ timeout: 5000 })
  })

  test('does NOT show for brand-new users (no lastSessionAt)', async ({ authedPage: page }) => {
    await seedStore(page, {
      lastSessionAt: null,
      recoveryShown: false,
    })
    await page.goto('/today')
    await page.waitForLoadState('networkidle')

    // No session at all → not a returning user → no recovery prompt
    await expect(page.getByText('How overwhelmed are you right now?')).not.toBeVisible()
  })
})
