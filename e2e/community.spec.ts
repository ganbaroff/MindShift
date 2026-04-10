/**
 * E2E — Community screen + Economy dashboard (Sprint AG-2→AG-4)
 *
 * All Supabase calls mocked. Tests run offline.
 * Covers: community render, agent chat sheet, anonymous join modal,
 *         economy dashboard, crystal balance display.
 */

import { test, expect } from '@playwright/test'
import { seedStore, mockSupabase, TEST_USER } from './helpers'

// ── Mock data ──────────────────────────────────────────────────────────────────

const MOCK_AGENTS = [
  {
    id: 'agent-001',
    slug: 'mochi',
    display_name: 'Mochi',
    tier: 'FREE',
    rank: 'MEMBER',
    state: 'idle',
    personality: { tone: 'warm', specialty: 'ADHD support', catchphrase: 'One step at a time.', avatar_url: '' },
  },
  {
    id: 'agent-002',
    slug: 'strategist',
    display_name: 'Strategist',
    tier: 'PRO',
    rank: 'SENIOR',
    state: 'working',
    personality: { tone: 'analytical', specialty: 'Focus strategy', catchphrase: 'Clarity beats speed.', avatar_url: '' },
  },
]

const MOCK_COMMUNITIES = [
  {
    id: 'comm-001',
    slug: 'deep-focus-collective',
    name: 'Deep Focus Collective',
    tier: 'OPEN',
    entry_cost_crystals: 0,
    is_anonymous: false,
    member_count: 47,
    constitution: 'A quiet room for people who focus together.',
  },
  {
    id: 'comm-002',
    slug: 'foundation-club',
    name: 'Foundation Club',
    tier: 'ELITE',
    entry_cost_crystals: 10000,
    is_anonymous: true,
    member_count: 3,
    constitution: 'Members are known by their badge only.',
  },
]

// ── Setup ──────────────────────────────────────────────────────────────────────

async function setupCommunity(page: import('@playwright/test').Page) {
  await seedStore(page)
  await mockSupabase(page)

  // Override: agents
  await page.route('**/rest/v1/agents**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_AGENTS),
    }),
  )

  // Override: communities (OPEN tier)
  await page.route('**/rest/v1/communities**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_COMMUNITIES),
    }),
  )

  // Override: community_memberships (not a member yet)
  await page.route('**/rest/v1/community_memberships**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    }),
  )

  // Override: crystal balance RPC
  await page.route('**/rest/v1/rpc/get_crystal_balance**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(250),
    }),
  )
}

// ── Tests ──────────────────────────────────────────────────────────────────────

test.describe('Community screen', () => {
  test('renders title, agents, and community list', async ({ page }) => {
    await setupCommunity(page)
    await page.goto('/community')

    // Header
    await expect(page.getByRole('heading', { name: /community/i })).toBeVisible()

    // Crystal balance strip
    await expect(page.getByRole('group', { name: /focus crystals/i })).toBeVisible()

    // Agents section
    await expect(page.getByRole('region', { name: /world inhabitants/i })).toBeVisible()
    await expect(page.getByText('Mochi')).toBeVisible()
    await expect(page.getByText('Strategist')).toBeVisible()
  })

  test('agents show Chat button (when not offline)', async ({ page }) => {
    await setupCommunity(page)
    await page.goto('/community')

    // Both agents are not offline → should have Chat buttons
    const chatBtns = page.getByRole('button', { name: /chat with/i })
    await expect(chatBtns.first()).toBeVisible()
  })

  test('opens agent chat sheet on Chat click', async ({ page }) => {
    await setupCommunity(page)
    await page.goto('/community')

    // Mock agent-chat edge function response
    await page.route('**/functions/v1/agent-chat**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ reply: 'One step at a time.', agentState: 'idle' }),
      }),
    )

    // Click Chat on Mochi
    await page.getByRole('button', { name: /chat with mochi/i }).click()

    // Sheet should open with dialog role
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('Mochi')).toBeVisible()
    await expect(dialog.getByRole('textbox', { name: /message/i })).toBeVisible()

    // Close with × button
    await dialog.getByRole('button', { name: /close chat/i }).click()
    await expect(dialog).not.toBeVisible()
  })

  test('sends message in chat sheet', async ({ page }) => {
    await setupCommunity(page)
    await page.goto('/community')

    const replyText = 'One step at a time.'
    await page.route('**/functions/v1/agent-chat**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ reply: replyText, agentState: 'listening' }),
      }),
    )

    await page.getByRole('button', { name: /chat with mochi/i }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('textbox', { name: /message/i }).fill('Hello Mochi')
    await dialog.getByRole('button', { name: /send message/i }).click()

    // User message appears
    await expect(dialog.getByText('Hello Mochi')).toBeVisible()
    // Agent reply appears (after network)
    await expect(dialog.getByText(replyText)).toBeVisible({ timeout: 5000 })
  })

  test('shows discover section for available communities', async ({ page }) => {
    await setupCommunity(page)
    await page.goto('/community')

    const discover = page.getByRole('region', { name: /discover/i })
    await expect(discover).toBeVisible()
    await expect(discover.getByText('Deep Focus Collective')).toBeVisible()
    await expect(discover.getByRole('button', { name: /join deep focus collective/i })).toBeVisible()
  })

  test('opens alias modal when joining anonymous community', async ({ page }) => {
    await setupCommunity(page)
    await page.goto('/community')

    // Foundation Club is anonymous → should show AliasJoinModal
    const joinBtn = page.getByRole('button', { name: /join foundation club/i })
    await expect(joinBtn).toBeVisible()
    await joinBtn.click()

    // Modal dialog appears
    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible()
    await expect(modal.getByRole('heading', { name: /join anonymously/i })).toBeVisible()
    await expect(modal.getByRole('textbox')).toBeVisible()

    // Cancel closes modal
    await modal.getByRole('button', { name: /not now/i }).click()
    await expect(modal).not.toBeVisible()
  })

  test('economy link navigates to /economy', async ({ page }) => {
    await setupCommunity(page)
    await page.goto('/community')

    await page.route('**/rest/v1/revenue_snapshots**', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    )

    await page.getByRole('button', { name: /crystal economy/i }).click()
    await expect(page).toHaveURL(/\/economy/)
  })
})

test.describe('Economy dashboard', () => {
  test('renders crystal rules and shareholder section', async ({ page }) => {
    await seedStore(page)
    await mockSupabase(page)

    await page.route('**/rest/v1/revenue_snapshots**', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    )
    await page.route('**/rest/v1/shareholder_positions**', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    )
    await page.route('**/rest/v1/rpc/get_crystal_balance**', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(100) }),
    )

    await page.goto('/economy')

    await expect(page.getByRole('heading', { name: /crystal economy/i })).toBeVisible()
    await expect(page.getByText(/1 min focus = 5/i)).toBeVisible()
    await expect(page.getByText(/crystals never expire/i)).toBeVisible()
    await expect(page.getByText(/first revenue snapshot coming soon/i)).toBeVisible()
  })

  test('shows crystal balances when logged in', async ({ page }) => {
    await seedStore(page)
    await mockSupabase(page)

    await page.route('**/rest/v1/revenue_snapshots**', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    )
    await page.route('**/rest/v1/shareholder_positions**', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    )
    await page.route('**/rest/v1/rpc/get_crystal_balance**', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(500) }),
    )

    await page.goto('/economy')

    // Balance pills should show 500
    const focusPill = page.getByRole('group', { name: /focus: 500/i })
    await expect(focusPill).toBeVisible()
  })

  test('back button works', async ({ page }) => {
    await seedStore(page)
    await mockSupabase(page)

    await page.route('**/rest/v1/**', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    )

    await page.goto('/community')
    await page.route('**/rest/v1/revenue_snapshots**', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    )
    await page.getByRole('button', { name: /crystal economy/i }).click()
    await expect(page).toHaveURL(/\/economy/)

    await page.getByRole('button', { name: /go back/i }).click()
    await expect(page).toHaveURL(/\/community/)
  })
})
