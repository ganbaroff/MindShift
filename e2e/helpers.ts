/**
 * E2E test helpers — shared fixtures, auth mocking, Zustand hydration.
 *
 * Strategy:
 *  1. Inject Zustand persisted state into localStorage before navigation.
 *  2. Inject Supabase auth session into its own localStorage key so
 *     `supabase.auth.getSession()` returns a valid session client-side.
 *  3. Intercept Supabase auth & PostgREST endpoints to prevent real API calls.
 *  4. Dismiss CookieBanner by seeding its localStorage key.
 */
import { test as base, type Page } from '@playwright/test'

// ── Test user constants ────────────────────────────────────────────────────────

export const TEST_USER = {
  id: 'e2e-test-user-00000000-0000-0000-0000-000000000001',
  email: 'e2e-test@mindshift.app',
}

// Supabase project ref — extracted from VITE_SUPABASE_URL
const SUPABASE_REF = 'cinctbslvejqicxanvnr'

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

// ── Supabase auth session builder ──────────────────────────────────────────────

/**
 * Build a fake Supabase session stored in localStorage.
 * The Supabase JS client reads `sb-{ref}-auth-token` from localStorage
 * in `getSession()` BEFORE making any network call, so this is the
 * primary mechanism for auth mocking in E2E tests.
 */
function buildSupabaseSession() {
  const now = Math.floor(Date.now() / 1000)
  const expiresAt = now + 86_400 // 24h in the future — won't trigger refresh

  // Build a JWT-like access_token. The Supabase client checks `expires_at`
  // from the stored session object (not the JWT payload) for expiry decisions.
  // The signature is irrelevant client-side — only the server validates it.
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    iss: 'supabase',
    sub: TEST_USER.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: TEST_USER.email,
    iat: now,
    exp: expiresAt,
  })).toString('base64url')
  const fakeJwt = `${header}.${payload}.e2e-test-signature`

  return {
    access_token: fakeJwt,
    token_type: 'bearer',
    expires_in: 86_400,
    expires_at: expiresAt,
    refresh_token: 'e2e-fake-refresh-token',
    user: {
      id: TEST_USER.id,
      email: TEST_USER.email,
      aud: 'authenticated',
      role: 'authenticated',
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: {},
      identities: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  }
}

// ── Auth mocking ───────────────────────────────────────────────────────────────

/** Intercept Supabase auth, DB & Edge Function calls so tests run offline. */
export async function mockSupabase(page: Page) {
  const session = buildSupabaseSession()

  // Intercept auth session check (AuthGuard + onAuthStateChange)
  await page.route('**/auth/v1/session', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(session),
    })
  )

  // Intercept auth user endpoint
  await page.route('**/auth/v1/user', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(session.user),
    })
  )

  // Intercept token refresh — prevent real API calls
  await page.route('**/auth/v1/token**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(session),
    })
  )

  // Intercept OTP endpoint (magic link send)
  // Note: signInWithOtp adds ?redirect_to= query param, so we need ** suffix
  await page.route('**/auth/v1/otp**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message_id: 'e2e-mock-message' }),
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

  // Intercept Edge Functions — return valid decompose-task response
  await page.route('**/functions/v1/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        steps: ['Step 1: Break it into small pieces', 'Step 2: Do the first piece', 'Step 3: Check your work'],
        estimatedMinutes: 15,
        message: 'Welcome back — you showed up, and that\'s what matters.',
        insights: ['Great consistency this week.', 'Your peak focus is in the morning.', 'Try a 25-minute session tomorrow.'],
      }),
    })
  )
}

// ── Seed localStorage with Zustand state + Supabase session ────────────────────

export async function seedStore(page: Page, overrides: Record<string, unknown> = {}) {
  const storeState = buildStoreState(overrides)
  const supabaseSession = buildSupabaseSession()
  const storageKey = `sb-${SUPABASE_REF}-auth-token`

  await page.addInitScript(({ storeState, supabaseSession, storageKey }) => {
    // Zustand persisted state — drives app UI (userId, email, onboardingCompleted, etc.)
    localStorage.setItem('mindshift-store', JSON.stringify(storeState))

    // Supabase auth session — drives AuthGuard's getSession() check
    localStorage.setItem(storageKey, JSON.stringify(supabaseSession))

    // Dismiss CookieBanner so it doesn't interfere with element queries
    localStorage.setItem('ms_cookie_consent', JSON.stringify({
      accepted: true,
      version: '2026-03',
      at: new Date().toISOString(),
    }))
  }, { storeState, supabaseSession, storageKey })
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
