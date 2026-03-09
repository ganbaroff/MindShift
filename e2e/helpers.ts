/**
 * E2E test helpers — shared fixtures, auth mocking, Zustand hydration.
 *
 * Strategy:
 *  1. Inject Zustand persisted state into localStorage before navigation.
 *  2. Intercept Supabase auth endpoints to return a valid mock session.
 *  3. Intercept Supabase PostgREST calls to prevent real DB writes.
 */
import { test as base, type Page } from '@playwright/test'

// ── Test user constants ────────────────────────────────────────────────────────

export const TEST_USER = {
  id: 'e2e-test-user-00000000-0000-0000-0000-000000000001',
  email: 'e2e-test@mindshift.app',
  accessToken: 'e2e-fake-access-token',
}

// ── Zustand store seed ─────────────────────────────────────────────────────────

/** Minimal persisted Zustand state that passes AuthGuard. */
export function buildStoreState(overrides: Record<string, unknown> = {}) {
  return {
    state: {
      userId: TEST_USER.id,
      email: TEST_USER.email,
      cognitiveMode: 'focused',
      appMode: 'minimal',
      avatarId: 1,
      xpTotal: 0,
      lastSessionAt: new Date().toISOString(),
      onboardingCompleted: true,
      focusAnchor: null,
      achievements: [],
      audioVolume: 0.47,
      reducedStimulation: false,
      subscriptionTier: 'free',
      trialEndsAt: null,
      gridWidgets: [],
      psychotype: 'achiever',
      ...overrides,
    },
    version: 0,
  }
}

// ── Auth mocking ───────────────────────────────────────────────────────────────

/** Intercept Supabase auth & DB calls so tests run without a live backend. */
export async function mockSupabase(page: Page) {
  // Intercept auth session check (AuthGuard + onAuthStateChange)
  await page.route('**/auth/v1/session', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: TEST_USER.accessToken,
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'e2e-refresh',
        user: {
          id: TEST_USER.id,
          email: TEST_USER.email,
          aud: 'authenticated',
          role: 'authenticated',
        },
      }),
    })
  )

  // Intercept auth user endpoint
  await page.route('**/auth/v1/user', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: TEST_USER.id,
        email: TEST_USER.email,
        aud: 'authenticated',
        role: 'authenticated',
      }),
    })
  )

  // Intercept PostgREST calls (tasks, users, focus_sessions, etc.)
  await page.route('**/rest/v1/**', (route) => {
    const method = route.request().method()
    if (method === 'GET' || method === 'HEAD') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    }
    // POST / PATCH / DELETE → 200 OK
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    })
  })

  // Intercept Edge Functions
  await page.route('**/functions/v1/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ steps: ['Step 1', 'Step 2', 'Step 3'], estimatedMinutes: 15 }),
    })
  )
}

// ── Seed localStorage with Zustand state ───────────────────────────────────────

export async function seedStore(page: Page, overrides: Record<string, unknown> = {}) {
  const storeState = buildStoreState(overrides)
  await page.addInitScript((state) => {
    localStorage.setItem('mindshift-store', JSON.stringify(state))
  }, storeState)
}

// ── Extended test fixture — auto-authenticates via localStorage + route mocking ─

type Fixtures = {
  authedPage: Page
}

export const test = base.extend<Fixtures>({
  authedPage: async ({ page }, use) => {
    await mockSupabase(page)
    await seedStore(page)
    await use(page)
  },
})

export { expect } from '@playwright/test'
