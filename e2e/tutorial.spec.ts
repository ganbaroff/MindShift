/**
 * E2E: FirstFocusTutorial
 *
 * Covers:
 *  1. Tutorial overlay appears for new users (firstFocusTutorialCompleted: false)
 *  2. Skip button works and marks tutorial done
 *  3. Tutorial does not appear after completion
 */

import { test, expect, seedStore, mockSupabase } from './helpers'

test.describe('FirstFocusTutorial', () => {
  test('appears for new users after onboarding', async ({ page }) => {
    await mockSupabase(page)
    await seedStore(page, { firstFocusTutorialCompleted: false })
    await page.goto('/')

    // Tutorial overlay is fullscreen z-50 — intro step should be visible
    await expect(page.getByText('Let\'s try focusing')).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('button', { name: /skip/i })).toBeVisible()
  })

  test('skip button dismisses tutorial and persists completion', async ({ page }) => {
    await mockSupabase(page)
    await seedStore(page, { firstFocusTutorialCompleted: false })
    await page.goto('/')

    await page.getByRole('button', { name: /skip/i }).first().click()

    // Tutorial overlay gone — app renders normally
    await expect(page.getByText('Let\'s try focusing')).not.toBeVisible({ timeout: 3000 })

    // firstFocusTutorialCompleted should be true in persisted store.
    // idbStorage.setItem writes to IDB asynchronously and keeps a backup in
    // localStorage under 'mindshift-store_backup'. Poll until the value
    // propagates (typically < 500 ms).
    await page.waitForFunction(() => {
      const raw = localStorage.getItem('mindshift-store_backup')
        ?? localStorage.getItem('mindshift-store')
      if (!raw) return false
      try {
        const state = (JSON.parse(raw) as { state: { firstFocusTutorialCompleted?: boolean } }).state
        return state.firstFocusTutorialCompleted === true
      } catch {
        return false
      }
    }, undefined, { timeout: 5000 })
    // If waitForFunction resolves, the value is true — no separate assertion needed,
    // but add one for a clear failure message if somehow we get here with wrong value.
    const stored = await page.evaluate(() => {
      const raw = localStorage.getItem('mindshift-store_backup')
        ?? localStorage.getItem('mindshift-store')
      if (!raw) return null
      return (JSON.parse(raw) as { state: { firstFocusTutorialCompleted?: boolean } }).state
        .firstFocusTutorialCompleted
    })
    expect(stored).toBe(true)
  })

  test('does not appear once completed', async ({ page }) => {
    // Default seedStore has firstFocusTutorialCompleted: true
    await mockSupabase(page)
    await seedStore(page)
    await page.goto('/')

    await expect(page.getByText('Let\'s try focusing')).not.toBeVisible({ timeout: 3000 })
  })
})
