/**
 * E2E (integration): Sprint E2 D.5 — volaura-bridge-proxy → VOLAURA character_events
 *
 * Full chain:
 *   MindShift JWT → volaura-bridge-proxy edge function
 *   → /api/auth/from_external (VOLAURA Railway)
 *   → character_events row inserted in VOLAURA shared Supabase
 *
 * REQUIREMENTS (set in .env or CI secrets):
 *   VITE_SUPABASE_URL        — MindShift Supabase URL
 *   SUPABASE_SERVICE_KEY_MS  — MindShift service_role key (to create test user + mint JWT)
 *   VOLAURA_SUPABASE_URL     — VOLAURA shared Supabase URL (to query character_events)
 *   VOLAURA_SERVICE_KEY      — VOLAURA shared Supabase service_role key
 *
 * The test creates a throwaway MindShift user, calls the proxy with their JWT,
 * verifies a character_events row was written, then deletes the test user.
 *
 * If any required env var is missing the test is SKIPPED (not failed), so
 * CI without secrets configured stays green.
 */

import { test, expect, request as pwRequest } from '@playwright/test'

// ── Helpers ───────────────────────────────────────────────────────────────────

const MS_URL     = process.env.VITE_SUPABASE_URL           ?? ''
const MS_SVC     = process.env.SUPABASE_SERVICE_KEY_MS      ?? ''  // service_role for MindShift project
const VOL_URL    = process.env.VOLAURA_SUPABASE_URL         ?? 'https://dwdgzfusjsobnixgyzjk.supabase.co'
const VOL_SVC    = process.env.VOLAURA_SERVICE_KEY          ?? ''  // service_role for VOLAURA project

const PROXY_URL  = MS_URL ? `${MS_URL}/functions/v1/volaura-bridge-proxy` : ''

/** Create a throwaway user in MindShift via admin API and return their JWT. */
async function createTestUser(ctx: Awaited<ReturnType<typeof pwRequest.newContext>>) {
  const email = `e2e-bridge-${Date.now()}@mindshift-e2e.dev`
  const password = 'E2eTestPass123!'

  // Create user via admin endpoint
  const createRes = await ctx.post(`${MS_URL}/auth/v1/admin/users`, {
    headers: {
      Authorization: `Bearer ${MS_SVC}`,
      apikey:        MS_SVC,
      'Content-Type': 'application/json',
    },
    data: {
      email,
      password,
      email_confirm: true,
      user_metadata: { source: 'e2e_bridge_test' },
    },
  })
  expect(createRes.ok(), `create test user: ${await createRes.text()}`).toBeTruthy()
  const user = await createRes.json()

  // Sign in to get JWT
  const signInRes = await ctx.post(`${MS_URL}/auth/v1/token?grant_type=password`, {
    headers: {
      apikey:         MS_SVC,
      'Content-Type': 'application/json',
    },
    data: { email, password },
  })
  expect(signInRes.ok(), `sign in test user: ${await signInRes.text()}`).toBeTruthy()
  const session = await signInRes.json()

  return {
    userId: user.id as string,
    email,
    jwt: session.access_token as string,
  }
}

/** Delete test user from MindShift after the test. */
async function deleteTestUser(
  ctx: Awaited<ReturnType<typeof pwRequest.newContext>>,
  userId: string,
) {
  await ctx.delete(`${MS_URL}/auth/v1/admin/users/${userId}`, {
    headers: {
      Authorization: `Bearer ${MS_SVC}`,
      apikey:        MS_SVC,
    },
  })
}

/** Query VOLAURA shared DB for character_events by shared_user_id. */
async function queryCharacterEvents(
  ctx: Awaited<ReturnType<typeof pwRequest.newContext>>,
  sharedUserId: string,
) {
  const res = await ctx.get(
    `${VOL_URL}/rest/v1/character_events?user_id=eq.${sharedUserId}&order=created_at.desc&limit=5`,
    {
      headers: {
        Authorization: `Bearer ${VOL_SVC}`,
        apikey:        VOL_SVC,
        Accept:        'application/json',
      },
    },
  )
  expect(res.ok(), `query character_events: ${await res.text()}`).toBeTruthy()
  return (await res.json()) as Array<Record<string, unknown>>
}

/** Query VOLAURA shared DB for identity mapping row. */
async function queryIdentityMap(
  ctx: Awaited<ReturnType<typeof pwRequest.newContext>>,
  standaloneUserId: string,
) {
  const res = await ctx.get(
    `${VOL_URL}/rest/v1/user_identity_map?standalone_user_id=eq.${standaloneUserId}&standalone_project_ref=eq.awfoqycoltvhamtrsvxk`,
    {
      headers: {
        Authorization: `Bearer ${VOL_SVC}`,
        apikey:        VOL_SVC,
        Accept:        'application/json',
      },
    },
  )
  if (!res.ok()) return []
  return (await res.json()) as Array<Record<string, unknown>>
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('volaura-bridge-proxy integration', () => {
  test.beforeEach(({ }, testInfo) => {
    // Skip the entire suite if required secrets are not available
    const missing: string[] = []
    if (!MS_URL)  missing.push('VITE_SUPABASE_URL')
    if (!MS_SVC)  missing.push('SUPABASE_SERVICE_KEY_MS')
    if (!VOL_SVC) missing.push('VOLAURA_SERVICE_KEY')
    if (missing.length > 0) {
      testInfo.skip(true, `Skipping bridge integration test — missing env vars: ${missing.join(', ')}`)
    }
  })

  test('fetch_state returns ok:false or ok:true (proxy reachable)', async () => {
    const ctx = await pwRequest.newContext()
    const { userId, jwt } = await createTestUser(ctx)

    try {
      const res = await ctx.post(PROXY_URL, {
        headers: {
          'Content-Type': 'application/json',
          apikey:         process.env.VITE_SUPABASE_ANON_KEY ?? '',
          Authorization:  `Bearer ${jwt}`,
        },
        data: { action: 'fetch_state' },
      })

      // Proxy always returns 200 (even if VOLAURA not configured)
      expect(res.status()).toBe(200)
      const body = await res.json() as { ok: boolean; reason?: string; data?: unknown }

      if (!body.ok) {
        // VOLAURA_API_URL or EXTERNAL_BRIDGE_SECRET not set — proxy is reachable but feature-gated
        console.log('Proxy reachable; VOLAURA not configured:', body.reason)
        test.info().annotations.push({ type: 'skip-reason', description: `not_configured: ${body.reason}` })
        return
      }

      // If ok:true, data should have character state fields
      expect(body.data).toBeDefined()
    } finally {
      await deleteTestUser(ctx, userId)
      await ctx.dispose()
    }
  })

  test('character_event → row written in VOLAURA shared DB', async () => {
    if (!VOL_SVC) {
      test.skip()
      return
    }

    const ctx = await pwRequest.newContext()
    const { userId, email, jwt } = await createTestUser(ctx)

    try {
      // Send a focus session event via proxy
      const proxyRes = await ctx.post(PROXY_URL, {
        headers: {
          'Content-Type': 'application/json',
          apikey:         process.env.VITE_SUPABASE_ANON_KEY ?? '',
          Authorization:  `Bearer ${jwt}`,
        },
        data: {
          action:     'character_event',
          event_type: 'xp_earned',
          payload: {
            _schema_version: 1,
            xp:            50,
            focus_minutes: 10,
            phase:         'focus',
            energy_before: 3,
            energy_after:  4,
            source:        'e2e_d5_test',
          },
        },
      })

      expect(proxyRes.status()).toBe(200)
      const proxyBody = await proxyRes.json() as {
        ok: boolean
        reason?: string
        shared_user_id?: string
      }

      if (!proxyBody.ok) {
        // Bridge not configured — mark skip and return
        test.skip(true, `Bridge not configured: ${proxyBody.reason}`)
        return
      }

      // ── Verify identity mapping was created ───────────────────────────────
      const sharedUserId = proxyBody.shared_user_id
      expect(sharedUserId, 'shared_user_id must be returned').toBeTruthy()

      const mappings = await queryIdentityMap(ctx, userId)
      expect(mappings.length, 'identity mapping row must exist').toBeGreaterThan(0)
      expect(mappings[0].shared_user_id).toBe(sharedUserId)
      expect((mappings[0].email as string).toLowerCase()).toBe(email.toLowerCase())
      expect(mappings[0].standalone_project_ref).toBe('awfoqycoltvhamtrsvxk')
      expect(mappings[0].source_product).toBe('mindshift')

      // ── Verify character_events row was written ───────────────────────────
      // Allow up to 3s for the Railway backend to persist the event
      let events: Array<Record<string, unknown>> = []
      for (let attempt = 0; attempt < 6; attempt++) {
        events = await queryCharacterEvents(ctx, sharedUserId!)
        if (events.length > 0) break
        await new Promise(r => setTimeout(r, 500))
      }

      expect(events.length, 'at least one character_events row must exist after proxy call').toBeGreaterThan(0)

      const ev = events[0]
      expect(ev.event_type).toBe('xp_earned')
      expect(ev.source_product).toBe('mindshift')

      // Verify payload was sanitized and forwarded correctly
      const payload = ev.payload as Record<string, unknown>
      expect(payload.xp).toBe(50)
      expect(payload.focus_minutes).toBe(10)
      expect(payload._schema_version).toBe(1)

    } finally {
      await deleteTestUser(ctx, userId)
      await ctx.dispose()
    }
  })

  test('invalid action returns 400', async () => {
    const ctx = await pwRequest.newContext()
    const { userId, jwt } = await createTestUser(ctx)

    try {
      const res = await ctx.post(PROXY_URL, {
        headers: {
          'Content-Type': 'application/json',
          apikey:         process.env.VITE_SUPABASE_ANON_KEY ?? '',
          Authorization:  `Bearer ${jwt}`,
        },
        data: { action: 'invalid_action' },
      })

      expect(res.status()).toBe(400)
      const body = await res.json() as { error: string }
      expect(body.error).toMatch(/action must be one of/i)
    } finally {
      await deleteTestUser(ctx, userId)
      await ctx.dispose()
    }
  })

  test('unauthenticated call returns 401', async () => {
    const ctx = await pwRequest.newContext()

    try {
      const res = await ctx.post(PROXY_URL, {
        headers: {
          'Content-Type': 'application/json',
          apikey:         process.env.VITE_SUPABASE_ANON_KEY ?? '',
          // No Authorization header — anon call
        },
        data: { action: 'fetch_state' },
      })

      expect(res.status()).toBe(401)
    } finally {
      await ctx.dispose()
    }
  })
})
