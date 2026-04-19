/**
 * E2E: data-face attribute (EGAP-1 foundation, 2026-04-19)
 *
 * MindShift ships v1.0 as a single-face app, but the Ecosystem Design
 * Manifesto Law 7 ("One Body, N Faces") requires the data-face attribute
 * to exist from day one so future faces (VOLAURA, Life Sim, BrandedBy,
 * ZEUS) can re-theme via the Tier-3 accent token without UI rewrites.
 *
 * This test verifies:
 *   • <html data-face="mindshift"> is set on mount.
 *   • The value stays "mindshift" across route transitions — accent is a
 *     face-scoped token, not a route-scoped one.
 */
import { test, expect } from './helpers'

test.describe('EGAP-1 — data-face attribute', () => {
  test('<html> has data-face="mindshift" on /today', async ({ authedPage: page }) => {
    await page.goto('/today')
    await page.waitForLoadState('networkidle')

    const face = await page.locator('html').getAttribute('data-face')
    expect(face).toBe('mindshift')
  })

  test('data-face persists across route transitions', async ({ authedPage: page }) => {
    await page.goto('/today')
    await page.waitForLoadState('networkidle')
    expect(await page.locator('html').getAttribute('data-face')).toBe('mindshift')

    await page.goto('/tasks')
    await page.waitForLoadState('networkidle')
    expect(await page.locator('html').getAttribute('data-face')).toBe('mindshift')

    await page.goto('/progress')
    await page.waitForLoadState('networkidle')
    expect(await page.locator('html').getAttribute('data-face')).toBe('mindshift')
  })

  test('--color-face-accent resolves to MindShift accent hex', async ({ authedPage: page }) => {
    await page.goto('/today')
    await page.waitForLoadState('networkidle')

    // Read the computed value of the accent token on <html>. The per-face
    // override block `[data-face="mindshift"] { --color-face-accent: #7B72FF }`
    // should take precedence over the @theme default (which aliases --color-primary).
    const accent = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue('--color-face-accent')
        .trim()
        .toLowerCase()
    )

    // Accept the literal hex from the [data-face="mindshift"] block, or an
    // equivalent resolved form if the browser normalizes it.
    expect(accent === '#7b72ff' || accent === 'rgb(123, 114, 255)').toBe(true)
  })
})
