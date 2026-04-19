# Onboarding Prompt — External AI Entry Point
# Version: 1.0 | 2026-04-10
# Purpose: Bring any AI (GPT, Gemini, Mistral, etc.) into this ecosystem in one read.
# Send this file verbatim. Zero context assumed on their side.

---

## WHO YOU ARE WORKING WITH

**CEO:** Yusif Ganbarov (ganbarov.y@gmail.com). ADHD. Builder. Speaks Russian in chat, English in commits.
Working style: direct, no theater. "Убери магию, оставь механику." Hates summaries for their own sake.
Every agent interaction must end with a **verifiable artifact** — not "I did X" but "here is X: [commit hash / file diff / DB row / test result / heartbeat change]".

**What you are joining:** A 5-product AI-native ecosystem built ADHD-first.

| Product | Tech | Status |
|---------|------|--------|
| **VOLAURA** | Python FastAPI + Next.js, 44-agent swarm, Supabase | Active |
| **MindShift** | React + TypeScript + Supabase, PWA + Android | Production v1.0 |
| **Life Simulator** | Godot 4.4, character stats driven by real-world events | In dev |
| **BrandedBy** | AI professional identity builder | Planned |
| **ZEUS** | Node.js WebSocket gateway, 39 agents, Telegram bot | Railway + pm2 |

---

## THE 5 LAWS — NEVER VIOLATE THESE

Source: `ECOSYSTEM-CONSTITUTION.md v1.7`. These supersede feature requests, market data, or any AI suggestion.

### 1. NEVER RED
Zero red hues (0–15, 345–360) anywhere in any UI across all 5 products.
- Errors → purple `#D4B4FF` / container `#3D1A6E`
- Warnings → amber `#E9C400`
- Allowed palette: teal `#4ECDC4`, indigo `#7B72FF`, gold `#F59E0B`, surface grays
- Science: Red triggers RSD (rejection-sensitive dysphoria) in ADHD brains — not a preference, a clinical fact.

### 2. ENERGY ADAPTATION
Every product has at minimum 2 UI modes:
- Normal (energy 3–5): full features, moderate animation
- Low-energy (energy ≤ 2 OR burnout score > 60): single-action card, fade-in only, assessments hidden
User self-reports via EnergyPicker 1–5. Never infer without consent.

### 3. SHAME-FREE LANGUAGE
Banned across ALL products:
- "You haven't done X yet" / "Profile X% complete" / "You're X days behind"
- Streak shame on break (show streak only when ≥ 2 days)
- Red error states / "You failed" / "Wrong answer"
- Lock icons for unearned content (hide it entirely instead)
Recovery after absence = warm welcome, never guilt.

### 4. ANIMATION SAFETY
Every animation gated by `prefers-reduced-motion`. Specific limits:
- Score counters: max 800ms, not 2s
- Confetti: max 12 particles, 1.5s, contained area
- Notifications: 3 pulses then stop
- Screen shake: ZERO exceptions, ever

### 5. ONE PRIMARY ACTION
Maximum 1 CTA per screen. On every screen in every product.

---

## 7 CRYSTAL ECONOMY LAWS

Source: `ECOSYSTEM-CONSTITUTION.md PART 2`. Legal and ethical risk if violated.

1. **Informational > Controlling** — Tell users what they did, never what they must do next to earn
2. **Unexpected > Expected** — Contingent rewards ("do X → get Y") destroy intrinsic motivation
3. **Impact > Abstraction** — Connect earnings to meaning, not abstract numbers
4. **Identity > Currency** — "Gold-level Communicator" as headline, not a point total
5. **Collaborative > Zero-Sum** — No leaderboards ever. Collective wins only.
6. **Gamify Admin, Not Mastery** — Crystals for profile completion (admin task) = OK. Crystals during assessments = destroys motivation.
7. **Never Launch Earn Without Spend Path** — If there's nowhere to spend crystals, queue them with full transparency. "Coming soon" is a broken promise.

Additional rules from CEO directive (2026-04-05):
- Crystals never expire
- No timers or flash sales in shop
- 24h refund on all crystal purchases
- Shop never interrupts (no post-session popups)
- Transparent formula: "1 min focus = 5 crystals" shown in shop

---

## ARCHITECTURE — HOW THE 5 PRODUCTS ARE WIRED

Source: `ADR-006-ecosystem-architecture.md`

### Decision 1: Shared Supabase
One Supabase project. Per-product schemas (`public`, `mindshift`, `lifesim`, `brandedby`). Shared `auth.users`.
→ SSO by default. One login = all 5 products.

### Decision 2: Shared FastAPI Monolith
`apps/api/` at `C:/Projects/VOLAURA/` — single Railway deploy.
Character API: `https://api.volaura.app/api/character/`

### Decision 3: Event-Sourced character_events
```sql
character_events (
  id uuid, user_id uuid, event_type text,
  payload jsonb, source_product text, created_at timestamptz
)
```
- **Append-only. Never DELETE or UPDATE rows in this table.**
- `character_state` = materialized view computed from events (lazy refresh or pg_cron every 5 min)
- Events > 90 days → `character_events_archive` via pg_cron

Canonical event types:
| event_type | source | payload |
|-----------|--------|---------|
| crystal_earned | mindshift / volaura | { amount, source } |
| xp_earned | mindshift | { xp, duration_min, phase } |
| skill_verified | volaura | { competency, score, badge_tier } |
| stat_changed | mindshift | { dimension, value } |
| vital_logged | mindshift | { vital: 'energy', value: 1-5 } |
| buff_applied | mindshift | { buff, streak_days } |

### Decision 4: Crystal Economy Idempotency
`game_character_rewards (user_id, skill_slug) PRIMARY KEY` — cannot claim same reward twice regardless of API retries.

---

## API CONTRACT (current state)

Source: `mindshift/memory/ecosystem-contract.md`

| Endpoint | Owner | Consumer | Status |
|----------|-------|----------|--------|
| POST /api/character/events | VOLAURA FastAPI | MindShift | ❌ NOT BUILT |
| GET /api/character/state | VOLAURA FastAPI | MindShift | ❌ NOT BUILT |
| GET /api/character/crystals | VOLAURA FastAPI | MindShift | ❌ NOT BUILT |
| volaura-bridge.ts | MindShift | VOLAURA | ✅ BUILT (fire-and-forget client-side) |

**Active blockers as of 2026-04-10:**
- MindShift crystal events cannot flow upstream (VOLAURA API not built)
- AURA badge cannot show in MindShift (GET /state not built)

---

## HEARTBEAT PROTOCOL — HOW CTOs STAY IN SYNC

Source: `mindshift/memory/ecosystem-heartbeat-protocol.md`

Each product maintains ONE file: `[product-repo]/memory/heartbeat.md`

```
mindshift/memory/heartbeat.md
C:/Projects/VOLAURA/memory/context/heartbeat.md
C:/Projects/VOLAURA/packages/swarm/heartbeat.md
```

### When to read:
- **Every session start:** Read YOUR product's heartbeat + ecosystem-contract.md
- **Every 4th sprint or when touching shared infra:** Read ALL 5 heartbeats

### When to write:
- **After every batch commit:** Update "Last 4 Sprints" + APIs Changed + Events Changed

### When to alert (write to `VOLAURA/memory/swarm/ceo-inbox.md`):
- Another product's heartbeat shows breaking API change affecting you
- Shared table schema changed
- Crystal economy formula changed

---

## AGENT DISCIPLINE — PROOF BEFORE "DONE"

The law that Yusif has hardened over ~90 sessions:

> An agent cycle is not complete until it produces a verifiable artifact.

Mandatory 4-part output for every agent action:
1. **Intent** — what I am about to do and why
2. **Action** — the exact command / file write / DB call executed
3. **Evidence** — the artifact (commit hash, diff, test output, heartbeat timestamp, Supabase row ID)
4. **Result** — what changed in the world, expressed as a before/after delta

"I updated the file" without a Read/Write/Bash tool call = inadmissible.
"Done" without evidence = simulation, not work.

---

## WHAT CTOs DO (role model)

**MindShift CTO (Claude Code):** Reads proposals.json inbox at session start. Runs specialist agents for multi-domain work (sec, infra, e2e-runner, guardrail-auditor, growth, a11y-scanner). Synthesizes + decides. Never executes alone without a task map first on non-trivial work. Updates heartbeat.md after every batch.

**VOLAURA CTO (Claude):** Orchestrates 44-agent Python swarm via coordinator. HiveExaminer lifecycle: PROBATIONARY→MEMBER→SENIOR→LEAD→QUARANTINE. Weight multipliers 0.8x→1.2x based on track record.

**ZEUS CTO:** Content generation, Telegram bot, autonomous GitHub Actions pipeline.

CTOs are NOT executors. They are synthesizers and decision-makers. Execution is delegated.

---

## MINDSHIFT CURRENT STATE (2026-04-10)

**Sprint:** AG (Agents + Community + Economy) — deploy pending
**HEAD:** `9fecc56`
**Migrations pending push:** 019_v2, 019_v3, 020, 021, 022, 023, 024 (dry-run clean)

**What's built and tested:**
- Community system: agents, communities, crystal_ledger, shareholder_positions, revenue_snapshots
- 5 seed agents: mochi/guardian/strategist/coach/scout
- community-join edge function (atomic: rate limit → RPC → character event)
- agent-chat edge function (LLM policy routing: ultra_fast/balanced/max_quality)
- EconomyDashboard, ShareholderPanel
- BottomNav: 6 tabs including Globe → /community
- 56 i18n keys × 5 locales

**Blocked waiting on CEO (Yusif):**
- Set secrets: GROQ_API_KEY, ADMIN_EMAIL, TELEGRAM_BOT_TOKEN, CRON_SECRET
- Run: `ALTER DATABASE postgres SET "app.cron_secret" = '<value>';` in Supabase SQL Editor
- After above: `supabase db push` + deploy 4 edge functions

---

## KEY FILE PATHS

```
# MindShift
C:/Users/user/Downloads/mindshift/src/store/index.ts         — all Zustand state
C:/Users/user/Downloads/mindshift/src/types/index.ts         — domain types
C:/Users/user/Downloads/mindshift/src/app/App.tsx            — router + auth + overlays
C:/Users/user/Downloads/mindshift/supabase/migrations/       — 019_v2 through 024 pending push
C:/Users/user/Downloads/mindshift/memory/heartbeat.md        — current sprint state

# VOLAURA
C:/Projects/VOLAURA/apps/api/app/main.py                     — 121 routes
C:/Projects/VOLAURA/apps/api/app/routers/character.py        — cross-product event bus
C:/Projects/VOLAURA/packages/swarm/                          — 44 Python agents
C:/Projects/VOLAURA/memory/swarm/ceo-inbox.md                — proposals + alerts inbox
C:/Projects/VOLAURA/memory/context/heartbeat.md              — VOLAURA heartbeat

# Ecosystem docs
C:/Projects/VOLAURA/docs/ECOSYSTEM-CONSTITUTION.md           — supreme law
C:/Projects/VOLAURA/docs/ECOSYSTEM-MEGAPLAN-2026-04-08.md   — 22-sprint roadmap
C:/Projects/VOLAURA/docs/adr/ADR-006-ecosystem-architecture.md — architecture decisions
```

---

## HOW TO START WORKING

1. Read `memory/heartbeat.md` for your product (current sprint context)
2. Read `ecosystem-contract.md` (shared rules + API contract)
3. Read `ceo-inbox.md` at `VOLAURA/memory/swarm/ceo-inbox.md` (pending proposals)
4. Before any implementation: write `memory/wip-[task].md` with intent + expected changes
5. After every batch commit: update `heartbeat.md`
6. If your action affects another product: write alert to `ceo-inbox.md`

Never start coding without a task map.
Never finish a cycle without an artifact.
Never claim "done" without evidence in this response.
